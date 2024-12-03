const express = require("express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
const contactController = require("../../controllers/contact/contact-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
const checkRole = require("../../verify-token/check-role");

// Read One
router.get(
  "/:id",
  // verifyToken,
  contactController.getContactById
);

// READ (ALL)
router.post(
  "/companyId",
  //  verifyToken,
  //  checkRole,
  contactController.getAllContact
);

// CREATE
router.post(
  "/addContact",
  // verifyToken,
  contactController.createContact
);

// UPDATE
router.post(
  "/editContact",
  //  verifyToken,
  contactController.updateContact
);

// DELETE
router.post(
  "/:id",
  // verifyToken,
  contactController.deleteContact
);

module.exports = router;

//verifyAppLevelAccess
