const mongoose = require("mongoose");
const Task = require("../../models/task/task-model");
const { Tasks } = require("../../models/task/task-model");
const SubTask = require("../../models/sub-task/subtask-model");
const uuidv4 = require("uuid/v4");
const nodemailer = require("nodemailer");
const User = require("../../models/user/user-model");
const audit = require("../audit-log/audit-log-controller");
const TaskStage = require("../../models/task-stages/task-stages-model");
const GroupTaskStage = require("../../models/task-stages/group-task-stages-model");
const fs = require("fs");
const config = require("../../config/config");
const jwt = require("jsonwebtoken");
const secret = require("../../config/secret");
const Project = require("../../models/project/project-model");
const Product = require("../../models/product/product-model");
const TaskPriority = require("../../models/task/task-priority-model");
const { logError, logInfo } = require("../../common/logger");
const { sendEmail } = require("../../common/mailer");
const accessConfig = require("../../common/validate-entitlements");
const objectId = require("../../common/common");
// const NotificationSetting = require("../../models/notification-setting/notification-setting-model");
// const Role = require("../../models/role/role-model");
const errors = {
  TASK_DOESNT_EXIST: "Task does not exist",
  ADD_TASK_ERROR: "Error occurred while adding the Task",
  EDIT_TASK_ERROR: "Error occurred while updating the Task",
  DELETE_TASK_ERROR: "Error occurred while deleting the Task",
  SEARCH_PARAM_MISSING: "Please input required parameters for search",
  SERVER_ERROR: "Opps, something went wrong. Please try again.",
  NOT_AUTHORIZED: "Your are not authorized",
};
const sortData = require("../../common/common");
const dateUtil = require("../../utils/date-util");
const rabbitMQ = require("../../rabbitmq");
const { addMyNotification } = require("../../common/add-my-notifications");
const { ObjectId } = require("mongodb");
const totalSundays = require("../../common/common");
const Holiday = require("../../models/leave/holiday-model");
//const { response } = require("express");
const { skip } = require("rxjs-compat/operator/skip");
let uploadFolder = config.UPLOAD_PATH;
const { UploadFile } = require("../../models/upload-file/upload-file-model");
// const NotificationPreference = require("../../models/notification-setting/notification-preference-model");
const {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} = require("date-fns");
const { result } = require("lodash");
const sendNotification = require("../../utils/send-notification");
const { handleNotifications } = require("../../utils/notification-service");
const notificationSettingModel = require("../../models/notification-setting/notification-setting-model");

