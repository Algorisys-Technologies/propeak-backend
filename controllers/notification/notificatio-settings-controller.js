const Notification = require("../../models/notification/notification-model");
const mongoose = require("mongoose");
const User = require("../../models/user/user-model");

const eventTypes = [
  "TASK_CREATED",
  "TASK_ASSIGNED",
  "STAGE_CHANGED",
  "TASK_COMPLETED",
  "TASK_REJECTED",
  "TASK_COMMENTED",
  "PROJECT_ARCHIVED",
  "CUSTOM_FIELD_UPDATE",
  "EMAIL_RECEIVED"
];
const eventEmailTemplates = {
  "TASK_CREATED": {
    subject: "New Task Created in ProPeak",
    body: (userName, fromDate, toDate) => `
      <p>Dear ${userName || "Valued User"},</p>
      <p>A new task has been created in ProPeak:</p>
      <p><strong>Effective From:</strong> ${fromDate}</p>
      <p><strong>Effective To:</strong> ${toDate}</p>
      <p>If you have any questions, please reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `
  },
  "TASK_ASSIGNED": {
    subject: "Task Assigned to You",
    body: (userName, taskDetails) => `
      <p>Dear ${userName || "Valued User"},</p>
      <p>You have been assigned a new task in ProPeak:</p>
      <p><strong>Task Details:</strong> ${taskDetails}</p>
      <p>If you have any questions, please reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `
  },
  "STAGE_CHANGED": {
    subject: "Task Stage Changed in ProPeak",
    body: (userName, taskDetails, newStage) => `
      <p>Dear ${userName || "Valued User"},</p>
      <p>The stage of your task in ProPeak has been updated:</p>
      <p><strong>Task Details:</strong> ${taskDetails}</p>
      <p><strong>New Stage:</strong> ${newStage}</p>
      <p>If you have any questions, please reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `
  },
  "TASK_COMPLETED": {
    subject: "Task Completed in ProPeak",
    body: (userName, taskDetails) => `
      <p>Dear ${userName || "Valued User"},</p>
      <p>Your task in ProPeak has been marked as completed:</p>
      <p><strong>Task Details:</strong> ${taskDetails}</p>
      <p>If you have any questions, please reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `
  },
  "TASK_REJECTED": {
    subject: "Task Rejected in ProPeak",
    body: (userName, taskDetails, rejectionReason) => `
      <p>Dear ${userName || "Valued User"},</p>
      <p>Your task in ProPeak has been rejected:</p>
      <p><strong>Task Details:</strong> ${taskDetails}</p>
      <p><strong>Rejection Reason:</strong> ${rejectionReason}</p>
      <p>If you have any questions, please reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `
  },
  "TASK_COMMENTED": {
    subject: "New Comment on Your Task in ProPeak",
    body: (userName, commentDetails) => `
      <p>Dear ${userName || "Valued User"},</p>
      <p>A new comment has been added to your task in ProPeak:</p>
      <p><strong>Comment:</strong> ${commentDetails}</p>
      <p>If you have any questions, please reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `
  },
  "PROJECT_ARCHIVED": {
    subject: "Project Archived in ProPeak",
    body: (userName, projectName) => `
      <p>Dear ${userName || "Valued User"},</p>
      <p>The project "${projectName}" has been archived in ProPeak.</p>
      <p>If you have any questions, please reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `
  },
  "CUSTOM_FIELD_UPDATE": {
    subject: "Custom Field Updated in ProPeak",
    body: (userName, customFieldDetails) => `
      <p>Dear ${userName || "Valued User"},</p>
      <p>A custom field has been updated in ProPeak:</p>
      <p><strong>Details:</strong> ${customFieldDetails}</p>
      <p>If you have any questions, please reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `
  },
  "EMAIL_RECEIVED": {
    subject: "New Email Received in ProPeak",
    body: (userName, emailDetails) => `
      <p>Dear ${userName || "Valued User"},</p>
      <p>You have received a new email in ProPeak:</p>
      <p><strong>Email Details:</strong> ${emailDetails}</p>
      <p>If you have any questions, please reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `
  }
};

