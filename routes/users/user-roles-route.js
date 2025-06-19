//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
var userRole_controller = require("../../controllers/user/user-role-controller");
const verifyToken = require("../../verify-token/verify-token");

// READ (ALL)
router.get("/", verifyToken, userRole_controller.userRole_get_all);

module.exports = router;
