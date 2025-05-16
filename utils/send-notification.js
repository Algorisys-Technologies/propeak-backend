const eventMessages = require("../utils/event-sms");
const NotificationSetting = require("../models/notification-setting/notification-setting-model");
const User = require("../models/user/user-model");
const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types;
const UserNotification = require("../models/notification-setting/user-notification-model");
const NotificationPreference = require("../models/notification-setting/notification-preference-model");
const sendEmail = require("../utils/sendEmail");

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

  // For project events, use task._id as projectId
  const notificationProjectId = isProjectEvent ? task._id : task.projectId;

  console.log(
    "Resolved projectId for NotificationSetting query:",
    notificationProjectId
  );

  const settings = await NotificationSetting.find({
    eventType,
    projectId: notificationProjectId,
    active: true,
    isDeleted: false,
  }).populate("notifyRoles");
  // console.log(task, "what comes here ?");
  // const settings = await NotificationSetting.find({
  //   eventType,
  //   projectId: task.projectId,
  //   active: true,
  //   isDeleted: false,
  // }).populate("notifyRoles");
  console.log(settings, "settings????");
  if (!settings.length) {
    console.warn(`No NotificationSetting found for eventType: ${eventType}`);
    return;
  }

  const userIds = new Set();

  for (const setting of settings) {
    if (Array.isArray(setting.notifyUserIds)) {
      setting.notifyUserIds.forEach((id) => userIds.add(id.toString()));
    }

    if (Array.isArray(setting.notifyRoles) && setting.notifyRoles.length) {
      const roleUsers = await User.find({
        role: { $in: setting.notifyRoles },
        companyId: task.companyId,
        isDeleted: false,
      })
        .select("_id")
        .lean();

      roleUsers.forEach((u) => userIds.add(u._id.toString()));
    }
  }

  const users = await User.find({
    _id: { $in: Array.from(userIds) },
  }).lean();

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

  const category = projectEvents.includes(eventType) ? "project" : "task";

  for (const user of users) {
    if (!user) continue;

    const setting = settings.find(
      (s) =>
        (s.notifyUserIds || []).some(
          (id) => id.toString() === user._id.toString()
        ) || (s.notifyRoles || []).includes(user.role?.toString())
    );

    const channels = setting?.channel || [];
    const roleNames = (setting?.notifyRoles || []).map((r) =>
      typeof r === "object" && r.name ? r.name : r.toString()
    );

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
      subject: [
        "CUSTOM_FIELD_UPDATE",
        "PROJECT_CREATED",
        "PROJECT_ARCHIVED",
        "PROJECT_STAGE_CHANGED",
      ].includes(eventType)
        ? "Project Notification"
        : "Task Notification",
      message,
      url: `/tasks/${task._id}`,
      read: false,
      // category: "task",
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
    console.log("No users to notify.");
  }
};
