const EmailLogs = require('../../models/emaillog/email-log-model');
const jwt = require('jsonwebtoken');
const secret = require('../../config/secret');
const { logError, logInfo } = require('../../common/logger');

exports.insertEmailLog = (userEmail,ownerEmail,subject,data) => {
  try {
    let EmailDate = new Date();
    let newEmailLogs = {
      to: userEmail,
      cc: ownerEmail,
      subject: subject,
      bodyText: data,
      createdBy: "scheduler",
      createdOn: EmailDate
    };
    logInfo(newEmailLogs,"insertEmailLog newEmailLogs");
  
    let c = new EmailLogs(newEmailLogs);

    c.save(function (err) {
      if (err) {
          logError(err,"insertEmailLog err");
      }
      
    });
  }
  catch(e) {
    logError(err,"insertEmailLog catch err");
  } 
}