//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
var UserUnlockSchedulerController = require("../../controllers/scheduler/user-account-unlock-scheduler-controller");
const verifyToken = require("../../verify-token/auto-verify-token");

router.get(
  "/getdata",
  verifyToken,
  UserUnlockSchedulerController.getUserDataScheduler
);

// leave notification
router.get(
  "/getleavedata",
  verifyToken,
  UserUnlockSchedulerController.getLeaveDataScheduler
);

module.exports = router;
