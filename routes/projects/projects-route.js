//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
var projectController = require("../../controllers/project/project-controller");
const restrictCreation = require("../../common/restrict-creations");
// const config = require("../config/config");
const checkRole = require("../../verify-token/check-role");
const projectConfigController = require("../../controllers/project/project-config-controller");
const companyProjectConfigController = require("../../controllers/project/company-project-config-controller");

router.post("/summary", projectController.getAllProjectsSummary);

router.get("/statusOptions", verifyToken, projectController.getStatusOptions);

router.get("/data/:projectId", projectController.getProjectByProjectId);

//get project with task
router.get(
  "/tasks/data/:projectId",
  projectController.getProjectDataByProjectId
);

// READ (ALL)
router.get("/:projectId", verifyToken, projectController.getTasksAndUsers);

router.post("/addProject", projectController.createProject);
// UPDATE
router.post("/editProject", projectController.updateProject);

// DELETE
router.post("/deleteProject", projectController.deleteProject);

router.post("/updateField", projectController.updateProjectField);

//Category order update
router.post(
  "/updateCategory",
  verifyToken,
  projectController.updateProjectCategory
);

//Get AuditLog
router.post("/AuditLog", projectController.getAuditLog);

router.post("/getAuditLogForProject", projectController.getAuditLogForProject);

router.post("/getData", verifyToken, projectController.getProjectData);

router.post(
  "/getProjectDataForCompany",
  projectController.getProjectDataForCompany
);

router.post("/addProjectUsers", verifyToken, projectController.addProjectUsers);

router.post("/getUserProject", verifyToken, projectController.getUserProject);

// archiveProject
router.post(
  "/archiveProject",

  projectController.archiveProject
);

router.post(
  "/addCustomTaskField",
  // verifyToken,
  projectController.addCustomTaskField
);

router.get(
  "/getCustomTasksField/:projectId",
  // verifyToken,
  projectController.getCustomTasksField
);

router.get(
  "/getCustomTasksFields/:groupId",
  // verifyToken,
  projectController.getCustomTasksFieldGroup
);

router.get(
  "/getCustomTaskField/:customFieldId",
  // verifyToken,
  projectController.getCustomTaskField
);

// Update custom task field (assuming ID comes from URL parameter)
router.put(
  "/updateCustomTaskField/:customFieldId",
  // verifyToken,
  projectController.updateCustomTaskField
);

// Delete custom task field (assuming ID comes from URL parameter)
router.post(
  "/deleteCustomTaskField/:customFieldId",
  // verifyToken,
  projectController.deleteCustomTaskField
);

router.get(
  "/getAllProjectsId/:id",
  // verifyToken,
  projectController.getAllProjectsId
);

router.post(
  "/createProjectType",
  // verifyToken,
  projectController.createProjectType
);

//router.get("/getProjectTypes", verifyToken, projectController.getProjectTypes);

router.get(
  "/getProjectTypes/:all",
  // verifyToken,
  projectController.getProjectTypes
);

// CREATE project config
router.post("/createConfig", projectConfigController.createProjectConfig);

// READ project config by project ID
router.get(
  "/getConfig/:projectId",
  projectConfigController.getProjectConfigByProjectId
);

// UPDATE project config
router.put("/updateConfig/:id", projectConfigController.updateProjectConfig);

router.get(
  "/getGlobalTaskConfig/:companyId",
  projectConfigController.getGlobalTaskConfig
);

router.get(
  "/getGroupTaskConfig/:companyId/:groupId",
  projectConfigController.getGroupTaskConfig
);

// Route to create comapny project configuration
router.post(
  "/createCompanyProjectConfig",
  companyProjectConfigController.createProjectConfig
);

router.get(
  "/getCompanyProjectConfig/:companyId/:projectId",
  companyProjectConfigController.getProjectConfig
);

router.get(
  "/getGroupProjectConfig/:companyId/:groupId",
  companyProjectConfigController.getGroupProjectConfig
);

router.put(
  "/updateCompanyProjectConfig/:id",
  companyProjectConfigController.updateProjectConfig
);

router.delete(
  "/deleteComapanyProjectConfig/:id",
  companyProjectConfigController.deleteProjectConfig
);

// DELETE project config
router.delete(
  "/deleteConfig/:projectId",
  verifyToken,
  projectConfigController.deleteProjectConfig
);

router.get(
  "/getProjectsByCompanyId/:companyId",
  // verifyToken,
  projectController.getProjectsByCompanyId
);

router.get(
  "/kanban/:companyId/:userId",
  // verifyToken,
  projectController.getProjectsKanbanData
);
router.post("/getKanbanProjects", projectController.getKanbanProjects);
router.post("/getKanbanProjectsData", projectController.getKanbanProjectsData);

//Exhibitions route
router.get(
  "/kanbane/:companyId/:userId",
  projectController.getExhibitionKanbanData
);
router.post("/getKanbanExhibition", projectController.getKanbanExhibition);
router.post(
  "/getKanbanExhibitionData",
  projectController.getKanbanExhibitionData
);

router.get(
  "/kanban-groupMaster/:companyId/:userId/:groupId",
  projectController.getProjectKanbanDataByGroupId
);

router.post(
  "/getKanbanProjectsByGroup",
  projectController.getKanbanProjectsByGroup
);
router.get("/allProjects", projectController.getProjects);
router.put("/updateStage", projectController.updateStage);
router.post("/getProjectsCalendar", projectController.getProjectsCalendar);
router.post(
  "/getProjectsExhibitionCalendar",
  projectController.getProjectsExhibitionCalendar
);
router.post("/allProjects", projectController.allProjects);
router.post("/getProjectTable", projectController.getProjectTable);
router.get(
  "/getGroupIdOfProject/:projectId",
  projectController.getGroupIdOfProject
);
router.post("/selectedDelete", projectController.deleteSelectedProjects);
router.post(
  "/selectedDeleteExhibition",
  projectController.selectedDeleteExhibition
);
router.post("/allProjectsExhibition", projectController.allProjectsExhibition);
router.post(
  "/getProjectExhibitionTable",
  projectController.getProjectExhibitionTable
);
router.post("/allProjectsForGroup", projectController.allProjectsForGroup);
router.post(
  "/getProjectTableForGroup",
  projectController.getProjectTableForGroup
);
module.exports = router;
