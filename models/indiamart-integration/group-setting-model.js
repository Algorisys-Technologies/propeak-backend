const mongoose = require("mongoose");

const groupSettingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupMaster",
      required: true,
    },
    projectStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectStage",
      required: true,
    },
    taskStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskStage",
      required: true,
    },
    projectTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "projecttype",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    projectOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    notifyUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "notifyuser",
      required: true,
    },
    integrationProvider: {
      type: String,
      // required: true
    },
    authKey: {
      type: String,
      // required:true,
    },
    keyName: {
      type: String,
    },
    method: {
      type: String,
      // required
    },
    enabled: { type: Boolean, default: false },
    fetchNow: { type: Boolean, default: false },

    fetchFrequetly: { type: Boolean, default: false },
    startDate: {
      type: Date,
      // required: true
    },
    endDate: {
      type: Date,
      // required: true
    },
    lastFetched: {
      type: Date,
      // required: true
    },
    createdOn: { type: Date, default: new Date() },
    modifiedOn: { type: Date, default: new Date() },
    createdBy: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GroupSetting", groupSettingSchema);
