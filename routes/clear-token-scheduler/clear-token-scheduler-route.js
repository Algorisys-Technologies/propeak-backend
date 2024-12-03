const express = require('express');
const router = express.Router();
var clearTokenSchedulerController = require('../../controllers/clear-token-scheduler/clear-token-scheduler-controller');
const verifyToken = require("../../verify-token/auto-verify-token");

router.get('/getdata',verifyToken,clearTokenSchedulerController.getTokenData);

module.exports = router;