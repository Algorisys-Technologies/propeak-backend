//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const emailConfigController = require("../../controllers/email-config/email-config-controller");
const groupEmailConfigController = require("../../controllers/email-config/group-email-config-controller");

// Routes

router.post("/emailConfig", emailConfigController.createEmailConfig);
router.post("/companyId", emailConfigController.getAllEmailConfigs);
router.put("/emailConfig/:id", emailConfigController.updateEmailConfig);
// router.post('/:id', emailConfigController.deleteEmailConfig);
router.post("/fetchNow", emailConfigController.fetchNowEmailConfig);

router.post(
  "/groupEmailConfig",
  groupEmailConfigController.createGroupEmailConfig
);
router.post(
  "/groupEmailConfig/companyId",
  groupEmailConfigController.getAllGroupEmailConfigs
);
router.get(
  "/groupEmailConfig/:id",
  groupEmailConfigController.getGroupEmailConfigById
);
router.put(
  "/groupEmailConfig/:id",
  groupEmailConfigController.updateGroupEmailConfig
);
router.delete(
  "/groupEmailConfig/:id",
  groupEmailConfigController.deleteGroupEmailConfig
);
router.post(
  "/groupEmailConfig/fetchNow",
  groupEmailConfigController.fetchNowGroupEmailConfig
);

module.exports = router;
