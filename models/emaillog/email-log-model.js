const mongoose = require('mongoose');

// Define the database model
const EmailLogsSchema = new mongoose.Schema({
  to: {
    type: String
  },
  cc: {
    type: String
  },
  subject: {
    type: String
  },
  bodyText: {
    type: String
  },
  createdBy: {
    type: String
  },
  createdOn: {
    type: Date
  }
}, { versionKey: false });


const EmailLogs = module.exports = mongoose.model('emaillog', EmailLogsSchema);
