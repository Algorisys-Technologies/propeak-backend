const mongoose = require('mongoose');

// Define the database model for project types
const ProjectTypeSchema = new mongoose.Schema({
  projectType: {
    type: String, 
    required: true 
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String, 
    required: true
  },
  createdOn: {
    type: String, 
    required: true
  },
  modifiedBy: {
    type: String 
  },
  modifiedOn: {
    type: String 
  }
}, { versionKey: false });

const ProjectType = module.exports = mongoose.model('projectType', ProjectTypeSchema);
