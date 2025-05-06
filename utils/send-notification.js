const eventMessages = require("../utils/event-sms");
const NotificationSetting = require("../models/notification-setting/notification-setting-model");
const User = require("../models/user/user-model");
const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types;
const UserNotification = require("../models/notification-setting/user-notification-model");
module.exports = async function sendNotification(task, eventType) {
  console.log("eventType:", eventType);
  const TASK_COMPLETED = "TASK_COMPLETED";

  if (task.status === "completed") {
    eventType = TASK_COMPLETED;
    console.log("Overridden eventType to TASK_COMPLETED");
  }
  console.log("eventType:", eventType);

  console.log(task.projectId, "task.projectId");
  console.log(task, "task.............");
  const settings = await NotificationSetting.find({
    eventType,
    projectId: task.projectId,
    active: true,
    isDeleted: false,
  }).populate("notifyRoles");

  console.log(settings, "is it found???");

  if (!settings.length) {
    console.warn(`No NotificationSetting found for eventType: ${eventType}`);
    return;
  }

  let userIds = new Set();

  for (const setting of settings) {
    // Add specific users
    if (Array.isArray(setting.notifyUserIds)) {
      setting.notifyUserIds.forEach((id) => userIds.add(id.toString()));
    }
    const roleNames = (setting.notifyRoles || []).map((r) => r.name);
    console.log(roleNames, "roleNames.................");
    // Add users based on roles
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

  const generateMessage = eventMessages[eventType];
  console.log(generateMessage, "from generateMessage")
  if (!generateMessage) {
    console.warn(`No message defined for event type: ${eventType}`);
    return;
  }

  const message = generateMessage(task);
  const notifications = [];

  for (const user of users) {
    if (!user) continue;

    console.log(`[In-App] To: ${user.name} | Event: ${eventType} | ${message}`);

    if (user.email) {
      console.log(`[Email] To: ${user.email} | ${message}`);
      // Email logic can be added here if needed
    }

    const setting = settings.find(
      (s) =>
        (s.notifyUserIds || []).some(
          (id) => id.toString() === user._id.toString()
        ) || (s.notifyRoles || []).includes(user.role?.toString())
    );

    const channels = setting?.channel || [];
    const roleNames = (setting?.notifyRoles || []).map((r) => {
      // r could be populated object or just ID string
      return typeof r === "object" && r.name ? r.name : r.toString();
    });

    console.log(task.companyId, "is it coming here ");
    notifications.push({
      companyId: task.companyId,
      isDeleted: false,
      userId: user._id,
      subject: `Task Notification`,
      message: message,
      url: `/tasks/${task._id}`,
      read: false,
      category: "task",
      eventType,
      projectId: task.projectId,
      taskId: task._id,
      email: channels.includes("email") && user.email ? true : false,
      inApp: channels.includes("inapp"),
      notifyRoleNames: roleNames,
      muteEvents: [],
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







// module.exports = async function sendNotification(data, eventType) {
//   console.log("eventType:", eventType);

//   const isTask = data.taskStageId !== undefined;
//   const TASK_COMPLETED = "TASK_COMPLETED";

//   if (isTask && data.status === "completed") {
//     eventType = TASK_COMPLETED;
//     console.log("Overridden eventType to TASK_COMPLETED");
//   }

//   const projectId = isTask ? data.projectId : data._id;
//   const companyId = data.companyId;

//   const settings = await NotificationSetting.find({
//     eventType,
//     projectId,
//     active: true,
//     isDeleted: false,
//   });

//   if (!settings.length) {
//     console.warn(`No NotificationSetting found for eventType: ${eventType}`);
//     return;
//   }

//   let userIds = new Set();

//   for (const setting of settings) {
//     if (Array.isArray(setting.notifyUserIds)) {
//       setting.notifyUserIds.forEach((id) => userIds.add(id.toString()));
//     }

//     if (Array.isArray(setting.notifyRoles) && setting.notifyRoles.length) {
//       const roleUsers = await User.find({
//         role: { $in: setting.notifyRoles },
//         companyId,
//         isDeleted: false,
//       }).select("_id").lean();

//       roleUsers.forEach((u) => userIds.add(u._id.toString()));
//     }
//   }

//   const users = await User.find({ _id: { $in: Array.from(userIds) } }).lean();

//   const generateMessage = eventMessages[eventType];
//   if (!generateMessage) {
//     console.warn(`No message defined for event type: ${eventType}`);
//     return;
//   }

//   const message = generateMessage(data);
//   const notifications = [];

//   for (const user of users) {
//     if (!user) continue;

//     console.log(`[In-App] To: ${user.name} | Event: ${eventType} | ${message}`);
//     if (user.email) {
//       console.log(`[Email] To: ${user.email} | ${message}`);
//     }

//     const setting = settings.find((s) =>
//       (s.notifyUserIds || []).includes(user._id.toString()) ||
//       (s.notifyRoles || []).includes(user.role?.toString())
//     );

//     const channels = setting?.channel || [];

//     notifications.push({
//       companyId,
//       isDeleted: false,
//       userId: user._id,
//       subject: isTask ? "Task Notification" : "Project Notification",
//       message,
//       url: isTask ? `/tasks/${data._id}` : `/projects/${data._id}`,
//       read: false,
//       category: isTask ? "task" : "project",
//       eventType,
//       projectId,
//       taskId: isTask ? data._id : undefined,
//       email: channels.includes("email") && user.email ? true : false,
//       inApp: channels.includes("inapp"),
//       muteEvents: [],
//       createdOn: new Date(),
//       createdBy: data.modifiedBy || data.createdBy,
//     });
//   }

//   if (notifications.length) {
//     await UserNotification.insertMany(notifications);
//     console.log("Notifications stored in UserNotification collection.");
//   } else {
//     console.log("No users to notify.");
//   }
// };
