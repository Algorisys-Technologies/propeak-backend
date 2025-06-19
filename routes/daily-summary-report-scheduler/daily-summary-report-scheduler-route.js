//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
var dailySummaryReportSchedulerController = require("../../controllers/scheduler/daily-summary-report-scheduler-controller");
const verifyToken = require("../../verify-token/auto-verify-token");

router.get(
  "/getdata",
  verifyToken,
  dailySummaryReportSchedulerController.getData
);

module.exports = router;
