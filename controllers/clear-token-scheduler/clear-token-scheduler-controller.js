const mongoose = require('mongoose');
const Token = require('../../models/Token/token');
const { logError, logInfo } = require('../../common/logger');
const dateUtil = require('../../utils/date-util');
const config = require("../../config/config");

exports.getTokenData = ((req, res) => {
    let currentTime = (new Date(new Date().toUTCString())).getTime() - config.refreshTokenExpiry;
    Token.deleteMany({createdOn: {$lte: currentTime}})
    .then((result) => {
        res.json({
            msg: "Token's cleared successfully"
        })
    })
    .catch((err) => {
        logError(err,"err");
    })
  
})