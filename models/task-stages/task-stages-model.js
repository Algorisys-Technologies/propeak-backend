const mongoose = require('mongoose');

// Define the database model for task stages
const TaskStageSchema = new mongoose.Schema(
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
    level: {
      type: String,
    },
    show: {
      type: Boolean,
      default: true, 
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company', 
      required: true, 
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project', // make sure your model name is correct
      default: null,
    },
  },
  { versionKey: false }
);
TaskStageSchema.index({ companyId: 1 });

const TaskStage = mongoose.model('taskStage', TaskStageSchema); 
module.exports = TaskStage;
