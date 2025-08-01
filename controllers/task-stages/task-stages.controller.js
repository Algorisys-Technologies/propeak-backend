const mongoose = require("mongoose");
const TaskStage = require("../../models/task-stages/task-stages-model");
const GroupTaskStage = require("../../models/task-stages/group-task-stages-model");
const audit = require("../audit-log/audit-log-controller");
const Task = require("../../models/task/task-model");

// Create a new task stage
exports.create_task_stage = async (req, res) => {
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

    const newStage = new TaskStage({
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
            "TaskStage",
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
      message: "Task stage added successfully.",
    });
  } catch (error) {
    console.error("Error creating task stage:", error);
    return res.status(500).json({
      success: false,
      error: "Error in adding task stage.",
    });
  }
};
exports.get_task_stages = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required.",
      });
    }

    const stages = await TaskStage.find({
      companyId,
      isDeleted: { $ne: true },
    });

    return res.status(200).json({
      success: true,
      stages,
    });
  } catch (error) {
    console.error("Error fetching task stages:", error);
    return res.status(500).json({
      success: false,
      error: "Error in fetching task stages.",
    });
  }
};
// Get task stages by company ID
// exports.get_task_stages_by_company = async (req, res) => {
//   try {
//     const { companyId } = req.body;
//     console.log(companyId, "company id from the task stages ");
//     if (!companyId) {
//       return res.status(400).json({ error: "Company ID is required." });
//     }
//     console.log("get task one ");
//     const stages = await TaskStage.find({ companyId });
//     console.log(stages, "stages");
//     if (stages.length === 0) {
//       return res
//         .status(404)
//         .json({ error: "No task stages found for this company." });
//     }
//     return res.status(200).json({ success: true, stages });
//   } catch (error) {
//     console.error(
//       "Error fetching task stages for companyId:",
//       req.params.companyId,
//       error
//     );
//     return res
//       .status(500)
//       .json({ success: false, error: "Failed to load task stages." });
//   }
// };
// exports.get_task_stages_by_company = async (req, res) => {
//   try {
//     const { companyId } = req.body;
//     if (!companyId) {
//       return res.status(400).json({ error: "Company ID is required." });
//     }
//     const stages = await TaskStage.find({
//       companyId: new mongoose.Types.ObjectId(companyId), isDeleted:false
//     });
//     console.log(stages, "stages");

//     return res.status(200).json({ success: true, stages });
//   } catch (error) {
//     console.error("Error fetching task stages:", error);
//     return res
//       .status(500)
//       .json({ success: false, error: "Failed to load task stages." });
//   }
// };
exports.get_task_stages_by_company = async (req, res) => {
  try {
    const { companyId, query } = req.body;
    const regex = new RegExp(query, "i");

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }

    // Find task stages where isDeleted is false
    const stages = await TaskStage.find({
      $or: [{ title: { $regex: regex } }, { displayName: { $regex: regex } }],
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
    });

    const stagesWithTaskCount = await TaskStage.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          isDeleted: { $ne: true }, // Exclude deleted task stages
        },
      },
      {
        $lookup: {
          from: "tasks",
          let: { stageId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$taskStageId", "$$stageId"] },
                    { $ne: ["$isDeleted", true] }, // Exclude deleted tasks
                  ],
                },
              },
            },
          ],
          as: "tasks",
        },
      },
      {
        $addFields: {
          taskCount: { $size: "$tasks" }, // Count only non-deleted tasks
        },
      },
      {
        $project: {
          _id: 1,
          taskCount: 1,
        },
      },
    ]);

    return res.status(200).json({ success: true, stages, stagesWithTaskCount });
  } catch (error) {
    console.error("Error fetching task stages:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load task stages." });
  }
};

// Update a task stage by ID
exports.update_task_stage = async (req, res) => {
  try {
    const { id } = req.params;
    const { modifiedBy, ...updateData } = req.body;

    const updatedStage = await TaskStage.findByIdAndUpdate(
      id,
      { ...updateData, modifiedOn: new Date(), modifiedBy },
      { new: true }
    );

    if (!updatedStage) {
      return res
        .status(404)
        .json({ success: false, message: "Task stage not found." });
    }

    // Insert audit logs for updated fields
    Object.keys(updateData).forEach((field) => {
      audit.insertAuditLog(
        "update",
        updatedStage.title,
        "TaskStage",
        field,
        updateData[field],
        modifiedBy,
        id
      );
    });

    return res.status(200).json({
      success: true,
      updatedStage,
      message: "Task stage updated successfully.",
    });
  } catch (error) {
    console.error("Error updating task stage:", error);
    return res.status(500).json({
      success: false,
      error: "Error updating task stage.",
    });
  }
};

// Reorder task stages
exports.reorder_task_stages = async (req, res) => {
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
      TaskStage.findByIdAndUpdate(
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
        "TaskStage",
        "sequence",
        result.sequence,
        modifiedBy,
        result._id
      );
    });

    return res.status(200).json({
      success: true,
      message: "Task stages reordered successfully.",
    });
  } catch (error) {
    console.error("Error reordering task stages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reorder task stages.",
    });
  }
};

