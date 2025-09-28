const mongoose = require("mongoose");
const { logError, logInfo } = require("../../common/logger");
const NotificationSetting = require("../../models/notification-setting/notification-setting-model");
const UserNotification = require("../../models/notification-setting/user-notification-model");
const Project = require("../../models/project/project-model");
const User = require("../../models/user/user-model");
const errors = {
  ADDNOTIFICATIONERROR: "Error occurred while adding the notification",
  EDITNOTIFICATIONERROR: "Error occurred while updating the notification",
  DELETENOTIFICATIONERROR: "Error occurred while deleting the notification",
  ADDHIDENOTIFICATIONERROR: "Error occurred while adding the hide notification",
  NOT_AUTHORIZED: "You're not authorized",
};
const { isValidObjectId } = require("mongoose");
const { DEFAULT_PAGE, DEFAULT_QUERY, DEFAULT_LIMIT } = require("../../utils/defaultValues");
const { updateReminderJobs } = require("../../task-reminder-scheduler");


exports.createNotificationSetting = async (req, res) => {
  try {
    const {
      companyId,
      projectId,
      taskStageId,
      eventType,
      notifyRoles,
      notifyUserIds,
      channel,
      mandatory,
      active,
      userId,
      type,
      reminderTime,
      intervalStart,
      intervalEnd,
      intervalMinutes,
    } = req.body;

    // Check if a setting already exists for the given projectId and eventType
    if (!eventType) {
      return res.status(200).json({
        success: false,
        message: "Please select eventType",
      });
    }
    const existingSetting = await NotificationSetting.findOne({
      companyId,
      projectId,
      eventType,
      isDeleted: false,
    });

    if (existingSetting) {
      return res.status(200).json({
        success: false,
        message:
          "Notification setting for this project and event already exists",
      });
    }

    if (eventType === "TASK_REMINDER_DUE" && !projectId) {
      return res.status(200).json({
        success: false,
        message: "Skipping creation, no valid projectId provided",
      });
    }

    const settingData = {
      companyId,
      projectId,
      taskStageId,
      eventType,
      notifyRoles,
      notifyUserIds,
      channel,
      mandatory,
      active,
      createdBy: userId,
    };

    if (eventType === "TASK_REMINDER_DUE") {
      settingData.type = type || "fixed";

      if (settingData.type === "fixed") {
        settingData.reminderTime = reminderTime || null;
        settingData.intervalStart = null;
        settingData.intervalEnd = null;
        settingData.intervalMinutes = null;
      } else if (settingData.type === "interval") {
        settingData.intervalStart = intervalStart || null;
        settingData.intervalEnd = intervalEnd || null;
        settingData.intervalMinutes = Number(intervalMinutes) || null;
        settingData.reminderTime = null;
      }
    }

    const setting = new NotificationSetting(settingData);
    const savedSetting = await setting.save();

    res.status(201).json({
      success: true,
      message: "Notification setting created successfully",
      data: savedSetting,
    });
  } catch (error) {
    console.error("Error creating notification setting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create notification setting",
      error: error.message,
    });
  }
};

