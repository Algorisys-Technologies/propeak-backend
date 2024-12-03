const express = require("express");
const router = express.Router();
// const multer = require('multer');
const fs = require("fs");
const verifyToken = require("../../verify-token/verify-token");
var uploadFileController = require("../../controllers/upload-file/upload-file-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
router.post(
  "/tasksFile",
  // verifyToken,
  // verifyAppLevelAccess,
  uploadFileController.tasksFileUpload
);

router.post("/",
  //  verifyToken, 
   uploadFileController.postUploadFile);

   router.post("/add",
    //  verifyToken, 
     uploadFileController.postUploadFileByProjectId);
  

//router.get('/:taskId',uploadFileController.uploadFile_get_by_taskId);

router.get(
  "/project/:projectId/:taskId",
  // verifyToken,
  uploadFileController.uploadFileGetByProjectId
);

router.post(
  "/uploadFileGetByProjectId",
  uploadFileController.getUploadFileByProjectId
)

router.post("/delete", 
  // verifyToken, 
  uploadFileController.deleteUploadFile);

router.get(
  "/download/:projectId/:taskId/:filename",
  // verifyToken,
  uploadFileController.downloadUploadFile
);

router.get(
  "/download/:projectId/:filename",
  // verifyToken,
  uploadFileController.downloadProjectUploadFile
);

router.get(
  "/view/:projectId/:taskId/:filename",
  // verifyToken,
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
