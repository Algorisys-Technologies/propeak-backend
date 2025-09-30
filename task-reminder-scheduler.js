const schedule = require("node-schedule");
const mongoose = require("mongoose");
const Task = require("./models/task/task-model");
const Project = require("./models/project/project-model");
const User = require("./models/user/user-model");
const NotificationSetting = require("./models/notification-setting/notification-setting-model");
const { handleNotifications } = require("./utils/notification-service");
const { addMyNotification } = require("./common/add-my-notifications");
const rabbitMQ = require("./rabbitmq");
const config = require("./config/config");
const userNotificationModel = require("./models/notification-setting/user-notification-model");
const { logError } = require("./common/logger");
require("dotenv").config();

const auditTaskAndSendMail = async (newTask, emailOwner, email) => {
  try {
    let projectTitle = newTask.projectId
      ? newTask.projectId.title
      : "Unknown Project";
    let projectId = newTask.projectId ? newTask.projectId._id : "N/A";
    let updatedDescription = newTask.description
      .split("\n")
      .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");
    let emailText = config.taskEmailContent
      .replace("#title#", newTask.title)
      .replace("#description#", updatedDescription)
      .replace("#projectName#", projectTitle)
      .replace("#projectId#", projectId)
      .replace("#priority#", newTask.priority.toUpperCase())
      .replace("#newTaskId#", newTask._id);

    let taskEmailLink = config.taskEmailLink
      .replace("#projectId#", projectId)
      .replace("#newTaskId#", newTask._id);

    if (email !== "XX") {
      var mailOptions = {
        from: config.from,
        to: email,
        subject: ` TASK_REMINDER_DUE - ${newTask.title}`,
        html: emailText,
      };

      let taskArr = {
        subject: mailOptions.subject,
        url: taskEmailLink,
        userId: newTask.assignedUser,
      };

      rabbitMQ
        .sendMessageToQueue(mailOptions, "message_queue", "msgRoute")
        .then((resp) => addMyNotification(taskArr))
        .catch((err) =>
          console.error("Failed to send email via RabbitMQ", err)
        );
    }
  } catch (error) {
    console.error("Error in sending email", error);
  }
};

const reminderOffset = 10 * 24 * 60 * 60 * 1000; // 10 days
const activeJobs = new Map();

// Update all reminder jobs when settings change
async function updateReminderJobs() {
  try {
    
    // Cancel all existing jobs
    cancelAllReminderJobs();
    
    // Reinitialize with current settings
    await initReminderJobs();
  
  } catch (error) {
    logError({
      message: error.message,
      stack: error.stack
    }, "updateReminderJobs");
  }
}

function cancelAllReminderJobs() {
  let cancelledCount = 0;
  
  // Cancel jobs in activeJobs Map
  for (const [jobName, job] of activeJobs) {
    job.cancel();
    activeJobs.delete(jobName);
    cancelledCount++;
  }
  
  // Also cancel jobs in schedule.scheduledJobs
  const scheduledJobs = schedule.scheduledJobs;
  for (const jobName in scheduledJobs) {
    if (jobName.includes('TASK_REMINDER_DUE')) {
      scheduledJobs[jobName].cancel();
      cancelledCount++;
    }
  }
  
}

