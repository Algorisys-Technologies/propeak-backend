const express = require('express');
const router = express.Router();
const vFolderController = require("../../controllers/vfolder/vfolder-controller")

router.get("/getVFolders/:companyId" , vFolderController.getVFolders)

module.exports = router;