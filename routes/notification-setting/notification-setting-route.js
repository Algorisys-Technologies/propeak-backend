const express = require("express");
const router = express.Router();
const notificationSettingController = require("../../controllers/notification-setting/notification-setting-controller");

router.post("/add", notificationSettingController.createNotificationSetting);
router.post("/addPreferences", notificationSettingController.addPreferences);
router.get("/getPreferences/:userId", notificationSettingController.getPreferences);
router.put("/:preferencesId", notificationSettingController.updatePreferences);

module.exports = router;

