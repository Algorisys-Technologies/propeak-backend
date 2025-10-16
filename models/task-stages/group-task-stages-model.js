const mongoose = require("mongoose");

// Define the database model for task stages
const GroupTaskStageSchema = new mongoose.Schema(
  {
    sequence: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    show: {
      type: Boolean,
      default: true,
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
    bgColor: {
      type: String,
    },
    textColor: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { versionKey: false }
);
GroupTaskStageSchema.index({ companyId: 1 });

const GroupTaskStage = mongoose.model("groupTaskStage", GroupTaskStageSchema);
module.exports = GroupTaskStage;
