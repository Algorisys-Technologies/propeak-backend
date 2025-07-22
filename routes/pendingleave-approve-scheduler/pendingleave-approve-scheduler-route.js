//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
var pendingleaveapprovescheduler = require("../../controllers/scheduler/pendingleaveapprove-scheduler-controller");
const verifyToken = require("../../verify-token/auto-verify-token");

console.log("Welcome to route!");
// get pending leave from leaveapplications
router.get(
  "/getpendingleaveapprovedata",
  verifyToken,
  pendingleaveapprovescheduler.getPendingLeaveApproveDataScheduler
);

module.exports = router;
