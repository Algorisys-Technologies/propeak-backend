//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
const vFolderController = require("../../controllers/vfolder/vfolder-controller");

router.get("/getVFolders/:companyId", vFolderController.getVFolders);

router.post("/renameVFolder", vFolderController.renameVFolder);

router.post("/deleteVFolder", vFolderController.deleteVFolder);

// Upload Contact Config routes
router.post(
  "/createUploadContactConfig",
  vFolderController.createUploadContactConfig
);

router.put(
  "/updateUploadContactConfig/:id",
  vFolderController.updateUploadContactConfig
);

router.get(
  "/getUploadContactConfig/:companyId/:groupId?",
  vFolderController.getUploadContactConfig
);

module.exports = router;
