const express = require("express");
const router = express.Router();
const rolePermissionController = require("../../controllers/role-permission/role-permission-controller");

router.get(
  "/GetRolePermissions",
  rolePermissionController.getAllRolePermissions
);
router.post(
  "/CreateRolePermissions",
  rolePermissionController.createRolePermission
);
router.put(
  "/UpdateRolePermissions/:id",
  rolePermissionController.updateRolePermission
);
router.post(
  "/DeleteRolePermissionsByRoleId",
  rolePermissionController.deleteRolePermissionsByRoleId
);

module.exports = router;
