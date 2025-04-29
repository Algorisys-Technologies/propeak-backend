const generateNotificationEmail = ({
  userName = "Valued User",
  notification,
  fromDate,
  toDate,
}) => {
  return `
      <p>Dear ${userName},</p>
      <p>We hope this email finds you well. You have a new notification from the ProPeak system. Below are the details:</p>
      <p><strong>Notification:</strong> ${notification}</p>
      <p><strong>Effective From:</strong> ${fromDate}</p>
      <p><strong>Effective To:</strong> ${toDate}</p>
      <p>If you have any questions or require assistance, please feel free to reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `;
};
const generateProjectNotificationEmail = ({
    userName = "Valued User",
    notification,
    fromDate,
    toDate,
    projectTitle,  // Add project-specific detail
  }) => {
    return `
        <p>Dear ${userName},</p>
        <p>We hope this email finds you well. You have a new notification from the ProPeak system related to the project <strong>${projectTitle}</strong>. Below are the details:</p>
        <p><strong>Notification:</strong> ${notification}</p>
        <p><strong>Effective From:</strong> ${fromDate}</p>
        <p><strong>Effective To:</strong> ${toDate}</p>
        <p>If you have any questions or require assistance, please feel free to reach out.</p>
        <p>Best regards,</p>
        <p><strong>The ProPeak Team</strong></p>
        <p><em>This is an automated email, please do not reply.</em></p>
      `;
  };