async function sendTaskReminderNotifications(setting) {
  try {
    const now = new Date();

    let tasks = await Task.find({
      isDeleted: false,
      projectId: setting.projectId,
      ...(setting.taskStageId ? { taskStageId: setting.taskStageId } : {}),
    }).lean();

    if (!tasks || tasks.length === 0) {
      return;
    }

    tasks = await processTasksByType(tasks, setting, now);

    const reminderDueTasks = tasks.filter((t) => t.showReminder && t.projectId);

    for (const reminderTask of reminderDueTasks) {
      const populatedTask = await Task.findById(reminderTask._id)
        .populate({ path: "projectId", select: "title", model: "project" })
        .populate({ path: "createdBy", select: "name", model: "user" });

      if (!populatedTask?.projectId || !populatedTask.projectId._id) {
        continue;
      }

      const notificationTime = calculateNotificationTime(setting, now);
      
      // Enhanced duplicate check for interval reminders
      const shouldCreateNotification = await shouldCreateReminderNotification(
        populatedTask, 
        setting, 
        notificationTime, 
        now
      );

      if (!shouldCreateNotification) {
        continue;
      }

      const notification = await handleNotifications(
        populatedTask,
        "TASK_REMINDER_DUE",
      );

      for (const channel of notification) {
        for (const email of channel.emails) {
          await auditTaskAndSendMail(populatedTask, [], email);
        }
      }
    }
  } catch (error) {
    logError({
      message: error.message,
      stack: error.stack
    }, "sendTaskReminderNotifications");
  }
}

async function processTasksByType(tasks, setting, now) {
  // Fetch notifications based on event type
  const userNotifications = await userNotificationModel.find({
    eventType: "TASK_REMINDER_DUE",
    projectId: setting.projectId,
    isDeleted: false,
    reminderType: setting.type // "interval" or "fixed"
  });

  return tasks.map((task) => {
    if (!task.startDate) return { ...task, reminderDate: null, showReminder: false };

    const reminderDate = new Date(new Date(task.startDate).getTime() + reminderOffset);
    task.reminderDate = reminderDate;

    const isCompleted = task.status === "completed";
    const isReminderDue = now >= reminderDate && !isCompleted;
    const isEndDatePast = task.endDate && new Date(task.endDate) < now && !isCompleted;

    // Get notifications related to this task
    const taskUserNotifications = userNotifications.filter(
      (un) => un.taskId?.toString() === task._id.toString()
    );

    let showReminder = false;

    if (setting.type === "interval") {
      // Interval → hide reminder if any user has skipped
      const hasActiveSkip = taskUserNotifications.some(un => 
        (un.skipUntil && new Date(un.skipUntil) > now) || 
        un.permanentlySkipped
      );
      showReminder = (isReminderDue || isEndDatePast) && !hasActiveSkip;

    } else if (setting.type === "fixed") {
      // Fixed → hide reminder only if all users skipped
      const allUsersSkipped = taskUserNotifications.length > 0 && 
        taskUserNotifications.every(un => 
          (un.skipUntil && new Date(un.skipUntil) > now) || 
          un.permanentlySkipped
        );
      showReminder = (isReminderDue || isEndDatePast) && !allUsersSkipped;
    }

    task.showReminder = showReminder;
    return task;
  });
}

// Enhanced notification creation check
async function shouldCreateReminderNotification(task, setting, notificationTime, now) {
  if (setting.type === "interval") {
    // For interval reminders: ONLY check skip status, NO duplicate checking
    const existingSkips = await userNotificationModel.find({
      taskId: task._id,
      eventType: "TASK_REMINDER_DUE",
      projectId: setting.projectId,
      isDeleted: false,
      $or: [
        { skipUntil: { $gt: now } }, // Active skip
        { permanentlySkipped: true } // Permanent skip
      ]
    });

    // If any active skip exists, don't create notification
    if (existingSkips.length > 0) {
      return false;
    }

    // ✅ REMOVED: No interval window duplicate check
    // Interval reminders will be created at each interval time
    return true;
    
  } else {
    // For fixed time: keep the duplicate check (30-minute window)
    const existingNotification = await userNotificationModel.findOne({
      taskId: task._id,
      eventType: "TASK_REMINDER_DUE",
      projectId: setting.projectId,
      isDeleted: false,
      createdOn: {
        $gte: new Date(notificationTime.getTime() - 30 * 60 * 1000),
        $lte: new Date(notificationTime.getTime() + 30 * 60 * 1000)
      }
    });

    if (existingNotification) {
      return false;
    }

    return true;
  }
}

