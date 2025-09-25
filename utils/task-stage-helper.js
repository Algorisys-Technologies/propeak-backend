const TaskStage = require("../models/task-stages/task-stages-model");
const GroupTaskStage = require("../models/task-stages/group-task-stages-model");

async function getTaskStagesTitles(taskStagesArr, groupId) {
  let taskStageDocs = [];
  let groupTaskStageDocs = [];

  // Find in TaskStage by IDs
  if (taskStagesArr && taskStagesArr.length > 0) {
    taskStageDocs = await TaskStage.find({
      _id: { $in: taskStagesArr },
    }).select("title");
  }

  // Find in GroupTaskStage by groupId
  if (groupId) {
    groupTaskStageDocs = await GroupTaskStage.find({
      groupId,
    }).select("title");
  }

  // Merge and remove duplicates
  return [
    ...new Set([
      ...taskStageDocs.map((stage) => stage.title),
      ...groupTaskStageDocs.map((stage) => stage.title),
    ]),
  ];
}

module.exports = { getTaskStagesTitles };
