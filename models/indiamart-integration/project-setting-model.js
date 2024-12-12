const mongoose = require("mongoose");

const projectSettingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    taskStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskStage",
      required: true,
    },
    integrationProvider: {
      type: String,
      // required: true
    },
    authKey:{
      type:String,
      // required:true,
    },
    keyName:{
      type:String,
    },
    enabled: { type: Boolean, default: true },
    fetchFrequetly:{type:Boolean,default:false},
    startDate: {
      type: Date,
      // required: true
    },
    endDate: {
      type: Date,
      // required: true
    },
    lastFetch: {
      type: Date,
      // required: true
    },
    createdOn: { type: String, default: new Date().toISOString() },
    modifiedOn: { type: String, default: new Date().toISOString() },
    createdBy: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default:false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ProjectSetting", projectSettingSchema);
