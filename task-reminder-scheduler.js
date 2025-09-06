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

async function sendTaskReminderNotifications(setting) {
  try {
    console.log("setting", setting);
    const now = new Date();

    if (setting.pausedUntil && setting.pausedUntil > now) {
      console.log(
        `Skipping reminders for ${setting._id}, paused until ${setting.pausedUntil}`
      );
      return;
    }

    // ⛔ Skip if disabled permanently
    if (!setting.active) {
      console.log(`Skipping reminders for ${setting._id}, inactive setting`);
      return;
    }

    let tasks = await Task.find({
      isDeleted: false,
      projectId: setting.projectId,
      ...(setting.taskStageId ? { taskStageId: setting.taskStageId } : {}),
    }).lean();

    // If no tasks found, skip
    if (!tasks || tasks.length === 0) {
      console.log(`No tasks found for project ${setting.projectId}`);
      return;
    }

    //let tasks = await Task.find({ isDeleted: false }).lean();
    // Check for user notification preferences
    const userNotifications = await userNotificationModel.find({
      eventType: "TASK_REMINDER_DUE",
      projectId: setting.projectId,
    });

    tasks = tasks.map((task) => {
      if (!task.startDate)
        return { ...task, reminderDate: null, showReminder: false };

      const reminderDate = new Date(
        new Date(task.startDate).getTime() + reminderOffset
      );
      task.reminderDate = reminderDate;

      const isCompleted = task.status === "completed";
      const isReminderDue = now >= reminderDate && !isCompleted;
      const isEndDatePast =
        task.endDate && new Date(task.endDate) < now && !isCompleted;

       // Check if user has skipped notifications for this task
       const userNotification = userNotifications.find(
        (un) => un.taskId && un.taskId.toString() === task._id.toString()
      );
      
      const isSkippedToday = userNotification && 
                            userNotification.skipUntil && 
                            new Date(userNotification.skipUntil) > now;
      
      const isPermanentlySkipped = userNotification && 
                                  userNotification.permanentlySkipped;

      task.showReminder = (isReminderDue || isEndDatePast) && 
                         !isSkippedToday && 
                         !isPermanentlySkipped;
      return task;
    });

    //const reminderDueTasks = tasks.filter((t) => t.showReminder);

    const reminderDueTasks = tasks.filter((t) => t.showReminder && t.projectId);

    for (const reminderTask of reminderDueTasks) {
      console.log(reminderTask, "from reminder task")
      const populatedTask = await Task.findById(reminderTask._id)
        .populate({ path: "projectId", select: "title", model: "project" })
        .populate({ path: "createdBy", select: "name", model: "user" });

      if (!populatedTask?.projectId || !populatedTask.projectId._id) {
        console.warn(
          `Skipping reminder for task ${populatedTask?._id} - projectId not found`
        );
        continue;
      }
      console.log(populatedTask, "frm populdated task")

      const notification = await handleNotifications(
        populatedTask,
        "TASK_REMINDER_DUE"
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

// --- Dynamic scheduling ---
async function initReminderJobs() {
  const settings = await NotificationSetting.find({
    eventType: "TASK_REMINDER_DUE",
    active: true,
  });

  settings.forEach((setting) => {
    // Fixed time reminders
    if (setting.type === "fixed" && setting.reminderTime) {
      const [hour, minute] = setting.reminderTime.split(":").map(Number);
      schedule.scheduleJob(
        `${setting._id}-fixed`,
        { hour, minute, tz: "Asia/Kolkata" },
        () => sendTaskReminderNotifications(setting)
      );
    }

    // Interval reminders
    if (
      setting.type === "interval" &&
      setting.intervalStart &&
      setting.intervalEnd &&
      setting.intervalMinutes
    ) {
      const [startHour, startMinute] = setting.intervalStart
        .split(":")
        .map(Number);
      const [endHour, endMinute] = setting.intervalEnd.split(":").map(Number);

      let current = new Date();
      current.setHours(startHour, startMinute, 0, 0);

      const end = new Date();
      end.setHours(endHour, endMinute, 0, 0);

      while (current <= end) {
        const jobTime = new Date(current);

        schedule.scheduleJob(
          `${setting._id}-${jobTime.getHours()}-${jobTime.getMinutes()}`,
          {
            hour: jobTime.getHours(),
            minute: jobTime.getMinutes(),
            tz: "Asia/Kolkata",
          },
          () => sendTaskReminderNotifications(setting)
        );

        current = new Date(current.getTime() + setting.intervalMinutes * 60000);
      }
    }
  });

  console.log("Dynamic TASK_REMINDER_DUE jobs scheduled.");
}

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
