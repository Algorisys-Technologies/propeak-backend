const express = require("express");
const router = express.Router();

var subTaskController = require("../../controllers/sub-task/subtask-controller");

router.get("/:projectId", subTaskController.getAllsubTasks);

// CREATE
router.post("/create", subTaskController.createSubTask);

// UPDATE
router.post("/update", subTaskController.updateSubTask);

router.put("/toggle", subTaskController.toggleSubTask);

router.post("/delete", subTaskController.deleteSubTask);

router.post("/subtaskComplete/", subTaskController.updateSubTaskCompleted);

module.exports = router;
