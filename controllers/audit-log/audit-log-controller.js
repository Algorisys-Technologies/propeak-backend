const AuditLogs = require('../../models/auditlog/audit-log-model');
const jwt = require('jsonwebtoken');
const secret = require('../../config/secret');
const { logError, logInfo } = require('../../common/logger');

exports.insertAuditLog = async (oldValue, name, tableName, fieldname, value, updatedby, projectId) => {
    try{
      let auditDate = new Date().toUTCString();
      let newAuditLogs = {
        name: name,
        projectId: projectId,
        tableName: tableName,
        fieldName: fieldname,
        oldValue: oldValue,
        newValue: value,
        updatedBy: updatedby,
        updatedOn: auditDate
      };
      logInfo("insertAuditLog newAuditLogs",newAuditLogs);
      let c = new AuditLogs(newAuditLogs);
      await c.save()
      
    }
    catch(e) {
      logError("insertAuditLog e",e);
    } 
  }