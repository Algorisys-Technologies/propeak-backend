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

// Define the schema for each item in the project configuration
const ProjectFieldConfigSchema = new mongoose.Schema({
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
});

const CompanyProjectConfigSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
    required: true,
  },
  level:{
    type: String,
    enum: ["global", "project"]
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project",
  },
  config: [ProjectFieldConfigSchema],
});

module.exports = {
  CompanyProjectConfig: mongoose.model(
    "CompanyProjectConfig",
    CompanyProjectConfigSchema
  ),
  ProjectFieldConfigSchema,
};
