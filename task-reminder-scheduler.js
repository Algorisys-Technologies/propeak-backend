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
    console.log("Updating reminder jobs...");
    
    // Cancel all existing jobs
    cancelAllReminderJobs();
    
    // Reinitialize with current settings
    await initReminderJobs();
    
    console.log("Reminder jobs updated successfully");
  } catch (error) {
    console.error("Error updating reminder jobs:", error);
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
  
  console.log(`Cancelled ${cancelledCount} reminder jobs`);
}

async function sendTaskReminderNotifications(setting) {
  try {
    console.log("Processing setting:", setting._id, "Type:", setting.type);
    const now = new Date();

    let tasks = await Task.find({
      isDeleted: false,
      projectId: setting.projectId,
      ...(setting.taskStageId ? { taskStageId: setting.taskStageId } : {}),
    }).lean();

    if (!tasks || tasks.length === 0) {
      console.log(`No tasks found for project ${setting.projectId}`);
      return;
    }

    // Process tasks based on setting type
    if (setting.type === "interval") {
      // Enhanced Interval logic → show next reminder if not skipped
      tasks = await processIntervalTasks(tasks, setting, now);
    } else {
      // Fixed-time logic → respect skipUntil & permanentlySkipped
      tasks = await processFixedTasks(tasks, setting, now);
    }

    const reminderDueTasks = tasks.filter((t) => t.showReminder && t.projectId);

    console.log(`Found ${reminderDueTasks.length} reminder-due tasks for project ${setting.projectId}`);

    for (const reminderTask of reminderDueTasks) {
      const populatedTask = await Task.findById(reminderTask._id)
        .populate({ path: "projectId", select: "title", model: "project" })
        .populate({ path: "createdBy", select: "name", model: "user" });

      if (!populatedTask?.projectId || !populatedTask.projectId._id) {
        console.warn(`Skipping reminder for task ${populatedTask?._id} - projectId not found`);
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
        console.log(`Skipping notification for task ${populatedTask._id}`);
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
    console.error("Error in sending task reminder notifications:", error);
  }
}

// Enhanced interval task processing
async function processIntervalTasks(tasks, setting, now) {
  const userNotifications = await userNotificationModel.find({
    eventType: "TASK_REMINDER_DUE",
    projectId: setting.projectId,
    isDeleted: false,
    reminderType: "interval"
  });

  console.log(userNotifications, "from userrNptification")

  return tasks.map((task) => {
    if (!task.startDate) return { ...task, reminderDate: null, showReminder: false };

    const reminderDate = new Date(new Date(task.startDate).getTime() + reminderOffset);
    task.reminderDate = reminderDate;

    const isCompleted = task.status === "completed";
    const isReminderDue = now >= reminderDate && !isCompleted;
    const isEndDatePast = task.endDate && new Date(task.endDate) < now && !isCompleted;

    // Check if this task has any skip settings
    const taskUserNotifications = userNotifications.filter(
      (un) => un.taskId?.toString() === task._id.toString()
    );

    // Check if any user has active skip settings for this task
    const hasActiveSkip = taskUserNotifications.some(un => 
      (un.skipUntil && new Date(un.skipUntil) > now) || 
      un.permanentlySkipped
    );

    // For interval: show reminder if due AND not skipped by all users
    // But don't check for recent duplicates - allow next interval reminder
    task.showReminder = (isReminderDue || isEndDatePast) && !hasActiveSkip;
    
    return task;
  });
}

// Fixed task processing (unchanged)
async function processFixedTasks(tasks, setting, now) {
  const userNotifications = await userNotificationModel.find({
    eventType: "TASK_REMINDER_DUE",
    projectId: setting.projectId,
    isDeleted: false,
    reminderType: "fixed"
  });

  return tasks.map((task) => {
    if (!task.startDate) return { ...task, reminderDate: null, showReminder: false };

    const reminderDate = new Date(new Date(task.startDate).getTime() + reminderOffset);
    task.reminderDate = reminderDate;

    const isCompleted = task.status === "completed";
    const isReminderDue = now >= reminderDate && !isCompleted;
    const isEndDatePast = task.endDate && new Date(task.endDate) < now && !isCompleted;

    const taskUserNotifications = userNotifications.filter(
      (un) => un.taskId?.toString() === task._id.toString()
    );

    const allUsersSkipped = taskUserNotifications.length > 0 && 
      taskUserNotifications.every(un => 
        (un.skipUntil && new Date(un.skipUntil) > now) || 
        un.permanentlySkipped
      );

    task.showReminder = (isReminderDue || isEndDatePast) && !allUsersSkipped;
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
      console.log(`Task ${task._id} has active skip settings - skipping notification`);
      return false;
    }

    // ✅ REMOVED: No interval window duplicate check
    // Interval reminders will be created at each interval time
    console.log(`Creating interval reminder for task ${task._id} - no skip settings found`);
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
      console.log(`Duplicate fixed-time notification prevented for task ${task._id}`);
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

    console.log(`Found ${settings.length} TASK_REMINDER_DUE settings`);

    settings.forEach((setting) => {
      // Fixed time reminders
      if (setting.type === "fixed" && setting.reminderTime) {
        const [hour, minute] = setting.reminderTime.split(":").map(Number);
        const jobName = `TASK_REMINDER_DUE-${setting._id}-fixed`;
        
        console.log(`Scheduling fixed reminder for ${setting._id} at ${hour}:${minute}`);
        
        const job = schedule.scheduleJob(
          jobName,
          { hour, minute, tz: "Asia/Kolkata" },
          () => sendTaskReminderNotifications(setting)
        );
        
        if (job) {
          activeJobs.set(jobName, job);
          console.log(`✅ Fixed job scheduled: ${jobName}`);
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

        console.log(`✅ Scheduled ${jobCount} interval jobs for setting ${setting._id}`);
      }
    });

    console.log(`Dynamic TASK_REMINDER_DUE jobs scheduled. Total active jobs: ${activeJobs.size}`);
  } catch (error) {
    console.error("Error initializing reminder jobs:", error);
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
    console.log("Connected to MongoDB.");
    initReminderJobs();
  })
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

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
