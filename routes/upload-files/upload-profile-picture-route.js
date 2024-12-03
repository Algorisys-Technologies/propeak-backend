const express = require('express');
const router = express.Router();
// const multer = require('multer');
const fs = require('fs');
const verifyToken = require("../../verify-token/verify-token");
var uploadProfileController = require('../../controllers/upload-file/upload-profile-controller');
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");

//router.get('/project/:projectId/:taskId',verifyToken,uploadProfileController.createProfile)
//router.post('/',uploadProfileController.createProfile );
router.post('/',verifyToken, uploadProfileController.createProfile);


// router.post('/tasksFile',verifyToken,verifyAppLevelAccess, uploadProfileController.tasksFileUpload);

// router.post('/',verifyToken, uploadProfileController.postUploadFile);

// //router.get('/:taskId',uploadProfileController.uploadFile_get_by_taskId);


// router.post('/delete',verifyToken,uploadProfileController.deleteUploadFile);

// router.get('/download/:projectId/:taskId/:filename',verifyToken,uploadProfileController.downloadUploadFile);


module.exports = router;