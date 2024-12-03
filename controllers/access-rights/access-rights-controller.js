const mongoose = require("mongoose");
const AccessRight = require("../../models/access-right/access-right-model");
const uuidv4 = require("uuid/v4");
const jwt = require("jsonwebtoken");
const secret = require("../../config/secret");
const access = require("../../check-entitlements");
const { logError, logInfo } = require("../../common/logger");

const errors = {
  NOT_AUTHORIZED: "Your are not authorized",
};

exports.setUserAccessRights = (req, res) => {
  let userRole = req.userInfo.userRole.toLowerCase();
  let accessCheck = access.checkEntitlements(userRole);
  if (accessCheck === false) {
    res.json({ err: errors.NOT_AUTHORIZED });
    return;
  }
  AccessRight.find({
    projectId: req.body.projectId,
    userId: req.body.userId,
  }).then((result) => {
    let accessRights = req.body.entitlements.map((e) => {
      let newAccessRight = {
        userId: req.body.userId,
        projectId: req.body.projectId,
        entitlementId: e.entitlementId,
        group: e.group,
        createdBy: req.userInfo.userId,
        createdOn: new Date(),
        isDeleted: false,
      };
      return newAccessRight;
    });
    if (result.length > 0) {
      AccessRight.deleteMany({
        projectId: req.body.projectId,
        userId: req.body.userId,
      }).then((res1) => {
        AccessRight.insertMany(accessRights)
          .then((result1) => {
            logInfo(result1.length, "setUserAccessRights result");
            res.json({ msg: "Access Rights updated successfully" });
          })
          .catch((err) => {
            logError(err, "setUserAccessRights err");
          });
      });
    } else {
      AccessRight.insertMany(accessRights)
        .then((result1) => {
          logInfo(result1.length, "setUserAccessRights result");
          res.json({ msg: "Access Rights saved successfully" });
        })
        .catch((err) => {
          logError(err, "setUserAccessRights err");
        });
    }
  });
};

exports.getUserAccessRights = (req, res) => {
  let userRole = req.userInfo.userRole.toLowerCase();
  let accessCheck = access.checkEntitlements(userRole);
  if (accessCheck === false) {
    res.json({ err: errors.NOT_AUTHORIZED });
    return;
  }
  AccessRight.find({ projectId: req.body.projectId, userId: req.body.userId })
    .then((result) => {
      logInfo(result.length, "getUserAccessRights result");
      res.json(result);
    })
    .catch((err) => {
      logError(err, "getUserAccessRights err");
    });
};
