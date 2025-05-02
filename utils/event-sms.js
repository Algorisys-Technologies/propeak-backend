// utils/eventMessages.js

const eventMessages = {
    TASK_CREATED: (task) => `A new task "${task.title}" has been created.`,
    TASK_ASSIGNED: (task) => `You have been assigned to the task "${task.title}".`,
    STAGE_CHANGED: (task) => `The task "${task.title}" has moved to a new stage.`,
    TASK_COMPLETED: (task) => `The task "${task.title}" has been marked as completed.`,
    TASK_REJECTED: (task) => `The task "${task.title}" has been rejected.`,
    TASK_COMMENTED: (task) => `A new comment was added on task "${task.title}".`,
    PROJECT_ARCHIVED: (task) => `The project containing "${task.title}" has been archived.`,
    CUSTOM_FIELD_UPDATE: (task) => `Custom fields of "${task.title}" were updated.`,
    EMAIL_RECEIVED: (task) => `You received an email related to "${task.title}".`,
  };
  
  module.exports = eventMessages;
  