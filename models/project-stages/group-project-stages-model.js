const mongoose = require("mongoose");

// Define the database model for project stages
const GroupProjectStageSchema = new mongoose.Schema(
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
      required: true,
    },
  },
  { versionKey: false }
);

const GroupProjectStage = (module.exports = mongoose.model(
  "groupProjectStage",
  GroupProjectStageSchema
));
