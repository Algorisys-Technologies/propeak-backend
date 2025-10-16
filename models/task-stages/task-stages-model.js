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
    bgColor: {
      type: String,
    },
    textColor: {
      type: String,
    }
  },
  { versionKey: false }
);
TaskStageSchema.index({ companyId: 1 });

const TaskStage = mongoose.model('taskStage', TaskStageSchema); 
module.exports = TaskStage;
