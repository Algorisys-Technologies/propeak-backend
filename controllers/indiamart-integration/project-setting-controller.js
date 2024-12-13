const ProjectSetting = require("../../models/indiamart-integration/project-setting-model");
const mongoose = require("mongoose");

// Create a new Project Setting
exports.createProjectSettings = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project ID is required." });
    }

    const existingSetting = await ProjectSetting.findOne({ projectId });
    if (existingSetting) {
      return res.status(400).json({
        success: false,
        message: "Project settings for this project already exist.",
      });
    }

    // Create a new ProjectSetting
    const projectSetting = new ProjectSetting(req.body);
    await projectSetting.save();

    res.status(201).json({ success: true, data: projectSetting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllProjectSettings = async (req, res) => {
  const { companyId, projectId } = req.body;

  if (!companyId) {
    return res
      .status(400)
      .json({ success: false, message: "Company ID is required" });
  }

  console.log(`Received companyId from request body: ${companyId}`);

  try {
    const projectSettings = await ProjectSetting.find({ companyId, projectId });

    if (!projectSettings.length) {
      return res.status(404).json({
        success: false,
        message: "No project settings found for the provided company ID",
      });
    }

    console.log(
      `Fetched project settings: ${JSON.stringify(projectSettings, null, 2)}`
    );

    res.status(200).json({ success: true, data: projectSettings });
  } catch (error) {
    console.error(`Error fetching project settings: ${error.message}`, error);

    res.status(500).json({
      success: false,
      message: "An error occurred while fetching project settings",
    });
  }
};

// Get a single Project Setting by ID
exports.getProjectSettingById = async (req, res) => {
  try {
    const projectSetting = await ProjectSetting.findById(req.params.id)
      .populate("companyId", "companyName")
      .populate("projectId", "title")
      .populate("taskStageId", "name");

    if (!projectSetting) {
      return res
        .status(404)
        .json({ success: false, message: "Project Setting not found" });
    }

    res.status(200).json({ success: true, data: projectSetting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProjectSettings = async (req, res) => {
  console.log("update project setting................");
  console.log(req.body, "request body of update...........");
  try {
    const projectSetting = await ProjectSetting.findByIdAndUpdate(
      req.body.id,
      req.body,
      { new: true, runValidators: true }
    );

    console.log(projectSetting, "projectSetting....................");
    if (!projectSetting) {
      return res
        .status(404)
        .json({ success: false, message: "Project Setting not found" });
    }

    res.status(200).json({ success: true, data: projectSetting });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