module.exports = eventEmailTemplates;
exports.createNotification = async (req, res) => {
  try {
    console.log("Creating notification...");
    
    const {
      companyId,
      notification,
      fromDate,
      toDate,
      isDeleted,
      projectId,
      eventType, // Event type passed
      channel, // Channels selected
    } = req.body;

    // Check if eventType is valid
    if (!eventTypes.includes(eventType)) {
      return res.status(400).json({ error: "Invalid event type." });
    }

    // Check if required fields are provided
    if (!notification || !channel) {
      return res.status(400).json({ error: "Missing notification content or channel." });
    }

    // Get users who need to be notified (example query)
    const users = await User.find({
      companyId: companyId,
      $or: [{ isDeleted: null }, { isDeleted: false }],
    });

    // Email logic
    if (channel.includes("email")) {
      for (let user of users) {
        if (user.email) {
          const mailOptions = {
            from: config.from,
            to: user.email,
            subject: eventEmailTemplates[eventType].subject,
            html: eventEmailTemplates[eventType].body(user.name, fromDate, toDate),
          };

          try {
            await rabbitMQ.sendMessageToQueue(
              mailOptions,
              "message_queue",
              "msgRoute"
            );
            console.log(`Email queued for ${user.email}`);
          } catch (err) {
            console.error(`Error while sending email to ${user.email}: `, err);
          }
        }
      }
    }

    res.json({ success: true, msg: "Notification successfully added and emails queued!" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error." });
  }
};
// // Create a new notification setting
// const createNotificationSetting = async (req, res) => {
//   try {
//     const {
//       companyId,
//       projectId,
//       taskStageId,
//       eventType,
//       notifyRoles = [],
//       notifyUserIds = [],
//       channel = ["inapp"],
//       mandatory = false,
//       active = true,
//     } = req.body;

//     // Check if a setting already exists for this combination
//     const existing = await NotificationSetting.findOne({
//       companyId,
//       projectId,
//       taskStageId: taskStageId || null, // treat undefined as null
//       eventType,
//     });

//     if (existing) {
//       return res.status(400).json({
//         success: false,
//         message: "Notification setting already exists for this configuration.",
//       });
//     }

//     const newNotificationSetting = new NotificationSetting({
//       companyId,
//       projectId,
//       taskStageId: taskStageId || null,
//       eventType,
//       notifyRoles,
//       notifyUserIds,
//       channel,
//       mandatory,
//       active,
//       createdBy: req.user._id,
//     });

//     const saved = await newNotificationSetting.save();

//     return res.status(201).json({
//       success: true,
//       message: "Notification setting created successfully.",
//       data: saved,
//     });
//   } catch (error) {
//     console.error("Create Notification Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to create notification setting.",
//       error: error.message,
//     });
//   }
// };

// Update an existing notification setting by ID
const updateNotificationSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updatedNotificationSetting = await NotificationSetting.findByIdAndUpdate(id, updatedData, { new: true });
    
    if (!updatedNotificationSetting) {
      return res.status(404).json({
        success: false,
        message: "Notification setting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification setting updated successfully.",
      data: updatedNotificationSetting,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification setting.",
      error: error.message,
    });
  }
};

// Get all notification settings for a company
const getNotificationSettings = async (req, res) => {
  try {
    const { companyId } = req.query;

    const notificationSettings = await NotificationSetting.find({ companyId });

    return res.status(200).json({
      success: true,
      data: notificationSettings,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification settings.",
      error: error.message,
    });
  }
};

// Get a notification setting by ID
const getNotificationSettingById = async (req, res) => {
  try {
    const { id } = req.params;

    const notificationSetting = await NotificationSetting.findById(id);

    if (!notificationSetting) {
      return res.status(404).json({
        success: false,
        message: "Notification setting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: notificationSetting,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification setting.",
      error: error.message,
    });
  }
};

// Delete a notification setting by ID
const deleteNotificationSetting = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedNotificationSetting = await NotificationSetting.findByIdAndDelete(id);

    if (!deletedNotificationSetting) {
      return res.status(404).json({
        success: false,
        message: "Notification setting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification setting deleted successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification setting.",
      error: error.message,
    });
  }
};

module.exports = {
  createNotificationSetting,
  updateNotificationSetting,
  getNotificationSettings,
  getNotificationSettingById,
  deleteNotificationSetting,
};
