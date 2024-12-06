const express = require("express");
const router = express.Router();
const integrationController = require("../../controllers/indiamart-integration/indiamart-integration-controller");

router.get(
  "/GetIntegrationSettings/:companyId/:provider",
  integrationController.getIntegrationSettings
);
router.put(
  "/UpdateIntegrationSettings/:companyId/:provider",
  integrationController.updateIntegrationSettings
);

router.post(
  "/AddIntegrationSettings/:companyId/:provider",
  integrationController.addIntegrationSettings
);

router.post(
  "/HandleIndiamartWebhook/:companyId",
  integrationController.handleIndiamartWebhook
);

// router.get(
//   "/GetActiveIntegrations/:companyId/:provider?",
//   integrationController.getActiveIntegrations
// );  // "?" makes the provider parameter optional.

module.exports = router;
