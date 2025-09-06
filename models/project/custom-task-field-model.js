const mongoose = require("mongoose");

const CustomTaskFieldSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    // unique: true // Ensures unique field keys
  },
  // projectId :{
  //   type: String
  // },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "groupMaster",
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project",
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    // required: true,
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["text", "number", "boolean", "date", "multilineText"],
  },
  level: {
    type: String,
    required: true,
    enum: ["project", "task"],
  },
  isMandatory: {
    type: Boolean,
    required: true,
  },
  isDeleted: {
    type: Boolean,
    required: true,
  },
});

module.exports = {
  CustomTaskField: mongoose.model("custom-task-field", CustomTaskFieldSchema),
  CustomTaskFieldSchema: CustomTaskFieldSchema,
};
