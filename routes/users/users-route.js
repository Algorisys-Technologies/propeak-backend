const express = require("express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
const User = require("../../models/user/user-model");
const checkRole = require("../../verify-token/check-role");
const uuidv4 = require("uuid/v4");
const userController = require("../../controllers/user/user-controller");
const restrictCreation = require("../../common/restrict-creations");
// READ (ALL)
router.post(
  "/companyId",
  // verifyToken,
  //  checkRole,
  userController.getUsers
);

router.post("/projectId", userController.getProjectUsers);

// READ (ONE)
router.get("/:id", verifyToken, userController.getUser);

// ADD USER - post user
router.post(
  "/addUser",
  // verifyToken,
  // verifyAppLevelAccess,
  // restrictCreation,
  userController.postAddUser
);

// UPDATE A USER
router.post(
  "/editUser",
  // verifyToken,
  // verifyAppLevelAccess,
  userController.updateUser
);

// DELETE
router.post(
  "/deleteUser",
  // verifyToken,
  // verifyAppLevelAccess,
  userController.deleteUser
);

// profile picture
router.post(
  "/getProfilePicture",
  verifyToken,
  userController.getProfilePicture
);

router.post("/checkUser", userController.checkUser);
module.exports = router;
