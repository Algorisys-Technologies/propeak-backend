const mongoose = require("mongoose");
const TaskStage = require("../../models/task-stages/task-stages-model");
// const TaskStage =require()
// Create a new task stage
exports.create_task_stage = async (req, res) => {
  try {
    const { sequence, title, displayName, show, companyId } = req.body;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: "Company ID is required." });
    }
    if (!title || !displayName) {
      return res.status(400).json({
        success: false,
        error: "Title and display name are required.",
        message: message.error,
      });
    }

    const newStage = new TaskStage({
      sequence,
      title,
      displayName,
      show,
      companyId,
    });

    await newStage.save();
    return res.json({
      success: true,
      stage: newStage,
      message: "task stage added successful",
    });
  } catch (error) {
    console.error("Error creating task stage:", error);
    return res.status(500).json({ success: false, error: error.message });
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
    const { companyId } = req.body;

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }

    // Find task stages where isDeleted is false
    const stages = await TaskStage.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true }, 
    });

    console.log(stages, "stages");

    return res.status(200).json({ success: true, stages });
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
    const updatedStage = await TaskStage.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedStage) {
      return res.status(404).json({ message: "Task stage not found" });
    }
    return res.json({
      updatedStage,
      success: true,
      message: "task stage updated successful.",
    });
  } catch (error) {
    return res.json({
      error: error.message,
      success: false,
      message: "error in updated task stage.",
    });
  }
};

// Reorder task stages
exports.reorder_task_stages = async (req, res) => {
  try {
    const { companyId, stages } = req.body;

    // Validate request data
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

    // Update the sequence of each stage in the database
    const updatePromises = stages.map((stage) => {
      return TaskStage.findByIdAndUpdate(
        stage._id,
        { sequence: stage.sequence },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    return res.status(200).json({
      success: true,
      message: "Task stages reordered successfully.",
    });
  } catch (error) {
    console.error("Error reordering task stages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reorder task stages.",
      error: error.message,
    });
  }
};

// Delete a task stage by ID
exports.delete_task_stage = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the task stage and update the isDeleted field to true
    const updatedStage = await TaskStage.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!updatedStage) {
      return res.status(404).json({ message: "Task stage not found" });
    }

    return res.json({
      success: true,
      message: "Task stage marked as deleted successfully.",
      data: updatedStage,
    });
  } catch (error) {
    return res.json({
      error: error.message,
      success: false,
      message: "Error in marking task stage as deleted.",
    });
  }
};

// exports.delete_task_stage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deletedStage = await TaskStage.findByIdAndDelete(id);

//     if (!deletedStage) {
//       return res.status(404).json({ message: "Task stage not found" });
//     }
//     return res.json({
//       success: true,
//       message: "task stage delete successful.",
//     });
//   } catch (error) {
//     return res.json({
//       error: error.message,
//       success: false,
//       message: "error in delete task stage.",
//     });
//   }
// };

// const mongoose = require("mongoose");
// const Category = require("../../models/category/category-model");

// // Create a new task stage
// exports.create_task_stage = async (req, res) => {
//   try {
//     const { sequence, title, displayName, show, companyId } = req.body;

//     if (!companyId) {
//       return res.status(400).json({ success: false, error: "Company ID is required." });
//     }
//     if (!title || !displayName) {
//       return res.status(400).json({
//         success: false,
//         error: "Title and display name are required.",
//       });
//     }

//     const newStage = new Category({
//       sequence,
//       title,
//       displayName,
//       show,
//       companyId,
//     });

//     await newStage.save();
//     return res.status(201).json({ success: true, stage: newStage });
//   } catch (error) {
//     console.error("Error creating task stage:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// // Get task stages by company ID
// exports.get_task_stages_by_company = async (req, res) => {
//   try {
//     const { companyId } = req.params;

//     if (!companyId) {
//       return res.status(400).json({ error: "Company ID is required." });
//     }

//     const stages = await Category.find({ companyId });

//     if (stages.length === 0) {
//       return res.status(404).json({ error: "No task stages found for this company." });
//     }
//     return res.status(200).json({ success: true, stages });
//   } catch (error) {
//     console.error("Error fetching task stages for companyId:", req.params.companyId, error);
//     return res.status(500).json({ success: false, error: "Failed to load task stages." });
//   }
// };

// // Update a task stage by ID
// exports.update_task_stage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updatedStage = await Category.findByIdAndUpdate(id, req.body, {
//       new: true,
//     });

//     if (!updatedStage) {
//       return res.status(404).json({ message: "Task stage not found" });
//     }
//     return res.status(200).json(updatedStage);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// // Delete a task stage by ID
// exports.delete_task_stage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deletedStage = await Category.findByIdAndDelete(id);

//     if (!deletedStage) {
//       return res.status(404).json({ message: "Task stage not found" });
//     }
//     return res.status(204).send();
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };
