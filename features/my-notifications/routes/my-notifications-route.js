const express = require('express');
const router = express.Router();
const verifyToken = require("../../../verify-token/verify-token");
var my_notifications_controller = require('../controllers/my-notifications-controller');

// // READ (ALL)
router.get('/', verifyToken, my_notifications_controller.getMyNotifications);

// CREATE
router.post('/notificationsRead', verifyToken, my_notifications_controller.markNotificationRead);

module.exports = router;
