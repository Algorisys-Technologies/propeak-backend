const mongoose = require("mongoose");
const DefaultStage = require("../../models/task-stages/task-stages-model");
const audit = require("../audit-log/audit-log-controller");
const Task = require("../../models/task/task-model");

// Create a new task stage
exports.createDefaultStages = async (req, res) => {
  try {
    const { sequence, title, displayName, show, companyId, createdBy } =
      req.body;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: "Company ID is required." });
    }
    if (!title || !displayName) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Title and display name are required.",
        });
    }

    const newStage = new DefaultStage({
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
    Object.entries(result.toObject()).forEach(([field, value]) => {
      if (
        ["sequence", "title", "displayName", "show", "companyId"].includes(
          field
        )
      ) {
        audit.insertAuditLog(
          "",
          result.title,
          "DefaultStage",
          field,
          value,
          createdBy,
          result._id
        );
      }
    });

    return res
      .status(201)
      .json({
        success: true,
        stage: result,
        message: "Task stage added successfully.",
      });
  } catch (error) {
    console.error("Error creating task stage:", error);
    return res
      .status(500)
      .json({ success: false, error: "Error in adding task stage." });
  }
};

// Get task stages by company
exports.getDefaultStagesByCompany = async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }

    const stagesWithTaskCount = await DefaultStage.aggregate([
      {
        $match: {
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
                    { $eq: ["$defaultStageId", "$$stageId"] },
                    { $ne: ["$isDeleted", true] },
                  ],
                },
              },
            },
          ],
          as: "tasks",
        },
      },
      { $addFields: { taskCount: { $size: "$tasks" } } },
      {
        $project: {
          _id: 1,
          sequence: 1,
          title: 1,
          displayName: 1,
          show: 1,
          companyId: 1,
          taskCount: 1,
        },
      },
    ]);

    return res.status(200).json({ success: true, stages: stagesWithTaskCount });
  } catch (error) {
    console.error("Error fetching task stages:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load task stages." });
  }
};

// Update a task stage by ID
exports.updateDefaultStages = async (req, res) => {
  try {
    const { id } = req.params;
    const { modifiedBy, ...updateData } = req.body;

    const updatedStage = await DefaultStage.findByIdAndUpdate(
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
    Object.entries(updateData).forEach(([field, value]) => {
      audit.insertAuditLog(
        "update",
        updatedStage.title,
        "DefaultStage",
        field,
        value,
        modifiedBy,
        id
      );
    });

    return res
      .status(200)
      .json({
        success: true,
        updatedStage,
        message: "Task stage updated successfully.",
      });
  } catch (error) {
    console.error("Error updating task stage:", error);
    return res
      .status(500)
      .json({ success: false, error: "Error updating task stage." });
  }
};

// Reorder task stages
exports.reorderDefaultStages = async (req, res) => {
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
      DefaultStage.findByIdAndUpdate(
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
        "DefaultStage",
        "sequence",
        result.sequence,
        modifiedBy,
        result._id
      );
    });

    return res
      .status(200)
      .json({ success: true, message: "Task stages reordered successfully." });
  } catch (error) {
    console.error("Error reordering task stages:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to reorder task stages." });
  }
};

// Delete a task stage by ID
exports.deleteDefaultStage = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedStage = await DefaultStage.findByIdAndUpdate(
      id,
      { isDeleted: true, modifiedOn: new Date() },
      { new: true }
    );

    if (!deletedStage) {
      return res
        .status(404)
        .json({ success: false, message: "Task stage not found." });
    }

    await Task.updateMany(
      { defaultStageId: deletedStage._id },
      { $set: { isDeleted: true } }
    );

    // Insert audit log for deletion
    audit.insertAuditLog(
      "delete",
      deletedStage.title,
      "DefaultStage",
      "isDeleted",
      true,
      deletedStage.modifiedBy,
      id
    );

    return res
      .status(200)
      .json({
        success: true,
        message: "Task stage marked as deleted successfully.",
        data: deletedStage,
      });
  } catch (error) {
    console.error("Error deleting task stage:", error);
    return res
      .status(500)
      .json({ success: false, error: "Error deleting task stage." });
  }
};
