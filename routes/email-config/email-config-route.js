//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const emailConfigController = require("../../controllers/email-config/email-config-controller");

// Routes

router.post("/emailConfig", emailConfigController.createEmailConfig);
router.post("/companyId", emailConfigController.getAllEmailConfigs);
router.put("/emailConfig/:id", emailConfigController.updateEmailConfig);
// router.post('/:id', emailConfigController.deleteEmailConfig);
router.post("/fetchNow", emailConfigController.fetchNowEmailConfig);

module.exports = router;