function calculateNotificationTime(setting, currentTime) {
  if (setting.type === 'fixed' && setting.reminderTime) {
    const [hour, minute] = setting.reminderTime.split(":").map(Number);
    const notificationTime = new Date(currentTime);
    notificationTime.setHours(hour, minute, 0, 0);
    return notificationTime;
  }
  return currentTime;
}

// --- Dynamic scheduling ---
async function initReminderJobs() {
  try {
    const settings = await NotificationSetting.find({
      eventType: "TASK_REMINDER_DUE",
      active: true,
      isDeleted: false
    });

    settings.forEach((setting) => {
      // Fixed time reminders
      if (setting.type === "fixed" && setting.reminderTime) {
        const [hour, minute] = setting.reminderTime.split(":").map(Number);
        const jobName = `TASK_REMINDER_DUE-${setting._id}-fixed`;
        
        
        const job = schedule.scheduleJob(
          jobName,
          { hour, minute, tz: "Asia/Kolkata" },
          () => sendTaskReminderNotifications(setting)
        );
        
        if (job) {
          activeJobs.set(jobName, job);
        }
      }

      // Interval reminders
      if (
        setting.type === "interval" &&
        setting.intervalStart &&
        setting.intervalEnd &&
        setting.intervalMinutes
      ) {
        const [startHour, startMinute] = setting.intervalStart.split(":").map(Number);
        const [endHour, endMinute] = setting.intervalEnd.split(":").map(Number);

        let current = new Date();
        current.setHours(startHour, startMinute, 0, 0);

        const end = new Date();
        end.setHours(endHour, endMinute, 0, 0);

        let jobCount = 0;

        while (current <= end) {
          const jobTime = new Date(current);
          const jobName = `TASK_REMINDER_DUE-${setting._id}-${jobTime.getHours().toString().padStart(2, '0')}-${jobTime.getMinutes().toString().padStart(2, '0')}`;

          const job = schedule.scheduleJob(
            jobName,
            {
              hour: jobTime.getHours(),
              minute: jobTime.getMinutes(),
              tz: "Asia/Kolkata",
            },
            () => sendTaskReminderNotifications(setting)
          );
          
          if (job) {
            activeJobs.set(jobName, job);
            jobCount++;
          }

          current = new Date(current.getTime() + setting.intervalMinutes * 60000);
        }

      }
    });

  } catch (error) {
    logError({
      message: error.message,
      stack: error.stack
    }, "initReminderJobs")
  }
}

// Export the update function for use in your notification settings controller
module.exports = {
  updateReminderJobs,
  sendTaskReminderNotifications,
  initReminderJobs
};

mongoose
  .connect(process.env.DB, { socketTimeoutMS: 0 })
  .then(() => {
    initReminderJobs();
  })
  .catch((err) =>  logError({
    message: err.message,
    stack: err.stack
  }, "mongoDB error"));

// const schedule = require("node-schedule");
// const Task = require("./models/task/task-model");
// const Project = require("./models/project/project-model");
// const User = require("./models/user/user-model");
// const mongoose = require("mongoose");
// require("dotenv").config();
// const { handleNotifications } = require("./utils/notification-service");
// const { addMyNotification } = require("./common/add-my-notifications");
// const rabbitMQ = require("./rabbitmq");
// const config = require("./config/config");

// const auditTaskAndSendMail = async (newTask, emailOwner, email) => {
//   try {
//     console.log(`[DEBUG] Preparing to send email to: ${email}`);

//     let updatedDescription = newTask.description
//       .split("\n")
//       .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");
//     let emailText = config.taskEmailContent
//       .replace("#title#", newTask.title)
//       .replace("#description#", updatedDescription)
//       .replace("#projectName#", newTask.projectId.title)
//       .replace("#projectId#", newTask.projectId._id)
//       .replace("#priority#", newTask.priority.toUpperCase())
//       .replace("#newTaskId#", newTask._id);

