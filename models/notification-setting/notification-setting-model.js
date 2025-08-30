const mongoose = require("mongoose");

const NotificationSettingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      // required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      // required: true,
      index: true,
    },
    taskStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskStage",
      index: true,
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
        "CUSTOM_FIELD_CREATED",
        "EMAIL_RECEIVED",
        "PROJECT_CREATED",
        "PROJECT_STAGE_CHANGED",
        "EXPORT_READY",
        "TASK_REMINDER_DUE",
      ],
      // required: true,
    },
    notifyRoles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "role",
      },
    ],

    notifyUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    channel: {
      type: [String],
      enum: ["email", "inapp"],
      default: ["inapp"],
    },
    mandatory: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      enum: ["fixed", "interval"],
      default: "fixed",
    },
    reminderTime: { type: String },
    intervalStart: { type: String },
    intervalEnd: { type: String },
    intervalMinutes: { type: Number },
    pausedUntil: {
      type: Date, // if set, reminders are skipped until this datetime
      default: null,
    },
    createdOn: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { versionKey: false }
);

// Compound indexes for common queries
NotificationSettingSchema.index({ companyId: 1, eventType: 1, isDeleted: 1 });
NotificationSettingSchema.index({ projectId: 1, eventType: 1, isDeleted: 1 });
NotificationSettingSchema.index({
  companyId: 1,
  projectId: 1,
  taskStageId: 1,
  isDeleted: 1,
});

module.exports = mongoose.model(
  "NotificationSetting",
  NotificationSettingSchema
);