exports.createTask = (req, res) => {
  console.log(req.body, "request body in create tasks ");
  const { taskData, fileName, projectId, newTaskData } = req.body;
  console.log(projectId, "from projectId", newTaskData);
  
  // Check if taskData is empty or not provided, use newTaskData instead
  let task, multiUsers;
  let useNewTaskData = false;
  
  if (!taskData || taskData.trim() === '') {
    useNewTaskData = true;
    task = newTaskData;
    multiUsers = task.multiUsers || [];
  } else {
    const parsedData = JSON.parse(taskData);
    task = parsedData.task;
    multiUsers = parsedData.multiUsers || [];
  }

  
  // Extract fields from the appropriate source
  const {
    _id,
    title,
    description,
    startDate,
    endDate,
    status,
    depId,
    userId,
    taskType,
    taskStageId,
    tag,
    interested_products,
    assignedUser,
    category,
    storyPoint,
    priority,
    companyId,
    notifyUsers = [],
    customFieldValues = {},
    createdBy,
    modifiedBy,
    isDeleted,
    createdByEmail,
    ownerEmail,
    publishStatus,
  } = task;

  console.log(taskStageId, "from taskStageId");

  let assignedUsers = [];
  if (!multiUsers || multiUsers.length === 0) {
    assignedUsers = [{ id: userId }];
  } else {
    const filterUserIds = (userIds, assignedUsers) => {
      userIds.forEach((userId) => {
        let normalizedId;
        if (userId && userId.id && userId.id.id) {
          normalizedId = userId.id.id;
        } else if (userId && userId.id) {
          normalizedId = userId.id;
        } else {
          normalizedId = userId;
        }

        if (!assignedUsers.some((user) => user.id === normalizedId)) {
          assignedUsers.push({ id: normalizedId });
        }
      });
      return assignedUsers;
    };

    if (userId) {
      multiUsers.push(userId);
    }
    assignedUsers = filterUserIds(multiUsers, assignedUsers);
  }
  
  // For newTaskData, we might need to handle some default values
  const creationMode = useNewTaskData ? "MANUAL" : task.creation_mode || "MANUAL";
  const leadSource = useNewTaskData ? "USER" : task.lead_source || "USER";
  
  const newTask = new Task({
    _id,
    userId,
    title,
    description,
    startDate,
    endDate,
    taskStageId: taskStageId || null,
    projectId,
    status,
    assignedUser,
    taskType,
    depId,
    category,
    tag,
    storyPoint,
    priority,
    creation_mode: creationMode,
    lead_source: leadSource,
    multiUsers: assignedUsers?.map((user) => user.id),
    notifyUsers: notifyUsers?.map((id) => id),
    customFieldValues,
    companyId,
    interested_products: interested_products?.map((p) => ({
      product_id: p.product_id,
      quantity: parseFloat(p.quantity || "0"),
      priority: "",
      unit: p.unit,
      negotiated_price: parseFloat(p.price || "0"),
      total_value: parseFloat(p.total || "0"),
    })),
    createdBy,
    createdOn: new Date(),
    modifiedBy,
    modifiedOn: new Date(),
    isDeleted,
    publish_status: publishStatus,
  });

  newTask
    .save()
    .then(async (result) => {
      // ... rest of the code remains the same
      const taskId = result._id;
      // Send notification here

      const task = await Task.findById(taskId)
        .populate({
          path: "projectId",
          select: "title",
          model: "project",
        })
        .populate({
          path: "createdBy",
          select: "name",
          model: "user",
        });

      if (fileName) {
        let uploadFile = {
          _id: _id,
          fileName: fileName,
          isDeleted: false,
          createdBy: userId,
          createdOn: new Date(),
          companyId: companyId,
          projectId: projectId,
          taskId: taskId,
        };

        const newuploadfile = new UploadFile(uploadFile);
        const uploadResult = await newuploadfile.save();

        if (taskId) {
          await Task.findOneAndUpdate(
            { _id: taskId },
            {
              $push: {
                uploadFiles: {
                  _id: uploadResult._id,
                  fileName: uploadResult.fileName,
                },
              },
            },
            { new: true }
          );
        } else {
          await Project.findOneAndUpdate(
            { _id: projectId },
            { $push: { uploadFiles: uploadResult._id } }
          );
        }
        console.log(req.files, uploadFile);
        try {
          if (!req.files.uploadFile) {
            res.send({ error: "No files were uploaded." });
            return;
          }

          const uploadedFile = req.files.uploadFile;
          console.log(uploadedFile, "uploadedFile");
          const fileUploaded = uploadedFile.name.split(".");
          const fileExtn = fileUploaded[fileUploaded.length - 1].toUpperCase();

          const validFileExtn = [
            "PDF",
            "DOCX",
            "PNG",
            "JPEG",
            "JPG",
            "TXT",
            "PPT",
            "XLSX",
            "XLS",
            "PPTX",
          ];

          if (validFileExtn.includes(fileExtn)) {
            let projectFolderPath;
            if (taskId) {
              projectFolderPath = `${uploadFolder}/${companyId}/${projectId}/${taskId}`;
            } else {
              projectFolderPath = `${uploadFolder}/${companyId}/${projectId}`;
            }

            if (!fs.existsSync(projectFolderPath)) {
              fs.mkdirSync(projectFolderPath, { recursive: true });
            }

            uploadedFile.mv(`${projectFolderPath}/${fileName}`, function (err) {
              if (err) {
                console.log(err);
                res.send({ error: "File Not Saved." });
              }
            });
          } else {
            res.send({
              _id: result._id,
              error:
                "File format not supported!(Formats supported are: 'PDF', 'DOCX', 'PNG', 'JPEG', 'JPG', 'TXT', 'PPT', 'XLSX', 'XLS', 'PPTX')",
            });
          }
        } catch (err) {
          console.log(err);
        }
      }

      const userIdToken = req.body.userName;
      const fields = Object.keys(result.toObject()).filter(
        (key) =>
          result[key] !== undefined &&
          result[key] !== null &&
          result[key].length !== 0 &&
          result[key] !== ""
      );

      fields.forEach((field) => {
        if (field === "multiUsers" || field === "notifyUsers") {
          result[field].forEach((id) => {
            audit.insertAuditLog(
              "",
              result.title,
              "Task",
              field,
              id,
              userIdToken,
              result._id
            );
          });
        } else {
          audit.insertAuditLog(
            "",
            result.title,
            "Task",
            field,
            result[field],
            userIdToken,
            result._id
          );
        }
      });

      const eventType = "TASK_CREATED";
      const notification = await handleNotifications(task, eventType);

      const auditTaskAndSendMail = async (newTask, emailOwner, email) => {
        try {
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

          if (email !== "XX") {
            var mailOptions = {
              from: config.from,
              to: email,
              subject: ` TASK_CREATED - ${newTask.title}`,
              html: emailText,
            };

            let taskArr = {
              subject: mailOptions.subject,
              url: taskEmailLink,
              userId: newTask.assignedUser,
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

      if (notification.length > 0) {
        for (const channel of notification) {
          const { emails } = channel;

          for (const email of emails) {
            await auditTaskAndSendMail(task, [], email);
          }
        }
      }

      if (task.publish_status === "published") {
        const auditTaskAndSendMail = async (updatedTask, emailOwner, email) => {
          try {
            let updatedDescription = updatedTask.description
              .split("\n")
              .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");

            let emailText = `
          Hi, <br/><br/>
          A new task has been <strong>assigned</strong> to you. <br/><br/>
          <strong>Project:</strong> ${updatedTask.projectId.title} <br/>
          <strong>Task:</strong> ${updatedTask.title} <br/>
          <strong>Description:</strong><br/> &nbsp;&nbsp;&nbsp;&nbsp; ${updatedDescription} <br/><br/>
          <strong>Priority:</strong> ${updatedTask.priority.toUpperCase()} <br/>
          
          To view project details, click 
          <a href="${process.env.URL}tasks/show/${updatedTask.projectId._id}/${
              updatedTask._id
            }" target="_blank">here</a>. <br/><br/>
          Thanks, <br/>
          The proPeak Team
        `;

            let taskEmailLink = config.taskEmailLink
              .replace("#projectId#", updatedTask.projectId._id)
              .replace("#newTaskId#", updatedTask._id);

            if (email !== "XX") {
              var mailOptions = {
                from: config.from,
                to: email,
                subject: `${updatedTask.projectId.title} - Task Assigned - ${updatedTask.title}`,
                html: emailText,
              };

              console.log(mailOptions, "from mail option");

              let taskArr = {
                subject: mailOptions.subject,
                url: taskEmailLink,
                userId: updatedTask.assignedUser,
              };

              rabbitMQ
                .sendMessageToQueue(mailOptions, "message_queue", "msgRoute")
                .then((resp) => {
                  logInfo(
                    "Task update mail message sent to the message_queue: " +
                      resp
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

        const eventType = "TASK_ASSIGNED";
        const notification = await handleNotifications(task, eventType);
        if (notification.length > 0) {
          for (const channel of notification) {
            const { emails } = channel;

            for (const email of emails) {
              await auditTaskAndSendMail(task, [], email);
            }
          }
        }
      }

      // ✅ Auto-create product tasks
      if (
        Array.isArray(interested_products) &&
        interested_products.length > 0
      ) {
        console.log("Creating product tasks for:", interested_products);
        const enrichedProducts = [];
        for (const product of interested_products) {
          const productDoc = await Product.findById(product.product_id).select(
            "name category description"
          );

          const enrichedProduct = {
            ...product,
            product_name: productDoc?.name || "Unnamed Product",
            product_category: productDoc?.category || "Uncategorized",
            product_description: productDoc?.description || "No description",
          };

          enrichedProducts.push(enrichedProduct);

          console.log("enrichedProducts", enrichedProducts);

          const productTask = new Task({
            title: `Product ${enrichedProduct.product_name}`,
            description: `${enrichedProduct.product_description} Category: ${enrichedProduct.product_description}`,
            startDate,
            endDate,
            taskStageId: taskStageId || null,
            projectId,
            status,
            assignedUser,
            taskType,
            depId,
            category,
            tag,
            storyPoint,
            priority,
            creation_mode: "AUTO",
            lead_source: "PRODUCT_TASK",
            multiUsers: multiUsers?.map((user) => user.id),
            notifyUsers: notifyUsers?.map((id) => id),
            customFieldValues,
            companyId,
            interested_products: [
              {
                product_id: enrichedProduct.product_id,
                quantity: parseFloat(enrichedProduct.quantity || "0"),
                priority: "",
                unit: enrichedProduct.unit,
                negotiated_price: parseFloat(enrichedProduct.price || "0"),
                total_value: parseFloat(enrichedProduct.total || "0"),
              },
            ],
            createdBy,
            createdOn: new Date(),
            modifiedBy,
            modifiedOn: new Date(),
            isDeleted: false,
            publish_status: publishStatus,
            parentTaskId: taskId,
          });

          await productTask.save();
        }
      }

      res.json({
        success: true,
        msg: "Task created successfully!",
        _id: result._id,
      });
    })
    .catch((err) => {
      console.error("CREATE_TASK ERROR", err);
      res.status(400).json({
        success: false,
        msg: "Failed to create task",
        error: err.message,
      });
    });
};
exports.updateTask = (req, res) => {
  console.log("is it coming th task update");
  console.log(req.body, "request body of update task ");
  const { taskId } = req.body;
  const { projectId, task, companyId, updates } = req.body;

  // console.log(updates, "from updateDate")

  const {
    title,
    description,
    startDate,
    endDate,
    taskStageId,
    status,
    assignedUser,
    depId,
    taskType,
    category,
    tag,
    interested_products,
    storyPoint,
    priority,
    multiUsers = [],
    notifyUsers = [],
    customFieldValues = {},
    modifiedBy,
    userId,
    createdByEmail,
    ownerEmail,
    publishStatus,
  } = task || updates;

  Task.findByIdAndUpdate(
    taskId,
    {
      depId: depId,
      taskType,
      title,
      description,
      startDate,
      endDate,
      taskStageId: taskStageId || null,
      projectId,
      status,
      assignedUser,
      category,
      tag,
      interested_products: interested_products?.map((p) => ({
        product_id: p.product_id,
        quantity: parseFloat(p.quantity || "0"),
        priority: "",
        negotiated_price: parseFloat(p.price || "0"),
        unit: p.unit,
        total_value: parseFloat(p.total || "0"),
      })),
      storyPoint,
      priority,
      multiUsers: multiUsers?.map((userId) => userId),
      notifyUsers: notifyUsers?.map((userId) => userId),
      customFieldValues,
      companyId,
      modifiedBy,
      modifiedOn: new Date(),
      userId,
      publish_status: publishStatus,
    },
    { new: true }
  )
    .then(async (result) => {
      if (!result) {
        return res.status(404).json({
          success: false,
          msg: "Task not found",
        });
      }
      const task = await Task.findById(result.id)
        .populate({
          path: "projectId",
          select: "title",
          model: "project",
        })
        .populate({
          path: "createdBy",
          select: "name",
          model: "user",
        }).populate({ path: "interested_products.product_id" })
        .populate("userId", "name");

        // console.log(task, "from task")
      // if(task.userId){
      //   const eventType = "TASK_ASSIGNED"
      //   await sendNotification(task, eventType);
      // }
      // if(task.publish_status === "published"){
      //   const eventType = "TASK_CREATED";
      //   try {
      //     const notificationResult = await sendNotification(task, eventType);
      //     console.log("Notification result:", notificationResult);
      //   } catch (notificationError) {
      //     console.error("Notification error:", notificationError);
      //   }
      // }

      // if(task.userId){
      //   const eventType = "TASK_ASSIGNED"
      //   await sendNotification(task, eventType);
      // }

      const userIdToken = req.body.userName;
      const fields = Object.keys(result.toObject()).filter(
        (key) =>
          result[key] !== undefined &&
          result[key] !== null &&
          result[key].length !== 0 &&
          result[key] !== ""
      );

      fields.forEach((field) => {
        if (field === "multiUsers" || field === "notifyUsers") {
          result[field].forEach((id) => {
            audit.insertAuditLog(
              "",
              result.title,
              "Task",
              field,
              id,
              userIdToken,
              result._id
            );
          });
        } else {
          audit.insertAuditLog(
            "",
            result.title,
            "Task",
            field,
            result[field],
            userIdToken,
            result._id
          );
        }
      });

      // if (emailOwner.length > 0 || email.length > 0) {
      const auditTaskAndSendMail = async (updatedTask, emailOwner, email) => {
        try {
          let updatedDescription = updatedTask.description
            .split("\n")
            .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");

          // let emailText = config.taskEmailAssignContent
          //   .replace("#title#", updatedTask.title)
          //   .replace("#description#", updatedDescription)
          //   .replace("#projectName#", updatedTask.projectId.title)
          //   .replace("#projectId#", updatedTask.projectId._id)
          //   .replace("#priority#", updatedTask.priority.toUpperCase())
          //   .replace("#newTaskId#", updatedTask._id);

          //   console.log(emailText, "from emailText")

          let emailText = `
            Hi, <br/><br/>
            A new task has been <strong>assigned</strong> to you. <br/><br/>
            <strong>Project:</strong> ${updatedTask.projectId.title} <br/>
            <strong>Task:</strong> ${updatedTask.title} <br/>
            <strong>Description:</strong><br/> &nbsp;&nbsp;&nbsp;&nbsp; ${updatedDescription} <br/><br/>
            <strong>Priority:</strong> ${updatedTask.priority.toUpperCase()} <br/>
            
            To view project details, click 
            <a href="${process.env.URL}tasks/show/${
            updatedTask.projectId._id
          }/${updatedTask._id}" target="_blank">here</a>. <br/><br/>
            Thanks, <br/>
            The proPeak Team
          `;

          let taskEmailLink = config.taskEmailLink
            .replace("#projectId#", updatedTask.projectId._id)
            .replace("#newTaskId#", updatedTask._id);

          if (email !== "XX") {
            var mailOptions = {
              from: config.from,
              to: email,
              // cc: emailOwner,
              subject: `TASK_ASSIGNED - ${updatedTask.title}`,
              html: emailText,
            };

            console.log(mailOptions, "from mailOption");

            let taskArr = {
              subject: mailOptions.subject,
              url: taskEmailLink,
              userId: updatedTask.assignedUser,
            };

            rabbitMQ
              .sendMessageToQueue(mailOptions, "message_queue", "msgRoute")
              .then((resp) => {
                logInfo(
                  "Task update mail message sent to the message_queue: " + resp
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

      if (task.publish_status === "published") {
        const eventType = "TASK_ASSIGNED";
        const notification = await handleNotifications(task, eventType);
        if (notification.length > 0) {
          for (const channel of notification) {
            const { emails } = channel;

            for (const email of emails) {
              await auditTaskAndSendMail(task, [], email);
            }
          }
        }
      }
      // }

      // ✅ Auto-create product tasks
      if (
        Array.isArray(interested_products) &&
        interested_products.length > 0
      ) {
        console.log(
          "Creating product tasks for in update:",
          interested_products
        );
        const enrichedProducts = [];
        for (const product of interested_products) {
          const productDoc = await Product.findById(product.product_id).select(
            "name category description"
          );

          const enrichedProduct = {
            ...product,
            product_name: productDoc?.name || "Unnamed Product",
            product_category: productDoc?.category || "Uncategorized",
            product_description: productDoc?.description || "No description",
          };

          enrichedProducts.push(enrichedProduct);

          console.log("enrichedProducts", enrichedProducts);

          const taskTitle = `Product ${enrichedProduct.product_name}`;

          // Skip if same title product task already exists for this parent task
          const existing = await Task.findOne({
            projectId: projectId,
            title: taskTitle,
            isDeleted: false,
          });

          if (existing) {
            console.log(`Skipping duplicate product task: ${taskTitle}`);
            continue;
          }

          const productTask = new Task({
            title: `Product ${enrichedProduct.product_name}`,
            description: `${enrichedProduct.product_description} Category: ${enrichedProduct.product_description}`,
            startDate,
            endDate,
            taskStageId: taskStageId || null,
            projectId,
            status,
            assignedUser,
            taskType,
            depId,
            category,
            tag,
            storyPoint,
            priority,
            creation_mode: "AUTO",
            lead_source: "PRODUCT_TASK",
            multiUsers: multiUsers?.map((user) => user.id),
            notifyUsers: notifyUsers?.map((id) => id),
            customFieldValues,
            companyId,
            interested_products: [
              {
                product_id: enrichedProduct.product_id,
                quantity: parseFloat(enrichedProduct.quantity || "0"),
                priority: "",
                unit: enrichedProduct.unit,
                negotiated_price: parseFloat(enrichedProduct.price || "0"),
                total_value: parseFloat(enrichedProduct.total || "0"),
              },
            ],
            createdBy,
            modifiedBy,
            createdOn: new Date(),
            modifiedOn: new Date(),
            isDeleted: false,
            publish_status: publishStatus,
            parentTaskId: taskId,
          });

          await productTask.save();
        }
      }

      res.json({
        success: true,
        task,
        msg: "Task updated successfully!",
      });
    })
    .catch((err) => {
      console.error("UPDATE_TASK ERROR", err);
      res.status(400).json({
        success: false,
        msg: "Failed to update task",
        error: err.message,
      });
    });
};

exports.autoSaveTask = async (req, res) => {
  try {
    const { _id, projectId, ...taskData } = req.body;

    console.log("req body", req.body);

    if (!Array.isArray(taskData.uploadFiles)) {
      taskData.uploadFiles = [];
    }

    // Ensure that interested_products is an array
    if (!Array.isArray(taskData.interested_products)) {
      taskData.interested_products = [];
    }

    // Handle other potential empty fields as arrays or objects
    taskData.subtasks = taskData.subtasks || [];
    taskData.messages = taskData.messages || [];

    if (taskData.startDate) {
      taskData.startDate = new Date(taskData.startDate);
    }
    if (taskData.endDate) {
      taskData.endDate = new Date(taskData.endDate);
    }

    let task;
    if (_id) {
      if (taskData.selectUsers) {
        taskData.userId = taskData.selectUsers;
      }

      // If task exists, update it
      task = await Task.findByIdAndUpdate(
        _id,
        { ...taskData, modifiedOn: new Date(), publish_status: "draft" },
        { new: true }
      );
    } else {
      // Check if a draft task with the same title and projectId already exists
      task = await Task.findOne({
        title: taskData.title,
        projectId,
        publish_status: "draft",
        creation_mode: "MANUAL",
      });

      if (!task) {
        // If no draft exists, create a new one
        task = new Task({
          ...taskData,
          projectId,
          publish_status: "draft",
          creation_mode: "MANUAL",
          createdOn: new Date(),
        });
        await task.save();
      }
    }

    return res.json(task);
  } catch (error) {
    console.error("Autosave error:", error);
    res.status(500).json({ error: "Failed to autosave" });
  }
};

exports.getTaskByTaskId = (req, res) => {
  const { taskId } = req.params;

  Task.findById({ _id: new mongoose.Types.ObjectId(taskId) })
    .populate({
      path: "interested_products.product_id",
    })
    .then((result) => {
      if (!result) {
        return res.status(404).json({ message: "Task not found" });
      }

      let messages = result.messages.filter((msg) => !msg.isDeleted);
      let uploadFiles = result.uploadFiles.filter((file) => !file.isDeleted);
      let data = {
        _id: result._id,
        title: result.title,
        description: result.description,
        startDate: result.startDate,
        endDate: result.endDate,
        status: result.status,
        priority: result.priority,
        userId: result.userId,
        companyId: result.companyId,
        createdBy: result.createdBy,
        createdOn: result.createdOn,
        modifiedBy: result.modifiedBy,
        modifiedOn: result.modifiedOn,
        isDeleted: result.isDeleted,
        tag: result.tag,
        customFieldValues: result.customFieldValues,
        depId: result.depId,
        // Include any additional fields relevant to your Task schema
      };

      res.json({
        data: result,
        messages: messages,
        uploadFiles: uploadFiles,
      });
    })
    .catch((err) => {
      logError("getTaskByTaskId error: ", err);
      res.status(500).json({ message: "Server error", error: err });
    });
};
exports.getTaskByProjectId = (req, res) => {
  logInfo(req.body, "getTaskByProjectId req.body");
  const { projectId } = req.body;
  Task.find({ projectId })
    .then((tasks) => {
      if (!tasks || tasks.length === 0) {
        return res
          .status(404)
          .json({ message: "No tasks found for this project." });
      }

      const filteredTasks = tasks.map((task) => {
        let messages = task.messages.filter((msg) => !msg.isDeleted);
        let uploadFiles = task.uploadFiles.filter((file) => !file.isDeleted);

        return {
          _id: task._id,
          title: task.title,
          description: task.description,
          startDate: task.startDate,
          endDate: task.endDate,
          status: task.status,
          priority: task.priority,
          projectId: task.projectId,
          userId: task.userId,
          createdBy: task.createdBy,
          createdOn: task.createdOn,
          modifiedBy: task.modifiedBy,
          modifiedOn: task.modifiedOn,
          isDeleted: task.isDeleted,
          messages: messages,
          uploadFiles: uploadFiles,
          customFieldValues: task.customFieldValues,
        };
      });

      res.json({ tasks: filteredTasks });
    })
    .catch((err) => {
      logError("getTaskByProjectId err", err);
      res
        .status(500)
        .json({ error: "An error occurred while fetching tasks." });
    });
};

exports.getTasks = (req, res) => {
  const { projectId, companyId } = req.body;
  if (!projectId || !companyId) {
    return res.status(400).json({
      success: false,
      msg: "Project ID and Company ID are required to fetch tasks",
    });
  }
  Task.find({ projectId, companyId, isDeleted: false })
    .populate("userId", "name")
    .populate({ path: "interested_products.product_id" })
    .then((tasks) => {
      if (!tasks || tasks.length === 0) {
        return res.status(404).json({
          success: false,
          msg: "No tasks found for the specified project and company",
        });
      }
      res.json({
        success: true,
        tasks,
      });
    })
    .catch((err) => {
      console.error("GET_TASKS ERROR", err);
      res.status(500).json({
        success: false,
        msg: "Failed to retrieve tasks",
        error: err.message,
      });
    });
};

exports.getTasksTable = async (req, res) => {
  try {
    const {
      projectId,
      pagination = { page: 1, limit: 10 },
      filters = [],
      searchFilter,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        msg: "Project ID is required to fetch tasks",
      });
    }

    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid project ID format." });
    }

    // Base condition for fetching tasks
    let condition = {
      projectId: new mongoose.Types.ObjectId(projectId),
      isDeleted: false,
    };

    // Apply search filter if provided
    if (searchFilter) {
      console.log(searchFilter, "from search filter ");

      const regex = new RegExp(searchFilter, "i");
      condition.title = { $regex: regex };
    }

    // Apply additional filters
    if (filters.length && filters[0].value) {
      for (const filter of filters) {
        // Changed to 'for...of' loop
        const { field, value, isSystem } = filter;

        if (!field || value === undefined) return;

        if (isSystem == "false") {
          const regex = new RegExp(value, "i");
          condition[`customFieldValues.${field}`] = { $regex: regex };
        }

        if (field === "selectUsers") {
          const user = await User.findOne({ name: value }).select("_id");

          if (user) {
            condition.userId = user._id;
          } else {
            return res.status(400).json({
              success: false,
              msg: "User not found",
            });
          }
        } else {
          switch (field) {
            case "title":
            case "description":
            case "tag":
            case "status":
            case "depId":
            case "taskType":
            case "priority":
            case "createdBy":
            case "modifiedBy":
            case "sequence":
            case "dateOfCompletion": {
              const regex = new RegExp(value, "i");
              condition[field] = { $regex: regex };
              break;
            }
            case "completed": {
              condition[field] = value === "true";
              break;
            }
            case "storyPoint": {
              condition[field] = Number(value);
              break;
            }
            case "startDate":
            case "endDate":
            case "createdOn":
            case "modifiedOn": {
              condition[field] = {
                $lte: new Date(new Date(value).setUTCHours(23, 59, 59, 999)),
                $gte: new Date(new Date(value).setUTCHours(0, 0, 0, 0)),
              };
              break;
            }
            case "userId":
            case "taskStageId": {
              condition[field] = value;
              break;
            }
            case "selectUsers": {
              condition["userId"] = value;
              break;
            }
            case "interested_products": {
              condition["interested_products.product_id"] = value;
              break;
            }
            case "uploadFiles": {
              condition["uploadFiles.fileName"] = value;
              break;
            }
            default:
              break;
          }
        }
      }
    }
    // Count total tasks matching the condition
    const totalCount = await Task.countDocuments(condition);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch tasks with pagination and filtering
    const tasks = await Task.find(condition)
      .skip(skip)
      .limit(limit)
      .populate("userId", "name")
      .populate({ path: "interested_products.product_id" })
      .lean();

    res.json({
      success: true,
      data: tasks,
      totalCount,
      page,
      totalPages,
      filters,
      searchFilter,
    });
  } catch (error) {
    console.error("Error in getTasksTable:", error);
    res.status(500).json({
      success: false,
      msg: "Server error occurred while retrieving tasks",
      error: error.message,
    });
  }
};

exports.getTasksCalendar = async (req, res) => {
  try {
    const { projectId, view, date } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        msg: "Project ID is required to fetch tasks for the calendar",
      });
    }

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid project ID format." });
    }

    // Ensure date is provided and valid
    const referenceDate = date ? new Date(date) : new Date();
    if (isNaN(referenceDate)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid date format. Please provide a valid date.",
      });
    }

    // Determine the date range based on the view
    let dateRange = {};
    if (view === "month") {
      dateRange = {
        startDate: { $gte: startOfMonth(referenceDate) },
        endDate: { $lte: endOfMonth(referenceDate) },
      };
    } else if (view === "week") {
      dateRange = {
        startDate: { $gte: startOfWeek(referenceDate) },
        endDate: { $lte: endOfWeek(referenceDate) },
      };
    } else if (view === "day") {
      dateRange = {
        startDate: { $gte: startOfDay(referenceDate) },
        endDate: { $lte: endOfDay(referenceDate) },
      };
    }
    // Base condition to filter tasks
    const condition = {
      projectId: new mongoose.Types.ObjectId(projectId),
      isDeleted: false,
      startDate: { $exists: true, $ne: null },
      endDate: { $exists: true, $ne: null },
      ...dateRange,
    };

    // Fetch tasks matching the condition
    const tasks = await Task.find(condition).populate("userId", "name").lean();
    // Transform tasks to calendar events format
    const calendarEvents = tasks.map((task) => ({
      id: task._id,
      title: task.title,
      start: task.startDate,
      end: task.endDate,
      user: task.userId?.name || "Unassigned",
    }));

    res.json({
      success: true,
      data: calendarEvents,
    });
  } catch (error) {
    console.error("Error in getTasksCalendar:", error);
    res.status(500).json({
      success: false,
      msg: "Server error occurred while retrieving calendar data",
      error: error.message,
    });
  }
};

exports.getTasksByProjectId = (req, res) => {
  logInfo(req.body, "getTasksByProjectId");
  let userRole = req.userInfo.userRole.toLowerCase();
  let userAccess = req.userInfo.userAccess;
  let viewAllTasks = false;
  let editAllTasks = false;

  if (userAccess && userAccess.length > 0) {
    viewAllTasks = accessConfig.validateEntitlements(
      userAccess,
      req.params.projectId,
      "Task",
      "view all",
      userRole
    );
    editAllTasks = accessConfig.validateEntitlements(
      userAccess,
      req.params.projectId,
      "Task",
      "edit all",
      userRole
    );
  }

  let userId = req.userInfo.userId;
  if (!userRole) {
    return res.json({ err: errors.NOT_AUTHORIZED });
  }

  const projectId = req.params.projectId;
  const projectCondition = { _id: new mongoose.Types.ObjectId(projectId) };

  const returnFields = {
    _id: 1,
    title: 1,
    description: 1,
    category: 1,
    startdate: 1,
    enddate: 1,
    notifyUsers: 1,
    projectUsers: 1,
    userGroups: 1,
    userid: 1,
    tasks: 1,
    status: 1,
  };

  logInfo([projectCondition, returnFields], "getTasksByProjectId query");

  Project.find(projectCondition, returnFields)
    .then((result) => {
      let project = {};
      if (result.length > 0) {
        project = {
          _id: result[0]._id,
          title: result[0].title,
          description: result[0].description,
          startdate: result[0].startdate,
          enddate: result[0].enddate,
          notifyUsers: result[0].notifyUsers,
          projectUsers: result[0].projectUsers,
          userGroups: result[0].userGroups,
          userid: result[0].userid,
          category: result[0].category,
          status: result[0].status,
        };

        let tasksData = [];
        let taskCount = result[0].tasks.length;
        if (taskCount > 0) {
          for (let i = 0; i < taskCount; ++i) {
            let t = result[0].tasks[i];
            // Filter for tasks not deleted and visible to the user
            if (
              (t.isDeleted === null || t.isDeleted === false) &&
              (userRole !== "user" ||
                (userRole === "user" && t.userId === userId))
            ) {
              let subTasks = t.subtasks.filter((s) => s.isDeleted === false);
              t.subtasks = subTasks;
              tasksData.push(t);
            }
          }
        }

        // New condition to check for viewAllTasks or editAllTasks
        if (viewAllTasks === true || editAllTasks === true) {
          // Filter out deleted tasks for users with permissions
          let tasks = result[0].tasks.filter((t) => t.isDeleted === false);
          let projectTasks = tasks.length > 0 ? tasks : [];

          project.tasks = projectTasks;
          project.totalCount = projectTasks.length;
          project.totalPages = 1;
        } else {
          // Regular user view
          project.tasks = tasksData;
          project.totalCount = tasksData.length;

          // Pagination logic
          if (req.query.view === "tableView") {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Paginate tasks
            project.tasks = tasksData.slice(skip, skip + limit);
            project.totalPages = Math.ceil(tasksData.length / limit);
          } else if (req.query.view === "kanbanView") {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            if (req.query.selectedCategory) {
              // Split the selected categories into an array
              const selectedCategories = req.query.selectedCategory.split(",");

              // Filter tasks by selected categories
              tasksData = tasksData.filter((task) => {
                return selectedCategories.includes(task.category);
              });
            }

            // Paginate tasks
            project.tasks = tasksData.slice(skip, skip + limit);
            project.totalPages = Math.ceil(tasksData.length / limit);
          } else {
            //   // Set total pages to 1 since all tasks are shown
            //   project.totalPages = 1;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Paginate tasks
            project.tasks = tasksData.slice(skip, skip + limit);
            project.totalPages = Math.ceil(tasksData.length / limit);
          }
        }
      }

      logInfo(project.tasks.length, "getTasksByProjectId task count");
      res.json(project);
    })
    .catch((err) => {
      logInfo(err, "getTasksByProjectId error");
      res.json({ err: errors.TASK_DOESNT_EXIST });
    });
};

exports.getAllTasks = (req, res) => {
  Task.find({
    $or: [
      {
        isDeleted: null,
      },
      {
        isDeleted: false,
      },
    ],
  })
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.json({
        err: errors.TASK_DOESNT_EXIST,
      });
    });
};

exports.deleteTask = (req, res) => {
  const { taskId } = req.body;

  if (!taskId) {
    return res.status(400).json({
      success: false,
      msg: "No task ID provided for deletion.",
    });
  }

  // Update the task to set isDeleted to true
  Task.findByIdAndUpdate(taskId, { $set: { isDeleted: true } }, { new: true })
    .then(async (task) => {
      if (!task) {
        return res.status(404).json({
          success: false,
          msg: "Task not found",
        });
      }

      // Update all upload files related to this task
      await UploadFile.updateOne(
        { _id: { $in: task.uploadFiles._id } },
        { $set: { isDeleted: true } }
      );

      // Insert an audit log for the task marked as deleted
      audit.insertAuditLog(
        "",
        "Task deletion",
        "Task",
        "delete",
        taskId,
        req.body.userName || "unknown",
        taskId
      );

      res.json({
        success: true,
        msg: "Task and related files marked as deleted successfully!",
        task,
      });
    })
    .catch((err) => {
      console.error("DELETE_TASK ERROR", err);
      res.status(400).json({
        success: false,
        msg: "Failed to mark task as deleted",
        error: err.message,
      });
    });
};
exports.deleteSelectedTasks = async (req, res) => {
  const { taskIds, modifiedBy } = req.body;
  // Validate input
  if (!Array.isArray(taskIds) || taskIds.length === 0 || !modifiedBy) {
    return res.status(400).json({
      success: false,
      msg: "taskIds and modifiedBy must be provided and valid.",
    });
  }

  // Validate that taskIds are valid ObjectIds
  if (taskIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return res.status(400).json({
      success: false,
      msg: "Invalid taskIds format.",
    });
  }

  try {
    // Step 1: Fetch the tasks to be deleted
    const tasksToDelete = await Task.find({ _id: { $in: taskIds } });
    // const fileIds = tasksToDelete.flatMap(task => task.uploadFiles.map(file => file.id));
    const fileNames = tasksToDelete.flatMap((task) =>
      task.uploadFiles.map((file) => file.fileName)
    );

    if (!tasksToDelete || tasksToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        msg: "No tasks found to delete.",
      });
    }

    // Step 2: Delete tasks
    const deletedTasks = await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: { isDeleted: true } }
    );

    const deleteFile = await UploadFile.find({ fileName: { $in: fileNames } });

    // const uploadFileIds = deleteFile.map(file => file._id);

    if (deleteFile)
      if (fileNames.length > 0) {
        await UploadFile.updateMany(
          { fileName: { $in: fileNames } },
          { $set: { isDeleted: true } }
        );
      }

    if (deletedTasks.deletedCount === 0) {
      return res.status(500).json({
        success: false,
        msg: "Failed to delete tasks.",
      });
    }

    // Step 3: Log the deletion of each task (if needed)
    tasksToDelete.forEach((task) => {
      // Assuming you want to log the task deletion (optional)
      audit.insertAuditLog("", "Task", "deleted", task._id, modifiedBy);
    });

    // Step 4: Send a success response
    res.json({
      success: true,
      msg: "Tasks deleted successfully!",
      deletedTaskIds: taskIds,
    });
  } catch (err) {
    console.error("Error deleting tasks:", err);
    res.status(500).json({
      success: false,
      msg: "Failed to delete tasks.",
      error: err.message,
    });
  }
};
exports.updateTasksSubTasks = (req, res) => {
  logInfo("updateTasksSubTasks");
  let task = req.body.task;
  let projectId = req.body.projectId;
  let updatedTask = {
    _id: task._id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    completed: task.completed,
    category: task.category,
    tag: task.tag,
    status: task.status,
    storyPoint: task.storyPoint,
    startDate: task.startDate,
    endDate: task.endDate,
    depId: task.depId,
    taskType: task.taskType,
    priority: task.priority,
    createdOn: task.createdOn,
    createdBy: task.createdBy,
    modifiedOn: new Date(),
    modifiedBy: task.modifiedBy,
    isDeleted: task.isDeleted,
    sequence: task.sequence,
    subtasks: task.subtasks,
    uploadFiles: task.uploadFiles,
    messages: task.messages,
    dateOfCompletion: task.dateOfCompletion ? task.dateOfCompletion : "",
    subtaskId: req.body.task.subtaskId,
    customFieldValues: req.body.task.customFieldValues,
  };
  Project.findOneAndUpdate(
    { _id: projectId, "tasks._id": updatedTask._id },
    { $set: { "tasks.$": updatedTask } },
    { new: false, projection: { _id: 1 } }
  )
    .then(async (result) => {
      if (updatedTask.status === "completed") {
        let emailOwner = "";
        let field = "notifyUsers";

        if (
          result[field] !== undefined &&
          result[field] !== null &&
          result[field].length !== 0
        ) {
          let newNotifyUsers = result[field].map((o) => {
            return o.emailId;
          });
          emailOwner = newNotifyUsers.join(",");
        } else {
          emailOwner = "";
        }

        let updatedDescription = updatedTask.description
          .split("\n")
          .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");
        let emailText = config.taskStatusEmailContent
          .replace("#title#", updatedTask.title)
          .replace("#description#", updatedDescription)
          .replace("#projectName#", result.title)
          .replace("#projectId#", projectId)
          .replace("#priority#", updatedTask.priority.toUpperCase())
          .replace("#projectId#", projectId)
          .replace("#newTaskId#", updatedTask._id)
          .replace("#newTaskId#", updatedTask._id);
        let taskEmailLink = config.taskEmailLink
          .replace("#projectId#", projectId)
          .replace("#newTaskId#", updatedTask._id);
        ("");

        var mailOptions = {
          from: config.from,
          to: emailOwner,
          subject: result.title + " - Task Completed -" + updatedTask.title,
          html: emailText,
        };

        let taskArray = {
          subject: mailOptions.subject,
          url: taskEmailLink,
          userId: updatedTask.userId,
        };

        rabbitMQ
          .sendMessageToQueue(mailOptions, "message_queue", "msgRoute")
          .then((resp) => {
            logInfo("task edit mail message sent to the message_queue:" + resp);
            addMyNotification(taskArray);
          });
      }
      const project = await Project.findOne(
        { _id: projectId, "tasks._id": updatedTask._id },
        { "tasks.$": 1 }
      );
      if (!project || !project.tasks || project.tasks.length === 0) {
        throw new Error("Task not found");
      }
      let t = project.tasks[0];
      let userIdToken = req.userInfo.userName;
      let fields = [];
      var res1 = Object.assign({}, updatedTask);

      for (let keys in res1) {
        if (
          keys !== "createdBy" &&
          keys !== "createdOn" &&
          keys !== "modifiedBy" &&
          keys !== "modifiedOn" &&
          keys !== "subtasks" &&
          keys !== "_id" &&
          keys !== "messages" &&
          keys !== "uploadFiles" &&
          keys !== "dateOfCompletion"
        ) {
          fields.push(keys);
        }
      }
      fields.filter((field) => {
        if (t[field] !== updatedTask[field]) {
          if (t[field].length !== 0 || updatedTask[field].length !== 0) {
            if (
              field === "startDate" ||
              field === "endDate" ||
              field === "dateOfCompletion"
            ) {
              if (
                t[field] !== undefined &&
                t[field] !== null &&
                t[field] !== ""
              ) {
                if (
                  t[field].toISOString().substr(0, 10) !== updatedTask[field]
                ) {
                  audit.insertAuditLog(
                    t[field],
                    updatedTask.title,
                    "Task",
                    field,
                    updatedTask[field],
                    userIdToken,
                    result._id
                  );
                } else {
                  audit.insertAuditLog(
                    "",
                    updatedTask.title,
                    "Task",
                    field,
                    updatedTask[field],
                    userIdToken,
                    result._id
                  );
                }
              }
            }
            audit.insertAuditLog(
              t[field],
              updatedTask.title,
              "Task",
              field,
              updatedTask[field],
              userIdToken,
              result._id
            );
          }
        }
      });
      logInfo("updateTasksSubTasks before response");
      res.json({
        success: true,
        msg: `Successfully Updated!`,
      });
    })
    .catch((err) => {
      logInfo(err, "updateTasksSubTasks error ");
      res.json({
        err: errors.EDIT_TASK_ERROR,
      });
    });
};
exports.updateTasksSequence = (req, res) => {
  try {
    let projectId = req.body.projectId;
    let tasks = req.body.tasks;
    Project.findById(projectId)
      .then((result) => {
        let allTasks = result.tasks.map((t) => {
          let t1 = t._id.toString();
          for (let i = 0; i < tasks.length; ++i) {
            if (t1 === tasks[i]._id) {
              t.sequence = tasks[i].sequence;
              t.modifiedBy = req.userInfo.userId;
              t.modifiedOn = new Date();
              break;
            }
          }
          return t;
        });
        result.tasks = allTasks;
        return result.save();
      })
      .then((result) => {
        logInfo("subTaskUpdate before reposne");
        res.json({
          success: true,
          msg: "Successful operation",
          result: result.tasks,
        });
      })
      .catch((err) => {
        logInfo("subTaskUpdate error " + err);
        res.json({
          err: errors.EDIT_SUBTASK_ERROR,
        });
      });
  } catch (e) {
    logError(" updateTasksSequence e", e);
  }
};

getUsersTodaysOpenTasks = async (
  userRole,
  userId,
  projectid,
  flag,
  showArchive
) => {
  let projectId = projectid;
  logInfo("getUsersTodaysOpenTasks");
  if (!userRole) {
    res.json({
      err: errors.NOT_AUTHORIZED,
    });
    return;
  }
  let dt = new Date();
  let dt1 = new Date();
  dt1.setUTCFullYear(dt.getFullYear()),
    dt1.setUTCMonth(dt.getMonth()),
    dt1.setUTCDate(dt.getDate());
  let projectFields = {
    $project: {
      _id: 1,
      title: 1,
      status: 1,
      userid: 1,
      projectUsers: 1,
      "tasks.title": 1,
      "tasks._id": 1,
      "tasks.userId": 1,
      "tasks.description": 1,
      "tasks.startDate": 1,
      "tasks.endDate": 1,
      "tasks.isDeleted": 1,
      "tasks.category": 1,
      "tasks.status": 1,
      "tasks.completed": 1,
    },
  };
  let taskCondition = {
    "tasks.isDeleted": false,
  };

  if (flag === "duetoday") {
    taskCondition["tasks.status"] = { $ne: "onHold" };
  }
  if (flag === "newTask") {
    taskCondition["tasks.status"] = "new";
  }
  if (flag === "inprogress") {
    taskCondition["tasks.status"] = "inprogress";
  }
  if (flag === "overdue" || flag === "futureTask") {
    taskCondition["tasks.status"] = { $ne: "completed" };
  }
  if (flag === "onhold") {
    taskCondition["tasks.status"] = "onHold";
  }

  if (flag === "cancelled") {
    taskCondition = {
      "tasks.isDeleted": true,
    };
  }

  if (userRole !== "admin") {
    if (userRole === "owner") {
      if (flag === "duetoday") {
        taskCondition = {
          "tasks.isDeleted": false,

          "tasks.status": { $ne: "onHold" },
        };
      }
      if (flag === "newTask") {
        taskCondition = {
          "tasks.isDeleted": false,
          "tasks.status": "new",
        };
      }
      if (flag === "inprogress") {
        taskCondition = {
          "tasks.isDeleted": false,
          "tasks.status": "inprogress",
        };
      }
      if (flag === "overdue") {
        taskCondition = {
          "tasks.isDeleted": false,
          "tasks.status": { $ne: "completed" },
        };
      }
      if (flag === "onhold") {
        taskCondition = {
          "tasks.isDeleted": false,
          "tasks.status": "onHold",
        };
      }
      if (flag === "cancelled") {
        taskCondition = {
          "tasks.isDeleted": true,
        };
      }
      if (flag === "futureTask") {
        taskCondition = {
          "tasks.isDeleted": false,
          "tasks.status": { $ne: "completed" },
        };
      }
    } else {
      taskCondition["tasks.userId"] = userId;

      if (flag === "cancelled") {
        taskCondition = {
          "tasks.isDeleted": true,
          "tasks.userId": userId,
        };
      }
    }
  }
  let userCondition = {
    isDeleted: false,
  };
  if (showArchive === false) {
    userCondition["archive"] = false;
  }

  if (projectId !== "undefined" && projectId !== null && projectId !== "") {
    if (userRole === "admin") {
      userCondition["_id"] = ObjectId(projectId);
    }
    if (userRole === "owner") {
      userCondition = {
        _id: ObjectId(projectId),
        $and: [
          {
            $or: [
              {
                userid: userId,
              },
              {
                "projectUsers.userId": userId,
              },
            ],
          },
        ],
        isDeleted: false,
      };
    }
  } else {
    if (userRole === "owner") {
      userCondition = {
        $and: [
          {
            $or: [
              {
                userid: userId,
              },
              {
                "projectUsers.userId": userId,
              },
            ],
          },
        ],
        isDeleted: false,
      };
    }
    if (userRole === "user") {
      userCondition = {
        isDeleted: false,
        "projectUsers.userId": userId,
      };
    }
  }

  let projectCond = {
    $match: userCondition,
  };
  let tasksUnwind = {
    $unwind: "$tasks",
  };
  let taskFilterCondition = {
    $match: taskCondition,
  };

  logInfo(
    [projectCond, projectFields, tasksUnwind, taskFilterCondition],
    "getUsersTodaysOpenTasks filtercondition"
  );
  var result = await Project.aggregate([
    projectCond,
    projectFields,
    tasksUnwind,
    taskFilterCondition,
  ]);
  let date = dateUtil.DateToString(new Date().toISOString());
  let tasks = result.map((p) => {
    let t = {};
    t.projectId = p._id;
    t.projectTitle = p.title;
    t._id = p.tasks._id;
    t.title = p.tasks.title;
    t.description = p.tasks.description;
    t.status = p.tasks.status;
    t.startDate = p.tasks.startDate;
    t.endDate = p.tasks.endDate;
    t.userId = p.tasks.userId;
    t.completed = p.tasks.completed;
    let user = p.projectUsers.filter(
      (u) => u.userId === p.tasks.userId.toString()
    );
    t.userName =
      user && Array.isArray(user) && user.length > 0 ? user[0].name : "";
    return t;
  });

  if (flag === "duetoday") {
    let dueTodayTaskArray = [];
    for (let i = 0; i < tasks.length; i++) {
      if (dateUtil.DateToString(tasks[i].startDate) === date) {
        dueTodayTaskArray.push(tasks[i]);
      }
    }
    return dueTodayTaskArray;
  }
  if (flag === "overdue") {
    let overDueTaskArray = [];
    for (let i = 0; i < tasks.length; i++) {
      if (
        tasks[i].endDate !== undefined &&
        tasks[i].endDate !== null &&
        tasks[i].endDate !== ""
      ) {
        if (dateUtil.DateToString(tasks[i].endDate) < date) {
          overDueTaskArray.push(tasks[i]);
        }
      }
    }

    return overDueTaskArray;
  }

  if (flag === "futureTask") {
    let futureTaskArray = [];
    for (let i = 0; i < tasks.length; i++) {
      if (
        (tasks[i].endDate === undefined ||
          tasks[i].endDate === null ||
          tasks[i].endDate === "") &&
        (tasks[i].startDate === undefined ||
          tasks[i].startDate === null ||
          tasks[i].startDate === "") &&
        tasks[i].status !== "onHold"
      ) {
        futureTaskArray.push(tasks[i]);
      }
    }
    return futureTaskArray;
  }
  if (
    flag === "newTask" ||
    flag === "inprogress" ||
    flag === "onhold" ||
    flag === "cancelled"
  ) {
    return tasks;
  }
};

gettodaysTasksChartData = async (userRole, userId, projectid, showArchive) => {
  logInfo("gettodaysTasksChartData");
  let projectId = projectid;
  if (!userRole) {
    res.json({
      err: errors.NOT_AUTHORIZED,
    });
    return;
  }
  let dt = new Date();
  let dt1 = new Date();
  dt1.setUTCFullYear(dt.getFullYear()),
    dt1.setUTCMonth(dt.getMonth()),
    dt1.setUTCDate(dt.getDate());
  let projectFields = {
    $project: {
      _id: 1,
      title: 1,
      userid: 1,
      status: 1,
      "tasks.title": 1,
      "tasks._id": 1,
      "tasks.userId": 1,
      projectUsers: 1,
      "tasks.description": 1,
      "tasks.startDate": 1,
      "tasks.endDate": 1,
      "tasks.isDeleted": 1,
      "tasks.category": 1,
      "tasks.status": 1,
      "tasks.completed": 1,
      "tasks.dateOfCompletion": 1,
    },
  };
  let taskCondition = {
    "tasks.isDeleted": false,
  };

  let projCondition = {
    isDeleted: false,
  };
  if (projectId) {
    projCondition["_id"] = ObjectId(projectId);
  }
  if (showArchive === false) {
    projCondition["archive"] = false;
  }
  if (userRole === "owner") {
    projCondition.$or = [
      {
        userid: userId,
      },
      {
        "projectUsers.userId": userId,
      },
    ];
  }
  if (userRole === "user") {
    projCondition = {
      isDeleted: false,
      "projectUsers.userId": userId,
    };
  }
  if (userRole !== "admin") {
    if (userRole === "owner") {
      taskCondition = {
        // "tasks.userId": userId,
        // $and: [
        //   {
        //     $or: [{
        //       userid: userId
        //     }
        //     , {
        //       "tasks.userId": userId
        //     }
        //   ]
        //   }],
        "tasks.isDeleted": false,
      };
    } else {
      taskCondition = {
        "tasks.userId": userId,
        "tasks.isDeleted": false,
      };
    }
  }
  let projectCond = {
    $match: projCondition,
  };
  let tasksUnwind = {
    $unwind: "$tasks",
  };
  let taskFilterCondition = {
    $match: taskCondition,
  };

  logInfo(
    [projectCond, projectFields, tasksUnwind, taskFilterCondition],
    "gettodaysTasksChartData"
  );

  var result = await Project.aggregate([
    projectCond,
    projectFields,
    tasksUnwind,
    taskFilterCondition,
  ]);

  let tasks = result.map((p) => {
    let t = {};
    t.projectId = p._id;
    t.projectTitle = p.title;
    t.title = p.tasks.title;
    t.status = p.tasks.status;
    t.userId = p.tasks.userId;
    t.startDate = p.tasks.startDate;
    t.endDate = p.tasks.endDate;
    t.dateOfCompletion = p.tasks.dateOfCompletion;
    t.isDeleted = p.tasks.isDeleted;
    return t;
  });

  let countArray = [];

  if (tasks.length > 0) {
    let tasksByProjectId = {};
    for (let i = 0; i < tasks.length; i++) {
      if (tasksByProjectId[tasks[i].status]) {
        tasksByProjectId[tasks[i].status].push(tasks[i]);
      } else {
        tasksByProjectId[tasks[i].status] = [tasks[i]];
      }
    }

    let keys = Object.keys(tasksByProjectId);
    let overDueCount = 0;
    let futureTaskCount = 0;
    let todaysTaskCount = 0;
    let date = dateUtil.DateToString(new Date());
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] === "completed") {
        let completed = tasksByProjectId[keys[i]].length;
        countArray.push({ name: "Completed", value: completed });
      } else if (keys[i] === "inprogress") {
        let inprogress = tasksByProjectId[keys[i]].length;
        for (let j = 0; j < tasksByProjectId[keys[i]].length; j++) {
          let dbDate = dateUtil.DateToString(
            tasksByProjectId[keys[i]][j].endDate
          );
          if (
            tasksByProjectId[keys[i]][j].endDate !== undefined &&
            tasksByProjectId[keys[i]][j].endDate !== null &&
            tasksByProjectId[keys[i]][j].endDate !== ""
          ) {
            if (dbDate < date) {
              overDueCount++;
            }
          }
          if (
            (tasksByProjectId[keys[i]][j].endDate === undefined ||
              tasksByProjectId[keys[i]][j].endDate === null ||
              tasksByProjectId[keys[i]][j].endDate === "") &&
            (tasksByProjectId[keys[i]][j].startDate === undefined ||
              tasksByProjectId[keys[i]][j].startDate === null ||
              tasksByProjectId[keys[i]][j].startDate === "")
          ) {
            futureTaskCount++;
          }

          // let dbDate1 = dateUtil.DateToString(tasksByProjectId[keys[i]][j].startDate);
          // if (tasksByProjectId[keys[i]][j].startDate !== undefined && tasksByProjectId[keys[i]][j].startDate !== null && tasksByProjectId[keys[i]][j].startDate !== '') {
          //   if (dbDate1 === date) {
          //     todaysTaskCount++
          //   }
          // }
        }
        countArray.push({ name: "Running", value: inprogress });
      } else if (keys[i] === "new") {
        let todo = tasksByProjectId[keys[i]].length;
        for (let j = 0; j < tasksByProjectId[keys[i]].length; j++) {
          let dbDate = dateUtil.DateToString(
            tasksByProjectId[keys[i]][j].endDate
          );
          if (
            tasksByProjectId[keys[i]][j].endDate !== undefined &&
            tasksByProjectId[keys[i]][j].endDate !== null &&
            tasksByProjectId[keys[i]][j].endDate !== ""
          ) {
            if (dbDate < date) {
              overDueCount++;
            }
          }
          if (
            (tasksByProjectId[keys[i]][j].endDate === undefined ||
              tasksByProjectId[keys[i]][j].endDate === null ||
              tasksByProjectId[keys[i]][j].endDate === "") &&
            (tasksByProjectId[keys[i]][j].startDate === undefined ||
              tasksByProjectId[keys[i]][j].startDate === null ||
              tasksByProjectId[keys[i]][j].startDate === "")
          ) {
            futureTaskCount++;
          }
          // let dbDate1 = dateUtil.DateToString(tasksByProjectId[keys[i]][j].startDate);
          // if (tasksByProjectId[keys[i]][j].startDate !== undefined && tasksByProjectId[keys[i]][j].startDate !== null && tasksByProjectId[keys[i]][j].startDate !== '') {
          //   if (dbDate1 === date) {
          //     todaysTaskCount++
          //   }
          // }
        }
        countArray.push({ name: "New", value: todo });
      } else if (keys[i] === "onHold") {
        let onhold = tasksByProjectId[keys[i]].length;
        for (let j = 0; j < tasksByProjectId[keys[i]].length; j++) {
          let dbDate = dateUtil.DateToString(
            tasksByProjectId[keys[i]][j].endDate
          );
          if (
            tasksByProjectId[keys[i]][j].endDate !== undefined &&
            tasksByProjectId[keys[i]][j].endDate !== null &&
            tasksByProjectId[keys[i]][j].endDate !== ""
          ) {
            if (dbDate < date) {
              overDueCount++;
            }
          }
          // if ((tasksByProjectId[keys[i]][j].endDate === undefined || tasksByProjectId[keys[i]][j].endDate === null || tasksByProjectId[keys[i]][j].endDate === '') && (tasksByProjectId[keys[i]][j].startDate === undefined || tasksByProjectId[keys[i]][j].startDate === null || tasksByProjectId[keys[i]][j].startDate === '')) {
          //   futureTaskCount++
          // }
          // let dbDate1 = dateUtil.DateToString(tasksByProjectId[keys[i]][j].startDate);
          // if (tasksByProjectId[keys[i]][j].startDate !== undefined && tasksByProjectId[keys[i]][j].startDate !== null && tasksByProjectId[keys[i]][j].startDate !== '') {
          //   if (dbDate1 === date) {
          //     todaysTaskCount++
          //   }
          // }
        }
        countArray.push({ name: "OnHold", value: onhold });
      }
    }
    let allTask = result.length;
    // countArray.push({ 'name': 'All', 'value': allTask })
    // countArray.push({ 'name': 'Delete', 'value': isDeleteCount })
    countArray.push({ name: "Overdue", value: overDueCount });
    countArray.push({ name: "FutureTask", value: futureTaskCount });
    countArray.push({ name: "TodaysTask", value: todaysTaskCount });
  }

  return countArray;
};

getUserProductivityData = async (userRole, userId, projectid) => {
  logInfo("getUserProductivityData userInfo=");
  // logInfo(req.userInfo, "getUserProductivityData userInfo=");
  // logInfo(req.body, "getUserProductivityData");

  // let userRole = req.userInfo.userRole.toLowerCase();
  // let userId = req.userInfo.userId;

  let condition = {};

  let projectFields = {
    $project: {
      _id: 1,
      // "tasks.title": 1,
      "tasks._id": 1,
      "tasks.userId": 1,
      "tasks.startDate": 1,
      "tasks.isDeleted": 1,
      "tasks.storyPoint": 1,
      "tasks.dateOfCompletion": 1,
    },
  };
  let unwindTasks = {
    $unwind: "$tasks",
  };
  if (userId !== undefined && userId !== null && userId !== "") {
    condition = {
      $and: [
        {
          "tasks.dateOfCompletion": {
            $ne: undefined,
          },
        },
        {
          "tasks.dateOfCompletion": {
            $ne: null,
          },
        },
        {
          "tasks.dateOfCompletion": {
            $ne: "",
          },
        },
      ],
      $and: [
        {
          "tasks.startDate": {
            $ne: undefined,
          },
        },
        {
          "tasks.startDate": {
            $ne: null,
          },
        },
        {
          "tasks.startDate": {
            $ne: "",
          },
        },
      ],
      "tasks.userId": userId,
      "tasks.isDeleted": false,
    };
  }

  let taskFilterCondition = {
    $match: condition,
  };
  let projectCond = {};
  projectCond = {
    $match: {
      isDeleted: false,
    },
  };

  logInfo(
    [projectCond, projectFields, unwindTasks, taskFilterCondition],
    "getUserProductivity Data filtercondition="
  );
  var result = await Project.aggregate([
    projectCond,
    projectFields,
    unwindTasks,
    taskFilterCondition,
  ]);
  let storyPoint;
  let tasksByuserId = {};
  let yesterDayDate = dateUtil.DateToString(
    new Date(new Date() - 24 * 60 * 60 * 1000)
  );
  let lastMonthDate = dateUtil.DateToString(
    new Date(new Date(yesterDayDate) - 1000 * 60 * 60 * 24 * 30)
  );

  var result1 = await Holiday.find({
    $and: [
      {
        fullDate: { $lte: yesterDayDate },
      },
      {
        fullDate: { $gte: lastMonthDate },
      },
    ],
    isActive: "1",
  });
  // .then((result1) => {
  let holidayCount = result1 && result1.length;
  let totalSunday = totalSundays.getSundayInaMonth(
    lastMonthDate,
    yesterDayDate
  );
  let totalHoliday = holidayCount + totalSunday;
  let oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  let daysInMonth = Math.round(
    Math.abs(
      (new Date(yesterDayDate).getTime() - new Date(lastMonthDate).getTime()) /
        oneDay
    )
  );

  let workingHours = (daysInMonth - totalHoliday) * config.minWorkingHours;

  if (result.length > 0) {
    for (let i = 0; i < result.length; i++) {
      let startDate = dateUtil.DateToString(result[i].tasks.startDate);
      if (startDate >= lastMonthDate || startDate <= yesterDayDate) {
        if (tasksByuserId[result[i].tasks.userId]) {
          storyPoint =
            tasksByuserId[result[i].tasks.userId].storyPoint +
            result[i].tasks.storyPoint;
          tasksByuserId[result[i].tasks.userId].storyPoint = storyPoint;
        } else {
          storyPoint = 0;
          storyPoint = storyPoint + result[i].tasks.storyPoint;
          tasksByuserId[result[i].tasks.userId] = {
            storyPoint: storyPoint,
            workingHours: workingHours,
          };
        }
      }
    }
  }
  let tasks = [];
  let keys = Object.keys(tasksByuserId);

  for (let i = 0; i < keys.length; i++) {
    let taskObj = {
      Storypoint: tasksByuserId[keys[i]].storyPoint,
      WorkingHours: tasksByuserId[keys[i]].workingHours,
    };
    tasks.push(taskObj);
  }
  logInfo("before response getUserProductivity Data  tasks=");
  return tasks;

  // })
};

