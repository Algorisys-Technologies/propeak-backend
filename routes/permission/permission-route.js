//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const permissionController = require("../../controllers/permission/permission-controller");

router.get("/GetPermissions", permissionController.getAllPermissions);
router.post("/CreatePermission", permissionController.createPermission);
router.put("/UpdatePermission/:id", permissionController.updatePermission);
router.delete("/DeletePermission/:id", permissionController.deletePermission);
router.post(
  "/GetPermissionsByFeatureId",
  permissionController.getPermissionsByFeatureId
);
router.post(
  "/GetPermissionsByUserId",
  permissionController.getPermissionsByUserId
);

module.exports = router;
