const express = require('express');
const router = express.Router();
//const verifyToken = require("../../verify-token/verify-token");
const verifyToken = require("../../verify-token/auto-verify-token");

var holidaySchedulerController = require('../../controllers/scheduler/holiday-scheduler-controller');
router.get('/getholiday', verifyToken, holidaySchedulerController.getHolidayData);

module.exports = router;