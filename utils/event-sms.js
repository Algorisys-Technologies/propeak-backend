// utils/eventMessages.js

const eventMessages = {
  // TASK_CREATED: (task) => `A new task "${task.title}" has been created.`,
  TASK_CREATED: (task) => {
    const createdDate = new Date(task.createdOn).toLocaleDateString();
    return `A new task has been created.
  
  Title: ${task.title}
  Project: ${task.projectName || task.projectId.title}
  Created By: ${task.createdByName || task.createdBy}
  Created On: ${createdDate}
  Priority: ${task.priority || "N/A"}
  Description: ${task.description || "No description"}`;
  },

  TASK_ASSIGNED: (task) =>
    `You have been assigned to the task "${task.title}".`,
  // STAGE_CHANGED: (task) => `The task "${task.title}" has moved to a new "${task.status}"stage.`,
  STAGE_CHANGED: (task) => {
    const taskTitle = task.title || "Untitled Task";
    const stageTitle = task.taskStageId?.title || "UNKNOWN STAGE";
    const taskStatus = task.status
      ? task.status.toUpperCase()
      : "UNKNOWN STATUS";
    const projectTitle = task.projectId?.title || "Unknown Project";

    return `Task "${taskTitle}" from project "${projectTitle}" has moved to the "${taskStatus}" stage. Current status: ${taskStatus}. Please review it.`;
  },

  TASK_COMPLETED: (task) =>
    `The task "${task.title}" has been marked as completed.`,
  TASK_REJECTED: (task) => `The task "${task.title}" has been rejected.`,
  TASK_COMMENTED: (task) => `A new comment was added on task "${task.title}".`,
  // PROJECT_ARCHIVED: (task) =>
  //   `The project containing "${task.title}" has been archived.`,
  PROJECT_ARCHIVED: (project) => {
    const title = project.title || "Untitled Project";
    const createdOn = project.createdOn
      ? new Date(project.createdOn).toLocaleDateString()
      : "an unknown date";
    const status = project.status || "unknown";

    return `Project "${title}" has been archived. It was originally created on ${createdOn} and its last known status was "${status}".`;
  },

  CUSTOM_FIELD_UPDATE: (task) =>
    `Custom fields of "${task.title}" were updated.`,
  EMAIL_RECEIVED: (task) => `You received an email related to "${task.title}".`,
};

module.exports = eventMessages;
