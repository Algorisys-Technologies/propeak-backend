//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var category_controller = require("../../controllers/category/category-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
const checkRole = require("../../verify-token/check-role");

// READ (ONE)
// router.get('/:id', category_controller.categories_get_by_id);

// READ (ALL)
router.get("/", verifyToken, checkRole, category_controller.categories_get_all);

// CREATE
router.post(
  "/addCategory",
  verifyToken,
  verifyAppLevelAccess,
  category_controller.categories_post
);

// UPDATE
router.put("/:id", verifyToken, category_controller.categories_put);

// DELETE
router.post(
  "/deleteCategory",
  verifyToken,
  verifyAppLevelAccess,
  category_controller.categories_delete
);

module.exports = router;
