const { ProjectConfig } = require("../../models/project/project-config-model");

// Create a new Project Configuration
const createProjectConfig = async (req, res) => {
  try {
    const { projectId, groupId, config, level, companyId } = req.body;

    // Basic validation

    // Create a new ProjectConfig document
    const projectConfig = new ProjectConfig({
      projectId,
      groupId,
      config,
      level,
      companyId,
    });

    // Save to database
    const savedConfig = await projectConfig.save();
    res
      .status(201)
      .json({ message: "Project config created successfully", savedConfig });
  } catch (error) {
    console.error("Error creating project config:", error);
    res.status(500).json({ message: "Error creating project config", error });
  }
};

// Get all Project Configurations for a specific project
const getProjectConfigByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params;
    // Basic validation
    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    // Find the project configuration by projectId
    const projectConfig = await ProjectConfig.findOne({ projectId });

    if (!projectConfig) {
      return res.status(404).json({ message: "Project config not found" });
    }

    res.status(200).json(projectConfig);
  } catch (error) {
    console.error("Error fetching project config:", error);
    res.status(500).json({ message: "Error fetching project config", error });
  }
};

const getGlobalTaskConfig = async (req, res) => {
  try {
    console.log("In Get Global Task Config");
    const { companyId } = req.params;
    // Basic validation
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    // Find the project configuration by projectId
    const projectConfig = await ProjectConfig.findOne({
      level: "global",
      companyId,
    });
    console.log(projectConfig);

    if (!projectConfig) {
      return res.status(404).json({ message: "Project config not found" });
    }

    res.status(200).json(projectConfig);
  } catch (error) {
    console.error("Error fetching project config:", error);
    res.status(500).json({ message: "Error fetching project config", error });
  }
};

const getGroupTaskConfig = async (req, res) => {
  try {
    console.log("In Get Global Task Config");
    const { companyId, groupId } = req.params;
    // Basic validation
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    // Find the project configuration by projectId
    const projectConfig = await ProjectConfig.findOne({
      level: "group",
      companyId,
      groupId,
    });
    console.log(projectConfig);

    if (!projectConfig) {
      return res.status(404).json({ message: "Project config not found" });
    }

    res.status(200).json(projectConfig);
  } catch (error) {
    console.error("Error fetching project config:", error);
    res.status(500).json({ message: "Error fetching project config", error });
  }
};

const updateProjectConfig = async (req, res) => {
  const { id } = req.params;
  const { config } = req.body;

  try {
    // Update based on both companyId and config ID
    const projectConfig = await ProjectConfig.findOneAndUpdate(
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

// // Update a Project Configuration
// const updateProjectConfig = async (req, res) => {
//   try {
//     const { projectId } = req.params;
//     const { config } = req.body;

//     // Basic validation
//     if (!projectId || !Array.isArray(config)) {
//       return res.status(400).json({ message: "Invalid input data" });
//     }

//     // Find the project configuration and update it
//     const updatedConfig = await ProjectConfig.findOneAndUpdate(
//       { projectId },
//       { config },
//       { new: true }
//     );

//     if (!updatedConfig) {
//       return res.status(404).json({ message: "Project config not found" });
//     }

//     res
//       .status(200)
//       .json({ message: "Project config updated successfully", updatedConfig });
//   } catch (error) {
//     console.error("Error updating project config:", error);
//     res.status(500).json({ message: "Error updating project config", error });
//   }
// };

// Delete a Project Configuration
const deleteProjectConfig = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Basic validation
    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    // Find the project configuration and delete it
    const deletedConfig = await ProjectConfig.findOneAndDelete({ projectId });

    if (!deletedConfig) {
      return res.status(404).json({ message: "Project config not found" });
    }

    res.status(200).json({ message: "Project config deleted successfully" });
  } catch (error) {
    console.error("Error deleting project config:", error);
    res.status(500).json({ message: "Error deleting project config", error });
  }
};

module.exports = {
  createProjectConfig,
  getProjectConfigByProjectId,
  updateProjectConfig,
  deleteProjectConfig,
  getGlobalTaskConfig,
  getGroupTaskConfig,
};
