const mongoose = require("mongoose");

// Define the schema for options if the component type is dropdown
const OptionsSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
});

// Define the schema for each item in the config array
const ConfigItemSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    required: true,
  },
  dataType: {
    type: String,
    enum: ["string", "boolean", "number", "date", "component"],
    required: true,
  },
  componentType: {
    type: String,
    enum: ["dropdown", "text", "checkbox", "date", "component"],
    default: null,
  },
  options: {
    type: [OptionsSchema],
    default: [],
    required: function () {
      return this.componentType === "dropdown";
    },
  },
  isSystem: {
    type: Boolean,
    required: true,
  },
  isRequired: {
    type: Boolean,
    required: true,
  },
  defaultValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  uiOrder: {
    type: Number,
    required: true,
  },
  excelOrder: {
    type: Number,
    required: true,
  },
});

// Define the main schema for ProjectConfig
const ProjectConfigSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project",
  },
  level: {
    type: String
  },
  companyId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
  },
  config: [ConfigItemSchema],

});

module.exports = {
  ProjectConfig: mongoose.model("project-config", ProjectConfigSchema),
  ProjectConfigSchema: ProjectConfigSchema,
};
