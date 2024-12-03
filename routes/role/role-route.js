const express = require("express");
const router = express.Router();
const roleController = require("../../controllers/role/role-controller");

router.get("/GetSystemRoles/:companyId", roleController.getSystemRoles);

router.get("/GetRoles/:companyId", roleController.getRolesByCompanyId);
router.post("/CreateRole", roleController.createRole);
router.put("/UpdateRole/:id", roleController.updateRole);
router.delete("/DeleteRole/:id", roleController.deleteRole);

module.exports = router;
