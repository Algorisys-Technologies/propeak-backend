const mongoose = require("mongoose");

const NotificationSettingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      // required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      // required: true,
    },
    taskStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskStage",
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
        "EMAIL_RECEIVED",
        "PROJECT_CREATED",
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

module.exports = mongoose.model(
  "NotificationSetting",
  NotificationSettingSchema
);
