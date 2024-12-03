const express = require("express");
const router = express.Router();
const notificationController = require("../../controllers/notification/notification-controller");

router.post("/add", notificationController.createNotification);
router.post("/companyId", notificationController.getAllNotifications);
router.get("/:id", notificationController.getNotificationById);
router.put("/:id", notificationController.updateNotification);
router.delete("/:id", notificationController.deleteNotification);
router.post(
  "/projectNotification",
  notificationController.createProjectNotification
);
router.post(
  "/projectNotifications",
  notificationController.getProjectNotifications
);
// Update a project-specific notification by ID
router.put(
  "/projectNotification/:id",
  notificationController.updateProjectNotification
);

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const verifyToken = require("../../verify-token/verify-token");
// var notificationController = require('../../controllers/notification/notification-controller');
// const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
// const checkRole = require("../../verify-token/check-role");

// //Read One
// router.get('/:id', verifyToken, notificationController.getNotificationById);

// // READ (ALL)
// router.get('/notification/:projectId', verifyToken, checkRole,notificationController.getAllNotifications);

// // CREATE
// router.post('/addNotification', verifyToken, verifyAppLevelAccess, notificationController.createNotification);

// //  // UPDATE
// router.post('/editNotification', verifyToken, verifyAppLevelAccess, notificationController.updateNotification);

// // // DELETE
// router.post('/deleteNotification', verifyToken, verifyAppLevelAccess, notificationController.deleteNotification);

// //Get Hide

// router.get('/getunhidenotifications/getdata', verifyToken, notificationController.getAllUnHideNotifications);

// // CREATE HIDE Notification
// router.post('/createhidenotification', verifyToken, notificationController.createHideNotification);

// module.exports = router;
