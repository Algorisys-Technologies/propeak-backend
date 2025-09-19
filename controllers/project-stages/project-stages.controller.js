const mongoose = require("mongoose");
const ProjectStage = require("../../models/project-stages/project-stages-model");
const GroupProjectStage = require("../../models/project-stages/group-project-stages-model");
const Project = require("../../models/project/project-model");
const Task = require("../../models/task/task-model");
const audit = require("../audit-log/audit-log-controller");

exports.create_project_stage = async (req, res) => {
  try {
    const { sequence, title, displayName, show, companyId, createdBy } =
      req.body;

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
    ["sequence", "title", "displayName", "show", "companyId"].forEach(
      (field) => {
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
      }
    );

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

exports.select_project_stages = async (req, res) => {
  try {
    const { companyId} = req.body;

    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }

    const stages = await ProjectStage.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
    }).select("_id displayName title");

    return res
      .status(200)
      .json({ success: true, stages });
  } catch (error) {
    console.error("Error fetching project stages:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load project stages." });
  }
}

exports.get_project_stages_by_company = async (req, res) => {
  try {
    const { companyId, query, page } = req.body;
    const regex = new RegExp(query, "i");
    const limit = 5;

    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }

    const stages = await ProjectStage.find({
      $or: [{ title: { $regex: regex } }, { displayName: { $regex: regex } }],
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
    }).skip(page * limit).limit(limit);

    const totalCount = await ProjectStage.countDocuments({
      $or: [{ title: { $regex: regex } }, { displayName: { $regex: regex } }],
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
    });

    const totalPages = Math.ceil(totalCount/limit); 

    const stagesWithProjectCount = await ProjectStage.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "projects",
          let: { stageId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$projectStageId", "$$stageId"] },
                    { $ne: ["$isDeleted", true] }, // only active projects
                  ],
                },
              },
            },
            { $limit: 1 }, // Take only the first record
            { $count: "count" }, // directly count in the lookup stage
          ],
          as: "projectStats",
        },
      },
      {
        $addFields: {
          projectCount: {
            $ifNull: [{ $arrayElemAt: ["$projectStats.count", 0] }, 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          projectCount: 1,
        },
      },
    ]);    

    if (stages.length === 0) {
      return res
        .status(404)
        .json({ error: "No project stages found for this company." });
    }

    return res
      .json({ success: true, stages, stagesWithProjectCount, totalCount, totalPages });
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
    return res
      .status(500)
      .json({ success: false, error: "Error updating project stage." });
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
      const projectIdArray = await Project.distinct("_id", {
        projectStageId: deletedStage._id,
      });
      console.log(projectIdArray, "project array");
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
    return res
      .status(500)
      .json({ success: false, error: "Error deleting project stage." });
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

exports.create_group_project_stage = async (req, res) => {
  try {
    const {
      sequence,
      title,
      displayName,
      show,
      companyId,
      groupId,
      createdBy,
    } = req.body;

    console.log("req.body...create_group_project_stage", req.body);

    if (!companyId || !groupId) {
      return res.status(400).json({
        success: false,
        error: "Company ID and Group ID are required.",
      });
    }

    if (!title || !displayName) {
      return res.status(400).json({
        success: false,
        error: "Title and display name are required.",
      });
    }

    const newStage = new GroupProjectStage({
      sequence,
      title,
      displayName,
      show: show === "on",
      companyId,
      groupId,
      createdBy,
      createdOn: new Date(),
      modifiedBy: createdBy,
      modifiedOn: new Date(),
    });

    const result = await newStage.save();

    // Insert audit logs
    [
      "sequence",
      "title",
      "displayName",
      "show",
      "companyId",
      "groupId",
    ].forEach((field) => {
      if (result[field] !== undefined) {
        audit.insertAuditLog(
          "",
          result.title,
          "GroupProjectStage",
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
      message: "Group-level project stage added successfully.",
    });
  } catch (error) {
    console.error("Error creating group-level project stage:", error);
    return res.status(500).json({
      success: false,
      error: "Error in adding group-level project stage.",
    });
  }
};

exports.get_project_stages_by_group = async (req, res) => {
  try {
    const { groupId, companyId, query, page } = req.body;
    const limit = 5;

    if (!groupId || !companyId) {
      return res
        .status(400)
        .json({ error: "Group ID and Company ID are required." });
    }

    const regex = new RegExp(query, "i");

    const stages = await GroupProjectStage.find({
      $or: [{ title: { $regex: regex } }, { displayName: { $regex: regex } }],
      groupId: new mongoose.Types.ObjectId(groupId),
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
    }).skip(page * limit).limit(limit);

    const totalCount = await GroupProjectStage.countDocuments({
      $or: [{ title: { $regex: regex } }, { displayName: { $regex: regex } }],
      groupId: new mongoose.Types.ObjectId(groupId),
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
    })

    const totalPages = Math.ceil(totalCount/limit);

    const stagesWithProjectAndTaskCount = await GroupProjectStage.aggregate([
      {
        $match: {
          groupId: new mongoose.Types.ObjectId(groupId),
          companyId: new mongoose.Types.ObjectId(companyId),
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "projects",
          let: { stageId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$projectStageId", "$$stageId"] },
                    { $ne: ["$isDeleted", true] }, // only active projects
                  ],
                },
              },
            },
            { $limit: 1 }, // Take only the first record
            { $count: "count" }, // directly count in the lookup stage
          ],
          as: "projectStats",
        },
      },
      {
        $addFields: {
          projectCount: {
            $ifNull: [{ $arrayElemAt: ["$projectStats.count", 0] }, 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          projectCount: 1,
        },
      },
    ]); 

    if (stages.length === 0) {
      return res
        .status(404)
        .json({ error: "No project stages found for this group." });
    }

    return res
      .status(200)
      .json({ success: true, stages, stagesWithProjectAndTaskCount, totalCount, totalPages });
  } catch (error) {
    console.error("Error fetching group project stages:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load group project stages." });
  }
};

