const express = require("express");
const router = express.Router();
const notificationSettingController = require("../../controllers/notification-setting/notification-setting-controller");
const notificationController = require("../../controllers/notification-setting/notifications-controller");
const notificationPreferenceController = require("../../controllers/notification-setting/notification-preference-controller");
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

//Notification Center
router.post("/notifications", notificationController.getNotifications);
router.delete("/notificartions/:id", notificationController.deleteNotification);
router.post(
  "/notificartions/read/:id",
  notificationController.markNotificationAsRead
);

router.post(
  "/notificartions/readAll",
  notificationController.markNotificationAsAllRead
);

//Preference os users
router.post("/addPreference", notificationPreferenceController.addPreferences);
router.post("/getPreferences", notificationPreferenceController.getPreferences);
router.post(
  "/:preferencesId",
  notificationPreferenceController.updatePreferences
);
module.exports = router;
