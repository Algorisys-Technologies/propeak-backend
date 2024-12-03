const express = require("express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var globalController = require("../../controllers/global-search/global-search-controller");

router.post(
  "/globalSearch",
  globalController.searchByTasksAndProjects
);
module.exports = router;
