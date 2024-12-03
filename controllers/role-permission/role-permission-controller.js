const RolePermission = require("../../models/role-permission/role-permission-model");
const mongoose = require("mongoose");

exports.getAllRolePermissions = async (req, res) => {
  try {
    const rolePermissions = await RolePermission.find().populate(
      "roleId permissionId"
    );
    res.json(rolePermissions);
  } catch (error) {
    console.error("Error getting role permissions:", error);
    res.status(500).json({ error: "Error getting role permissions" });
  }
};

exports.createRolePermission = async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;

    console.log("reqBodysss", req.body);

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid roleId",
      });
    }

    if (
      !permissionId ||
      typeof permissionId !== "object" ||
      !permissionId._id
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid permissionId structure",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(permissionId._id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid permissionId._id",
      });
    }

    // Check if the role permission already exists
    // const existingRolePermission = await RolePermission.findOne({
    //   roleId: (roleId),
    //   permissionId: (permissionId._id),
    // });

    // if (existingRolePermission) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "RolePermission already exists",
    //   });
    // }

    const rolePermission = new RolePermission({
      roleId: (roleId),
      permissionId: (permissionId._id), // Use permissionId._id here
    });

    await rolePermission.save();

    res.json({
      success: true,
      message: "RolePermission Created",
      rolePermission,
    });
  } catch (error) {
    console.error("Error creating role permission:", error);
    res.status(500).json({ error: "Error creating role permission" });
  }
};

exports.updateRolePermission = async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;
    const updatedRolePermission = await RolePermission.findByIdAndUpdate(
      req.params.id,
      {
        roleId: (roleId),
        permissionId: (permissionId),
      },
      { new: true }
    );
    res.json({
      success: true,
      message: "RolePermission Updated",
      updatedRolePermission,
    });
  } catch (error) {
    console.error("Error updating role permission:", error);
    res.status(500).json({ error: "Error updating role permission" });
  }
};

exports.deleteRolePermissionsByRoleId = async (req, res) => {
  try {
    const { roleId } = req.body;
    console.log(roleId)
    await RolePermission.deleteMany({
      roleId: roleId,
    });
    res.json({ success: true, message: "RolePermissions Deleted for Role" });
  } catch (error) {
    console.error("Error deleting role permissions by roleId:", error);
    res
      .status(500)
      .json({ error: "Error deleting role permissions by roleId" });
  }
};
