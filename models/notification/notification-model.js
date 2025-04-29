
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the database model for notifications
const NotificationSchema = new Schema(
  {
    notification: {
      type: String,
      required: true,
    },
    shownotifications: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    toDate: {
      type: String,
    },
    fromDate: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    hidenotifications: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      // required: true,
    },
    channel: {
      type: [String],
      enum: ["email", "inApp","sms"],
      default: ["inApp"],
    },
    eventType: {
      type: String,
      enum: [
        "TASK_CREATED",
        "TASK_ASSIGNED",
        "STAGE_CHANGED",
        "TASK_COMPLETED",
        "TASK_REJECTED",
        "TASK_COMMENTED",
        "PROJECT_ARCHIVED",
        "CUSTOM_FIELD_UPDATE",
        "EMAIL_RECEIVED"
      ],
      required: true,
    },
  },
  {
    versionKey: false,
    collection: "notification",
  }
);

// Export the model
const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
