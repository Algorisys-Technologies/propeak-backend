const mongoose = require('mongoose');

// Define the database model
const AuditLogsSchema = new mongoose.Schema({
  name: {
    type: String
  },
  projectId: {
    type: String
  },
  tableName: {
    type: String
  },
  fieldName: {
    type: String
  },
  oldValue: {
    type: String
  },
  newValue: {
    type: String
  },
  updatedBy: {
    type: String
  },
  updatedOn: {
    type: String
  }
}, { versionKey: false });


const AuditLogs = module.exports = mongoose.model('auditlogs', AuditLogsSchema);
