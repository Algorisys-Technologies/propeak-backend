const mongoose = require("mongoose");
const uuidv4 = require("uuid/v4");
const jwt = require("jsonwebtoken");
const secret = require("../../config/secret");
const audit = require("../audit-log/audit-log-controller");
const Project = require("../../models/project/project-model");
const { logError, logInfo } = require("../../common/logger");
const { SubTask } = require("../../models/sub-task/subtask-model");
const Task = require("../../models/task/task-model");
const User = require("../../models/user/user-model");
const config = require("../../config/config");
const rabbitMQ = require("../../rabbitmq");
const { addMyNotification } = require("../../common/add-my-notifications");

const errors = {
  SUBTASK_DOESNT_EXIST: "SubTask does not exist",
  ADD_SUBTASK_ERROR: "Error occurred while adding the SubTask",
  EDIT_SUBTASK_ERROR: "Error occurred while updating the SubTask",
  DELETE_SUBTASK_ERROR: "Error occurred while deleting the SubTask",
};

exports.getAllsubTasks = (req, res) => {
  logInfo("getAllsubTasks");
  Project.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(projectId),
        $or: [{ isDeleted: false }, { isDeleted: null }],
      },
    },
    { $unwind: "$tasks" },
    {
      $match: {
        $or: [{ "tasks.isDeleted": false }, { "tasks.isDeleted": null }],
      },
    },
    { $project: { "tasks.subtasks": 1 } },
  ])
    .then((result) => {
      let subTaskresult = result[0].tasks.subtasks.filter((m) => {
        if (m.isDeleted !== true) {
          return m;
        }
      });
      logInfo("getAllsubTasks before response");
      res.json(subTaskresult);
    })
    .catch((err) => {
      res.json({ err: errors.MESSAGE_DOESNT_EXIST });
    });
};