exports.getDashboardDatabyCompanyId = async (req, res) => {
  try {
    const companyId = req.body.companyId;
    const limit = 5;
    const page = parseInt(req.query.page) || 0;
    const today = new Date();
    // console.log(today, "from today")
    // today.setHours(0, 0, 0, 0);
    const startOfToday = new Date(new Date().setUTCHours(0, 0, 0));
    const endOfToday = new Date(new Date().setUTCHours(23, 59, 59));

    const queries = {
      allTasks: Task.countDocuments({ companyId, isDeleted: false }),

      runningTasks: Task.find({
        companyId,
        startDate: { $lte: today },
        endDate: { $gte: today },
        // status: { $in: ["inprogress", "todo"] },
        isDeleted: false,
      })
        .skip(page * limit)
        .limit(limit)
        .populate("userId")
        .populate("projectId")
        .populate("taskStageId"),

      runningTasksTotalCount: Task.countDocuments({
        companyId,
        startDate: { $lte: today },
        endDate: { $gte: today },
        // status: { $in: ["inprogress", "todo"] },
        isDeleted: false,
      }),

      overdueTasks: Task.find({
        companyId,
        endDate: { $lte: new Date() },
        // status: { $in: ["inprogress", "todo"] },
        isDeleted: false,
      })
        .skip(page * limit)
        .limit(limit)
        .populate("userId")
        .populate("projectId")
        .populate("taskStageId"),

      overdueTasksTotalCount: Task.countDocuments({
        companyId,
        endDate: { $lte: new Date() },
        // status: { $in: ["inprogress", "todo"] },
        isDeleted: false,
      }),

      todayTasks: Task.find({
        companyId,
        startDate: { $lte: today },
        endDate: { $gte: today },
        isDeleted: false,
      })
        .skip(page * limit)
        .limit(limit)
        .populate("userId")
        .populate("projectId")
        .populate("taskStageId"),

      todayTasksTotalCount: Task.countDocuments({
        companyId,
        startDate: { $lte: today },
        endDate: { $gte: today },
        isDeleted: false,
      }),

      newTasks: Task.find({
        companyId,
        createdOn: { $lte: endOfToday, $gte: startOfToday },
        isDeleted: false,
      })
        .skip(page * limit)
        .limit(limit)
        .populate("userId")
        .populate("projectId")
        .populate("taskStageId"),

      newTasksTotalCount: Task.countDocuments({
        companyId,
        createdOn: { $lte: endOfToday, $gte: startOfToday },
        isDeleted: false,
      }),

      futureTasks: Task.find({
        companyId,
        $or: [{ endDate: { $gt: endOfToday } }, { endDate: null }],
        isDeleted: false,
      })
        .skip(page * limit)
        .limit(limit)
        .populate("userId")
        .populate("projectId")
        .populate("taskStageId"),

      futureTasksTotalCount: Task.countDocuments({
        companyId,
        $or: [{ endDate: { $gt: endOfToday } }, { endDate: null }],
        isDeleted: false,
      }),
    };

    const results = await Promise.all(Object.values(queries));

    const [
      allTasks,
      runningTasks,
      runningTasksTotalCount,
      overdueTasks,
      overdueTasksTotalCount,
      todayTasks,
      todayTasksTotalCount,
      newTasks,
      newTasksTotalCount,
      futureTasks,
      futureTasksTotalCount,
    ] = results;

    res.json({
      success: true,
      allTasks,
      runningTasks,
      overdueTasks,
      todayTasks,
      newTasks,
      futureTasks,
      runningTasksTotalCount,
      overdueTasksTotalCount,
      todayTasksTotalCount,
      newTasksTotalCount,
      futureTasksTotalCount,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

exports.getDashboardData = async (req, res) => {
  let projectId = req.body.projectId;
  let flag = req.body.flag;
  let userRole = req.userInfo.userRole.toLowerCase();
  let userId = req.userInfo.userId;
  let showArchive = req.body.showArchive;
  let UsersTodaysTasks = await getUsersTodaysOpenTasks(
    userRole,
    userId,
    projectId,
    flag,
    showArchive
  );

  let todaysTasksChartData = await gettodaysTasksChartData(
    userRole,
    userId,
    projectId,
    showArchive
  );
  let userProductivityData = await getUserProductivityData(
    userRole,
    userId,
    projectId,
    showArchive
  );

  let dashboardData = {
    todaysTasksChartData: todaysTasksChartData,
    userProductivityData: userProductivityData,
    UsersTodaysTasks: UsersTodaysTasks,
  };
  res.json({
    success: true,
    data: dashboardData,
  });
};

exports.assignUsers = async (req, res) => {
  console.log("is assign tasks is coming here ???");
  try {
    const { taskId, assignedUsers } = req.body;

    // Validate input
    if (
      !taskId ||
      !Array.isArray(assignedUsers) ||
      assignedUsers.length === 0
    ) {
      return res.status(400).json({
        error: "Invalid input: taskId and assignedUsers must be provided.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ error: "Invalid taskId format." });
    }
    // Step 1: Find the project containing the task
    const project = await Project.findOne({
      "tasks._id": taskId,
      $or: [{ isDeleted: null }, { isDeleted: false }],
    });

    if (!project) {
      console.log("Project not found for taskId:", taskId);
      return res.status(404).json({ error: "Task not found" });
    }
    const task = project.tasks.find((t) => t._id.toString() === taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    const userId = assignedUsers[0];
    const user = project.projectUsers.find(
      (user) => user._id.toString() === userId
    );

    if (!user) {
      console.log(`User not found in project: ${userId}`);
      return res
        .status(400)
        .json({ error: `User not found for ID: ${userId}` });
    }
    task.userId = user.userId;
    task.hiddenUserId = user.name;
    task.modifiedOn = new Date();
    task.modifiedBy = req.userInfo.userId;

    await project.save();

    const updateTask = {
      task: {
        userId: task.userId,
        title: task.title,
        description: task.description,
        completed: task.completed,
        category: task.category,
        tag: task.tag,
        status: task.status,
        storyPoint: task.storyPoint,
        startDate: task.startDate,
        endDate: task.endDate,
        depId: task.depId,
        taskType: task.taskType,
        priority: task.priority,
        createdOn: task.createdOn,
        modifiedOn: task.modifiedOn,
        createdBy: task.createdBy,
        modifiedBy: task.modifiedBy,
        isDeleted: task.isDeleted,
        sequence: task.sequence,
        messages: task.messages,
        uploadFiles: task.uploadFiles,
        subtasks: task.subtasks,
        dateOfCompletion: task.dateOfCompletion,
        customFieldValues: task.customFieldValues,
        assignedUsers: task.assignedUsers,
        _id: task._id,
        hiddenDepId: task.hiddenDepId,
        hiddenUserId: task.hiddenUserId,
        assignUsers: task.assignUsers,
        allowMultipleUsers: task.allowMultipleUsers,
        projectId: task.projectId,
      },
      userName: user.name, // Returning the user name
      email: user.email, // Returning the user email
      projectName: project.name, // Assuming project has a name field
      ownerEmail: project.ownerEmail, // Assuming project has an ownerEmail field
      id: task._id, // Task ID
    };
    // Step 8: Respond with the updated task information
    res.json({
      success: true,
      msg: "Users assigned successfully with tasks updated",
      updateTask,
    });
  } catch (error) {
    console.error("Error assigning users:", error);
    logError(error, "Error assigning users");
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

exports.getTasksStagesByProjectId = async (req, res) => {
  try {
    const { projectId, companyId } = req.params;
    const project = (
      await Project.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(projectId) }, // Match the project by ID
        },
        {
          $lookup: {
            from: "users", // Name of the collection containing users (check your database for the correct name)
            localField: "projectUsers", // Array of ObjectIds in the `Project` schema
            foreignField: "_id", // Field in the `users` collection that matches the ObjectIds
            as: "populatedProjectUsers", // Name of the output field for the populated array
          },
        },
        {
          $lookup: {
            from: "products",
            let: { companyId: "$companyId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$companyId", { $toObjectId: companyId }] },
                },
              },
            ],
            as: "companyProducts",
          },
        },
        {
          $lookup: {
            from: "uploadfiles",
            let: { projectId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$projectId", "$$projectId"] },
                  isDeleted: { $ne: true },
                },
              },
              {
                $group: {
                  _id: "$fileName",
                },
              },
            ],
            as: "uploadedFiles",
          },
        },
        {
          $lookup: {
            from: "tasks",
            let: { projectId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$projectId", "$$projectId"] },
                },
              },
              {
                $unwind: "$tag",
              },
              {
                $group: {
                  _id: "$tag", // Group by tag
                  // count: { $sum: 1 } // Count occurrences of each tag
                },
              },
            ],
            as: "taskTags",
          },
        },
      ])
    )[0];
    // console.log(project, "from project")
    const taskStagesTitles = project.taskStages;
    // const taskStages = await TaskStage.find({
    //   title: { $in: taskStagesTitles },
    //   companyId: companyId,
    //   $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    // }).sort({ sequence: "asc" });
    // Find global task stages
    const globalTaskStages = await TaskStage.find({
      title: { $in: taskStagesTitles },
      companyId: companyId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ sequence: "asc" });

    console.log("globalTaskStages...", globalTaskStages);

    // Find group task stages
    const groupTaskStages = await GroupTaskStage.find({
      title: { $in: taskStagesTitles },
      companyId: companyId,
      groupId: project.group, // ensure correct group
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ sequence: "asc" });

    console.log("groupTaskStages...", groupTaskStages);

    // Merge both results
    const allTaskStages = [...groupTaskStages, ...globalTaskStages];
    return res.json({ success: true, taskStages: allTaskStages, project });
  } catch (error) {
    console.log(error);
    return res.json({ message: "error fetching task kanban", success: false });
  }
};