const eventTypes = [
  "NOTIFICATION",
  "TASK_CREATED",
  "TASK_ASSIGNED",
  "STAGE_CHANGED",
  "TASK_COMPLETED",
  "TASK_REJECTED",
  "TASK_COMMENTED",
  "PROJECT_ARCHIVED",
  "CUSTOM_FIELD_UPDATE",
  "EMAIL_RECEIVED",
];
const eventEmailTemplates = {
  NOTIFICATION: {
    subject: "Notification from ProPeak",
    body: (userName, notificationMessage) => `
          <p>Dear ${userName || "Valued User"},</p>
          <p>You have a new notification in ProPeak:</p>
          <p><strong>Notification:</strong> ${notificationMessage}</p>
          <p>If you have any questions, please reach out.</p>
          <p>Best regards,</p>
          <p><strong>The ProPeak Team</strong></p>
          <p><em>This is an automated email, please do not reply.</em></p>
        `,
  },
  TASK_CREATED: {
    subject: "New Task Created in ProPeak",
    body: (userName, fromDate, toDate) => `
        <p>Dear ${userName || "Valued User"},</p>
        <p>A new task has been created in ProPeak:</p>
        <p><strong>Effective From:</strong> ${fromDate}</p>
        <p><strong>Effective To:</strong> ${toDate}</p>
        <p>If you have any questions, please reach out.</p>
        <p>Best regards,</p>
        <p><strong>The ProPeak Team</strong></p>
        <p><em>This is an automated email, please do not reply.</em></p>
      `,
  },
  TASK_ASSIGNED: {
    subject: "Task Assigned to You",
    body: (userName, taskDetails) => `
        <p>Dear ${userName || "Valued User"},</p>
        <p>You have been assigned a new task in ProPeak:</p>
        <p><strong>Task Details:</strong> ${taskDetails}</p>
        <p>If you have any questions, please reach out.</p>
        <p>Best regards,</p>
        <p><strong>The ProPeak Team</strong></p>
        <p><em>This is an automated email, please do not reply.</em></p>
      `,
  },
  STAGE_CHANGED: {
    subject: "Task Stage Changed in ProPeak",
    body: (userName, taskDetails, newStage) => `
        <p>Dear ${userName || "Valued User"},</p>
        <p>The stage of your task in ProPeak has been updated:</p>
        <p><strong>Task Details:</strong> ${taskDetails}</p>
        <p><strong>New Stage:</strong> ${newStage}</p>
        <p>If you have any questions, please reach out.</p>
        <p>Best regards,</p>
        <p><strong>The ProPeak Team</strong></p>
        <p><em>This is an automated email, please do not reply.</em></p>
      `,
  },
  TASK_COMPLETED: {
    subject: "Task Completed in ProPeak",
    body: (userName, taskDetails) => `
        <p>Dear ${userName || "Valued User"},</p>
        <p>Your task in ProPeak has been marked as completed:</p>
        <p><strong>Task Details:</strong> ${taskDetails}</p>
        <p>If you have any questions, please reach out.</p>
        <p>Best regards,</p>
        <p><strong>The ProPeak Team</strong></p>
        <p><em>This is an automated email, please do not reply.</em></p>
      `,
  },
  TASK_REJECTED: {
    subject: "Task Rejected in ProPeak",
    body: (userName, taskDetails, rejectionReason) => `
        <p>Dear ${userName || "Valued User"},</p>
        <p>Your task in ProPeak has been rejected:</p>
        <p><strong>Task Details:</strong> ${taskDetails}</p>
        <p><strong>Rejection Reason:</strong> ${rejectionReason}</p>
        <p>If you have any questions, please reach out.</p>
        <p>Best regards,</p>
        <p><strong>The ProPeak Team</strong></p>
        <p><em>This is an automated email, please do not reply.</em></p>
      `,
  },
  TASK_COMMENTED: {
    subject: "New Comment on Your Task in ProPeak",
    body: (userName, commentDetails) => `
        <p>Dear ${userName || "Valued User"},</p>
        <p>A new comment has been added to your task in ProPeak:</p>
        <p><strong>Comment:</strong> ${commentDetails}</p>
        <p>If you have any questions, please reach out.</p>
        <p>Best regards,</p>
        <p><strong>The ProPeak Team</strong></p>
        <p><em>This is an automated email, please do not reply.</em></p>
      `,
  },
  PROJECT_ARCHIVED: {
    subject: "Project Archived in ProPeak",
    body: (userName, projectName) => `
        <p>Dear ${userName || "Valued User"},</p>
        <p>The project "${projectName}" has been archived in ProPeak.</p>
        <p>If you have any questions, please reach out.</p>
        <p>Best regards,</p>
        <p><strong>The ProPeak Team</strong></p>
        <p><em>This is an automated email, please do not reply.</em></p>
      `,
  },
  CUSTOM_FIELD_UPDATE: {
    subject: "Custom Field Updated in ProPeak",
    body: (userName, customFieldDetails) => `
        <p>Dear ${userName || "Valued User"},</p>
        <p>A custom field has been updated in ProPeak:</p>
        <p><strong>Details:</strong> ${customFieldDetails}</p>
        <p>If you have any questions, please reach out.</p>
        <p>Best regards,</p>
        <p><strong>The ProPeak Team</strong></p>
        <p><em>This is an automated email, please do not reply.</em></p>
      `,
  },
  EMAIL_RECEIVED: {
    subject: "New Email Received in ProPeak",
    body: (userName, emailDetails) => `
        <p>Dear ${userName || "Valued User"},</p>
        <p>You have received a new email in ProPeak:</p>
        <p><strong>Email Details:</strong> ${emailDetails}</p>
        <p>If you have any questions, please reach out.</p>
        <p>Best regards,</p>
        <p><strong>The ProPeak Team</strong></p>
        <p><em>This is an automated email, please do not reply.</em></p>
      `,
  },
};
const generateProjectArchiveNotificationEmail = ({
    userName = "Valued User",
    notification,
    fromDate,
    toDate,
    projectTitle,
    archivedByUserName
  }) => {
    return `
      <p>Dear ${userName},</p>
      <p>We hope this email finds you well. You have a new notification from the ProPeak system. Below are the details:</p>
      <p><strong>Notification:</strong> The project "${projectTitle}", assigned to you, has been archived by ${archivedByUserName}.</p>
      <p><strong>Effective From:</strong> ${fromDate}</p>
      <p><strong>Effective To:</strong> ${toDate}</p>
      <p>If you have any questions or require assistance, please feel free to reach out.</p>
      <p>Best regards,</p>
      <p><strong>The ProPeak Team</strong></p>
      <p><em>This is an automated email, please do not reply.</em></p>
    `;
  };
  
module.exports = {
  generateNotificationEmail,
  eventEmailTemplates,
  generateProjectNotificationEmail,
  generateProjectArchiveNotificationEmail
};
