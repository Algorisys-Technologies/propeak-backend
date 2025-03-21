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

router.post("/addProjectSetting", projectSettings.createProjectSetting);

router.post("/projectSetting", projectSettings.getAllProjectSetting);

router.put("/updateProjectSetting", projectSettings.updateProjectSetting);

router.post("/createFetch", projectSettings.fetchIndiaMartSettings);

router.post("/addGroupSetting", projectSettings.createGroupSetting);

router.post("/groupSetting", projectSettings.getAllGroupSetting);

router.put("/updateGroupSetting", projectSettings.updateGroupSetting);

router.post("/createFetchGroup", projectSettings.fetchIndiaMartSettingsGroup);

module.exports = router;
