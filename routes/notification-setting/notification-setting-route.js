const express = require("express");
const router = express.Router();
const notificationSettingController = require("../../controllers/notification-setting/notification-setting-controller");

router.post("/add", notificationSettingController.createNotificationSetting);

module.exports = router;

