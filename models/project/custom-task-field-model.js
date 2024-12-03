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
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project",
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["text", "number"], // Allowed field types
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
});

module.exports = {
  CustomTaskField: mongoose.model("custom-task-field", CustomTaskFieldSchema),
  CustomTaskFieldSchema: CustomTaskFieldSchema,
};
