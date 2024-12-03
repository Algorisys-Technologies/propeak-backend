const mongoose = require('mongoose');


// Define the database model
const SchedulerTokenSchema = new mongoose.Schema({
  ip: {
    type: String
  },
  token: {
    type: String
  },
  active: {
    type: Boolean
  }
}, {
  collection: 'schedulertokens'
}, {
  versionKey: false
});

const SchedulerToken = module.exports = mongoose.model('schedulerToken', SchedulerTokenSchema);