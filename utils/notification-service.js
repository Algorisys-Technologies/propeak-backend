const NotificationSetting = require('../models/notification-setting/notification-setting-model');
const NotificationPreference = require('../models/notification-setting/notification-preference-model');
const Role = require('../models/role/role-model');
const User = require('../models/user/user-model');
const sendNotification = require('./send-notification'); // adjust import path accordingly

/**
 * Handle in-app and email notifications for a given task and event type.
 * @param {Object} task - The task object with at least companyId and projectId.
 * @param {string} eventType - The type of event triggering the notification.
 */
async function handleNotifications(task, eventType) {
    const normalizedProjectId =
    typeof task.projectId === 'object' && task.projectId !== null
        ? task.projectId._id
        : task.projectId;

  try {
    // In-app notifications
    const inappChannels = await NotificationSetting.find({
      companyId: task.companyId,
      projectId: normalizedProjectId || null,
      eventType,
      channel: { $in: ["inapp"] },
      active: true
    });

    if (inappChannels.length > 0) {
      await sendNotification(task, eventType);
    }
  } catch (error) {
    console.error("In-app notification error:", error);
  }

  // Email notifications
  const emailChannels = await NotificationSetting.find({
    companyId: task.companyId,
    projectId: normalizedProjectId || null,
    eventType,
    channel: { $in: ["email"] },
    active: true
  });

  console.log(emailChannels, "from emailChannels")

  const result = [];

for (const ch of emailChannels) {
  // 1. Get role names
  const roles = await Role.find({ _id: { $in: ch.notifyRoles } }, 'name');
  const roleNames = roles.map(role => role.name);

  // 2. Get users by notifyUserIds
  const usersById = await User.find({ _id: { $in: ch.notifyUserIds } }, 'email role');

  // 3. Get users by role names
  let usersByRole = [];
  if (roleNames.length > 0) {
    usersByRole = await User.find({ role: { $in: roleNames }, companyId: task.companyId }, 'email role');
  }

  // 4. Merge and deduplicate users
  const allUsers = [...usersById, ...usersByRole];
  const userMap = new Map();
  allUsers.forEach(user => {
    userMap.set(user._id.toString(), user); // deduplicate by _id
  });
  const mergedUsers = Array.from(userMap.values());

  // 5. Filter by user preferences
  const finalUsers = [];
  for (const user of mergedUsers) {
    const pref = await NotificationPreference.findOne({ userId: user._id });

    if (pref?.email === false) continue;
    if (pref?.muteEvents?.includes(eventType)) continue;

    finalUsers.push(user);
  }

  // 6. Extract and deduplicate emails
  const emails = [...new Set(finalUsers.map(user => user.email))];

  result.push({ emails });
}

return result;

}

module.exports = { handleNotifications };