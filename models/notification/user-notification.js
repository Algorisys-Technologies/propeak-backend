const mongoose = require("mongoose");

const UserNotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  message: {
    type: String,
  },
  url: {
    type: String,
  },
  read: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    enum: ["task", "project", "message", "comment", "system", "email", "reminder"],
    default: "task",
  },
  eventType: {
    type: String,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project",
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "task",
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  modifiedOn: {
    type: Date,
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
}, { versionKey: false });

module.exports = mongoose.model("usernotification", UserNotificationSchema);
