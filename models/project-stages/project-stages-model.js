const mongoose = require("mongoose");

// Define the database model for project stages
const ProjectStageSchema = new mongoose.Schema(
  {
    sequence: {
      type: Number,
    },
    title: {
      type: String,
    },
    displayName: {
      type: String,
    },
    show: {
      type: Boolean,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupMaster",
    },
  },
  { versionKey: false }
);

ProjectStageSchema.index({ companyId: 1, isDeleted: 1 });
ProjectStageSchema.index({ companyId: 1, groupId: 1 });
ProjectStageSchema.index({ companyId: 1, sequence: 1 });

const ProjectStage = (module.exports = mongoose.model(
  "projectStage",
  ProjectStageSchema
));
