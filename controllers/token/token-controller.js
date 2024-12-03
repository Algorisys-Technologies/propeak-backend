const mongoose = require('mongoose');
const Token = require('../../models/Token/token');


exports.removeUserTokens = (userId) => {
    if (userId) {
        Token.deleteMany({ userId: userId })
            .then((result) => {
            })
            .catch((err) => {
                logInfo("Deleteuser Token.deleteMany err", err);
                // console.log("Deleteuser Token.deleteMany err", err);
            });
    }
}
exports.removeToken = (token) => {
    if (token) {
        //let decoded = decodeToken(token);
        //console.log("logout decoded",decoded);
        Token.findOneAndDelete({ token: token })
            //   .then((result) => {
            //   })
            .catch((err) => {
                logInfo("logout", err);
                // console.log("logout err", err);
            });
    }
}
exports.updateToken = (oldToken, newToken) => {
    if (oldToken) {
        //let decoded = decodeToken(token);
        //console.log("logout decoded",decoded);
        Token.findOneAndUpdate({ token: oldToken }, { $set: { token: newToken, updatedOn: (new Date(new Date().toUTCString())).getTime() } })
            .then((result) => {
                // console.log(result);
            })
            .catch((err) => {
                logInfo("updateToken", err);
                // console.log("updateToken err", err);
            });
    }
}

exports.saveRefreshToken = function (accessToken, refreshToken, userId) {
    let token = new Token({
        token: accessToken,
        refreshToken: refreshToken,
        userId: userId,
        createdOn: (new Date(new Date().toUTCString())).getTime()
    });
    token.save()
        .catch((err) => {
            // console.log(err);
            if (err.errors) {
                res.json({ err: errors.REGISTER_GENERAL_ERROR });
            }
        });
}

exports.getRefreshTokenByAccessToken = async function (token) {
    // console.log("getRefreshTokenByAccessToken");
    let res = await Token.findOne({ token: token }, { refreshToken: 1 });//.exec((err, token) => {
    // console.log("getRefreshTokenByAccessToken=", res);
    // if (err) {
    //     return;
    //   }
    //   else if (!token) {
    //     return;
    //   }
    return res ? res.refreshToken : "";//token.refreshToken;
    // });
    // return;
}

exports.isValidRefreshToken = async function (refreshToken) {
    // console.log("getRefreshToken");
    let res = await Token.findOne({ refreshToken: refreshToken }, { refreshToken: 1 });
    // console.log("getRefreshTokenByAccessToken=", res);
    return (res && res.refreshToken) ? true : false;
}