//     let taskEmailLink = config.taskEmailLink
//       .replace("#projectId#", newTask.projectId._id)
//       .replace("#newTaskId#", newTask._id);

//     // console.log(emailText, "from mailOptions")

//     if (email !== "XX") {
//       var mailOptions = {
//         from: config.from,
//         to: email,
//         // cc: emailOwner,
//         subject: ` TASK_REMINDER_DUE - ${newTask.title}`,
//         html: emailText,
//       };

//       console.log(`[DEBUG] mailOptions constructed:`, mailOptions);

//       let taskArr = {
//         subject: mailOptions.subject,
//         url: taskEmailLink,
//         userId: newTask.assignedUser,
//       };

//       console.log(`[DEBUG] Sending message to RabbitMQ queue...`);
//       rabbitMQ
//         .sendMessageToQueue(mailOptions, "message_queue", "msgRoute")
//         .then((resp) => {
//           logInfo("Task add mail message sent to the message_queue: " + resp);
//           addMyNotification(taskArr);
//         })
//         .catch((err) => {
//           console.error("Failed to send email via RabbitMQ", err);
//         });
//     }
//   } catch (error) {
//     console.error("Error in sending email", error);
//   }
// };

// const reminderOffset = 10 * 24 * 60 * 60 * 1000; // 10 days in ms

// async function sendTaskReminderNotifications() {
//   try {
//     const now = new Date();

//     // Fetch all tasks that might need reminders (you can filter better here if needed)
//     let tasks = await Task.find({ isDeleted: false }).lean();

//     // Map to set reminder info on tasks (reuse your existing logic)
//     tasks = tasks.map((task) => {
//       if (!task.startDate) {
//         task.reminderDate = null;
//         task.showReminder = false;
//         return task;
//       }

//       const reminderDate = new Date(
//         new Date(task.startDate).getTime() + reminderOffset
//       );
//       task.reminderDate = reminderDate;

//       const isCompleted = task.status === "completed";

//       const isReminderDue = now >= reminderDate && !isCompleted;
//       const isEndDatePast =
//         task.endDate && new Date(task.endDate) < now && !isCompleted;

//       task.showReminder = isReminderDue || isEndDatePast;

//       return task;
//     });

//     const reminderDueTasks = tasks.filter((t) => t.showReminder);

//     if (reminderDueTasks.length > 0) {
//       for (const reminderTask of reminderDueTasks) {
//         try {
//           const populatedTask = await Task.findById(reminderTask._id)
//             .populate({ path: "projectId", select: "title", model: "project" })
//             .populate({ path: "createdBy", select: "name", model: "user" });

//           const eventType = "TASK_REMINDER_DUE";
//           const notification = await handleNotifications(
//             populatedTask,
//             eventType
//           );

//           if (notification.length > 0) {
//             for (const channel of notification) {
//               const { emails } = channel;
//               for (const email of emails) {
//                 await auditTaskAndSendMail(populatedTask, [], email);
//               }
//             }
//           }
//         } catch (err) {
//           console.error(
//             `Failed to send reminder notification for task ${reminderTask._id}`,
//             err
//           );
//         }
//       }
//     }
//   } catch (error) {
//     console.error("Error in sending task reminder notifications:", error);
//   }
// }

// // Connect mongoose and schedule job only after DB connection:
// mongoose
//   .connect(process.env.DB, {
//     socketTimeoutMS: 0,
//   })
//   .then(() => {
//     console.log("Connected to MongoDB."); //0 9 * * * */2 * * * *
//     schedule.scheduleJob("0 9 * * *", () => {
//       console.log("Running task reminder notification job daily at 9 AM...");
//       sendTaskReminderNotifications();
//     });
//   })
//   .catch((err) => {
//     console.error("Failed to connect to MongoDB:", err);
//   });
