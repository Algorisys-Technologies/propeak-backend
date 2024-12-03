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
  },
  {
    versionKey: false,
    collection: "notification",
  }
);

// Export the model
const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
