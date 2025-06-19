//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var accessRights_controller = require("../../controllers/access-rights/app-level-access-right-controller");

// // READ (ONE)
// // router.get('/:id', category_controller.categories_get_by_id);

// // READ (ALL)
// router.get('/', category_controller.categories_get_all);

// CREATE
router.get("/", verifyToken, accessRights_controller.appLevelAccessRight);
router.post(
  "/save",
  verifyToken,
  accessRights_controller.saveAppLevelAccessRight
);
router.post(
  "/get",
  verifyToken,
  accessRights_controller.getAppLevelAccessRight
);
// router.post('/setaccessrights',verifyToken,accessRights_controller.defaultAppLevelAccessRightOnAddUser);

module.exports = router;
