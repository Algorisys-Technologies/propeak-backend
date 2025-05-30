const mongoose = require("mongoose");

const UserNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    subject: {
      type: String,
      // required: true,
    },
    message: String,
    url: String,
    read: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: [
        "task",
        "project",
        "status",
        "project-status",
        "assign",
        "archive",
        "field",
        "reminder",
      ],
      default: "task",
    },
    eventType: String,
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project",
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "task",
    },
    email: {
      type: Boolean,
    },
    inApp: {
      type: Boolean,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      // required: true,
    },
    muteEvents: [],
    notifyRoleNames: {
      type: [String], // ✅ Added this line to hold role names like ['ADMIN', 'SUPPORT']
      default: [],
    },
    createdOn: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    modifiedOn: Date,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model("UserNotification", UserNotificationSchema);
