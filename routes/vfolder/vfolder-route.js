const express = require('express');
const router = express.Router();
const vFolderController = require("../../controllers/vfolder/vfolder-controller")

router.get("/getVFolders/:companyId" , vFolderController.getVFolders)

router.post("/renameVFolder" , vFolderController.renameVFolder)

module.exports = router;