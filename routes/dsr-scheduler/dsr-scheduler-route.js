//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
var dsrSchedulerController = require("../../controllers/scheduler/dsr-scheduler-controller");
const verifyToken = require("../../verify-token/auto-verify-token");

router.get("/getdata", verifyToken, dsrSchedulerController.getDsrData);

router.post("/updateLog", verifyToken, dsrSchedulerController.updateEmailLog);

module.exports = router;
