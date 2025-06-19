//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var groupController = require("../../controllers/group/group-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
const checkRole = require("../../verify-token/check-role");

//Read One
// router.get('/:id', companyController.getCompanyById);

// READ (ALL)
router.post(
  "/companyId",
  //  verifyToken, checkRole,
  groupController.getAllGroups
);

// CREATE
router.post(
  "/addGroup",
  // ,verifyToken,verifyAppLevelAccess,
  groupController.addGroup
);

// UPDATE
router.post(
  "/editGroup",
  // verifyToken,verifyAppLevelAccess,
  groupController.editGroup
);

// DELETE
router.post(
  "/deleteGroup",
  // verifyToken,verifyAppLevelAccess,
  groupController.deleteGroup
);

module.exports = router;
