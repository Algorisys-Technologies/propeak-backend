const mongoose = require('mongoose');

// Define the database model
const AccessRightSchema = new mongoose.Schema({
  userId:{
    type: String
  },
  projectId: {
    type: String
  },
  entitlementId: {
    type: String
  },
  group: {
    type: String
  },
  createdBy:{
    type: String
  },
  createdOn:{
    type: Date
  },
  isDeleted: {
    type: Boolean
  }
}, { versionKey: false });

// Use the unique validator plugin
// UserSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

const AccessRight = module.exports = mongoose.model('accessright', AccessRightSchema);