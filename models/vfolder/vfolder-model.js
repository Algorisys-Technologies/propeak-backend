const mongoose = require("mongoose");

// Define the database model
const VFolderSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
  },
  name: {
    type: String,
    unique: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    default: null,
  },
  projectOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    default: null,
  },
  notifyUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    default: null,
  },
  projectTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "projectType",
    default: null,
  },
  projectStageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "projectStage",
    default: null,
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "groupMaster",
    default: null,
  },
  isDeleted: {
    type: Boolean,
    required: true,
  },
  created_on: {
    type: Date,
  },
  modified_on: {
    type: Date,
  },
});

const VFolder = (module.exports = mongoose.model("vfolder", VFolderSchema));
