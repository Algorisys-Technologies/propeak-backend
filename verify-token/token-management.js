const secret = require('../config/secret');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const async = require('async');
const config = require("../config/config");
const mongoose = require('mongoose');
const Token = require('../models/Token/token');

exports.generateAccessToken = function(val) {
    console.log("in jwt")
    return jwt.sign(val, secret.secret, {
        expiresIn: config.tokenExpiry
    });
}

exports.generateRefreshToken = function(u) {
    return jwt.sign({ user: u }, secret.secretRefreshToken, {
        expiresIn: config.refreshTokenExpiry
    });
}

exports.decodeToken=function(t){
    return jwt.decode(t);
}
exports.decodeRefreshToken=function(t){
    return jwt.decode(t);
}
