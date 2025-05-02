const mongoose = require("mongoose");
const { logError, logInfo } = require("../../common/logger");
const NotificationSetting = require("../../models/notification-setting/notification-setting-model");
const UserNotificationModel = require("../../models/notification-setting/user-notification-model");
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

exports.createNotificationSetting = async (req, res) => {
  console.log("is this coming here ");
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
    } = req.body;

    const setting = new NotificationSetting({
      companyId,
      projectId,
      taskStageId,
      eventType,
      notifyRoles,
      notifyUserIds,
      channel,
      mandatory,
      active,
      createdBy: req.body.userId,
    });
    console.log("what is the coming here ", setting);
    const savedSetting = await setting.save();
    console.log(savedSetting, "savedSetting???");
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

exports.getNotificationSettings = async (req, res) => {
  try {
    console.log("is this notification ??");
    const { companyId } = req.body;
    console.log(companyId, "is this coming ");
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const settings = await NotificationSetting.find({
      companyId,
      isDeleted: { $ne: true },
    })
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
      })
      .populate({
        path: "notifyUserIds",
        select: "name email",  
      });

    res.status(200).json({
      success: true,
      message: "Notification settings fetched successfully",
      data: settings,
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


exports.addPreferences = async (req, res) => {
  const { userId, email, inApp, muteEvents } = req.body;

  const userNotification = await UserNotificationModel.create({
    userId,
    email,
    inApp,
    muteEvents,
    createdBy: userId,
    modifiedBy: userId,
  });
  console.log(userNotification, "ffrom user");
};

exports.getPreferences = async (req, res) => {
  const { userId } = req.params;

  const preferences = await UserNotificationModel.find({
    userId,
  });

  res.status(201).json({
    success: true,
    message: "Notification preferences added successfully.",
    data: preferences,
  });
};
