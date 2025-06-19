//const express = require("express");
const express = require("ultimate-express");
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
router.post("/", contactController.getContacts);
// CREATE
router.post(
  "/addContact",
  // verifyToken,
  contactController.createContact
);

router.post(
  "/addMultipleContacts",
  // verifyToken,
  contactController.createMultipleContacts
);

router.post(
  "/convert",
  // verifyToken,
  contactController.convertToAccount
);

router.post(
  "/updateVisitingCardsStatus",
  // verifyToken,
  contactController.updateVisitingCardsStatus
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
