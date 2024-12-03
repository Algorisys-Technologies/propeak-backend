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
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company', // Make sure to define the Company model
    required: true // Ensure that each stage is associated with a company
  }
}, { versionKey: false });

const ProjectStage = module.exports = mongoose.model('projectStage', ProjectStageSchema);
