const mongoose = require("mongoose");
const ProjectStage = require("../../models/project-stages/project-stages-model");
const Project = require("../../models/project/project-model");
const Task = require("../../models/task/task-model");
const audit = require("../audit-log/audit-log-controller");

exports.create_project_stage = async (req, res) => {
  try {
    const { sequence, title, displayName, show, companyId, createdBy } = req.body;

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
      createdBy,
      createdOn: new Date(),
      modifiedBy: createdBy,
      modifiedOn: new Date(),
    });

    const result = await newStage.save();

    // Insert audit logs
    ["sequence", "title", "displayName", "show", "companyId"].forEach((field) => {
      if (result[field] !== undefined) {
        audit.insertAuditLog(
          "",
          result.title,
          "ProjectStage",
          field,
          result[field],
          createdBy,
          result._id
        );
      }
    });

    return res.status(201).json({
      success: true,
      stage: result,
      message: "Project stage added successfully.",
    });
  } catch (error) {
    console.error("Error creating project stage:", error);
    return res.status(500).json({
      success: false,
      error: "Error in adding project stage.",
    });
  }
};

exports.get_project_stages_by_company = async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }

    const stages = await ProjectStage.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
    });

    const stagesWithProjectAndTaskCount = await ProjectStage.aggregate([
      {
        $match: { 
          companyId: new mongoose.Types.ObjectId(companyId), 
          isDeleted: { $ne: true } 
        }
      },
      {
        $lookup: {
          from: "projects",
          let: { stageId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ["$projectStageId", "$$stageId"] },
              { $ne: ["$isDeleted", true] } // Exclude deleted projects
            ] } } },
            {
              $lookup: {
                from: "tasks",
                let: { projectId: "$_id" },
                pipeline: [
                  { $match: { $expr: { $and: [
                    { $eq: ["$projectId", "$$projectId"] },
                    { $ne: ["$isDeleted", true] } // Exclude deleted tasks
                  ] } } }
                ],
                as: "tasks"
              }
            }
          ],
          as: "projects"
        }
      },
      {
        $addFields: {
          projectCount: { $size: "$projects" }, // Count only non-deleted projects
          totalTasks: {
            $sum: {
              $map: {
                input: "$projects",
                as: "proj",
                in: { $size: "$$proj.tasks" } // Count only non-deleted tasks
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          projectCount: 1,
          totalTasks: 1
        }
      }
    ]);
    
    

    if (stages.length === 0) {
      return res
        .status(404)
        .json({ error: "No project stages found for this company." });
    }

    return res.status(200).json({ success: true, stages, stagesWithProjectAndTaskCount });
  } catch (error) {
    console.error("Error fetching project stages:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load project stages." });
  }
};

exports.update_project_stage = async (req, res) => {
  try {
    const { id } = req.params;
    const { modifiedBy, ...updateData } = req.body;

    const updatedStage = await ProjectStage.findByIdAndUpdate(
      id,
      { ...updateData, modifiedOn: new Date(), modifiedBy },
      { new: true }
    );

    if (!updatedStage) {
      return res
        .status(404)
        .json({ success: false, message: "Project stage not found." });
    }

    // Insert audit logs for updated fields
    Object.keys(updateData).forEach((field) => {
      audit.insertAuditLog(
        "update",
        updatedStage.title,
        "ProjectStage",
        field,
        updateData[field],
        modifiedBy,
        id
      );
    });

    return res.status(200).json({
      success: true,
      updatedStage,
      message: "Project stage updated successfully.",
    });
  } catch (error) {
    console.error("Error updating project stage:", error);
    return res.status(500).json({ success: false, error: "Error updating project stage." });
  }
};

exports.delete_project_stage = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedStage = await ProjectStage.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    // if (deletedStage) {
    //   await Project.updateMany(
    //     { projectStageId: deletedStage._id },
    //     { $set: { isDeleted: true } }
    //   );
    // }

    if (deletedStage) {  
      await Project.updateMany(
        { projectStageId: deletedStage._id },
        { $set: { isDeleted: true } }
      );
      const projectIdArray = await Project.distinct("_id", { projectStageId: deletedStage._id });
      console.log(projectIdArray, "project array")
      if (projectIdArray.length > 0) {
        await Task.updateMany(
          { projectId: { $in: projectIdArray } },
          { $set: { isDeleted: true } }
        );
      }
    }
    if (!deletedStage) {
      return res
        .status(404)
        .json({ success: false, message: "Project stage not found." });
    }

    // Insert audit log for deletion
    audit.insertAuditLog(
      "delete",
      deletedStage.title,
      "ProjectStage",
      "isDeleted",
      true,
      deletedStage.modifiedBy,
      id
    );

    return res.status(200).json({
      success: true,
      message: "Project stage marked as deleted successfully.",
      data: deletedStage,
    });
  } catch (error) {
    console.error("Error deleting project stage:", error);
    return res.status(500).json({ success: false, error: "Error deleting project stage." });
  }
};

exports.reorder_project_stages = async (req, res) => {
  try {
    const { companyId, stages, modifiedBy } = req.body;

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

    const updatePromises = stages.map((stage) =>
      ProjectStage.findByIdAndUpdate(
        stage._id,
        { sequence: stage.sequence, modifiedOn: new Date(), modifiedBy },
        { new: true }
      )
    );

    const results = await Promise.all(updatePromises);

    // Insert audit logs for reordered stages
    results.forEach((result) => {
      audit.insertAuditLog(
        "update",
        result.title,
        "ProjectStage",
        "sequence",
        result.sequence,
        modifiedBy,
        result._id
      );
    });

    return res.status(200).json({
      success: true,
      message: "Project stages reordered successfully.",
    });
  } catch (error) {
    console.error("Error reordering project stages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reorder project stages.",
    });
  }
};
