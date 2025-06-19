//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
const reminderController = require("../../controllers/reminder/reminder-controller");
//const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
const checkRole = require("../../verify-token/check-role");

// CREATE
router.post(
  "/addReminder",
  // verifyToken,
  //verifyAppLevelAccess,
  reminderController.createReminder
);

// READ (ALL)
router.get(
  "/reminders/:projectId",
  // verifyToken,
  // checkRole,
  reminderController.getAllReminders
);

// READ (ONE)
router.get("/reminder/:id", verifyToken, reminderController.getReminderById);

// UPDATE
router.post(
  "/editReminder",
  // verifyToken,
  //verifyAppLevelAccess,
  reminderController.updateReminder
);

// DELETE
router.post(
  "/deleteReminder",
  // verifyToken,
  //verifyAppLevelAccess,
  reminderController.deleteReminder
);

module.exports = router;
