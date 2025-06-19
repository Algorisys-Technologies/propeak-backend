//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
const accountController = require("../../controllers/accounts/account-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
const checkRole = require("../../verify-token/check-role");

// Read One
// router.get('/:id',
//     // verifyToken,
//      accountController.getAccountById);
// READ (ALL)

router.post(
  "/companyId",
  // verifyToken, checkRole,
  accountController.getAllAccounts
);

// CREATE
router.post(
  "/addAccount",
  // verifyToken,
  accountController.createAccount
);

// UPDATE
router.post(
  "/editAccount",
  // verifyToken,
  accountController.updateAccount
);

// DELETE
router.post(
  "/:id",
  // verifyToken,
  accountController.deleteAccount
);

module.exports = router;

//verifyAppLevelAccess
