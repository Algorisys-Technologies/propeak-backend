const mongoose = require("mongoose");

const NotificationLogSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "task",
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  channel: {
    type: String,
    enum: ["email", "inapp"],
  },
  message: String,
  status: {
    type: String,
    enum: ["SENT", "FAILED", "SKIPPED"],
    default: "SENT",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { versionKey: false });

module.exports = mongoose.model("NotificationLog", NotificationLogSchema);
