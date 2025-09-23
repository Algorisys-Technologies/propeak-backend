const mongoose = require("mongoose");
const { Message } = require("../../models/message/message-model");
const jwt = require("jsonwebtoken");
const secret = require("../../config/secret");
const audit = require("../audit-log/audit-log-controller");
const Project = require("../../models/project/project-model");
const Task = require("../../models/task/task-model");
const { logError, logInfo } = require("../../common/logger");
const access = require("../../check-entitlements");
const User = require("../../models/user/user-model");
//const nodemailer = require('nodemailer');
const { sendEmail } = require("../../common/mailer");
const config = require("../../config/config");
const { addMyNotification } = require("../../common/add-my-notifications");
const rabbitMQ = require("../../rabbitmq");
const { DEFAULT_PAGE, DEFAULT_LIMIT } = require("../../utils/defaultValues");

const errors = {
  MESSAGE_DOESNT_EXIST: "Messages do not exist",
  ADD_MESSAGE_ERROR: "Error occurred while adding the Message",
  EDIT_MESSAGE_ERROR: "Error occurred while updating the Message",
  DELETE_MESSAGE_ERROR: "Error occurred while deleting the Message",
  NOT_AUTHORIZED: "Your are not authorized",
};

exports.addMessage = async (req, res) => {

  // Create new message document
  const newMessage = new Message({
    title: req.body.title,
    isDeleted: false,
    createdBy: req.body.createdBy,
    createdOn: new Date(),
    projectId: req.body.projectId,
    taskId: req.body.taskId || null,
  });

  try {
    await newMessage.save();
    console.log("Message saved successfully");

    if (req.body.taskId) {
      await Task.findOneAndUpdate(
        { _id: req.body.projectId },
        { $push: { messages: newMessage._id } }
      );

      return res.json({
        success: true,
        msg: "Successfully Added!",
      });
    } else {
      await Project.findOneAndUpdate(
        { _id: req.body.projectId },
        { $push: { messages: newMessage._id } }
      );

      // console.log("Message added to project without specific task");

      // Optionally insert audit log
      audit.insertAuditLog(
        "",
        newMessage.title,
        "Project",
        "messages",
        newMessage.title,
        req.body.userId,
        req.body.projectId
      );

      return res.json({ msg: "Successfully Added!" });
    }
  } catch (err) {
    console.error("Error adding message:", err);
    return res.status(500).json({ err: "ADD_MESSAGE_ERROR" });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    await Message.findByIdAndDelete({ _id: messageId });

    return res.json({ success: true, message: "message deleted" });
  } catch (error) {
    return res.json({ success: false, error });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { projectId, taskId, currentPage = DEFAULT_PAGE } = req.body;
    const limit = DEFAULT_LIMIT;

    // Validate inputs
    if (!projectId && !taskId) {
      return res.status(400).json({
        success: false,
        messages: [],
        totalPages: 0,
        currentPage: 0,
        msg: "Either projectId or taskId is required.",
      });
    }


    // Determine the query based on taskId or projectId
    const query = taskId ? { taskId } : { projectId, taskId: null };

    // Fetch messages with pagination
    const messages = await Message.find(query)
      .populate("createdBy")
      .skip(limit * currentPage)
      .limit(limit);

    // Count total messages to calculate total pages
    const totalMessages = await Message.countDocuments(query);
    const totalPages = Math.ceil(totalMessages / limit);

    // Handle case where no messages are found
    if (!messages || messages.length === 0) {
      return res.status(404).json({
        success: false,
        messages: [],
        totalPages: 0,
        currentPage: 0,
        msg: "No messages found for the given criteria.",
      });
    }

    // Return paginated response
    return res.json({
      success: true,
      messages,
      totalPages,
      currentPage,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred.",
    });
  }
};

// exports.getMessages = async (req, res) => {
//   try {
//     const { projectId, taskId } = req.body;

//     console.log("params", projectId, taskId);
//     let messages;
//     if (taskId) {
//       messages = await Message.find({ taskId }).populate("createdBy");
//     } else {
//       messages = await Message.find({ projectId }).populate("createdBy");
//     }

//     return res.json({ success: true, messages });
//   } catch (error) {
//     console.error("Error fetching messages:", error); // Logging for easier debugging
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };
