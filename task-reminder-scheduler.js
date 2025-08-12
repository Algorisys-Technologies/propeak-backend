const schedule = require("node-schedule");
const Task = require("./models/task/task-model");
const Project = require("./models/project/project-model");
const User = require("./models/user/user-model");
const mongoose = require("mongoose");
require("dotenv").config();
const { handleNotifications } = require("./utils/notification-service");
const { addMyNotification } = require("./common/add-my-notifications");
const rabbitMQ = require("./rabbitmq");
const config = require("./config/config");

const auditTaskAndSendMail = async (newTask, emailOwner, email) => {
  try {
    console.log(`[DEBUG] Preparing to send email to: ${email}`);

    let updatedDescription = newTask.description
      .split("\n")
      .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");
    let emailText = config.taskEmailContent
      .replace("#title#", newTask.title)
      .replace("#description#", updatedDescription)
      .replace("#projectName#", newTask.projectId.title)
      .replace("#projectId#", newTask.projectId._id)
      .replace("#priority#", newTask.priority.toUpperCase())
      .replace("#newTaskId#", newTask._id);

    let taskEmailLink = config.taskEmailLink
      .replace("#projectId#", newTask.projectId._id)
      .replace("#newTaskId#", newTask._id);

    // console.log(emailText, "from mailOptions")

    if (email !== "XX") {
      var mailOptions = {
        from: config.from,
        to: email,
        // cc: emailOwner,
        subject: ` TASK_REMINDER_DUE - ${newTask.title}`,
        html: emailText,
      };

      console.log(`[DEBUG] mailOptions constructed:`, mailOptions);

      let taskArr = {
        subject: mailOptions.subject,
        url: taskEmailLink,
        userId: newTask.assignedUser,
      };

      console.log(`[DEBUG] Sending message to RabbitMQ queue...`);
      rabbitMQ
        .sendMessageToQueue(mailOptions, "message_queue", "msgRoute")
        .then((resp) => {
          logInfo("Task add mail message sent to the message_queue: " + resp);
          addMyNotification(taskArr);
        })
        .catch((err) => {
          console.error("Failed to send email via RabbitMQ", err);
        });
    }
  } catch (error) {
    console.error("Error in sending email", error);
  }
};

const reminderOffset = 10 * 24 * 60 * 60 * 1000; // 10 days in ms

async function sendTaskReminderNotifications() {
  try {
    const now = new Date();

    // Fetch all tasks that might need reminders (you can filter better here if needed)
    let tasks = await Task.find({ isDeleted: false }).lean();

    // Map to set reminder info on tasks (reuse your existing logic)
    tasks = tasks.map((task) => {
      if (!task.startDate) {
        task.reminderDate = null;
        task.showReminder = false;
        return task;
      }

      const reminderDate = new Date(
        new Date(task.startDate).getTime() + reminderOffset
      );
      task.reminderDate = reminderDate;

      const isCompleted = task.status === "completed";

      const isReminderDue = now >= reminderDate && !isCompleted;
      const isEndDatePast =
        task.endDate && new Date(task.endDate) < now && !isCompleted;

      task.showReminder = isReminderDue || isEndDatePast;

      return task;
    });

    const reminderDueTasks = tasks.filter((t) => t.showReminder);

    if (reminderDueTasks.length > 0) {
      for (const reminderTask of reminderDueTasks) {
        try {
          const populatedTask = await Task.findById(reminderTask._id)
            .populate({ path: "projectId", select: "title", model: "project" })
            .populate({ path: "createdBy", select: "name", model: "user" });

          const eventType = "TASK_REMINDER_DUE";
          const notification = await handleNotifications(
            populatedTask,
            eventType
          );

          if (notification.length > 0) {
            for (const channel of notification) {
              const { emails } = channel;
              for (const email of emails) {
                await auditTaskAndSendMail(populatedTask, [], email);
              }
            }
          }
        } catch (err) {
          console.error(
            `Failed to send reminder notification for task ${reminderTask._id}`,
            err
          );
        }
      }
    }
  } catch (error) {
    console.error("Error in sending task reminder notifications:", error);
  }
}

// Connect mongoose and schedule job only after DB connection:
mongoose
  .connect(process.env.DB, {
    socketTimeoutMS: 0,
  })
  .then(() => {
    console.log("Connected to MongoDB."); //0 9 * * * */2 * * * *
    schedule.scheduleJob("0 9 * * *", () => {
      console.log("Running task reminder notification job daily at 9 AM...");
      sendTaskReminderNotifications();
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
  });