exports.updateNotificationSetting = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Updating notification setting for ID:", id);

    const {
      companyId,
      projectId,
      taskStageId,
      eventType,
      notifyRoles,
      notifyUserIds,
      channel,
      mandatory,
      active,
      userId,
      type,
      reminderTime,
      intervalStart,
      intervalEnd,
      intervalMinutes,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification setting ID is required",
      });
    }

    if (eventType === "TASK_REMINDER_DUE" && !projectId) {
      return res.status(200).json({
        success: false,
        message: "Skipping update, no valid projectId provided",
      });
    }

    // Get current setting before update
    const currentSetting = await NotificationSetting.findById(id);
    if (!currentSetting) {
      return res.status(404).json({
        success: false,
        message: "Notification setting not found",
      });
    }

    const updateData = {
      companyId,
      projectId,
      taskStageId,
      eventType,
      notifyRoles,
      notifyUserIds,
      channel,
      mandatory,
      active,
      modifiedBy: userId,
      modifiedOn: new Date(),
    };

    // Detect changes
    let typeChanged = false;
    let timingChanged = false;

    if (eventType === "TASK_REMINDER_DUE") {
      updateData.type = type || "fixed";

      typeChanged = currentSetting.type !== updateData.type;

      if (updateData.type === "fixed") {
        updateData.reminderTime = reminderTime || null;
        updateData.intervalStart = null;
        updateData.intervalEnd = null;
        updateData.intervalMinutes = null;
        
        timingChanged = currentSetting.reminderTime !== updateData.reminderTime;
      } else if (updateData.type === "interval") {
        updateData.intervalStart = intervalStart || null;
        updateData.intervalEnd = intervalEnd || null;
        updateData.intervalMinutes = Number(intervalMinutes) || null;
        updateData.reminderTime = null;

        timingChanged = 
          currentSetting.intervalStart !== updateData.intervalStart ||
          currentSetting.intervalEnd !== updateData.intervalEnd ||
          currentSetting.intervalMinutes !== updateData.intervalMinutes;
      }
    }

    const updatedSetting = await NotificationSetting.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedSetting) {
      return res.status(404).json({
        success: false,
        message: "Notification setting not found",
      });
    }

    // 🔹 HANDLE NOTIFICATION UPDATES FOR TASK_REMINDER_DUE
    if (eventType === "TASK_REMINDER_DUE" && (typeChanged || timingChanged)) {
      console.log("Processing notification updates for setting change...");
      
      // Update scheduler jobs
      await updateReminderJobs();
      
      // Update existing notifications based on scenario
      await handleNotificationUpdates(currentSetting, updatedSetting);
    }

    res.status(200).json({
      success: true,
      message: "Notification setting updated successfully",
      data: updatedSetting,
    });
  } catch (error) {
    console.error("Error updating notification setting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notification setting",
      error: error.message,
    });
  }
};

// exports.updateNotificationSetting = async (req, res) => {
//   // console.log("is this coming here ???", req.body);
//   try {
//     const { id } = req.params;
//     console.log("what id is coming here ???", id);
//     const {
//       companyId,
//       projectId,
//       taskStageId,
//       eventType,
//       notifyRoles,
//       notifyUserIds,
//       channel,
//       mandatory,
//       active,

//     } = req.body;

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: "Notification setting ID is required",
//       });
//     }

//     // const existingSetting = await NotificationSetting.findOne({
//     //   projectId,
//     //   isDeleted: false,
//     // });

//     // if (existingSetting) {
//     //   return res.status(200).json({
//     //     success: false,
//     //     message:
//     //       "Notification setting for this project and event already exists",
//     //   });
//     // }

//     const updatedSetting = await NotificationSetting.findByIdAndUpdate(
//       id,
//       {
//         companyId,
//         projectId,
//         taskStageId,
//         eventType,
//         notifyRoles,
//         notifyUserIds,
//         channel,
//         mandatory,
//         active,
//         modifiedBy: req.body.userId,
//         modifiedOn: new Date(),
//       },
//       { new: true }
//     );

//     if (!updatedSetting) {
//       return res.status(404).json({
//         success: false,
//         message: "Notification setting not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Notification setting updated successfully",
//       data: updatedSetting,
//     });
//   } catch (error) {
//     console.error("Error updating notification setting:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update notification setting",
//       error: error.message,
//     });
//   }
// };

