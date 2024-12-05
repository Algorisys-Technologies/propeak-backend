const mongoose = require('mongoose');

// Define the database model for project stages
const ProjectStageSchema = new mongoose.Schema({

  sequence: {
    type: Number
  },
  title: {
    type: String
  },
  displayName: {
    type: String
  },
  show: {
    type: Boolean
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true 
  }
}, { versionKey: false });

const ProjectStage = module.exports = mongoose.model('projectStage', ProjectStageSchema);
