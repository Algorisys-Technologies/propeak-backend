const Permission = require("../../models/permission/permission-model");
const mongoose = require("mongoose");

// Get all permissions
exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().populate("featureId");
    res.json(permissions);
  } catch (error) {
    console.error("Error getting permissions:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Create a new permission
exports.createPermission = async (req, res) => {
  try {
    const { name, featureId } = req.body;
    if(name == ""){
      return res.json({
        success: false, message: "Please enter Permission name."
      })
    }
    const existingPermission = await Permission.findOne({
      name
    });
    if(existingPermission){
      return res.json({
        success: false, message: "Permission name already exist."
      })
    }
    const permission = new Permission({
      name,
      featureId: (featureId),
    });
    await permission.save();
    res
      .status(201)
      .json({ success: true, message: "Permission Created", permission });
  } catch (error) {
    console.error("Error creating permission:", error);
    return res.status(400).json({ message: "Bad Request" });
  }
};

// Update an existing permission
exports.updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, featureId } = req.body;

    if(name == ""){
      return res.json({
        success: false, message: "Please enter Permission name."
      })
    }
    
    const permission = await Permission.findByIdAndUpdate(
      id,
      { name, featureId: (featureId) },
      { new: true }
    );
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }
    res.json({ success: true, message: "Permission Updated", permission });
  } catch (error) {
    console.error("Error updating permission:", error);
    return res.status(400).json({ message: "Bad Request" });
  }
};

// Delete a permission
exports.deletePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Permission.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: "Permission not found" });
    }
    res.json({ success: true, message: "Permission Deleted" });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get permissions by feature ID
exports.getPermissionsByFeatureId = async (req, res) => {
  try {
    const { featureId } = req.body;
    const permissions = await Permission.find({
      featureId: (featureId),
    });
    res.json(permissions);
  } catch (error) {
    console.error("Error getting permissions by feature ID:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get permissions by user ID
exports.getPermissionsByUserId = async (req, res) => {
  try {
    const { userId } = req.body;

    const permissions = await Permission.aggregate([
      {
        $lookup: {
          from: "rolepermissions",
          localField: "_id",
          foreignField: "permissionId",
          as: "rolePermissions",
        },
      },
      {
        $unwind: "$rolePermissions",
      },
      {
        $lookup: {
          from: "userroles",
          localField: "rolePermissions.roleId",
          foreignField: "roleId",
          as: "userRoles",
        },
      },
      {
        $unwind: "$userRoles",
      },
      {
        $match: { "userRoles.userId": new mongoose.Types.ObjectId(userId) },
      },
      {
        $project: { name: 1 },
      },
    ]);

    res.json(permissions);
  } catch (error) {
    console.error("Error getting permissions by user ID:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// Get role permissions for a specific permission
exports.getRolePermissions = async (req, res) => {
  try {
    const { id } = req.body;
    const rolePermissions = await conn
      .get()
      .collection("RolePermissions")
      .find({ permissionId: new mongoose.Types.ObjectId(id) })
      .toArray();
    res.json(rolePermissions);
  } catch (error) {
    console.error("Error getting role permissions:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get feature details associated with a permission
exports.getFeature = async (req, res) => {
  try {
    const { id } = req.body;
    const permission = await Permission.findById(mongoose.Types.ObjectId(id));
    if (permission) {
      const feature = await conn
        .get()
        .collection("Features")
        .findOne({ _id: permission.featureId });
      return res.json(feature);
    }
    return res.status(404).json({ message: "Permission not found" });
  } catch (error) {
    console.error("Error getting feature:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get permissions by role
exports.getPermissionsByRole = async (req, res) => {
  try {
    const { role } = req.body;
    const permissions = await Permission.aggregate([
      {
        $lookup: {
          from: "RolePermissions",
          localField: "_id",
          foreignField: "permissionId",
          as: "rolePermissions",
        },
      },
      {
        $lookup: {
          from: "Roles",
          localField: "rolePermissions.roleId",
          foreignField: "_id",
          as: "roles",
        },
      },
      {
        $match: { "roles.name": role },
      },
    ]);

    res.json(permissions);
  } catch (error) {
    console.error("Error getting permissions by role:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
