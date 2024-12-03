const mongoose = require('mongoose');
const AccessRight = require('../../models/access-right/applevelaccessright-model');
const AppLevelAccessRightEntitlement = require('../../models/access-right/applevelaccessrightentitlment-model');
const DefaultAppLevelAccessRight = require('../../models/access-right/defaultapplevelaccessright-model');
const uuidv4 = require('uuid/v4');
const jwt = require('jsonwebtoken');
const secret = require('../../config/secret');
const access = require('../../check-entitlements');
const { logError, logInfo } = require('../../common/logger');
const fs = require("fs");
const cacheManager = require('../../redis');

const errors = {
    "NOT_AUTHORIZED": "You are not authorized"
};

exports.appLevelAccessRight = (async (req, res) => {
    let userRole = req.userInfo.userRole.toLowerCase();
    let accessCheck = access.checkEntitlements(userRole);
    if (accessCheck === false) {
        res.json({ err: errors.NOT_AUTHORIZED });
        return;
    }

    var cachedData = await cacheManager.getCachedData("appLevelAccessRightEntitlementData");

    if (!!cachedData) {

        if (cachedData.length > 0) {
            res.json(cachedData);
            return;
        }
    }

    AppLevelAccessRightEntitlement.find({})
        .then((result) => {
            cacheManager.setCachedData("appLevelAccessRightEntitlementData", result);
            logInfo(result.length, "appLevelAccessRightsEntitlement result");
            // console.log("result", result);
            res.json(result);
        })
        .catch((err) => {
            logError(err, "appLevelAccessRightsEntitlement err");

        })
});


exports.saveAppLevelAccessRight = ((req, res) => {

    AccessRight.find({ userId: req.body.userId })
        .then((result) => {

            let accessRights = req.body.entitlements.map((e) => {
                let newAccessRight = {
                    userId: req.body.userId,
                    entitlementId: e.EntitlementId,
                    group: e.Group,
                    access: e.Value,
                    createdBy: req.userInfo.userId,
                    createdOn: new Date(),
                    isDeleted: false
                }
                return newAccessRight;
            })
            if (result.length > 0) {

                AccessRight.deleteMany({ userId: req.body.userId })
                    .then((res1) => {

                        AccessRight.insertMany(accessRights)
                            .then((result1) => {
                                logInfo(result1.length, "setUserAccessRights result");
                                res.json({ msg: "Access Rights updated successfully" })
                            })
                            .catch((err) => {
                                logError(err, "setUserAccessRights err");
                            })
                    })
            } else {

                AccessRight.insertMany(accessRights)
                    .then((result1) => {
                        logInfo(result1.length, "setUserAccessRights result");
                        res.json({ msg: "Access Rights saved successfully" })
                    })
                    .catch((err) => {
                        logError(err, "setUserAccessRights err");
                    })
            }
        })

});

exports.getAppLevelAccessRight = ((req, res) => {

    AccessRight.find({ userId: req.body.userId })
        .then((result) => {
            logInfo(result.length, "getUserAccessRights result");
            // console.log("result", result);
            res.json(result);
        })
        .catch((err) => {
            logError(err, "getUserAccessRights err");

        })
});

// exports.defaultAppLevelAccessRightOnAddUser = ((usrId, usrRole) =>{
//         // let defaultAppLevelAccessRight = [
//         //     {
//         //         userId: usrId,
//         //         entitlementId: "Edit",
//         //         group: "Projects",
//         //         access: true,
//         //         createdBy: "",
//         //         createdOn: new Date(),
//         //         isDeleted: false
//         //     },
//         //     {
//         //         userId: usrId,
//         //         entitlementId: "View",
//         //         group: "Projects",
//         //         access: true,
//         //         createdBy: "",
//         //         createdOn: new Date(),
//         //         isDeleted: false
//         //     },
//         //     {
//         //         userId: usrId,
//         //         entitlementId: "Delete",
//         //         group: "Projects",
//         //         access: true,
//         //         createdBy: "",
//         //         createdOn: new Date(),
//         //         isDeleted: false
//         //     },
//         //     {
//         //         userId: usrId,
//         //         entitlementId: "Clone",
//         //         group: "Projects",
//         //         access: true,
//         //         createdBy: "",
//         //         createdOn: new Date(),
//         //         isDeleted: false
//         //     },
//         //     {
//         //         userId: usrId,
//         //         entitlementId: "Edit",
//         //         group: ,
//         //         access: true,
//         //         createdBy: "",
//         //         createdOn: new Date(),
//         //         isDeleted: false
//         //     },
//         //     {
//         //         userId: usrId,
//         //         entitlementId: "Clone",
//         //         group: "Favorite Projects",
//         //         access: true,
//         //         createdBy: "",
//         //         createdOn: new Date(),
//         //         isDeleted: false
//         //     }
//         // ];
//        try{
//         DefaultAppLevelAccessRight.find({userRole: usrRole })
//         .then((result) => {
//            console.log("result",result);
//             var defaultAppLevelAccessRight = result.map((e) => {
//                 let newAccessRight = {
//                     userId: usrId,
//                     entitlementId: e.entitlement,
//                     group: e.group,
//                     access: true,
//                     createdBy: "",
//                     createdOn: new Date(),
//                     isDeleted: false
//                 }
//                 return newAccessRight;
//             })
//             if (defaultAppLevelAccessRight.length > 0) {
//                 console.log("defaultAppLevelAccessRight",defaultAppLevelAccessRight);
//                 AccessRight.insertMany(defaultAppLevelAccessRight)
//                 .then((result1) => {
//                     console.log("result1",result1);
//                     logInfo(result1.length, "setUserAccessRights result");
//                     res.json({ msg: "Access Rights updated successfully" })
//                 })
//                 .catch((err) => {
//                     logError(err, "setUserAccessRights err");
//                 })
//             }
//         })
//         .catch((err) => {
//             // console.log(err);
//         })
//     }
//     catch(e){
//         // console.log(e);
//     }

// });