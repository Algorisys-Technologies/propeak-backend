//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const projectStageController = require("../../controllers/project-stages/project-stages.controller.js");

router.post(
  "/migrate-to-group",
  projectStageController.migrateGlobalStagesToGroupStage
);

router.post("/companyId", projectStageController.get_project_stages_by_company);
router.post("/add", projectStageController.create_project_stage);
router.put("/:id", projectStageController.update_project_stage);
router.post("/reorder", projectStageController.reorder_project_stages);
router.post("/:id", projectStageController.delete_project_stage);

router.post(
  "/group/:groupId",
  projectStageController.get_project_stages_by_group
);
router.post("/add/group", projectStageController.create_group_project_stage);
router.put("/:id/group", projectStageController.update_group_project_stage);
router.post(
  "/reorder/group",
  projectStageController.reorder_group_project_stages
);
router.post("/:id/group", projectStageController.delete_group_project_stage);

module.exports = router;
