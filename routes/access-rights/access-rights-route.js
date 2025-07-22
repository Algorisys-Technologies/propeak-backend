//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var accessRights_controller = require("../../controllers/access-rights/access-rights-controller");

// // READ (ONE)
// // router.get('/:id', category_controller.categories_get_by_id);

// // READ (ALL)
// router.get('/', category_controller.categories_get_all);

// CREATE
router.post("/", verifyToken, accessRights_controller.setUserAccessRights);

router.post("/get", verifyToken, accessRights_controller.getUserAccessRights);

module.exports = router;
