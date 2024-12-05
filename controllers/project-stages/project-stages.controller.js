const mongoose = require("mongoose");
const ProjectStage = require("../../models/project-stages/project-stages-model");

exports.create_project_stage = async (req, res) => {
  // console.log(res, "response ", req , "  request")
  try {
    const { sequence, title, displayName, show, companyId } = req.body;
    console.log(title, "title");
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: "Company ID is required." });
    }
    if (!title || !displayName) {
      return res.status(400).json({
        success: false,
        error: "Title and display name are required.",
      });
    }
    const newStage = new ProjectStage({
      sequence,
      title,
      displayName,
      show,
      companyId,
    });

    await newStage.save();
    return res.status(201).json({
      success: true,
      stage: newStage,
      message: "Project stage added successful",
    });
  } catch (error) {
    console.error("Error creating project stage:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "error in adding project stage",
    });
  }
};

exports.get_project_stages_by_company = async (req, res) => {
  try {
    const { companyId } = req.body;
    console.log("CompanyId:", companyId);

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }

    // Fetch project stages where companyId matches and isDeleted is not true
    const stages = await ProjectStage.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
    });

    if (stages.length === 0) {
      return res
        .status(404)
        .json({ error: "No project stages found for this company." });
    }

    return res.status(200).json({ success: true, stages });
  } catch (error) {
    console.error(
      "Error fetching project stages for companyId:",
      companyId,
      error
    );
    return res
      .status(500)
      .json({ success: false, error: "Failed to load project stages." });
  }
};


// Update a project stage by ID
exports.update_project_stage = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedStage = await ProjectStage.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedStage) {
      return res.status(404).json({ message: "Project stage not found." });
    }
    return res.json({
      updatedStage,
      success: true,
      message: "Project stage updated successful.",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Delete a project stage by ID
exports.delete_project_stage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStage = await ProjectStage.findByIdAndDelete(id);
    if (!deletedStage) {
      return res
        .status(404)
        .json({ success: false, message: "Project stage not found." });
    }
    return res.json({
      success: true,
      message: "Project stage delete successful.",
    });
  } catch (error) {
    return res.json({
      error: error.message,
      success: false,
      message: "error in delete project stage.",
    });
  }
};

// Reorder project stages
exports.reorder_project_stages = async (req, res) => {
  try {
    const { companyId, stages } = req.body;

    // Check if the required data is provided
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: "Company ID is required." });
    }

    if (!stages || !Array.isArray(stages)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid stages data." });
    }

    // Loop through the stages and update the sequence in the database
    const updatePromises = stages.map((stage) => {
      return ProjectStage.findByIdAndUpdate(
        stage._id,
        { sequence: stage.sequence },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    return res.status(200).json({
      success: true,
      message: "Project stages reordered successfully.",
    });
  } catch (error) {
    console.error("Error reordering project stages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reorder project stages.",
      error: error.message,
    });
  }
};
