//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var taskCloneController = require("../../controllers/task/task-clone-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");

// CREATE
router.post("/cloneTask", taskCloneController.taskClone);

module.exports = router;
