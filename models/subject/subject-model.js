const mongoose = require('mongoose');
const {Discussion,DiscussionSchema} = require('../discussion/discussion-model');

// Define the database model
const SubjectSchema = new mongoose.Schema({
  title : {
    type: String
  },
  projectId: {
    type: String
  },
  edit: {
    type: Boolean
  },
  isDeleted: {
    type: Boolean
  },
  createdOn:{
    type: Date
  },
  createdBy: {
    type: String
  },
  discussion:[DiscussionSchema]
}, { versionKey: false });

const Subject = module.exports = mongoose.model('subject', SubjectSchema);
