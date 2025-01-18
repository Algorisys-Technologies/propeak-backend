const express = require("express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var taskController = require("../../controllers/task/task-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
const checkRole = require("../../verify-token/check-role");
const restrictCreation = require("../../common/restrict-creations");

//get TaskPriority
// router.get("/taskpriorities", verifyToken, taskController.getTaskPriority);

// router.post('/todaystasks', verifyToken,checkRole,verifyAppLevelAccess,taskController.getUsersTodaysOpenTasks);

router.get(
  "/projecttasks/:projectId",
  verifyToken,
  taskController.getTasksByProjectId
);

// READ (ALL)
router.get(
  "/",
  // verifyToken,
  // checkRole,
  taskController.getAllTasks
);

router.post("/updateSequence", verifyToken, taskController.updateTasksSequence);

// CREATE
router.post(
  "/addTask",
  // verifyToken,
  // verifyAppLevelAccess,
  // restrictCreation,
  taskController.createTask
);
router.get(
  "/data/:taskId",
  // verifyToken,
  taskController.getTaskByTaskId
);
router.post("/allTask", taskController.getTasks);
router.post("/getTaskTable", taskController.getTasksTable);
router.post("/deleteFiltered", taskController.deleteFiltered);
router.post("/getTasksCalendar", taskController.getTasksCalendar);
// router.get("/data/:taskId", taskController.getTaskByProjectId);
router.post("/deleteTask", taskController.deleteTask);
// UPDATE OF Task
router.post(
  "/updateTask",
  // verifyToken,
  // verifyAppLevelAccess,
  taskController.updateTask
);

router.post(
  "/updateSubTasks",
  verifyToken,
  verifyAppLevelAccess,
  taskController.updateTasksSubTasks
);

// router.post('/todaysTasksChartData', verifyToken, checkRole, verifyAppLevelAccess, taskController.gettodaysTasksChartData);

//get User Productivity Data

router.post(
  "/getDashboardData",
  // verifyToken,
  // checkRole,
  // verifyAppLevelAccess,
  taskController.getDashboardData
);

router.post(
  "/getDashboardDatabyCompanyId",
  // verifyToken,
  // checkRole,
  // verifyAppLevelAccess,
  taskController.getDashboardDatabyCompanyId
);

router.get("/getTasksKanbanData/:projectId", taskController.getTasksKanbanData);
router.get(
  "/kanban/:projectId/:companyId",
  taskController.getTasksStagesByProjectId
);

router.post("/kanban", taskController.getKanbanTasks);

router.put("/updateStage", taskController.updateStage);

router.post("/deleteTask", taskController.deleteTask);

router.post("/assign", verifyToken, taskController.assignUsers);
router.post("/assignTasksToUser", taskController.assignTasksToUser);
router.post("/assignTasksToProject", taskController.assignTasksToProject);
router.post("/moveTasksToProject", taskController.moveTasksToProject);

router.post("/selectedDelete", taskController.deleteSelectedTasks);

module.exports = router;
