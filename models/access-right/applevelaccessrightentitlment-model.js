const mongoose = require('mongoose');

// Define the database model
const AppLevelAccessRightEntitlementSchema = new mongoose.Schema({
  id:{
    type: String
  },

  Group: {
    type: String
  },

  EntitlementId: {
    type: String
  },

  Value: {
    type: Boolean
  }

}, { versionKey: false });


const  AppLevelAccessRightEntitlement = module.exports = mongoose.model('applevelaccessrightsentitlments', AppLevelAccessRightEntitlementSchema);