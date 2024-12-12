const express = require("express");
const router = express.Router();
const integrationController = require("../../controllers/indiamart-integration/indiamart-integration-controller");
const projectSettings = require("../../controllers/indiamart-integration/project-setting-controller");
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

router.post("/addProjectSetting", projectSettings.createProjectSettings);

router.post("/projectSetting", projectSettings.getAllProjectSettings);

router.put("/updateProjectSetting", projectSettings.updateProjectSettings);
module.exports = router;
