const express = require('express');
const router = express.Router();
var schedulerController = require('../../controllers/scheduler/scheduler-controller');
const verifyToken = require("../../verify-token/auto-verify-token");

router.get('/getdata',verifyToken, schedulerController.getTaskStatusDataScheduler);


module.exports = router;