const Role = require("../../models/role/role-model");

exports.getSystemRoles = async (req, res) => {
  try {
    const {companyId} = req.params
    const roles = await Role.find({ $or:[ {companyId: null}, {companyId: companyId}]});
    res.json(roles);
  } catch (error) {
    console.error("Error getting roles:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getRolesByCompanyId = async (req, res) => {
  try {
    const {companyId} = req.params
    const roles = await Role.find({companyId: companyId});
    res.json(roles);
  } catch (error) {
    console.error("Error getting roles:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.createRole = async (req, res) => {
  console.log("......123");
  console.log(req.body, "request body.............");
  
  try {
    const { name, companyId } = req.body;

    const existingRole = await Role.findOne({ name, companyId });

    if (existingRole) {
      return res.json({ success: false, message: "Role with the same name already exists." });
    }

    const role = new Role(req.body);
    await role.save();
    
    return res.json({ success: true, message: "Role added successfully." });
  } catch (error) {
    console.error("Error creating role:", error);
    return res.json({ success: false, message: "Error in adding role." });
  }
};

// exports.createRole = async (req, res) => {
//   console.log("......123");
//   console.log(req.body, "request body.............")
//   try {
//     const role = new Role(req.body);
//     await role.save();
//     // res.status(201).json(role);
//     return res.json({success: true, message: "role added successful."});
//   } catch (error) {
//     console.error("Error creating role:", error);
//     return res.json({success: false, message: "error in added role."});
//   }
// };

exports.updateRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    // res.json(role);
    return res.json({success: true, message: "role updated successful."});
  } catch (error) {
    return res.json({success: false, message: "error in updated role."});
    console.error("Error updating role:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const result = await Role.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: "Role not found" });
    }
    res.json({ message: "Role deleted" });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