exports.update_group_project_stage = async (req, res) => {
  try {
    const { id } = req.params;
    const { sequence, title, displayName, show, groupId, modifiedBy } =
      req.body;

    if (!id || !groupId) {
      return res
        .status(400)
        .json({ success: false, error: "ID and Group ID are required." });
    }

    const updatedStage = await GroupProjectStage.findByIdAndUpdate(
      id,
      {
        sequence,
        title,
        displayName,
        show: show === "on",
        groupId,
        modifiedBy,
        modifiedOn: new Date(),
      },
      { new: true }
    );

    if (!updatedStage) {
      return res
        .status(404)
        .json({ success: false, error: "Project stage not found." });
    }

    // Audit logging
    ["sequence", "title", "displayName", "show", "groupId"].forEach((field) => {
      if (req.body[field] !== undefined) {
        audit.insertAuditLog(
          "",
          updatedStage.title,
          "GroupProjectStage",
          field,
          req.body[field],
          modifiedBy,
          id
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: "Group-level project stage updated successfully.",
      stage: updatedStage,
    });
  } catch (error) {
    console.error("Error updating group-level project stage:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update group-level project stage.",
    });
  }
};

exports.reorder_group_project_stages = async (req, res) => {
  try {
    const { stages, groupId, companyId } = req.body;

    if (!groupId || !companyId || !Array.isArray(stages)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request body." });
    }

    const bulkOps = stages.map((stage, index) => ({
      updateOne: {
        filter: { _id: stage._id },
        update: { $set: { sequence: index + 1, modifiedOn: new Date() } },
      },
    }));

    await GroupProjectStage.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: "Stages reordered successfully.",
    });
  } catch (error) {
    console.error("Error reordering stages:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reorder project stages.",
    });
  }
};

exports.delete_group_project_stage = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupId, deletedBy } = req.body;

    if (!id || !groupId) {
      return res
        .status(400)
        .json({ success: false, error: "Stage ID and Group ID are required." });
    }

    const deletedStage = await GroupProjectStage.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        modifiedOn: new Date(),
        modifiedBy: deletedBy,
      },
      { new: true }
    );

    if (!deletedStage) {
      return res
        .status(404)
        .json({ success: false, error: "Project stage not found." });
    }

    // Audit logging
    audit.insertAuditLog(
      "",
      deletedStage.title,
      "GroupProjectStage",
      "isDeleted",
      true,
      deletedBy,
      id
    );

    return res.status(200).json({
      success: true,
      message: "Group-level project stage deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting group-level project stage:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete project stage.",
    });
  }
};

exports.migrateGlobalStagesToGroupStage = async (req, res) => {
  try {
    const { groupId, companyId, createdBy } = req.body;

    if (!groupId || !companyId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing groupId or companyId" });
    }

    console.log(
      "Starting migration process for groupId:",
      groupId,
      "and companyId:",
      companyId
    );

    // Step 1: Check if the "Unassigned" stage already exists for the group
    const existingUnassignedStage = await GroupProjectStage.findOne({
      title: "unassigned",
      groupId,
      companyId,
      isDeleted: { $ne: true },
    });

    let unassignedStage;
    if (existingUnassignedStage) {
      console.log(
        "Found existing 'Unassigned' stage:",
        existingUnassignedStage._id
      );
      unassignedStage = existingUnassignedStage;
    } else {
      console.log(
        "No existing 'Unassigned' stage found. Creating a new one..."
      );
      unassignedStage = await GroupProjectStage.create({
        title: "unassigned",
        displayName: "Unassigned",
        sequence: 0,
        show: true,
        groupId,
        companyId,
        createdBy,
        createdOn: new Date(),
        modifiedBy: createdBy,
        modifiedOn: new Date(),
      });
      console.log(
        "Created new 'Unassigned' stage with ID:",
        unassignedStage._id
      );
    }

    // Step 2: Get all global project stages for the given company
    console.log("Fetching global project stages for company:", companyId);
    const globalStages = await ProjectStage.find({
      companyId,
      isDeleted: { $ne: true },
    });

    const globalStageIds = globalStages.map((s) => s._id);
    console.log(
      `Found ${globalStageIds.length} global stages for company ${companyId}`
    );

    // Step 3: Update projects with matching groupId and global stage
    console.log(
      "Updating projects in group",
      groupId,
      "with 'Unassigned' group stage..."
    );
    const result = await Project.updateMany(
      {
        companyId,
        group: groupId,
        projectStageId: { $in: globalStageIds },
        isDeleted: { $ne: true },
      },
      {
        $set: {
          projectStageId: unassignedStage._id,
          isDeleted: false, // Prevent accidentally marking the project as deleted
        },
      }
    );

    console.log(
      `Successfully migrated ${result.modifiedCount} projects to 'Unassigned' group stage.`
    );
    return res.json({
      success: true,
      message: `✅ Migrated ${result.modifiedCount} projects to 'Unassigned' group stage.`,
    });
  } catch (error) {
    console.error("❌ Migration error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Migration failed" });
  }
};
