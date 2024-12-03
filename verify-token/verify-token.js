const jwt = require("jsonwebtoken");
const secret = require("../config/secret");
const { ACCESS_TOKEN, REFRESH_TOKEN } = require("../common/const");
const {
  generateAccessToken,
  generateRefreshToken,
  decodeToken,
} = require("./token-management");
const tokenController = require("../controllers/token/token-controller");
const AccessRight = require("../models/access-right/access-right-model");

async function verifyToken(req, res, next) {
  //console.log(req.headers);
  //console.log(req.headers[ACCESS_TOKEN]);
  //console.log(req.headers[REFRESH_TOKEN]);
  //console.log(ACCESS_TOKEN.toLowerCase());
  //console.log(req.headers[ACCESS_TOKEN.toLowerCase()]);
  //console.log(REFRESH_TOKEN.toLowerCase());
  //console.log(req.headers[REFRESH_TOKEN.toLowerCase()]);
  var token = req.headers[ACCESS_TOKEN]
    ? req.headers[ACCESS_TOKEN]
    : req.headers[ACCESS_TOKEN.toLowerCase()];
  var refreshToken = req.headers[REFRESH_TOKEN]
    ? req.headers[REFRESH_TOKEN]
    : req.headers[REFRESH_TOKEN.toLowerCase()];
  let statusCode = "201";
  //console.log("verify token",token,refreshToken);
  if (!token || !refreshToken) {
    // console.log('No token provided.');
    return res.status(403).json({ auth: false, message: "No token provided." });
  }

  let isValidRefreshToken = await tokenController.isValidRefreshToken(
    refreshToken
  );
  // console.log("isValidRefreshToken", isValidRefreshToken);
  if (!isValidRefreshToken) {
    // console.log("inValidRefreshToken");
    return res.status(403).json({ auth: false, message: "Not valid token." });
  }

  jwt.verify(token, secret.secret, async function (err, decoded) {
    // console.log(err);
    // console.log(decoded);
    if (err) {
      // console.log(err.name);
      if (err.name === "TokenExpiredError") {
        //if (refreshToken) {
        jwt.verify(
          refreshToken,
          secret.secretRefreshToken,
          async function (err, decoded) {
            // console.log("3 err", err);
            // console.log("3 decoded", decoded);
            if (err) {
              // console.log("3 err1");
              statusCode = 403;
              return; // res.status(403).json({ error: true, auth: false, message: 'Token Expired Error' });
            }

            console.log("in refresh", decoded.user);

            const accessRights = await AccessRight.find(
              { userId: decoded.user._id },
              { projectId: 1, entitlementId: 1, group: 1 }
            );

            let u = decoded.user;
            let newToken = generateAccessToken(u);
            //tokenController.updateToken(token,newToken);
            // console.log(newToken);
            updateRequest(
              req,
              res,
              decoded,
              accessRights,
              newToken,
              refreshToken
            );
            next();
          }
        );
        // }
        // else {
        //   console.log("token expired failed1");
        //   statusCode = 403;
        //   return res.status(403).json({ error: true, auth: false, message: 'Token Expired Error' });
        // }
      } else {
        // console.log("failed");
        statusCode = 403;
        return;
        //return res.status(403).json({ error: true, auth: false, message: 'Failed to authenticate token.' });
      }
    } else {
      // if everything good, save to request for use in other routes
      // console.log("decoded in verify token",decoded);
      const accessRights = await AccessRight.find(
        { userId: decoded._id },
        { projectId: 1, entitlementId: 1, group: 1 }
      );
      updateRequest(req, res, decoded, accessRights, token, refreshToken);
      next();
    }
  });

  if (statusCode === 403) {
    // console.log("statusCode === 403");
    return res
      .status(403)
      .json({ error: true, auth: false, message: "Token Expired Error" });
  }
}

async function updateRequest(
  req,
  res,
  decoded,
  accessRights,
  token,
  refreshToken
) {
  // console.log("updateRequest", decoded);
  req.userId = decoded._id;
  req.userName = decoded.name;
  req.userRole = decoded.role;
  req.companyId = decoded.companyId;
  req.userAccess = accessRights;

  req.userInfo = {
    userId: decoded._id,
    userName: decoded.name,
    userRole: decoded.role,
    companyId: decoded.companyId,
    userAccess: accessRights,
  };
  res.setHeader(ACCESS_TOKEN, token);
  res.setHeader(REFRESH_TOKEN, refreshToken);
}
module.exports = verifyToken;
