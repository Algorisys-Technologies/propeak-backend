const mongoose = require('mongoose');

// Define the database model
const DefaultAppLevelAccessRightSchema = new mongoose.Schema({
  userRole:{
    type: String
  },

  entitlement: {
    type: String
  },

  group: {
    type: String
  },


},{ versionKey: false });


const  DefaultAppLevelAccessRight = module.exports = mongoose.model('defaultapplevelaccessrights', DefaultAppLevelAccessRightSchema);