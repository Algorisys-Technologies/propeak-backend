//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
var taskType_controller = require("../../controllers/task/task-type-controller");
const verifyToken = require("../../verify-token/verify-token");

// READ (ALL)
router.get("/", verifyToken, taskType_controller.taskTypes_get_all);

module.exports = router;
