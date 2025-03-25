const {
  CompanyProjectConfig,
} = require("../../models/project/company-project-config-model");

// Create Project Configuration
const createProjectConfig = async (req, res) => {
  const { companyId, groupId, projectId, level, config } = req.body;
  console.log("In Create");
  try {
    const projectConfig = new CompanyProjectConfig({
      companyId,
      groupId,
      projectId,
      level,
      config,
    });
    await projectConfig.save();
    return res.status(201).json({ success: true, projectConfig });
  } catch (error) {
    console.error("Error creating project configuration:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Project Configuration by Company ID
const getProjectConfig = async (req, res) => {
  const { companyId, projectId } = req.params;

  try {
    let projectConfig;
    if (projectId == "global") {
      projectConfig = await CompanyProjectConfig.findOne({
        companyId,
        level: "global",
      });
    } else {
      projectConfig = await CompanyProjectConfig.findOne({
        companyId,
        projectId,
      });
      if (!projectConfig) {
        projectConfig = await CompanyProjectConfig.findOne({
          companyId,
          level: "global",
        });
        if (!projectConfig) {
          return res
            .status(404)
            .json({ success: false, message: "Configuration not found" });
        }
      }
    }

    return res.status(200).json({ success: true, projectConfig });
  } catch (error) {
    console.error("Error fetching project configuration:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getGroupProjectConfig = async (req, res) => {
  const { companyId, groupId } = req.params;

  try {
    let projectConfig;

    projectConfig = await CompanyProjectConfig.findOne({
      companyId,
      groupId,
    });
    if (!projectConfig) {
      projectConfig = await CompanyProjectConfig.findOne({
        companyId,
        groupId,
        level: "group",
      });
      if (!projectConfig) {
        return res
          .status(404)
          .json({ success: false, message: "Configuration not found" });
      }
    }

    return res.status(200).json({ success: true, projectConfig });
  } catch (error) {
    console.error("Error fetching project configuration:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProjectConfig = async (req, res) => {
  const { id } = req.params;
  const { config } = req.body;

  try {
    // Update based on both companyId and config ID
    const projectConfig = await CompanyProjectConfig.findOneAndUpdate(
      { _id: id },
      { config },
      { new: true, runValidators: true }
    );

    if (!projectConfig) {
      return res
        .status(404)
        .json({ success: false, message: "Configuration not found" });
    }

    return res.status(200).json({ success: true, projectConfig });
  } catch (error) {
    console.error("Error updating project configuration:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Project Configuration by Company ID
const deleteProjectConfig = async (req, res) => {
  const { id } = req.params;

  try {
    const projectConfig = await CompanyProjectConfig.findOneAndDelete({
      _id: id,
    });

    if (!projectConfig) {
      return res
        .status(404)
        .json({ success: false, message: "Configuration not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Configuration deleted successfully" });
  } catch (error) {
    console.error("Error deleting project configuration:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProjectConfig,
  getProjectConfig,
  updateProjectConfig,
  deleteProjectConfig,
  getGroupProjectConfig,
};
