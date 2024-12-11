const express = require('express');
const router = express.Router();
var uploadglobalFileController = require('../controllers/golbal-repository-controller');
const verifyAppLevelAccess = require("../../../verify-app-level-access/verify-app-level-access");
const verifyToken = require("../../../verify-token/verify-token");

//add/upload file
// router.post('/uploadVisitingCards', uploadglobalFileController.uploadVisitingCards);

router.post('/add', uploadglobalFileController.postUploadFile);
//get All file
router.post('/getAllFile', uploadglobalFileController.getAllRepositoryFile);

//get All contacts file
router.post('/getAllContactFile', uploadglobalFileController.getAllContactsFile);


//get singlefile

router.get('/:fileId', uploadglobalFileController.getRepositoryFile);

//delete file
router.post('/delete', uploadglobalFileController.deleteUploadFile);

//download file

router.post('/download', uploadglobalFileController.downloadUploadFile);

//Edit File
router.post('/edit', uploadglobalFileController.editRepositoryFile);

//Add/create folder

router.post('/createFolder', uploadglobalFileController.createFolder);

module.exports = router;

