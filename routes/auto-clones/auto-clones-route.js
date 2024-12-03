const express = require('express');
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var autoCloneController = require('../../controllers/auto-clone/auto-clone-controller');

//Read One
router.post('/getautoCloneData',verifyToken,autoCloneController.getAutoClonByProjectId);


// CREATE
router.post('/',verifyToken, autoCloneController.createAutoClone);

// UPDATE
 router.post('/update',verifyToken, autoCloneController.updateAutoClone);

// // DELETE
// router.post('/delete',verifyToken, autoCloneController.deleteAutoClone);

module.exports = router;