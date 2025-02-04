const express = require("express");
const router = express.Router();
// const multer = require('multer');
const fs = require("fs");
const verifyToken = require("../../verify-token/verify-token");
var uploadFileController = require("../../controllers/upload-file/upload-file-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
router.post("/tasksFile", uploadFileController.tasksFileUpload);
router.post("/projectsFile", uploadFileController.projectFileUpload);

router.post("/", uploadFileController.postUploadFile);

router.post("/add", uploadFileController.postUploadFileByProjectId);

router.get(
  "/project/:projectId/:taskId",
  uploadFileController.uploadFileGetByProjectId
);

router.post(
  "/uploadFileGetByProjectId",
  uploadFileController.getUploadFileByProjectId
);

router.post("/delete", uploadFileController.deleteUploadFile);

router.get(
  "/download/:projectId/:taskId/:filename",
  uploadFileController.downloadUploadFile
);

router.get(
  "/download/:projectId/:filename",
  uploadFileController.downloadProjectUploadFile
);

router.get(
  "/view/:projectId/:taskId/:filename",
  uploadFileController.viewUploadFile
);

///////////////view///////////////
router.get(
  "/view/:projectId/:filename",
  // verifyToken,
  uploadFileController.viewUploadFileByProjectId
);

router.post(
  "/upload-task-fields-config",
  // verifyToken,
  uploadFileController.uploadTaskFieldsConfig
);

module.exports = router;