// Delete a task stage by ID
exports.delete_task_stage = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedStage = await TaskStage.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (deletedStage) {
      await Task.updateMany(
        { taskStageId: deletedStage._id },
        { $set: { isDeleted: true } }
      );
    }

    if (!deletedStage) {
      return res
        .status(404)
        .json({ success: false, message: "Task stage not found." });
    }

    // Insert audit log for deletion
    audit.insertAuditLog(
      "delete",
      deletedStage.title,
      "TaskStage",
      "isDeleted",
      true,
      deletedStage.modifiedBy,
      id
    );

    return res.status(200).json({
      success: true,
      message: "Task stage marked as deleted successfully.",
      data: deletedStage,
    });
  } catch (error) {
    console.error("Error deleting task stage:", error);
    return res.status(500).json({
      success: false,
      error: "Error deleting task stage.",
    });
  }
};

exports.get_task_stages_by_group = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { companyId, query } = req.body;

    if (!companyId || !groupId) {
      return res
        .status(400)
        .json({ error: "Group ID and Company ID are required." });
    }

    const regex = new RegExp(query || "", "i");

    const stages = await GroupTaskStage.find({
      $or: [{ title: { $regex: regex } }, { displayName: { $regex: regex } }],
      groupId: new mongoose.Types.ObjectId(groupId),
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
    });

    const stagesWithTaskCount = await GroupTaskStage.aggregate([
      {
        $match: {
          groupId: new mongoose.Types.ObjectId(groupId),
          companyId: new mongoose.Types.ObjectId(companyId),
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "tasks",
          let: { stageId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$taskStageId", "$$stageId"] },
                    { $ne: ["$isDeleted", true] },
                  ],
                },
              },
            },
          ],
          as: "tasks",
        },
      },
      {
        $addFields: {
          taskCount: { $size: "$tasks" },
        },
      },
      {
        $project: {
          _id: 1,
          taskCount: 1,
        },
      },
    ]);

    return res.status(200).json({ success: true, stages, stagesWithTaskCount });
  } catch (error) {
    console.error("Error fetching group-level task stages:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load group-level task stages.",
    });
  }
};

exports.create_group_task_stage = async (req, res) => {
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

    const newStage = new GroupTaskStage({
      sequence,
      title,
      displayName,
      show,
      companyId,
      groupId,
      createdBy,
      createdOn: new Date(),
      modifiedBy: createdBy,
      modifiedOn: new Date(),
    });

    const result = await newStage.save();

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
          "GroupTaskStage",
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
      message: "Group-level task stage added successfully.",
    });
  } catch (error) {
    console.error("Error creating group-level task stage:", error);
    return res.status(500).json({
      success: false,
      error: "Error in adding group-level task stage.",
    });
  }
};

exports.update_group_task_stage = async (req, res) => {
  try {
    const { id } = req.params;
    const { sequence, title, displayName, show, groupId, modifiedBy } =
      req.body;

    if (!groupId || !id) {
      return res
        .status(400)
        .json({ success: false, error: "Group ID and Stage ID are required." });
    }

    const updatedData = {
      sequence,
      title,
      displayName,
      show,
      groupId,
      modifiedBy,
      modifiedOn: new Date(),
    };

    const updatedStage = await GroupTaskStage.findByIdAndUpdate(
      id,
      updatedData,
      {
        new: true,
      }
    );

    return res.status(200).json({
      success: true,
      stage: updatedStage,
      message: "Group-level task stage updated successfully.",
    });
  } catch (error) {
    console.error("Error updating group-level task stage:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update group-level task stage.",
    });
  }
};

exports.delete_group_task_stage = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupId, deletedBy } = req.body;

    if (!groupId || !id) {
      return res
        .status(400)
        .json({ success: false, error: "Group ID and Stage ID are required." });
    }

    const deletedStage = await GroupTaskStage.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedBy,
      deletedOn: new Date(),
    });

    return res.status(200).json({
      success: true,
      stage: deletedStage,
      message: "Group-level task stage deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting group-level task stage:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete group-level task stage.",
    });
  }
};

exports.reorder_group_task_stages = async (req, res) => {
  try {
    const { companyId, groupId, stages = [] } = req.body;

    if (!companyId || !groupId || !Array.isArray(stages)) {
      return res.status(400).json({
        success: false,
        error: "Company ID, Group ID, and stages array are required.",
      });
    }

    const bulkOps = stages.map((stage, index) => ({
      updateOne: {
        filter: { _id: stage._id, companyId, groupId },
        update: { $set: { sequence: index } },
      },
    }));

    await GroupTaskStage.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: "Group-level task stages reordered successfully.",
    });
  } catch (error) {
    console.error("Error reordering group-level task stages:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reorder group-level task stages.",
    });
  }
};
