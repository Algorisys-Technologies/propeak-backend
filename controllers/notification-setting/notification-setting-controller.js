const mongoose = require("mongoose");
const { logError, logInfo } = require("../../common/logger");
const NotificationSettingSchema = require("../../models/notification-setting/notification-setting-model");
const UserNotificationModel = require("../../models/notification-setting/user-notification-model");

const errors = {
  ADDNOTIFICATIONERROR: "Error occurred while adding the notification",
  EDITNOTIFICATIONERROR: "Error occurred while updating the notification",
  DELETENOTIFICATIONERROR: "Error occurred while deleting the notification",
  ADDHIDENOTIFICATIONERROR: "Error occurred while adding the hide notification",
  NOT_AUTHORIZED: "You're not authorized",
};

// Create Notification Setting
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
    } = req.body;

    // Validate required fields
    if (!companyId || !projectId || !taskStageId || !eventType || !channel) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Create the notification setting
    const setting = new NotificationSettingSchema({
      companyId,
      projectId,
      taskStageId,
      eventType,
      notifyRoles,
      notifyUserIds,
      channel,
      mandatory: Boolean(mandatory),  
      createdBy: req.userInfo._id,
    });

    // Save to the database
    await setting.save();

    // Log success
    logInfo(`Notification setting created successfully for company ${companyId} and project ${projectId}`);

    res.status(201).json({ success: true, setting });
  } catch (error) {
    // Log error
    logError(error);

    res.status(500).json({
      success: false,
      message: errors.ADDNOTIFICATIONERROR,
      error: error.message || error,
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
    console.log(userNotification, "ffrom user")
};

exports.getPreferences = async (req, res) => {
  const { userId } = req.params;

    const preferences = await UserNotificationModel.find({
      userId
    });
    
    res.status(201).json({
      success: true,
      message: "Notification preferences added successfully.",
      data: preferences,
    });
};