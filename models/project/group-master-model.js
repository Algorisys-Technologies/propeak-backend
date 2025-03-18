const mongoose = require("mongoose");

const GroupMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    createdOn: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    updatedOn: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    showInMenu: {
      type: Boolean,
      default: true,
    },
  },
  { versionKey: false }
);

const GroupMaster = mongoose.model("groupMaster", GroupMasterSchema);
module.exports = GroupMaster;
