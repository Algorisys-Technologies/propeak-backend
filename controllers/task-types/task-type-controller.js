const TaskType = require("../../models/task-types/task-types-model");

exports.create_task_type = async (req, res) => {
  try {
    const { taskType, companyId, createdBy, createdOn } = req.body;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: "Company ID is required." });
    }

    if (!taskType) {
      return res.status(400).json({
        success: false,
        error: "Task type is required.",
      });
    }

    const newTaskType = new TaskType({
      taskType,
      companyId,
      createdBy,
      createdOn,
    });

    await newTaskType.save();
    return res.status(201).json({ success: true, taskType: newTaskType });
  } catch (error) {
    console.error("Error creating task type:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.get_task_types_by_company = async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }

    const taskTypes = await TaskType.find({ companyId });

    if (taskTypes.length === 0) {
      return res
        .status(404)
        .json({ error: "No task types found for this company." });
    }

    return res.status(200).json({ success: true, taskTypes });
  } catch (error) {
    console.error("Error fetching task types for companyId:", companyId, error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load task types." });
  }
};

exports.update_task_type = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedTaskType = await TaskType.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedTaskType) {
      return res.status(404).json({ message: "Task type not found" });
    }

    return res.status(200).json(updatedTaskType);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.delete_task_type = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTaskType = await TaskType.findByIdAndDelete(id);

    if (!deletedTaskType) {
      return res.status(404).json({ message: "Task type not found" });
    }

    return res.json({ success: true, message: "Task type deleted" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
