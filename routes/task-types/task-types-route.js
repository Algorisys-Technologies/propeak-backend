const express = require("express");
const router = express.Router();
const taskTypeController = require("../../controllers/task-types/task-type-controller");

router.post("/companyId", taskTypeController.get_task_types_by_company);
router.post("/add", taskTypeController.create_task_type);
router.put("/:id", taskTypeController.update_task_type);
router.delete("/:id", taskTypeController.delete_task_type);

module.exports = router;
