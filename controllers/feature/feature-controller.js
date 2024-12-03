const Feature = require("../../models/feature/feature-model");

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
  try {
    const features = await Feature.find({isSystem: false});
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
