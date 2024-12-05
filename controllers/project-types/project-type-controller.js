const mongoose = require("mongoose");
const ProjectType = require("../../models/project-types/project-types-model");
const audit = require("../audit-log/audit-log-controller");
const AuditLogs = require("../../models/auditlog/audit-log-model");

exports.create_project_type = async (req, res) => {
  console.log("create_project_type request received");
  try {
    const { projectType, companyId, createdBy, createdOn } = req.body;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: "Company ID is required." });
    }

    if (!projectType) {
      return res.status(400).json({
        success: false,
        error: "Project type is required.",
      });
    }

    const newProjectType = new ProjectType({
      projectType,
      companyId,
      createdBy,
      createdOn: createdOn || new Date(),
      modifiedBy: createdBy,
      modifiedOn: new Date(),
    });

    console.log("New Project Type:", newProjectType);

    const result = await newProjectType.save();

    const fieldsToAudit = ["projectType", "companyId", "createdBy"];
    fieldsToAudit.forEach((field) => {
      if (
        result[field] !== undefined &&
        result[field] !== null &&
        result[field] !== ""
      ) {
        audit.insertAuditLog(
          "",
          result.projectType,
          "ProjectType",
          field,
          result[field],
          createdBy,
          result._id
        );
      }
    });

    return res.status(201).json({
      success: true,
      message: "Project type created successfully!",
      projectType: result,
    });
  } catch (error) {
    console.error("Error creating project type:", error);
    return res
      .status(500)
      .json({ success: false, error: "Error creating project type." });
  }
};

// Get project types by company
exports.get_project_types_by_company = async (req, res) => {
  try {
    const { companyId } = req.body;

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }

    // Fetch project types where isDeleted is not true
    const projectTypes = await ProjectType.find({
      companyId,
      isDeleted: { $ne: true },
    });

    return res.status(200).json({ success: true, projectTypes });
  } catch (error) {
    console.error(
      "Error fetching project types for companyId:",
      companyId,
      error
    );
    return res
      .status(500)
      .json({ success: false, error: "Failed to load project types." });
  }
};

exports.delete_project_type = async (req, res) => {
  try {
    const { id } = req.params;

    // Perform a soft delete by marking isDeleted as true
    const deletedProjectType = await ProjectType.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true } // Return the updated document
    );

    if (!deletedProjectType) {
      return res
        .status(404)
        .json({ success: false, message: "Project type not found." });
    }
    // Insert audit log for deletion
    audit.insertAuditLog(
      "delete",
      deletedProjectType.projectType,
      "ProjectType",
      "isDeleted",
      true,
      deletedProjectType.modifiedBy,
      id
    );

    return res.status(200).json({
      success: true,
      message: "Project type marked as deleted successfully.",
      data: deletedProjectType,
    });
  } catch (error) {
    console.error("Error deleting project type:", error);
    return res
      .status(500)
      .json({ success: false, error: "Error deleting project type." });
  }
};

// Update a project type by ID
exports.update_project_type = async (req, res) => {
  try {
    const { id } = req.params;
    const { modifiedBy, ...updateData } = req.body;

    const updatedProjectType = await ProjectType.findByIdAndUpdate(
      id,
      { ...updateData, modifiedOn: new Date(), modifiedBy },
      { new: true } // Return the updated document
    );

    if (!updatedProjectType) {
      return res
        .status(404)
        .json({ success: false, message: "Project type not found." });
    }

    // Insert audit logs for updated fields
    Object.keys(updateData).forEach((field) => {
      audit.insertAuditLog(
        "update",
        updatedProjectType.projectType,
        "ProjectType",
        field,
        updateData[field],
        modifiedBy,
        id
      );
    });

    return res.status(200).json({
      success: true,
      message: "Project type updated successfully.",
      data: updatedProjectType,
    });
  } catch (error) {
    console.error("Error updating project type:", error);
    return res
      .status(500)
      .json({ success: false, error: "Error updating project type." });
  }
};
