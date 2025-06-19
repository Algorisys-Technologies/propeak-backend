//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const emailConfigController = require("../../controllers/task-email-config/task-email-config-controller");

// Routes

router.post("/email-config", emailConfigController.createEmailConfig);
router.get("/email-configs", emailConfigController.getAllEmailConfigs);
router.put("/email-config/:id", emailConfigController.updateEmailConfig);
router.delete("/email-config/:id", emailConfigController.deleteEmailConfig);

module.exports = router;
