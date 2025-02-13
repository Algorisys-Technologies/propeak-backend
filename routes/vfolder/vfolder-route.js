const express = require('express');
const router = express.Router();
const vFolderController = require("../../controllers/vfolder/vfolder-controller")

router.get("/getVFolders/:companyId" , vFolderController.getVFolders)

router.post("/renameVFolder" , vFolderController.renameVFolder)

router.post("/deleteVFolder", vFolderController.deleteVFolder)

module.exports = router;