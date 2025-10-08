const Feature = require("../../models/feature/feature-model");
const permissionModel = require("../../models/permission/permission-model");
const rolePermissionModel = require("../../models/role-permission/role-permission-model");
const roleModel = require("../../models/role/role-model");
const userModel = require("../../models/user/user-model");
const { DEFAULT_PAGE, DEFAULT_QUERY, DEFAULT_LIMIT } = require("../../utils/defaultValues");

// Get Feature by ID
exports.getFeatureById = async (req, res) => {
  try {
    const { id } = req.body;
    const feature = await Feature.findById(id);
    if (!feature) {
      return res.status(404).json({ message: "Feature not found" });
    }
    res.json(feature);
  } catch (error) {
    console.error("Error getting feature by ID:", error);
    res.status(500).json({ message: "Error retrieving feature" });
  }
};

// Get All Features
exports.getAllFeatures = async (req, res) => {
  const { page = DEFAULT_PAGE, q = DEFAULT_QUERY } = req.query;
  const regex = new RegExp(q, "i");
  const limit = DEFAULT_LIMIT;
  try {
    const features = await Feature.find({
      $or: [
        { name: { $regex: regex} },
      ],
      isSystem: false}
    ).skip(page*limit).limit(limit);
    const totalCount = await Feature.countDocuments( 
      {$or: [
      { name: { $regex: regex} },
      ],
      isSystem: false
    });
    const totalPages = Math.ceil(totalCount/limit);
    res.json({features, totalCount, totalPages});
  } catch (error) {
    console.error("Error getting features:", error);
    res.status(500).json({ message: "Error retrieving features" });
  }
};

exports.GetAllFeatures = async (req, res) => {
  const { userId } = req.query;

  // Get the user with their role
  const user = await userModel.findOne({ _id: userId }).select("role");

  // Use the user's role (not user._id)
  const role = await roleModel.findOne({ name: user.role }).select("_id");

  // Get role permissions
  const rolePermissions = await rolePermissionModel.find({ roleId: role._id }).select("permissionId")

  // Get permissions based on rolePermissions
  const permissions = await permissionModel.find({ 
    _id: { $in: rolePermissions.map(rp => rp.permissionId) }  // use permissionId if stored
  }).select("featureId");

  let features;
  try {
      features = await Feature.find({ 
        _id: { $in: permissions.map(p => p.featureId) } 
      });
    if(user.role === "ADMIN" || user.role === "Admin"){
      features = await Feature.find();
    }
    res.json(features);
  } catch (error) {
    console.error("Error getting features:", error);
    res.status(500).json({ message: "Error retrieving features" });
  }
};

exports.GetSystemFeatures = async (req, res) => {
  try {
    const features = await Feature.find();
    res.json(features);
  } catch (error) {
    console.error("Error getting features:", error);
    res.status(500).json({ message: "Error retrieving features" });
  }
};

// Create Feature
exports.createFeature = async (req, res) => {
  try {
    const { name, desc, route, isSystem } = req.body;
    const validation = validateFeature({ name, route });
    if (!validation.valid) {
        return res.json({
        success: false,
        message: validation.error
      });
    }
    const newFeature = new Feature({ name, description: desc, route, isSystem });
    await newFeature.save();
    res.json({
      success: true,
      message: "Feature added successful.",
      feature: newFeature,
    });
  } catch (error) {
    console.error("Error creating feature:", error);
    res.status(500).json({ message: "Error creating feature" });
  }
};

// Update Feature by ID
exports.updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, desc, route, isSystem } = req.body;
    const validation = validateFeature({ name, route });
    if (!validation.valid) {
        return res.json({
        success: false,
        message: validation.error
      });
    }

    // Update the feature
    const updatedFeature = await Feature.findByIdAndUpdate(
      id,
      { name, description: desc, route, isSystem },
      { new: true, runValidators: true }
    );

    if (!updatedFeature) {
      return res.status(404).json({ message: "Feature not found" });
    }

    res.json({
      success: true,
      message: "Feature Updated successful",
      feature: updatedFeature,
    });
  } catch (error) {
    console.error("Error updating feature:", error);
    res.status(500).json({ message: "Error updating feature" });
  }
};

// Delete Feature by ID
exports.deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFeature = await Feature.findByIdAndDelete(id);
    if (!deletedFeature) {
      return res.status(404).json({ message: "Feature not found" });
    }
    res.json({ success: true, message: "Feature Deleted successful." });
  } catch (error) {
    console.error("Error deleting feature:", error);
    res.status(500).json({ message: "Error deleting feature" });
  }
};

const validateFeature = ({ name, route }) => {
  if (name == "" || route == "") {
    return { valid: false, error: "All fields marked with an asterisk (*) are mandatory." };
  }

  return { valid: true };
};