const express = require("express");
const router = express.Router();
const projectStageController = require("../../controllers/project-stages/project-stages.controller.js");

router.post("/companyId", projectStageController.get_project_stages_by_company);
router.post("/add", projectStageController.create_project_stage);
router.put("/:id", projectStageController.update_project_stage);
router.post("/reorder", projectStageController.reorder_project_stages);
router.delete("/:id", projectStageController.delete_project_stage);

module.exports = router;
