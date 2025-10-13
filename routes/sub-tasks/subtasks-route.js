//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();

var subTaskController = require("../../controllers/sub-task/subtask-controller");

router.post("/getAllSubTask", subTaskController.getAllsubTasks);

// CREATE
router.post("/create", subTaskController.createSubTask);
router.post("/create-subTask", subTaskController.createSubSubTask);
router.post("/update-subTask", subTaskController.updateSubSubTask);
router.post("/delete-subTask", subTaskController.deleteSubSubTask);

// UPDATE
router.post("/update", subTaskController.updateSubTask);

router.put("/toggle", subTaskController.toggleSubTask);

router.post("/delete", subTaskController.deleteSubTask);

router.post("/subtaskComplete/", subTaskController.updateSubTaskCompleted);

module.exports = router;
