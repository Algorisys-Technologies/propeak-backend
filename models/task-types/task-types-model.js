const mongoose = require("mongoose");

const TaskTypeSchema = new mongoose.Schema(
  {
    taskType: {
      type: String,
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      required: true,
    },
    createdOn: {
      type: String,
      required: true,
    },
    modifiedBy: {
      type: String,
    },
    modifiedOn: {
      type: String,
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model("TaskType", TaskTypeSchema);