exports.toggleNotificationActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "`active` must be a boolean value",
      });
    }

    const updatedSetting = await NotificationSetting.findByIdAndUpdate(
      id,
      {
        active,
        modifiedBy: req.body.userId,
        modifiedOn: new Date(),
      },
      { new: true }
    );

    if (updatedSetting?._id) {
      await UserNotification.updateMany(
        { notificationSettingId: updatedSetting._id },
        {
          $set: {
            active: updatedSetting.active,           // true or false
            isDeleted: !updatedSetting.active        // opposite of active
          }
        }
      );
    }

    if (!updatedSetting) {
      return res.status(404).json({
        success: false,
        message: "Notification setting not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Notification setting ${
        active ? "activated" : "deactivated"
      } successfully`,
      data: updatedSetting,
    });
  } catch (error) {
    console.error("Error toggling active status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle notification setting",
      error: error.message,
    });
  }
};

exports.getNotificationSettings = async (req, res) => {
  try {
    const { companyId, userId } = req.body;
    const query = req.query.query || DEFAULT_QUERY;
    const page = parseInt(req.query.page) || DEFAULT_PAGE;
    // const page = req.query.page ? req.query.page : 0;
    const limit = DEFAULT_LIMIT;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const filter = {
      companyId,
      isDeleted: false,
      // notifyUserIds: { $in: [userId] },
    };
    if (query) {
      filter.projectId = query;
    }

    const settings = await NotificationSetting.find(filter)
      .populate({
        path: "projectId",
        select: "title",
        model: "project",
      })
      .populate({
        path: "taskStageId",
        select: "displayName",
        model: "taskStage",
      })
      .populate({
        path: "notifyRoles",
        select: "name",
        model: "role",
      })
      .populate({
        path: "notifyUserIds",
        select: "name email",
      })
      .skip(page * limit)
      .limit(limit)

    const totalDocuments = await NotificationSetting.countDocuments(filter);
    const totalPages = Math.ceil(totalDocuments / limit);
    res.status(200).json({
      success: true,
      message: "Notification settings fetched successfully",
      data: settings,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notification settings",
      error: error.message,
    });
  }
};

exports.deleteNotificationSetting = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification setting ID is required",
      });
    }

    const deletedSetting = await NotificationSetting.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!deletedSetting) {
      return res.status(404).json({
        success: false,
        message: "Notification setting not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification setting deleted successfully",
      data: deletedSetting,
    });
  } catch (error) {
    console.error("Error deleting notification setting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification setting",
      error: error.message,
    });
  }
};

exports.addPreferences = async (req, res) => {
  try {
    const { userId, email, inApp, muteEvents } = req.body;

    if (!userId || !email || !inApp || !muteEvents) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    await UserNotificationModel.create({
      userId,
      email,
      inApp,
      muteEvents,
      createdBy: userId,
      modifiedBy: userId,
    });

    return res
      .status(200)
      .json({ success: true, message: "Preferences Saved successfully" });
  } catch (error) {
    console.error("Error adding preferences:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    const preferences = await UserNotificationModel.find({ userId });

    if (!preferences || preferences.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No preferences found for this user.",
      });
    }

    res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updatePreferences = async (req, res) => {
  const { preferencesId } = req.params;
  const { userId, email, inApp, muteEvents } = req.body;

  try {
    // Optional: verify document exists
    const existing = await UserNotificationModel.findOne({
      _id: preferencesId,
      userId,
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Preferences not found" });
    }

    // Update the document
    await UserNotification.updateOne(
      { _id: preferencesId, userId },
      {
        $set: {
          email,
          inApp,
          muteEvents,
        },
      }
    );

    return res
      .status(200)
      .json({ success: true, message: "Preferences Saved successfully" });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Handle notification updates for all scenarios
async function handleNotificationUpdates(oldSetting, newSetting) {
  try {
    // Get today's notifications for this setting
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const notifications = await UserNotification.find({
      notificationSettingId: oldSetting._id,
      eventType: "TASK_REMINDER_DUE",
      isDeleted: false,
      createdOn: { $gte: todayStart, $lte: todayEnd }
    });

    console.log(`Found ${notifications.length} notifications to process`);

    // Scenario 1: Fixed Time Change (11:00 AM → 2:30 PM)
    if (oldSetting.type === 'fixed' && newSetting.type === 'fixed' && oldSetting.reminderTime !== newSetting.reminderTime) {
      await handleFixedTimeChange(notifications, oldSetting, newSetting);
    }
    // Scenario 2: Interval to Fixed Change
    else if (oldSetting.type === 'interval' && newSetting.type === 'fixed') {
      await handleIntervalToFixedChange(notifications, oldSetting, newSetting);
    }
    // Scenario 3: Fixed to Interval Change
    else if (oldSetting.type === 'fixed' && newSetting.type === 'interval') {
      await handleFixedToIntervalChange(notifications, oldSetting, newSetting);
    }
    // Scenario 4: Interval Timing Change
    else if (oldSetting.type === 'interval' && newSetting.type === 'interval') {
      await handleIntervalTimingChange(notifications, oldSetting, newSetting);
    }

  } catch (error) {
    console.error("Error handling notification updates:", error);
  }
}

// Scenario 1: Fixed Time Change
async function handleFixedTimeChange(notifications, oldSetting, newSetting) {
  console.log("Handling fixed time change scenario");
  
  const [oldHour, oldMinute] = oldSetting.reminderTime.split(':').map(Number);

  let updatedCount = 0;

  for (const notification of notifications) {
    const notificationTime = new Date(notification.createdOn);
    const notificationHour = notificationTime.getHours(); // or getUTCHours()
    const notificationMinute = notificationTime.getMinutes(); // or getUTCMinutes()

    // Check if this notification was for the old fixed time
    if (notificationHour === oldHour && notificationMinute === oldMinute) {
      // Either delete or update
      await UserNotification.deleteOne({ _id: notification._id }); // ✅ correct usage
      updatedCount++;
    }
  }

  console.log(`Deleted ${updatedCount} notifications from ${oldSetting.reminderTime} to ${newSetting.reminderTime}`);
}


// Scenario 2: Interval to Fixed Change
async function handleIntervalToFixedChange(notifications) {
  
  // Mark all interval notifications as deleted
  const result = await UserNotification.deleteMany({
    _id: { $in: notifications.map(n => n._id) },
    reminderType: "interval",
  });
  

  console.log(`Deleted ${result.modifiedCount} interval notifications after switching to fixed time`);
}

// Scenario 3: Fixed to Interval Change
async function handleFixedToIntervalChange(notifications) {
  console.log("Handling fixed to interval change scenario");
  
  // Mark all fixed notifications as deleted
  const result = await UserNotification.deleteMany(
    {
      _id: { $in: notifications.map(n => n._id) },
      reminderType: 'fixed'
    }
  );

  console.log(`Deleted ${result.modifiedCount} fixed notifications after switching to interval time`);
}

// Scenario 4: Interval Timing Change
async function handleIntervalTimingChange(notifications, oldSetting, newSetting) {
  console.log("Handling interval timing change scenario");
  
  const [newStartHour, newStartMinute] = newSetting.intervalStart.split(':').map(Number);
  const [newEndHour, newEndMinute] = newSetting.intervalEnd.split(':').map(Number);
  let deletedCount = 0;

  for (const notification of notifications) {
    const newTime = recalculateIntervalTime(notification.createdOn, oldSetting, newSetting);
    
    if (newTime && isTimeInRange(newTime, newStartHour, newStartMinute, newEndHour, newEndMinute)) {
      // Delete notification if outside new range
      await UserNotification.deleteOne(notification._id);
      deletedCount++;
    }
  }

  console.log(`Updated interval notifications, deleted ${deletedCount}`);
}

// Utility functions
function recalculateIntervalTime(originalTime, oldSetting, newSetting) {
  const originalDate = new Date(originalTime);
  
  const [oldStartHour, oldStartMinute] = oldSetting.intervalStart.split(':').map(Number);
  const [newStartHour, newStartMinute] = newSetting.intervalStart.split(':').map(Number);
  
  // Calculate position in old interval
  const oldStartTime = new Date(originalDate);
  oldStartTime.setHours(oldStartHour, oldStartMinute, 0, 0);
  
  const minutesFromOldStart = (originalDate - oldStartTime) / (60 * 1000);
  const intervalIndex = Math.round(minutesFromOldStart / oldSetting.intervalMinutes);
  
  // Calculate equivalent in new interval
  const newStartTime = new Date(originalDate);
  newStartTime.setHours(newStartHour, newStartMinute, 0, 0);
  
  const newTime = new Date(newStartTime.getTime() + intervalIndex * newSetting.intervalMinutes * 60 * 1000);
  
  return newTime;
}

function isTimeInRange(time, startHour, startMinute, endHour, endMinute) {
  const checkTime = new Date(time);
  const startTime = new Date(checkTime);
  startTime.setHours(startHour, startMinute, 0, 0);
  
  const endTime = new Date(checkTime);
  endTime.setHours(endHour, endMinute, 0, 0);
  
  return checkTime >= startTime && checkTime <= endTime;
}