const eventMessages=require("../utils/event-sms")
const NotificationSetting = require("../models/notification-setting/notification-setting-model");
const User = require("../models/user/user-model");
const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types;
const UserNotification = require("../models/notification-setting/user-notification-model");

module.exports = async function sendNotification(task, eventType) {
    console.log("eventType:", eventType);
    console.log(task.projectId, "task.projectId");
  
    const settings = await NotificationSetting.find({
      eventType,
      projectId: task.projectId,
      active: true,
      isDeleted: false,
    });
  
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
  
      // Add users based on roles
      if (Array.isArray(setting.notifyRoles) && setting.notifyRoles.length) {
        const roleUsers = await User.find({
          role: { $in: setting.notifyRoles },
          companyId: task.companyId,
          isDeleted: false,
        }).select("_id").lean();
  
        roleUsers.forEach((u) => userIds.add(u._id.toString()));
      }
    }
  
    const users = await User.find({
      _id: { $in: Array.from(userIds) },
    }).lean();
  
    const generateMessage = eventMessages[eventType];
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
  
      const setting = settings.find((s) =>
        (s.notifyUserIds || []).some((id) => id.toString() === user._id.toString()) ||
        (s.notifyRoles || []).includes(user.role?.toString())
      );
  
      const channels = setting?.channel || [];
  
      notifications.push({
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
// module.exports = async function sendNotification(task, eventType) {
//   console.log("eventType:", eventType);
//     console.log(task.projectId, "task.projectId")
//   const settings = await NotificationSetting.find({
//     eventType,
//     projectId: task.projectId,
//     active: true,
//     isDeleted: false,
//   });
//   console.log(settings, "is it found???")
//   if (!settings.length) {
//     console.warn(`No NotificationSetting found for eventType: ${eventType}`);
//     return;
//   }

//   let userIds = new Set();

//   for (const setting of settings) {
//     // Add specific users
//     if (Array.isArray(setting.notifyUserIds)) {
//       setting.notifyUserIds.forEach((id) => userIds.add(id.toString()));
//     }

//     // Add users based on roles
//     if (Array.isArray(setting.notifyRoles) && setting.notifyRoles.length) {
//       const roleUsers = await User.find({
//         role: { $in: setting.notifyRoles },
//         companyId: task.companyId,
//         isDeleted: false,
//       }).select("_id").lean();

//       roleUsers.forEach((u) => userIds.add(u._id.toString()));
//     }
//   }

//   const users = await User.find({
//     _id: { $in: Array.from(userIds) },
//   }).lean();

//   const generateMessage = eventMessages[eventType];
//   if (!generateMessage) {
//     console.warn(`No message defined for event type: ${eventType}`);
//     return;
//   }

//   const message = generateMessage(task);

//   for (const user of users) {
//     if (!user) continue;

//     console.log(`[In-App] To: ${user.name} | Event: ${eventType} | ${message}`);
//     if (user.email) {
//       console.log(`[Email] To: ${user.email} | ${message}`);
//       // Email logic goes here
//     }
//   }
// };