exports.createSubTask = async (req, res) => {
  logInfo(req.body, "createSubTask req.body");
  //console.log("createSubTask req.body", req.body);
  try {
    let newSubTask = {
      taskId: req.body.taskId,
      title: req.body.title,
      completed: false,
      dateOfCompletion: "",
      isDeleted: false,
      storyPoint: "",
      sequence: "",
    };

    if (req.body.userId) {
      newSubTask.userId = req.body.userId;
    }

    console.log("newSubTasksss", newSubTask);

    const result = await SubTask.create(newSubTask);
    await Task.findOneAndUpdate(
      { _id: req.body.taskId },
      { $push: { subtasks: result._id } }
    );

    if (req.body.userId) {
      const mainTask = await Task.findById(req.body.taskId);
      const taskAssignedUser = mainTask ? mainTask.userId : null;
      const assignedTaskUser = taskAssignedUser
        ? await User.findById(taskAssignedUser)
        : null;
      const emailOwner = assignedTaskUser ? assignedTaskUser.email : null;

      const assignedUser = await User.findById(req.body.userId);
      const email = assignedUser ? assignedUser.email : null;
      const assignedUserName = assignedUser ? assignedUser.name : "N/A";

      const project = await Project.findById(mainTask.projectId);
      const projectName = project ? project.title : "Unknown Project";
      let subTaskEmailLink = `${config.subTaskEmailLink}/${mainTask.projectId}/kanban/stage`;

      const auditTaskAndSendMail = async (newSubTask, emailOwner, email) => {
        try {
          let updatedDescription = `
            <p>
              Subtask <strong>${newSubTask.title}</strong> has been assigned to:
            </p>
            <ul>
              <li><strong>Name:</strong> ${assignedUserName}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Click here</strong> ${subTaskEmailLink}</li> 
            </ul>`;
          let emailText = config.taskEmailContent
            .replace("#title#", mainTask.title)
            .replace("#description#", updatedDescription)
            .replace("#projectName#", projectName)
            .replace("#priority#", mainTask.priority.toUpperCase())
            .replace("#newTaskId#", mainTask._id);

          if (email !== "XX") {
            var mailOptions = {
              from: config.from,
              to: email,
              // cc: emailOwner,
              subject: `SubTask assigned - ${newSubTask.title}`,
              html: emailText,
            };

            let taskArr = {
              subject: mailOptions.subject,
              url: subTaskEmailLink,
              userId: newSubTask.userId,
            };

            rabbitMQ
              .sendMessageToQueue(mailOptions, "message_queue", "msgRoute")
              .then((resp) => {
                logInfo(
                  "Task add mail message sent to the message_queue: " + resp
                );
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

      auditTaskAndSendMail(result, emailOwner, email);
    }

    return res.json({
      success: true,
      msg: `Successfully added!`,
      result: result,
    });
  } catch (e) {
    console.log("err", e);
    return res.json({ success: false, message: e });
  }
};

exports.updateSubTask = async (req, res) => {
  logInfo(req.body, "updateSubTask req.body");
  console.log("updateSubTask req.body", req.body);

  try {
    const {
      taskId,
      subTaskId,
      title,
      completed = false,
      dateOfCompletion = "",
      isDeleted = false,
      storyPoint = "",
      sequence = "",
      userId,
    } = req.body;

    // Validate subTaskId
    if (!subTaskId) {
      // Change here to match the request body
      console.log("Error: Subtask ID is missing in the request body.");
      return res
        .status(400)
        .json({ success: false, msg: "Subtask ID is required" });
    }

    // Validate that subTaskId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
      // Change here to match the request body
      console.log("Error: Invalid Subtask ID format");
      return res
        .status(400)
        .json({ success: false, msg: "Invalid Subtask ID format" });
    }

    const subtaskToUpdate = await SubTask.findById(subTaskId);
    if (!subtaskToUpdate) {
      console.log("Error: Subtask not found");
      return res.status(404).json({ success: false, msg: "Subtask not found" });
    }

    // Update the subtask
    console.log("Attempting to update subtask with ID:", subTaskId);
    const updatedSubTask = await SubTask.findOneAndUpdate(
      { _id: subTaskId },
      {
        title,
        completed,
        dateOfCompletion,
        storyPoint,
        sequence,
        userId,
        isDeleted,
      },
      { new: true }
    );

    // Check if the update was successful
    if (!updatedSubTask) {
      console.log(
        "Error: Subtask not updated (no changes or subtask not found)"
      );
      return res
        .status(404)
        .json({ success: false, msg: "Subtask not found or no changes made" });
    }

    if (req.body.userId) {
      const mainTask = await Task.findById(req.body.taskId);
      const taskAssignedUser = mainTask ? mainTask.userId : null;
      const assignedTaskUser = taskAssignedUser
        ? await User.findById(taskAssignedUser)
        : null;
      const emailOwner = assignedTaskUser ? assignedTaskUser.email : null;

      const assignedUser = await User.findById(req.body.userId);
      const email = assignedUser ? assignedUser.email : null;
      const assignedUserName = assignedUser ? assignedUser.name : "N/A";

      const project = await Project.findById(mainTask.projectId);
      const projectName = project ? project.title : "Unknown Project";
      let subTaskEmailLink = `${config.subTaskEmailLink}/${mainTask.projectId}/kanban/stage`;

      const auditTaskAndSendMail = async (newSubTask, emailOwner, email) => {
        try {
          let updatedDescription = `
            <p>
              Subtask <strong>${newSubTask.title}</strong> has been assigned to:
            </p>
            <ul>
              <li><strong>Name:</strong> ${assignedUserName}</li>
              <li><strong>Email:</strong> ${email}</li>  
              <li><strong>Click here</strong> ${subTaskEmailLink}</li>     
            </ul>`;
          let emailText = config.taskEmailContent
            .replace("#title#", mainTask.title)
            .replace("#description#", updatedDescription)
            .replace("#projectName#", projectName)
            .replace("#priority#", mainTask.priority.toUpperCase())
            .replace("#newTaskId#", mainTask._id);

          if (email !== "XX") {
            var mailOptions = {
              from: config.from,
              to: email,
              // cc: emailOwner,
              subject: `SubTask assigned - ${newSubTask.title}`,
              html: emailText,
            };

            let taskArr = {
              subject: mailOptions.subject,
              url: subTaskEmailLink,
              userId: newSubTask.userId,
            };

            rabbitMQ
              .sendMessageToQueue(mailOptions, "message_queue", "msgRoute")
              .then((resp) => {
                logInfo(
                  "Task add mail message sent to the message_queue: " + resp
                );
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

      auditTaskAndSendMail(updatedSubTask, emailOwner, email);
    }

    return res.json({
      success: true,
      msg: `Subtask updated successfully!`,
      result: updatedSubTask,
    });
  } catch (e) {
    console.log("Error caught in updateSubTask:", e);
    return res.json({ success: false, message: e.message || e });
  }
};

// exports.updateSubTask = (req, res) => {
//   // console.log("req.body", req.body);
//   logInfo(req.body, "updateSubTask");
//   let projectId = req.body.projectId;
//   let taskId = req.body.taskId;
//   let subTask = req.body.subTask;
//   let updatedSubTask = {
//     _id: subTask._id,
//     title: subTask.title,
//     completed: subTask.completed,
//     edit: subTask.edit,
//     dateOfCompletion: subTask.dateOfCompletion,
//     isDeleted: subTask.isDeleted,
//     hiddenUsrId: subTask.hiddenUsrId,
//     storyPoint: subTask.storyPoint,
//     subtaskHiddenDepId: subTask.subtaskHiddenDepId,
//     sequence: subTask.sequence,
//   };
//   // console.log("updatedSubTask", updatedSubTask);
//   Project.findById(projectId)
//     .then((result) => {
//       let task = result.tasks.id(taskId);
//       let subtask = task.subtasks.id(updatedSubTask._id);
//       let userIdToken = req.userInfo.userName;
//       let fields = [];
//       var res1 = Object.assign({}, updatedSubTask);

//       for (let keys in res1) {
//         if (keys !== "_id") {
//           fields.push(keys);
//         }
//       }

//       fields.filter((field) => {
//         if (subtask[field] !== updatedSubTask[field]) {
//           if (
//             updatedSubTask[field] !== undefined &&
//             updatedSubTask[field] !== null &&
//             updatedSubTask[field] !== ""
//           ) {
//             audit.insertAuditLog(
//               subtask[field],
//               updatedSubTask.title,
//               "Subtask",
//               field,
//               updatedSubTask[field],
//               userIdToken,
//               result._id
//             );
//           }
//         }
//       });

//       if (updatedSubTask.isDeleted === true) {
//         subtask.isDeleted = updatedSubTask.isDeleted;
//       } else if (updatedSubTask.completed === true) {
//         subtask.completed = updatedSubTask.completed;
//       } else {
//         (subtask.title = updatedSubTask.title),
//           (subtask.hiddenUsrId = subTask.hiddenUsrId),
//           (subtask.storyPoint = subTask.storyPoint);
//       }
//       subtask = updatedSubTask;
//       return result.save();
//     })
//     .then((result) => {
//       // console.log("updateSubTask result", result);
//       logInfo("updateSubTask before reposne");
//       res.send({ result });
//     })
//     .catch((err) => {
//       logInfo("updateSubTask error " + err);
//       res.json({ err: errors.EDIT_SUBTASK_ERROR });
//     });
// };

exports.updateSubTaskCompleted = (req, res) => {
  logInfo(req.body, "updateSubTaskCompleted req.body");
  let updatedSubTask = {
    _id: req.body.subTask._id,
    taskId: req.body.subTask.taskId,
    title: req.body.subTask.title,
    completed: req.body.subTask.completed,
    edit: req.body.subTask.edit,
    dateOfCompletion: req.body.subTask.dateOfCompletion,
    isDeleted: req.body.subTask.isDeleted,
    sequence: req.body.subTask.sequence,
  };

  Project.findById(req.body.projectId)
    .then((result) => {
      let task = result.tasks.id(req.body.taskId);
      let subtask = task.subtasks.id(updatedSubTask._id);
      subtask.completed = updatedSubTask.completed;
      return result.save();
    })
    .then((result) => {
      logInfo(result, "updateSubTaskCompleted result");
      res.send({ result });
    })
    .catch((err) => {
      res.json({ err: errors.EDIT_SUBTASK_ERROR });
      return;
    });
};

exports.toggleSubTask = async (req, res) => {
  try {
    await SubTask.findOneAndUpdate(
      { _id: req.body.subTaskId },
      { completed: req.body.completed }
    );
    return res.json({
      success: true,
      msg: `Successfully toggled!`,
      result: result,
    });
  } catch (e) {
    console.log("err", e);
    return res.json({ success: false, message: e });
  }
};

exports.deleteSubTask = async (req, res) => {
  console.log("In delete subTask controller");
  try {
    const result = await SubTask.findOneAndDelete({ _id: req.body.subTaskId });

    await Task.findOneAndUpdate(
      { _id: req.body.taskId },
      { $pull: { subtasks: req.body.subTaskId } }
    );
    return res.json({
      success: true,
      msg: `Successfully Deleted!`,
      result: result,
    });
  } catch (e) {
    console.log("err", e);
    return res.json({ success: false, message: e });
  }
};
