
const mongoose = require("mongoose");

const NotificationSettingSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
    required: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project",
    required: true,
  },
  taskStageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "taskStage",
    required: false, 
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
  notifyRoles: [String], 
  notifyUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  channel: {
    type: [String],
    enum: ["email", "inapp","sms"],
    default: ["inapp"],
  },
  mandatory: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  createdOn: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
}, { versionKey: false });

module.exports = mongoose.model("notificationSetting", NotificationSettingSchema);