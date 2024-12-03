const jwt = require('jsonwebtoken');
const secret = require('../config/secret');
const SchedulerToken = require('../models/scheduler-token/scheduler-token-model');
const {
  logError,
  logInfo
} = require('../common/logger');
const ipaddress = require('../common/common');

function autoVerifyToken(req, res, next) {
 logInfo( req.headers.token,"autoVerifyToken token")
  var token = req.headers.token;
 let ip= ipaddress.getClientIp(req);
 logInfo(ip,"autoVerifyToken ip")

 if (!token)
 return res.status(403).send({ auth: false, message: 'No token provided.' });
 SchedulerToken.find({
     "token": token,
     "ip": ip
   })
   .then((result1) => {
 logInfo(result1.length,"autoVerifyToken result")
 
   if(result1.length === 0){
    // res.json({
    //   auth: false, message: 'Failed to authenticate token.'
    // });
    
    return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
   }
   else{
    
    next();
   }
   
  })
  .catch((err) => {
    logError(err,"autoVerifyToken err ")
    res.json({
      err
    })
  })
}

module.exports = autoVerifyToken;