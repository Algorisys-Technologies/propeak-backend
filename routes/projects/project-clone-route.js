const express = require('express');
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var projectCloneController = require('../../controllers/project/project-clone-controller');
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");

// CREATE
router.post('/cloneProject', projectCloneController.projectClone);

router.post('/autoclone/:projectId', projectCloneController.projectAutoClone);


module.exports = router;