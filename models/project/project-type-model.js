const mongoose = require("mongoose");

const ProjectTypesSchema = new mongoose.Schema(
  {
    projectType: {
      type: String,
      required: true,
    },
  },
  { versionKey: false }
);

const ProjectType = mongoose.model("projecttype", ProjectTypesSchema);
module.exports = ProjectType;