exports.updateStage = async (req, res) => {
  // console.log("request coming from body", req.body);
  try {
    const { taskId, newStageId, status, userId } = req.body;

    const task = await Task.findById(taskId)
      .populate({
        path: "modifiedBy",
        select: "email",
        model: "user",
      })
      .populate({
        path: "taskStageId",
        select: "title",
        model: "taskStage",
      })
      .populate({
        path: "projectId",
        select: "title",
        model: "project",
      });
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    task.taskStageId = newStageId;
    task.status = status;
    task.modifiedOn = new Date();
    task.modifiedBy = userId;
    // console.log(newStageId, "from new Stage")
    await task.save();
    const eventType = "STAGE_CHANGED";

    const notification = await handleNotifications(task, eventType);

    const auditTaskAndSendMail = async (newTask, emailOwner, email) => {
      try {
        let updatedDescription = newTask.description
          .split("\n")
          .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");
        // let emailText = config.taskEmailStageContent
        //   .replace("#title#", newTask.title)
        //   .replace("#description#", updatedDescription)
        //   .replace("#projectName#", newTask.projectId.title)
        //   .replace("#status#", newTask.status)
        //   .replace("#projectId#", newTask.projectId._id)
        //   .replace("#priority#", newTask.priority.toUpperCase())
        //   .replace("#newTaskId#", newTask._id);

        let taskEmailLink = config.taskEmailLink
          .replace("#projectId#", newTask.projectId._id)
          .replace("#newTaskId#", newTask._id);

        let emailText = `
            Hi, <br/><br/>
            Task stage has been <strong>changed</strong>. <br/><br/>
            <strong>Task:</strong> ${newTask.title} <br/>
            <strong>Project:</strong> ${newTask.projectId.title} <br/>
            <strong>Priority:</strong> ${newTask.priority.toUpperCase()} <br/>
            <strong>Stage Changed:</strong> ${newTask.status} <br/>
            <strong>Description:</strong><br/> &nbsp;&nbsp;&nbsp;&nbsp; ${updatedDescription} <br/><br/>
            To view task details, click 
            <a href="${process.env.URL}tasks/edit/${newTask.projectId._id}/${
          newTask._id
        }/update" target="_blank">here</a>. <br/><br/>
            Thanks, <br/>
            The proPeak Team
          `;

        // console.log(emailText, "from mailOptions")

        if (email !== "XX") {
          var mailOptions = {
            from: config.from,
            to: email,
            // cc: emailOwner,
            subject: ` STAGE_CHANGED - ${newTask.title}`,
            html: emailText,
          };

          console.log(mailOptions, "from mailOptions");

          let taskArr = {
            subject: mailOptions.subject,
            url: taskEmailLink,
            userId: newTask.assignedUser,
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

    if (notification.length > 0) {
      for (const channel of notification) {
        const { emails } = channel;

        for (const email of emails) {
          await auditTaskAndSendMail(task, [], email);
        }
      }
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Error updating task stage:", error);
    return res.status(500).json({ success: false });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.body;

    await Task.findByIdAndUpdate({ _id: taskId }, { isDeleted: true });
    await UploadFile.findOneAndUpdate(
      { taskId },
      { $set: { isDeleted: true } },
      { new: true }
    );

    return res.json({ success: true });
  } catch (error) {
    return res.json({ success: false });
  }
};

exports.getKanbanTasks = async (req, res) => {
  try {
    const { filters, searchFilter, projectId, stageId } = req.body;
    let page = req.query.page;

    const limit = 10;
    const skip = parseInt(page) * limit;

    if (stageId == "null") {
      return res.json({ success: false, tasks: [] });
    }

    let whereCondition = {
      taskStageId: stageId,
      isDeleted: false,
      projectId,
    };

    if (searchFilter) {
      const regex = new RegExp(searchFilter, "i");
      whereCondition.$or = [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
        { tag: { $regex: regex } },
      ];
    }

    filters.forEach((filter) => {
      const { field, value, isSystem } = filter;

      if (!field || value === undefined) return;

      if (isSystem == "false") {
        const regex = new RegExp(value, "i");
        whereCondition[`customFieldValues.${field}`] = { $regex: regex };
      }

      switch (field) {
        case "title":
        case "description":
        case "tag":
        case "status":
        case "depId":
        case "taskType":
        case "priority":
        case "createdBy":
        case "modifiedBy":
        case "sequence":
        case "dateOfCompletion": {
          // String fields - Use regex for partial matching
          const regex = new RegExp(value, "i");
          whereCondition[field] = { $regex: regex };
          break;
        }
        case "completed": {
          // Boolean field - Expect true or false
          whereCondition[field] = value === "true";
          break;
        }
        case "storyPoint": {
          // Number field - Parse as integer
          whereCondition[field] = Number(value);
          break;
        }
        case "startDate":
        case "endDate":
        case "createdOn":
        case "modifiedOn": {
          // Date fields - Compare as date range if value is an object with from and to
          whereCondition[field] = {
            $lte: new Date(new Date(value).setUTCHours(23, 59, 59, 999)),
            $gte: new Date(new Date(value).setUTCHours(0, 0, 0, 0)),
          };

          break;
        }
        case "userId":
        case "taskStageId": {
          // ObjectId fields - Compare as ObjectId
          whereCondition[field] = value;
          break;
        }
        case "selectUsers": {
          whereCondition["userId"] = value;
          break;
        }
        case "interested_products": {
          whereCondition["interested_products.product_id"] = value;
          break;
        }
        case "uploadFiles": {
          whereCondition["uploadFiles.fileName"] = value;
          break;
        }
        default:
          break;
      }
    });
    let tasks = await Task.find({
      ...whereCondition,
    })
      .sort({ modifiedOn: -1, createdOn: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId")
      .populate("createdBy")
      .populate("subtasks")
      .lean();

    const totalPages = Math.ceil(
      (await Task.countDocuments({
        ...whereCondition,
      })) / limit
    );

    // --- Reminder calculation without schema change ---
    const reminderOffset = 10 * 24 * 60 * 60 * 1000; // 10 days in ms
    const now = new Date();

    // tasks = tasks.map((task) => {
    //   if (task.startDate) {
    //     const reminderDate = new Date(
    //       new Date(task.startDate).getTime() + reminderOffset
    //     );
    //     task.reminderDate = reminderDate;

    //     // Reminder is due if today's date >= reminder date and task not completed
    //     task.showReminder = now >= reminderDate && !task.completed;
    //   } else {
    //     task.reminderDate = null;
    //     task.showReminder = false;
    //   }
    //   return task;
    // });

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

      // Condition 1: Reminder due 10 days after startDate (and not completed)
      const isReminderDue = now >= reminderDate && !isCompleted;

      // Condition 2: If endDate exists and is before now, and task not completed, reminder always shows
      const isEndDatePast =
        task.endDate && new Date(task.endDate) < now && !isCompleted;

      // Show reminder if either condition is true
      task.showReminder = isReminderDue || isEndDatePast;

      return task;
    });

    const totalCount = await Task.countDocuments({
      ...whereCondition,
    });

    return res.json({ success: true, tasks: tasks, totalPages, totalCount });
  } catch (error) {
    console.log(error);
    return res.json({ message: "error fetching task kanban", success: false });
  }
};

exports.assignTasksToUser = async (req, res) => {
  const { taskIds, userId, modifiedBy, projectId } = req.body;
  // Validate input
  if (
    !Array.isArray(taskIds) ||
    taskIds.length === 0 ||
    !userId ||
    !projectId
  ) {
    return res.status(400).json({
      success: false,
      msg: "taskIds, userId, and projectId must be provided and valid.",
    });
  }

  // Validate that taskIds are valid ObjectIds
  if (taskIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return res.status(400).json({
      success: false,
      msg: "Invalid taskIds format.",
    });
  }

  // Validate that projectId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({
      success: false,
      msg: "Invalid projectId format.",
    });
  }

  try {
    // Step 1: Update tasks with the assigned user
    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      {
        $set: {
          userId: userId,
          modifiedBy,
          modifiedOn: new Date(),
          projectId: projectId,
        },
      }
    );

    if (result.nModified === 0) {
      return res
        .status(404)
        .json({ success: false, msg: "No tasks were updated." });
    }

    // Step 2: Audit Log for each updated task
    taskIds.forEach((taskId) => {
      audit.insertAuditLog(
        "",
        "Task",
        "assignedUser",
        userId,
        modifiedBy,
        taskId
      );
    });

    // Step 3: Fetch necessary data for email notifications
    const mainProject = await Project.findById(projectId);
    const taskAssignedUser = mainProject ? mainProject.userid : null;
    const assignedTaskUser = taskAssignedUser
      ? await User.findById(taskAssignedUser)
      : null;
    const emailOwner = assignedTaskUser ? assignedTaskUser.email : null;
    const assignedUser = await User.findById(userId);
    const email = assignedUser ? assignedUser.email : null;
    // Helper function for email notifications
    const auditTaskAndSendMail = async (taskId, emailOwner, email) => {
      try {
        const updatedTask = await Task.findById(taskId);
        const updatedDescription = updatedTask.description
          .split("\n")
          .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");

        const emailText = config.taskEmailContent
          .replace("#title#", updatedTask.title)
          .replace("#description#", updatedDescription)
          .replace("#projectName#", updatedTask.projectId)
          .replace("#projectId#", updatedTask.projectId)
          .replace("#priority#", updatedTask.priority.toUpperCase())
          .replace("#newTaskId#", updatedTask._id);

        const taskEmailLink = config.taskEmailLink
          .replace("#projectId#", updatedTask.projectId)
          .replace("#newTaskId#", updatedTask._id);

        if (email !== "XX") {
          const mailOptions = {
            from: config.from,
            to: email,
            // cc: emailOwner,
            subject: `${updatedTask.projectId} - Task updated - ${updatedTask.title}`,
            html: emailText,
          };

          const taskArr = {
            subject: mailOptions.subject,
            url: taskEmailLink,
            userId: updatedTask.assignedUser,
          };

          await rabbitMQ.sendMessageToQueue(
            mailOptions,
            "message_queue",
            "msgRoute"
          );
          logInfo("Task assignment mail message sent to the message_queue.");
          addMyNotification(taskArr);
        }
      } catch (error) {
        console.error("Error in sending email", error);
      }
    };

    // Step 4: Send email for each updated task
    for (const taskId of taskIds) {
      await auditTaskAndSendMail(taskId, emailOwner, email);
    }

    return res.json({
      success: true,
      msg: "Tasks assigned successfully!",
    });
  } catch (err) {
    console.error("Error updating tasks:", err);
    return res.status(400).json({
      success: false,
      msg: "Failed to update tasks",
      error: err.message,
    });
  }
};

exports.assignTasksToProject = async (req, res) => {
  const { taskIds, targetProjectId, modifiedBy, sourceProjectId } = req.body;
  // Validate input
  if (
    !Array.isArray(taskIds) ||
    taskIds.length === 0 ||
    !targetProjectId ||
    !modifiedBy
  ) {
    return res.status(400).json({
      success: false,
      msg: "taskIds, targetProjectId, and modifiedBy must be provided and valid.",
    });
  }

  // Validate that taskIds are valid ObjectIds
  if (taskIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return res.status(400).json({
      success: false,
      msg: "Invalid taskIds format.",
    });
  }

  // Validate that targetProjectId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(targetProjectId)) {
    return res.status(400).json({
      success: false,
      msg: "Invalid targetProjectId format.",
    });
  }

  try {
    // Step 1: Fetch the tasks to be copied
    const tasksToCopy = await Task.find({ _id: { $in: taskIds } });
    console.log(tasksToCopy, "from task");

    if (!tasksToCopy || tasksToCopy.length === 0) {
      return res.status(404).json({
        success: false,
        msg: "No tasks found to copy.",
      });
    }

    // Step 2: Duplicate tasks and assign to the target project
    const copiedTasks = await Promise.all(
      tasksToCopy.map(async (task) => {
        const newTask = new Task({
          userId: task.userId || null,
          title: task.title || "Untitled Task",
          description: task.description || "No description",
          completed: task.completed || false,
          tag: task.tag || "",
          status: task.status || "todo",
          storyPoint: task.storyPoint || 1,
          startDate: task.startDate || new Date(),
          endDate: task.endDate || new Date(),
          depId: task.depId || "",
          taskType: task.taskType || "task",
          priority: task.priority || "low",
          createdOn: new Date(),
          modifiedOn: new Date(),
          createdBy: modifiedBy,
          modifiedBy,
          isDeleted: false,
          sequence: task.sequence || "1",
          subtasks: task.subtasks || [],
          customFieldValues: {},
          messages: task.messages || [],
          uploadFiles: task.uploadFiles || [],
          projectId: new ObjectId(targetProjectId) || "",
          companyId: task.companyId || "",
          taskStageId: task.taskStageId || "",
        });

        return await newTask.save();
      })
    );

    // Step 3: Audit log for each copied task
    copiedTasks.forEach((copiedTask) => {
      audit.insertAuditLog(
        "",
        "Task",
        "copiedToProject",
        copiedTask._id,
        modifiedBy,
        targetProjectId
      );
    });

    // Step 4: Send email notifications for copied tasks
    const mainProject = await Project.findById(sourceProjectId);
    const taskAssignedUser = mainProject ? mainProject.userid : null;
    const assignedTaskUser = taskAssignedUser
      ? await User.findById(taskAssignedUser)
      : null;
    const emailOwner = assignedTaskUser ? assignedTaskUser.email : null;
    const assignedUser = await User.findById(modifiedBy);
    const email = assignedUser ? assignedUser.email : null;
    const auditTaskAndSendMail = async (task, emailOwner, email) => {
      try {
        let updatedDescription = task.description
          .split("\n")
          .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");

        let emailText = config.taskEmailContent
          .replace("#title#", task.title)
          .replace("#description#", updatedDescription)
          .replace("#projectName#", targetProjectId) // Use the target project ID
          .replace("#projectId#", targetProjectId)
          .replace("#priority#", task.priority.toUpperCase())
          .replace("#newTaskId#", task._id);

        let taskEmailLink = config.taskEmailLink
          .replace("#projectId#", targetProjectId)
          .replace("#newTaskId#", task._id);

        if (email !== "XX") {
          var mailOptions = {
            from: config.from,
            to: email,
            // cc: emailOwner,
            subject: `${targetProjectId} - Task copied - ${task.title}`,
            html: emailText,
          };

          let taskArr = {
            subject: mailOptions.subject,
            url: taskEmailLink,
            userId: task.userId,
          };

          rabbitMQ
            .sendMessageToQueue(mailOptions, "message_queue", "msgRoute")
            .then((resp) => {
              logInfo(
                "Task copy mail message sent to the message_queue: " + resp
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

    // Send email for each copied task
    copiedTasks.forEach((task) => {
      auditTaskAndSendMail(task, emailOwner, email);
    });

    res.json({
      success: true,
      msg: "Tasks copied to the target project successfully!",
      copiedTasks: copiedTasks.map((task) => task._id), // Return copied task IDs
    });
  } catch (err) {
    console.error("Error copying tasks:", err);
    res.status(500).json({
      success: false,
      msg: "Failed to copy tasks.",
      error: err.message,
    });
  }
};
exports.moveTasksToProject = async (req, res) => {
  const { taskIds, targetProjectId, modifiedBy } = req.body;
  if (
    !Array.isArray(taskIds) ||
    taskIds.length === 0 ||
    !targetProjectId ||
    !modifiedBy
  ) {
    return res.status(400).json({
      success: false,
      msg: "taskIds, targetProjectId, and modifiedBy must be provided and valid.",
    });
  }

  // Validate taskIds and targetProjectId format
  if (
    taskIds.some((id) => !mongoose.Types.ObjectId.isValid(id)) ||
    !mongoose.Types.ObjectId.isValid(targetProjectId)
  ) {
    return res.status(400).json({
      success: false,
      msg: "Invalid taskIds or targetProjectId format.",
    });
  }

  try {
    // Step 1: Update tasks to set the new project ID
    const updatedTasks = await Task.updateMany(
      { _id: { $in: taskIds }, isDeleted: false },
      {
        $set: {
          projectId: targetProjectId,
          modifiedBy,
          modifiedOn: new Date(),
        },
      }
    );

    if (updatedTasks.nModified === 0) {
      return res.status(404).json({
        success: false,
        msg: "No tasks were updated. Please check the task IDs.",
      });
    }

    // Step 2: Log audit details for the updated tasks
    taskIds.forEach((taskId) => {
      audit.insertAuditLog(
        "",
        "Task",
        "movedToProject",
        taskId,
        modifiedBy,
        targetProjectId
      );
    });

    // Step 3: Send success response
    res.json({
      success: true,
      msg: "Tasks moved to the target project successfully!",
      updatedTaskIds: taskIds,
    });
  } catch (err) {
    console.error("Error moving tasks:", err);
    res.status(500).json({
      success: false,
      msg: "Failed to move tasks.",
      error: err.message,
    });
  }
};

exports.getTasksKanbanData = async (req, res) => {
  try {
    const { projectId } = req.params;
    const page = parseInt(req.query.page) || 0;
    let limit = 20;
    let skip = page * limit;
    // let stageId = req.query.stageId;
    const project = await Project.findOne({ _id: projectId });
    const taskStagesTitles = project.taskStages; // ["todo", "inProgress", "completed"]
    // Find documents where the title is in the taskStagesTitles array and sort them by 'order' in ascending order
    const taskStages = await TaskStage.find({
      title: { $in: taskStagesTitles },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ sequence: "asc" });
    // Fetch paginated projects for each stage separately
    const stagesWithTasks = await Promise.all(
      taskStages.map(async (stage) => {
        const tasks = await Task.find({
          taskStageId: stage._id,
          projectId,
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        })
          .sort({ modifiedOn: -1, createdOn: -1 })
          .skip(skip)
          .limit(limit)
          .populate("subtasks");
        const totalCount = await Task.countDocuments({
          taskStageId: stage._id,
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
          projectId,
        });
        const totalPages = Math.ceil(totalCount / limit);
        return {
          ...stage.toObject(),
          projectId,
          project,
          tasks,
          totalCount,
          totalPages,
        };
      })
    );

    return res.json({ success: true, taskStages: stagesWithTasks });
  } catch (error) {
    console.log(error);
    return res.json({ message: "error fetching task kanban", success: false });
  }
};

exports.deleteFiltered = async (req, res) => {
  try {
    const { projectId, filters = [], searchFilter } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        msg: "Project ID is required to fetch tasks",
      });
    }

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid project ID format." });
    }

    // Base condition for fetching tasks
    let condition = {
      projectId: new mongoose.Types.ObjectId(projectId),
      isDeleted: false,
    };

    if (!searchFilter && !(filters.length && filters[0].value)) {
      return res.json({ success: false, message: "No Filter Applied" });
    }

    // Apply search filter if provided
    if (searchFilter) {
      const regex = new RegExp(searchFilter, "i");
      condition.title = { $regex: regex };
    }

    // Apply additional filters
    if (filters.length && filters[0].value) {
      for (const filter of filters) {
        // Changed to 'for...of' loop
        const { field, value, isSystem } = filter;

        if (!field || value === undefined) return;

        if (isSystem == "false") {
          const regex = new RegExp(value, "i");
          condition[`customFieldValues.${field}`] = { $regex: regex };
        }

        if (field === "selectUsers") {
          const user = await User.findOne({ name: value }).select("_id");

          if (user) {
            condition.userId = user._id;
          } else {
            return res.status(400).json({
              success: false,
              msg: "User not found",
            });
          }
        } else {
          switch (field) {
            case "title":
            case "description":
            case "tag":
            case "status":
            case "depId":
            case "taskType":
            case "priority":
            case "createdBy":
            case "modifiedBy":
            case "sequence":
            case "dateOfCompletion": {
              const regex = new RegExp(value, "i");
              condition[field] = { $regex: regex };
              break;
            }
            case "completed": {
              condition[field] = value === "true";
              break;
            }
            case "storyPoint": {
              condition[field] = Number(value);
              break;
            }
            case "startDate":
            case "endDate":
            case "createdOn":
            case "modifiedOn": {
              condition[field] = {
                $lte: new Date(new Date(value).setUTCHours(23, 59, 59, 999)),
                $gte: new Date(new Date(value).setUTCHours(0, 0, 0, 0)),
              };
              break;
            }
            case "userId":
            case "taskStageId": {
              condition[field] = value;
              break;
            }
            case "uploadFiles": {
              condition["uploadFiles.fileName"] = value;
              break;
            }
            case "interested_products": {
              condition["interested_products.product_id"] = value;
              break;
            }
            default:
              break;
          }
        }
      }
    }

    await Task.updateMany(condition, { $set: { isDeleted: true } });

    if (condition["uploadFiles.fileName"]) {
      await UploadFile.updateMany(
        { fileName: condition["uploadFiles.fileName"] },
        { $set: { isDeleted: true } }
      );
    }

    res.json({ success: true, message: "Filtered Tasks Deleted" });
  } catch (e) {
    res.json({ success: false, message: "Failed Deleting Filtered Tasks" });
  }
};
