const express = require("express");
const router = express.Router();
const notificationSettingController = require("../../controllers/notification-setting/notification-setting-controller");
const notificationController = require("../../controllers/notification-setting/notifications-controller");

router.post("/add", notificationSettingController.createNotificationSetting);
router.post(
  "/notification-setting",
  notificationSettingController.getNotificationSettings
);
router.put(
  "/toggle/:id",
  notificationSettingController.toggleNotificationActive
);
router.delete("/:id", notificationSettingController.deleteNotificationSetting);
router.put("/:id", notificationSettingController.updateNotificationSetting);

// router.post("/addPreferences", notificationSettingController.addPreferences);
// router.get(
//   "/getPreferences/:userId",
//   notificationSettingController.getPreferences
// );
// router.post("/:preferencesId", notificationSettingController.updatePreferences);
//Notification Center
router.post("/notifications", notificationController.getNotifications);
router.delete("/notificartions/:id", notificationController.deleteNotification);
router.post("/notificartions/read/:id", notificationController.markNotificationAsRead);

module.exports = router;
