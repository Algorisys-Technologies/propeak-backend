const express = require("express");
const router = express.Router();
const integrationController = require("../../controllers/indiamart-integration/indiamart-integration-controller");
const projectSettings = require("../../controllers/indiamart-integration/project-setting-controller");
router.get(
  "/GetIntegrationSettings/:companyId",
  integrationController.getIntegrationSettings
);
router.put(
  "/UpdateIntegrationSettings/:companyId",
  integrationController.updateIntegrationSettings
);

router.post(
  "/AddIntegrationSettings/:companyId",
  integrationController.addIntegrationSettings
);

router.delete(
  "/DeleteIntegrationSettings/:companyId",
  integrationController.deleteIntegrationSettings
);

router.post(
  "/HandleIndiamartWebhook/:companyId",
  integrationController.handleIndiamartWebhook
);

router.post("/addProjectSetting", projectSettings.createProjectSettings);

router.post("/projectSetting", projectSettings.getAllProjectSettings);

router.put("/updateProjectSetting", projectSettings.updateProjectSettings);

router.post("/createFetch", projectSettings.fetchIndiaMartSettings);
module.exports = router;
