// utils/eventMessages.js

const eventMessages = {
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

  STAGE_CHANGED: (task) => {
    const taskTitle = task.title || "Untitled Task";
    const stageTitle = task.taskStageId?.title || "UNKNOWN STAGE";
    const taskStatus = task.status
      ? task.status.toUpperCase()
      : "UNKNOWN STATUS";
    const projectTitle = task.projectId?.title || "UNKNOWN PROJECT";

    return `Task "${taskTitle}" from project "${projectTitle}" has moved to the "${taskStatus}" stage. Current status: ${taskStatus}. Please review it.`;
  },

  PROJECT_STAGE_CHANGED: (task) => {
    return `Project '${task.title}' has been moved to '${task.status}'`;
  },

  TASK_COMPLETED: (task) =>
    `The task "${task.title}" has been marked as completed.`,

  TASK_REJECTED: (task) => {
    const taskTitle = task.title || "Untitled Task";
    return `The task "${taskTitle}" has been rejected.`;
  },

  TASK_COMMENTED: (task) => `A new comment was added on task "${task.title}".`,

  PROJECT_ARCHIVED: (project) => {
    const title = project.title || "Untitled Project";
    const createdOn = project.createdOn
      ? new Date(project.createdOn).toLocaleDateString()
      : "an unknown date";
    const status = project.status || "unknown";

    return `Project "${title}" has been archived. It was originally created on ${createdOn} and its last known status was "${status}".`;
  },

  CUSTOM_FIELD_UPDATE: (task) => {
    const label = task.label || "Unnamed Field";
    const key = task.key || "Unknown Key";
    const level = task.level || "unknown level";
    return `Custom field "${label}" (${key}) was updated at ${level} level.`;
  },

  EMAIL_RECEIVED: (task) => `You received an email related to "${task.title}".`,

  PROJECT_CREATED: (task) => `The Project created as Title "${task.title}".`,
};

module.exports = eventMessages;

