//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const taskStageController = require("../../controllers/task-stages/task-stages.controller");
router.post("/companyId", taskStageController.get_task_stages_by_company);
router.post("/taskStages", taskStageController.get_task_stages);
router.post("/add", taskStageController.create_task_stage);
router.put("/:id", taskStageController.update_task_stage);
router.post("/reorder", taskStageController.reorder_task_stages);
router.post("/:id", taskStageController.delete_task_stage);

// Group-level task stage routes
router.post("/group/:groupId", taskStageController.get_task_stages_by_group);
router.post("/add/group", taskStageController.create_group_task_stage);
router.put("/:id/group", taskStageController.update_group_task_stage);
router.post("/:id/group", taskStageController.delete_group_task_stage);
router.post("/reorder/group", taskStageController.reorder_group_task_stages);

module.exports = router;
