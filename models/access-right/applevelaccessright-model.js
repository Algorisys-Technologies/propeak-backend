const mongoose = require('mongoose');

// Define the database model
const AppLevelAccessRightSchema = new mongoose.Schema({
  userId:{
    type: String
  },

  entitlementId: {
    type: String
  },
  group: {
    type: String
  },
  access: {
    type: Boolean
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

const AppLevelAccessRight = module.exports = mongoose.model('applevelaccessrights', AppLevelAccessRightSchema);