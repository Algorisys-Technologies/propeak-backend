const eventMessages = require("../utils/event-sms");
const NotificationSetting = require("../models/notification-setting/notification-setting-model");
const User = require("../models/user/user-model");
const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types;
const UserNotification = require("../models/notification-setting/user-notification-model");
const NotificationPreference = require("../models/notification-setting/notification-preference-model");
const sendEmail = require("./send-email");

module.exports = async function sendNotification(task, eventType) {
  const TASK_COMPLETED = "TASK_COMPLETED";
  const TASK_REJECTED = "TASK_REJECTED";
  if (task.status === "completed") eventType = TASK_COMPLETED;
  if (task.status === "rejected") eventType = TASK_REJECTED;
  const projectEvents = [
    "CUSTOM_FIELD_UPDATE",
    "PROJECT_CREATED",
    "PROJECT_ARCHIVED",
    "PROJECT_STAGE_CHANGED",
  ];

  const isProjectEvent = projectEvents.includes(eventType);
  const notificationProjectId = isProjectEvent ? task._id : task.projectId;

  const settings = await NotificationSetting.find({
    eventType,
    projectId: notificationProjectId,
    active: true,
    isDeleted: false,
  }).populate("notifyRoles");

  if (!settings.length) {
    console.warn(`No NotificationSetting found for eventType: ${eventType}`);
    return;
  }

  const userIdSet = new Set();

  for (const setting of settings) {
    // Add explicitly mentioned users
    if (Array.isArray(setting.notifyUserIds)) {
      setting.notifyUserIds.forEach((id) => {
        if (id) userIdSet.add(id.toString());
      });
    }

    // Add users from roles
    if (Array.isArray(setting.notifyRoles)) {
      const roleNames = [];

      for (const role of setting.notifyRoles) {
        if (typeof role === "object" && role.name) {
          roleNames.push(role.name);
        } else {
          const roleDoc = await Role.findById(role).select("name");
          if (roleDoc?.name) roleNames.push(roleDoc.name);
        }
      }

      if (roleNames.length) {
        const roleUsers = await User.find({
          role: { $in: roleNames },
          companyId: task.companyId,
          isDeleted: false,
          isActive: true,
        })
          .select("_id")
          .lean();

        roleUsers.forEach((u) => userIdSet.add(u._id.toString()));
      }
    }
  }

  const userIds = Array.from(userIdSet);

  const users = await User.find({
    _id: { $in: userIds },
    isDeleted: false,
    isActive: true,
  }).lean();
  if (!users.length) {
    console.log("No users found to notify.");
    return;
  }

  const notificationPreferences = await NotificationPreference.find({
    userId: { $in: users.map((u) => u._id) },
  }).lean();

  const generateMessage = eventMessages[eventType];
  if (!generateMessage) {
    console.warn(`No message defined for event type: ${eventType}`);
    return;
  }

  const message = generateMessage(task);
  const notifications = [];
  const category = isProjectEvent ? "project" : "task";

  for (const user of users) {
    if (!user) continue;

    // Find which setting applies to this user
    const setting = settings.find(
      (s) =>
        (s.notifyUserIds || []).some(
          (id) => id.toString() === user._id.toString()
        ) ||
        (s.notifyRoles || []).some((role) =>
          typeof role === "object"
            ? role.name === user.role
            : role.toString() === user.role
        )
    );

    const channels = setting?.channel || [];

    // Extract notify role names
    const roleNames = [];
    if (setting?.notifyRoles?.length) {
      for (const role of setting.notifyRoles) {
        if (typeof role === "object" && role.name) {
          roleNames.push(role.name);
        } else {
          const roleDoc = await Role.findById(role).select("name");
          if (roleDoc) roleNames.push(roleDoc.name);
        }
      }
    }

    const userPreference = notificationPreferences.find(
      (p) => p.userId.toString() === user._id.toString()
    );

    const mutedEvents = userPreference?.muteEvents || [];
    const isMuted = mutedEvents.includes(eventType);
    const isMandatory = setting?.mandatory;
    const shouldSendEmail =
      channels.includes("email") && user.email && (!isMuted || isMandatory);

    if (isMuted && !isMandatory) {
      console.log(`User ${user._id} has muted ${eventType}, skipping...`);
      continue;
    }

    if (shouldSendEmail) {
      try {
        await sendEmail(
          user.email,
          "Notification - " + eventType.replace(/_/g, " "),
          message
        );
        console.log(`Email sent to ${user.email}`);
      } catch (err) {
        console.error(`Failed to send email to ${user.email}:`, err);
      }
    }

    notifications.push({
      companyId: task.companyId,
      isDeleted: false,
      userId: user._id,
      subject: isProjectEvent ? "Project Notification" : "Task Notification",
      message,
      url: `/tasks/${task._id}`,
      read: false,
      category,
      eventType,
      projectId: task.projectId,
      taskId: task._id,
      email: shouldSendEmail,
      inApp: channels.includes("inapp"),
      notifyRoleNames: roleNames,
      muteEvents: mutedEvents,
      createdOn: new Date(),
      createdBy: task.modifiedBy || task.createdBy,
    });
  }

  if (notifications.length) {
    await UserNotification.insertMany(notifications);
    console.log("Notifications stored in UserNotification collection.");
  } else {
    console.log("No notifications to store.");
  }
};
