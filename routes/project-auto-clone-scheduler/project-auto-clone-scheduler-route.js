const express = require('express');
const router = express.Router();
var projectAutoCloneController = require('../../controllers/project/project-auto-clone-controller');
const verifyToken = require("../../verify-token/auto-verify-token");

router.get('/getdata', verifyToken, projectAutoCloneController.getDataSchedulerAutoClone);



module.exports = router;