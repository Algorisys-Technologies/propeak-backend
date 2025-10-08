const mongoose = require("mongoose");
const Project = require("../../models/project/project-model");
const User = require("../../models/user/user-model");
const uuidv4 = require("uuid/v4");
const jwt = require("jsonwebtoken");
const secret = require("../../config/secret");
const audit = require("../audit-log/audit-log-controller");
const AuditLogs = require("../../models/auditlog/audit-log-model");
const ProjectStatus = require("../../models/project/project-status-model");
const ProjectStage = require("../../models/project-stages/project-stages-model");
const GroupProjectStage = require("../../models/project-stages/group-project-stages-model");
const rabbitMQ = require("../../rabbitmq");

const {
  CustomTaskField,
} = require("../../models/project/custom-task-field-model");
const ProjectTypes = require("../../models/project/project-type-model");
const { fromPromise } = require("rxjs/observable/fromPromise");
const { forkJoin } = require("rxjs/observable/forkJoin");
const { ObjectId } = require("mongodb");
const { logError, logInfo } = require("../../common/logger");
const FavoriteProject = require("../../models/project/favorite-project-model");
const accessConfig = require("../../common/validate-entitlements");
const access = require("../../check-entitlements");
const sortData = require("../../common/common");
//const { request } = require("express");
const Task = require("../../models/task/task-model");
const errors = {
  PROJECT_DOESNT_EXIST: "Project does not exist",
  ADD_PROJECT_ERROR: "Error occurred while adding the project",
  EDIT_PROJECT_ERROR: "Error occurred while updating the project",
  DELETE_PROJECT_ERROR: "Error occurred while deleting the project",
  SEARCH_PARAM_MISSING: "Please input required parameters for search",
  SERVER_ERROR: "Opps, something went wrong. Please try again.",
  NOT_AUTHORIZED: "Your are not authorized",
};
// const sendNotification = require("../../utils/send-notification");
// const NotificationSetting = require("../../models/notification-setting/notification-setting-model");
// const Role = require("../../models/role/role-model");
const config = require("../../config/config");
const {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} = require("date-fns");
const { handleNotifications } = require("../../utils/notification-service");

exports.getAuditLog = (req, res) => {
  try {
    let auditObservable = fromPromise(
      AuditLogs.find({
        projectId: req.body.id,
      })
    );
    let projectObservable = fromPromise(
      Project.findOne({
        _id: req.body.id,
      })
    );
    let observable = forkJoin(auditObservable, projectObservable);
    observable.subscribe(
      (data) => {
        let projectName = data[1].title;
        res.json({
          result: data[0],
          msg: projectName,
        });
      },
      (err) => {
        res
          .status(200)
          .json({ success: false, msg: `Something went wrong. ${err}` });
        console.log(err);
      }
    );
  } catch (e) {
    console.log(e);
    res
      .status(500)
      .json({ success: false, msg: `Something went wrong. ${err}` });
  }
};

exports.getAuditLogForProject = async (req, res) => {
  try {
    const { projectId, pagination = { page: 1, limit: 10 } } = req.body;
    const totalCount = await AuditLogs.countDocuments({
      projectId,
    });

    // Step 2: Implement pagination logic
    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    // Step 3: Fetch audit log entries for the specified project with pagination
    const auditLogs = await AuditLogs.find(
      { projectId },
      {
        tableName: 1,
        name: 1,
        fieldName: 1,
        oldValue: 1,
        newValue: 1,
        updatedBy: 1,
        updatedOn: 1,
      }
    )
      .sort({ updatedOn: -1 }) // Sort by date, newest first
      .skip(skip)
      .limit(limit);

    // Check if audit logs were found
    if (auditLogs.length === 0) {
      return res.status(404).json({
        success: true,
        data: [],
        totalCount,
        page,
        totalPages: 0,
      });
    }

    // Step 4: Fetch project name for the response
    const project = await Project.findById(projectId, { title: 1 });

    // Step 5: Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Step 6: Return the result with audit log and project details
    return res.status(200).json({
      success: true,
      data: auditLogs,
      projectName: project ? project.title : "Unknown Project",
      totalCount,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load audit log.",
      message: error.message,
    });
  }
};

exports.getStatusOptions = (req, res) => {
  try {
    ProjectStatus.find({}) //.sort({displayName:1})
      .then((result) => {
        sortData.sort(result, "displayName");
        res.json(result);
      })
      .catch((err) => {
        res.json({
          err: err,
        });
      });
  } catch (err) {
    logError("err getStatusOptions", err);
  }
};

exports.getProjectByProjectId = (req, res) => {
  Project.findById({
    _id: new mongoose.Types.ObjectId(req.params.projectId),
  })
    .populate({
      path: "projectTypeId",
      select: "projectType",
    })
    .populate({
      path: "accountId",
      select: "account_name",
    })
    .populate({
      path: "contactId",
      select: "title",
    })
    .then(
      (result) => {
        let messages = result.messages.filter((r) => {
          return r.isDeleted === false;
        });
        let uploadFiles = result.uploadFiles.filter((r) => {
          return r.isDeleted === false;
        });
        let data = {
          _id: result._id,
          title: result.title,
          description: result.description,
          startdate: result.startdate,
          enddate: result.enddate,
          status: result.status,
          taskStages: result.taskStages,
          projectStageId: result.projectStageId,
          group: result.group,
          userid: result.userid,
          companyId: result.companyId,
          userGroups: result.userGroups,
          sendnotification: result.sendnotification,
          createdBy: result.createdBy,
          createdOn: result.createdOn,
          modifiedBy: result.modifiedBy,
          modifiedOn: result.modifiedOn,
          isDeleted: result.isDeleted,
          projectUsers: result.projectUsers,
          notifyUsers: result.notifyUsers,
          miscellaneous: result.miscellaneous,
          archive: result.archive,
          customFieldValues: result.customFieldValues,
          projectTypeId: result.projectTypeId,
          tag: result.tag,
          projectType: result.projectType,
          accountId: result.accountId,
          contactId: result.contactId,
        };
        // logInfo("getProjectByProjectId before return response");
        res.json({
          data: data,
          messages: messages,
          uploadFiles: uploadFiles,
        });
      },
      (err) => {
        logError("getProjectByProjectId err ", err);
        res.json(err);
      }
    );
};

//Get Project With Task
exports.getProjectDataByProjectId = (req, res) => {
  logInfo(req.body, "getProjectDataByProjectId req.body");

  Project.findById(req.params.projectId)
    .then((result) => {
      let data = {
        _id: result._id,
        title: result.title,
        description: result.description,
        startdate: result.startdate,
        enddate: result.enddate,
        status: result.status,
        projectStageId: result.projectStageId,
        taskStages: result.taskStages,
        group: result.group,
        userid: result.userid,
        companyId: result.companyId,
        userGroups: result.userGroups,
        sendnotification: result.sendnotification,
        createdBy: result.createdBy,
        createdOn: result.createdOn,
        modifiedBy: result.modifiedBy,
        modifiedOn: result.modifiedOn,
        isDeleted: result.isDeleted,
        projectUsers: result.projectUsers,
        notifyUsers: result.notifyUsers,
        miscellaneous: result.miscellaneous,
        archive: result.archive,
        customFieldValues: result.customFieldValues,
        projectTypeId: result.projectTypeId,
      };

      logInfo("getProjectDataByProjectId end");
      res.json({
        data: data,
      });
    })
    .catch((err) => {
      logError("getProjectDataByProjectId err", err);
      res.json(err);
    });
};

// CREATE
exports.createProject = async (req, res) => {
  logInfo(req.body, "createProject req.body");
  // console.log("createProject req.body...", req.body);
  let userName = req.body.userName;
  const { title, companyId, status, taskStages, group } = req.body;
  //const existingProject = await Project.findOne({ title, companyId });

  let projectQuery = {
    title,
    companyId,
  };

  if (req.body.customFieldValues?.address) {
    projectQuery["customFieldValues.address"] =
      req.body.customFieldValues.address;
  }

  const existingProject = await Project.findOne(projectQuery);

  // console.log(existingProject, "existingProject");

  // const existingProject = await Project.findOne({ title, companyId });
  if (existingProject) {
    // Fetch users associated with the existing project
    const projectUsers = await User.find(
      { _id: { $in: existingProject.createdBy } },
      "name email"
    );

    return res
      .status(400)
      .send(
        `A project with the title "${existingProject.title}" is already in progress and is being worked on by ${projectUsers[0]?.name}.`
      );
  } else {
    if (
      !title ||
      title.trim() === "" ||
      // !group ||
      // group.trim() === "" ||
      !status ||
      status.trim() === "" ||
      !taskStages ||
      !Array.isArray(taskStages) ||
      taskStages.length === 0
    ) {
      return res
        .status(400)
        .send("All fields marked with an asterisk (*) are mandatory.");
    }
  }

  const userid = req.body.userid;
  const uniqueProjectUsers = Array.from(
    new Set([...(req.body.projectUsers || []), userid])
  );
  const uniqueNotifyUsers = Array.from(
    new Set([...(req.body.notifyUsers || []), userid])
  );

  let newProject = new Project({
    _id: req.body._id,
    title: req.body.title,
    description: req.body.description,
    startdate: req.body.startdate,
    enddate: req.body.enddate,
    projectStageId: req.body.projectStageId,
    status: req.body.status,
    taskStages: req.body.taskStages?.map((taskStageTitle) => taskStageTitle),
    // notifyUsers: req.body.notifyUsers?.map((userId) => userId),
    // projectUsers: req.body.projectUsers?.map((userId) => userId),
    notifyUsers: uniqueNotifyUsers,
    projectUsers: uniqueProjectUsers,
    tag: req.body.tag,
    // userid: req.body.userid,
    userid: userid,
    // group:  req.body.group?.map((groupId) =>  groupId),
    companyId: req.body.companyId,
    userGroups: req.body.userGroups,
    sendnotification: req.body.sendnotification,
    createdBy: req.body.createdBy,
    createdOn: new Date(),
    modifiedBy: req.body.modifiedBy,
    modifiedOn: new Date(),
    isDeleted: req.body.isDeleted,
    miscellaneous: req.body.miscellaneous,
    archive: req.body.archive,
    customFieldValues: req.body.customFieldValues,
    projectTypeId: req.body.projectTypeId,
    group:
      req.body.group &&
      req.body.group.trim() !== "" &&
      req.body.group !== "no-selection"
        ? req.body.group
        : null,
    creation_mode: "MANUAL",
    lead_source: "USER",
    projectType: req.body.projectType,
  });

  const eventType = "PROJECT_CREATED";
  const notification = await handleNotifications(newProject, eventType);

  const auditTaskAndSendMail = async (newTask, emailOwner, email) => {
    try {
      let updatedDescription = newTask.description
        .split("\n")
        .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");
      // let emailText = config.projectEmailCreateContent
      //   .replace("#title#", newTask.title)
      //   .replace("#description#", updatedDescription)
      //   .replace("#projectName#", newTask.title)
      //   .replace("#status#", newTask.status)
      //   .replace("#projectId#", newTask._id)
      //   // .replace("#priority#", newTask.priority.toUpperCase())
      //   // .replace("#newTaskId#", newTask._id);

      let taskEmailLink = config.taskEmailLink
        .replace("#projectId#", newTask._id)
        .replace("#newTaskId#", newTask._id);

      let emailText = `
        Hi, <br/><br/>
        A new project has been <strong>created</strong>. <br/><br/>
        <strong>Project:</strong> ${newTask.title} <br/>
        <strong>Description:</strong><br/> &nbsp;&nbsp;&nbsp;&nbsp; ${updatedDescription} <br/><br/>
        To view project details, click 
        <a href="${process.env.URL}tasks/${newTask._id}/kanban/stage" target="_blank">here</a>. <br/><br/>
        Thanks, <br/>
        The proPeak Team
      `;

      if (email !== "XX") {
        var mailOptions = {
          from: config.from,
          to: email,
          // cc: emailOwner,
          subject: ` PROJECT_CREATED - ${newTask.title}`,
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
            logInfo("Task add mail message sent to the message_queue: " + resp);
            // addMyNotification(taskArr);
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
        await auditTaskAndSendMail(newProject, [], email);
      }
    }
  }

  newProject
    .save()
    .then((result) => {
      logInfo(result, "createProject result");
      let userIdToken = req.body.userName;
      let fields = [];
      var res1 = Object.assign({}, result);
      for (let keys in res1._doc) {
        if (
          keys !== "createdBy" &&
          keys !== "createdOn" &&
          keys !== "modifiedBy" &&
          keys !== "modifiedOn" &&
          keys !== "_id" &&
          keys !== "tasks"
        ) {
          fields.push(keys);
        }
      }

      fields.filter((field) => {
        if (
          result[field] !== undefined &&
          result[field] !== null &&
          result[field].length !== 0 &&
          result[field] !== ""
        ) {
          if (field === "userid") {
            audit.insertAuditLog(
              "",
              result.title,
              "Project",
              field,
              userName,
              userIdToken,
              result._id
            );
          } else if (field === "projectUsers") {
            result[field].map((p) => {
              audit.insertAuditLog(
                "",
                result.title,
                "Project",
                field,
                p.name,
                userIdToken,
                result._id
              );
            });
          } else if (field === "notifyUsers") {
            result[field].map((n) => {
              audit.insertAuditLog(
                "",
                result.title,
                "Project",
                field,
                n.name,
                userIdToken,
                result._id
              );
            });
          } else if (field === "userGroups") {
            result[field].map((n) => {
              audit.insertAuditLog(
                "",
                result.title,
                "Project",
                field,
                n.groupName,
                userIdToken,
                result._id
              );
            });
            // audit.insertAuditLog('', result.title, 'Project', field, result[field], userIdToken, result._id);
          } else {
            audit.insertAuditLog(
              "",
              result.title,
              "Project",
              field,
              result[field],
              userIdToken,
              result._id
            );
          }
        }
      });

      res.json({
        success: true,
        msg: `Successfully added!`,
      });
    })
    .catch((err) => {
      console.log("CREATE_PROJECT ERROR", err);
      if (err.errors) {
        // Show failed if all else fails for some reasons
        console.log(err);
        res.json({
          err: errors.ADD_PROJECT_ERROR,
        });
      }
    });
};

exports.getProjects = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, msg: "Company ID is required." });
    }

    const projects = await Project.find({ companyId, isDeleted: false });
    // .populate("projectStageId", "name") // populate only name field
    // .populate("projectTypeId", "name")  // optional
    // .populate("group", "groupName")     // if group is a ref
    // .populate("companyId", "companyName") // optional, if needed
    // .populate("projectUsers", "name email") // optional
    // .sort({ createdOn: -1 });

    res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("GET_PROJECTS ERROR", error);
    res.status(500).json({
      success: false,
      msg: "Something went wrong while fetching projects.",
    });
  }
};

// UPDATE
exports.updateProject = async (req, res) => {
  logInfo(req.body, "updateProject req.body");
  try {
    let userName = req.body.userName;
    const { _id, title, companyId, status } = req.body;

    const existingProject = await Project.findOne({
      title,
      companyId,
      _id: { $ne: _id },
    });
    if (existingProject) {
      const projectUsers = await User.find(
        { _id: { $in: existingProject.projectUsers } },
        "name"
      );
      return res.status(400).json({
        success: false,
        msg: `A project with the title "${
          existingProject.title
        }" already exists and is being worked on by ${
          projectUsers[0]?.name || "someone"
        }.`,
      });
    }

    //Add all group members to projectUsers if they are not already present
    let updatedProject = {
      _id: req.body._id,
      title: req.body.title,
      description: req.body.description,
      startdate: req.body.startdate,
      enddate: req.body.enddate,
      projectStageId: req.body.projectStageId,
      status: req.body.status,
      taskStages: taskStages?.map((taskStageTitle) => taskStageTitle),
      notifyUsers: notifyUsers?.map((userId) => userId),
      projectUsers: projectUsers?.map((userId) => userId),
      userid: req.body.userid,
      group: group?.map((groupId) => groupId),
      companyId: req.body.companyId,
      userGroups: req.body.userGroups,
      sendnotification: req.body.sendnotification,
      createdBy: req.body.createdBy,
      createdOn: new Date(),
      tag: req.body.tag,
      modifiedBy: req.body.modifiedBy,
      modifiedOn: new Date(),
      isDeleted: req.body.isDeleted,
      miscellaneous: req.body.miscellaneous,
      archive: req.body.archive,
      customFieldValues: req.body.customFieldValues,
      projectTypeId: req.body.projectTypeId,
      creation_mode: "MANUAL",
      lead_source: "USER",
    };

    let projectUpdate = () => {
      Project.findOneAndUpdate(
        {
          _id: updatedProject._id,
        },
        updatedProject,
        {
          context: "query",
        }
      ).then((oldResult) => {
        Project.findOne({
          _id: updatedProject._id,
        })
          .then((newResult) => {
            logInfo(newResult, "updateProject newResult");
            let userIdToken = req.body.userName;
            let fields = [];
            var res1 = Object.assign({}, oldResult);
            for (let keys in res1._doc) {
              if (
                keys !== "createdBy" &&
                keys !== "createdOn" &&
                keys !== "modifiedBy" &&
                keys !== "modifiedOn" &&
                keys !== "_id" &&
                keys !== "messages" &&
                keys !== "uploadFiles" &&
                keys !== "tasks"
              ) {
                fields.push(keys);
              }
            }

            fields.filter((field) => {
              if (oldResult[field] !== newResult[field]) {
                if (
                  oldResult[field].length !== 0 ||
                  newResult[field].length !== 0
                ) {
                  if (field === "userid") {
                    User.find({
                      id: oldResult[field],
                    }).then((result) => {
                      let oldOwner = result[0].name;
                      audit.insertAuditLog(
                        oldOwner,
                        newResult.title,
                        "Project",
                        field,
                        userName,
                        userIdToken,
                        newResult._id
                      );
                    });
                  } else if (field === "projectUsers") {
                    let oldProjectUsers = oldResult[field].map((o) => {
                      return o.name;
                    });
                    let newProjectUsers = newResult[field].map((n) => {
                      return n.name;
                    });
                    if (oldProjectUsers.length !== newProjectUsers.length) {
                      audit.insertAuditLog(
                        oldProjectUsers.join(","),
                        newResult.title,
                        "Project",
                        field,
                        newProjectUsers.join(","),
                        userIdToken,
                        newResult._id
                      );
                    }
                  } else if (field === "notifyUsers") {
                    let oldNotifyUsers = oldResult[field].map((o) => {
                      return o.name;
                    });
                    let newNotifyUsers = newResult[field].map((n) => {
                      return n.name;
                    });
                    if (oldNotifyUsers.length !== newNotifyUsers.length) {
                      audit.insertAuditLog(
                        oldNotifyUsers.join(","),
                        newResult.title,
                        "Project",
                        field,
                        newNotifyUsers.join(","),
                        userIdToken,
                        newResult._id
                      );
                    }
                  } else if (field === "userGroups") {
                    let oldUserGroups = oldResult[field].map((o) => {
                      return o.groupName;
                    });
                    let newUserGroups = newResult[field].map((n) => {
                      return n.groupName;
                    });
                    if (oldUserGroups.length !== newUserGroups.length) {
                      audit.insertAuditLog(
                        oldUserGroups.join(","),
                        newResult.title,
                        "Project",
                        field,
                        newUserGroups.join(","),
                        userIdToken,
                        newResult._id
                      );
                    }
                  } else {
                    audit.insertAuditLog(
                      oldResult[field],
                      newResult.title,
                      "Project",
                      field,
                      newResult[field],
                      userIdToken,
                      newResult._id
                    );
                  }
                }
              }
            });
            res.json({
              success: true,
              msg: `Successfully updated!`,
            });
          })
          .catch((err) => {
            logError(
              errors.EDIT_PROJECT_ERROR,
              "updateProject errors.EDIT_PROJECT_ERROR"
            );
            res.json({
              err: errors.EDIT_PROJECT_ERROR,
            });
            return;
          });
      });
    };

    if (req.body.status === "completed") {
      Project.find({
        _id: req.body.id,
      }).then((result) => {
        if (result[0].tasks.length > 0) {
          let tasks = result[0].tasks.filter((t) => {
            return t.isDeleted === false;
          });
          let taskData =
            tasks.length > 0 &&
            tasks.filter((t) => {
              return t.category !== "completed" || t.status !== "completed";
            });
          if (taskData.length > 0) {
            res.json({
              success: true,
              msgErr: `You do not have permission to complete the project until all tasks are completed!`,
            });
          } else {
            projectUpdate();
          }
        }
      });
    } else {
      projectUpdate();
    }
  } catch (e) {
    logError(e, "updateProject error");
  }
};

exports.updateProjectField = async (req, res) => {
  logInfo("updateProjectField");
  logInfo(req.body, "req.body in update fields...here...");
  console.log("req.body in update fields...", req.body.customFieldValues);
  const { _id, title, companyId, status } = req.body;

  const existingProject = await Project.findOne({
    title,
    companyId,
    _id: { $ne: _id },
  });

  console.log(existingProject, "existingProject..............");
  // if (existingProject) {
  //   const projectUsers = await User.find(
  //     { _id: { $in: existingProject.projectUsers } },
  //     "name"
  //   );
  //   return res.status(400).json({
  //     success: false,
  //     msg: `A project with the title "${
  //       existingProject.title
  //     }" already exists and is being worked on by ${
  //       projectUsers[0]?.name || "someone"
  //     }.`,
  //   });
  // }

  let updatedProject = new Project({
    _id: req.body._id,
    title: req.body.title,
    description: req.body.description,
    startdate: req.body.startdate,
    enddate: req.body.enddate,
    status: req.body.status,
    projectStageId: req.body.projectStageId,
    userid: req.body.userid,
    group: req.body.group,
    companyId: req.body.companyId,
    userGroups: req.body.userGroups,

    createdBy: req.body.createdBy,
    createdOn: req.body.createdOn,
    modifiedBy: req.body.modifiedBy,
    modifiedOn: req.body.modifiedOn,
    isDeleted: req.body.isDeleted,
    taskStages: req.body.taskStages,
    projectUsers: req.body.projectUsers,
    notifyUsers: req.body.notifyUsers,
    miscellaneous: req.body.miscellaneous,
    sendnotification: req.body.sendnotification,
    archive: req.body.archive,
    projectTypeId: req.body.projectTypeId,
    customFieldValues: req.body.customFieldValues,
    tag: req.body.tag,
    contactId: req.body.contactId,
    accountId: req.body.accountId,
  });

  console.log(updatedProject, "from update Project");
  Project.findOneAndUpdate(
    {
      _id: req.body._id,
    },
    updatedProject
  )
    .then((oldResult) => {
      Project.find({
        _id: req.body._id,
      }).then((newResult) => {
        logInfo("updateProjectField");
        res.json({
          success: true,
          msg: "Updated Successfully",
        });
      });
    })
    .catch((err) => {
      logError("updateProjectField err", err);
    });
};

exports.updateProjectCategory = (req, res) => {
  let userRole = req.userInfo.userRole.toLowerCase();
  let accessCheck = access.checkEntitlements(userRole);
  if (accessCheck === false) {
    res.json({ err: errors.NOT_AUTHORIZED });
    return;
  }
  logInfo(req.body, "updateProjectCategory req.body");
  let updatedProject = req.body;
  Project.findOneAndUpdate(
    {
      _id: updatedProject._id,
    },
    updatedProject
  )
    .then((oldResult) => {
      Project.findOne({
        _id: updatedProject._id,
      }).then((newResult) => {
        logInfo("updateProjectCategory");
        res.json({
          msg: "Updated Successfully",
        });
      });
    })
    .catch((err) => {
      logError("updateProjectCategory err", err);
    });
};

exports.deleteProject = (req, res) => {
  logInfo(req.body.id, "deleteProject req.body");

  Project.findOneAndUpdate(
    {
      _id: req.body.id,
    },
    {
      $set: {
        isDeleted: true,
        customFieldValues: {},
      },
    },
    {
      new: true,
    }
  ).then(async (result) => {
    let field = "isDeleted";

    await Task.updateMany(
      {
        projectId: req.body.id,
      },
      {
        isDeleted: true,
      }
    );
    // let userIdToken = req.userInfo.userName;
    // audit.insertAuditLog(
    //   "false",
    //   result.title,
    //   "Project",
    //   field,
    //   result[field],
    //   userIdToken,
    //   result._id
    // );

    // Delete custom task fields associated with the project
    CustomTaskField.deleteMany({
      projectId: req.body.id,
    }).then(() => {
      FavoriteProject.deleteOne({
        projectId: req.body.id,
      })
        .then(() => {
          logInfo("deleteProject FavoriteProject result");
          res.json({
            msg: "Project deleted successfully!",
          });
        })
        .catch((err) => {
          logError("deleteProject FavoriteProject err", err);
          res.json(err);
        });
    });
  });
};

// READ (ALL)
exports.getTasksAndUsers = (req, res) => {
  let userRole = req.userInfo.userRole.toLowerCase();
  let accessCheck = access.checkEntitlementsForUserRole(userRole);
  if (accessCheck === false) {
    res.json({ err: errors.NOT_AUTHORIZED });
    return;
  }
  logInfo("getTasksAndUsers");
  logInfo(req.params.projectId, "req.params.projectId");
  Project.findById(req.params.projectId)
    .then((result) => {
      logInfo("result getTasksAndUsers users");
      logInfo("result getTasksAndUsers tasks");
      let tasks = [];

      // if(result.length>0){
      tasks = result.tasks.filter((t) => {
        return t.isDeleted === false;
      });
      let projectUsers =
        result.projectUsers &&
        result.projectUsers.filter((u) => {
          return u.name !== undefined && u.name !== null && u.name !== "";
        });

      // }
      res.json({
        users: projectUsers,
        tasks: tasks,
        title: result.title,
      });
    })
    .catch((err) => {
      logError("getTasksAndUsers err", err);
      res.json({
        err: `${err}`,
      });
    });
};

exports.getAllProjectsSummary = (req, res) => {
  try {
    let selectedUserId = req.body.userId;
    let selectedUserRole = req.body.userRole;
    let selectedProjectId = req.body.projectId;
    let showArchive = req.body.archive;

    logInfo("getAllProjectsSummary");
    logInfo(req.userInfo, "getAllProjectsSummary userInfo=");

    let userRole = req.userInfo.userRole.toLowerCase();
    let userId = req.userInfo.userId;

    if (!userRole) {
      res.json({
        err: errors.NOT_AUTHORIZED,
      });
      return;
    }
    let projects = [];
    let condition = {};
    let projectFields = {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        startdate: 1,
        enddate: 1,
        userid: 1,
        status: 1,
        projectUsers: 1,
        notifyUsers: 1,
        uploadFiles: 1,
        group: 1,
        miscellaneous: 1,
        companyId: 1,
        archive: 1,
        "tasks.status": 1,
        "tasks.completed": 1,
        "tasks.category": 1,
        "tasks.isDeleted": 1,
        "tasks.userId": 1,
        "tasks.endDate": 1,
      },
    };
    let projectCondition = "";
    let taskFilterCondition = {
      $match: condition,
    };
    let userCondition = {
      isDeleted: false,
      // archive: false
    };
    if (showArchive === false) {
      userCondition["archive"] = false;
    }
    if (selectedProjectId) {
      userCondition["_id"] = ObjectId(selectedProjectId);
    }
    if (selectedUserId) {
      if (userRole === "admin" || userRole === "owner") {
        if (selectedUserRole === "owner" || selectedUserRole === "admin") {
          userCondition.$and = [
            {
              $or: [
                {
                  userid: selectedUserId,
                },
                {
                  "projectUsers.userId": selectedUserId,
                },
              ],
            },
            { $or: [{ miscellaneous: null }, { miscellaneous: false }] },
          ];
        } else {
          userCondition = {
            isDeleted: false,
            $or: [{ miscellaneous: null }, { miscellaneous: false }],
            "projectUsers.userId": selectedUserId,
          };
        }
      } else {
        res.json({
          err: errors.NOT_AUTHORIZED,
        });
        return;
      }
    } else {
      if (userRole !== "admin") {
        if (userRole === "owner") {
          userCondition.$or = [
            {
              userid: userId,
            },
            {
              "projectUsers.userId": userId,
            },
          ];
        } else {
          userCondition = {
            isDeleted: false,
            "projectUsers.userId": userId,
          };
        }
      }
    }

    let projectCond = {
      $match: userCondition,
    };
    logInfo(
      [projectCond, projectFields],
      "getAllProjectsSummary filtercondition"
    );
    Project.aggregate([projectCond, projectFields]) //.sort({title:1})
      .then((result) => {
        let userIds = [];

        let date = dateUtil.DateToString(new Date().toISOString());
        // let onHoldTaskArray=[], overDueTaskArray=[];
        let projects = result.map((p) => {
          p.totalTasks = 0;
          p.completedTasks = 0;
          p.inProgressTasks = 0;
          p.activeTasks = 0;
          p.overDueTasks = 0;
          p.onHoldTasks = 0;
          p.incompleteTasks = 0;
          onHoldTaskArray = [];
          overDueTaskArray = [];
          incompletetaskArray = [];
          p.totalProjectUser = 0;

          p.projectUsers = p.projectUsers.filter(
            (p) => p.name !== undefined && p.name !== null
          );

          p.totalProjectUser = p.projectUsers.length;

          for (let j = 0; j < p.projectUsers.length; j++) {
            userIds.push(p.projectUsers[j].userId);
          }

          let attachments = p.uploadFiles.filter((u) => u.isDeleted === false);
          p.attachments = attachments.length;
          if (p.tasks && Array.isArray(p.tasks)) {
            p.tasks = p.tasks.filter((t) => {
              if (userRole === "user") {
                return t.isDeleted === false && t.userId === userId;
              } else {
                return t.isDeleted === false;
              }
            });
            p.totalTasks = p.tasks.length;
            for (let i = 0; i < p.tasks.length; i++) {
              if (
                p.tasks[i].endDate !== undefined &&
                p.tasks[i].endDate !== null &&
                p.tasks[i].endDate !== ""
              ) {
                if (
                  dateUtil.DateToString(p.tasks[i].endDate) < date &&
                  p.tasks[i].status !== "completed"
                ) {
                  overDueTaskArray.push(p.tasks[i]);
                }
              }
              if (p.tasks[i].status === "onHold") {
                onHoldTaskArray.push(p.tasks[i]);
              }
              if (p.tasks[i].status === "inprogress") {
                incompletetaskArray.push(p.tasks[i]);
              }
            }
            p.overDueTasks = overDueTaskArray.length;

            p.onHoldTasks = onHoldTaskArray.length;

            p.incompleteTasks = incompletetaskArray.length;

            p.tasks.map((t) => {
              if (t.completed) {
                p.completedTasks++;
              } else if (t.category === "inprogress") {
                p.inProgressTasks++;
                if (selectedUserId) {
                  if (t.userId === selectedUserId) p.activeTasks++;
                }
              }
              return t;
            });

            p.tasks = [];
          }
          return p;
        });
        let projUsers = [];

        if (userIds.length > 0) {
          for (let i = 0; i < userIds.length; i++) {
            if (!projUsers.includes(userIds[i].toString())) {
              projUsers.push(userIds[i].toString());
            }
          }
        }

        let totalProjectUser = projUsers.length;

        logInfo("getAllProjectsSummary projects");
        var result1 = sortData.sort(projects, "title");
        res.json({
          success: true,
          data: projects,
          count: userRole === "user" ? 1 : totalProjectUser,
        });
      })
      .catch((err) => {
        logError(err, "getAllProjectsSummary err");
        res.json({
          err: errors.SERVER_ERROR,
        });
      });
  } catch (e) {
    logError("e getAllProjectsSummary", e);
  }
};

exports.getAllProjectsId = async (req, res) => {
  try {
    const projects = await Project.find({ isDeleted: false });
    return res.json({
      projects: projects,
    });
  } catch (e) {
    return res.json({
      message: e.message,
    });
  }
};

exports.getProjectData = (req, res) => {
  try {
    Project.find(
      { isDeleted: false, status: "inprogress" },
      { _id: 1, title: 1 }
    ).then((result) => {
      res.json(result);
    });
  } catch (e) {
    logError("getProjectData", e);
  }
};

exports.getProjectDataForCompany = async (req, res) => {
  try {
    const { companyId } = req.body;
    const { query } = req.query;
    let projects;

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required.",
      });
    }

    // Base filter
    const filter = {
      companyId: companyId,
      isDeleted: false,
    };

    // Add title regex filter only if query is present and not empty
    if (query && query.trim() !== "") {
      filter.title = { $regex: query, $options: "i" };
    }
    if (query) {
      projects = await Project.find(filter);
    } else {
      projects = [];
    }

    // If no projects, respond with empty array (instead of 404)
    return res.json({
      projects: projects,
    });
  } catch (e) {
    return res.status(500).json({
      message: e.message,
    });
  }
};

exports.addProjectUsers = (req, res) => {
  try {
    Project.findOneAndUpdate(
      { _id: req.body.projectId },
      { $set: { projectUsers: req.body.projectUsers } }
    )
      .then((result) => {
        res.json({ msg: "Successfully added" });
      })
      .catch((err) => {
        logError("addProjectUsers err", err);
      });
  } catch (err) {
    logError("addProjectUsers err", err);
  }
};

exports.getUserProject = (req, res) => {
  try {
    Project.find(
      {
        isDeleted: false,
        archive: false,
      },
      {
        _id: 1,
        title: 1,
        status: 1,
        projectUsers: 1,
      }
    ).then((result) => {
      res.json(result);
    });
  } catch (e) {
    logError("getUserProject", e);
  }
};
exports.archiveProject = async (req, res) => {
  console.log("Un archive project code ?");
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project ID is required." });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found." });
    }

    const newArchiveStatus = !project.archive;

    await Project.findByIdAndUpdate(
      projectId,
      { $set: { archive: newArchiveStatus } },
      { new: true }
    );

    const eventType = "PROJECT_ARCHIVED";
    // console.log(project, "from project archived");
    const notification = await handleNotifications(project, eventType);

    // if (emailOwner.length > 0 || email.length > 0) {
    const auditTaskAndSendMail = async (newTask, emailOwner, email) => {
      try {
        let updatedDescription = newTask.description
          .split("\n")
          .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");
        // let emailText = config.projectEmailArchiveContent
        //   // .replace("#title#", newTask.title)
        //   .replace("#description#", updatedDescription)
        //   .replace("#projectName#", newTask.title)
        //   .replace("#projectId#", newTask._id)
        //   // .replace("#priority#", newTask.priority.toUpperCase())
        //   .replace("#newTaskId#", newTask._id);

        let taskEmailLink = config.taskEmailLink
          // .replace("#projectId#", newTask.projectId._id)
          .replace("#newTaskId#", newTask._id);

        // console.log(emailText, "from mailOptions")

        let emailText = `
            Hi, <br/><br/>
            A project has been <strong>Archived</strong>. <br/><br/>
            <strong>Project:</strong> ${newTask.title} <br/>
            <strong>Description:</strong><br/> &nbsp;&nbsp;&nbsp;&nbsp; ${updatedDescription} <br/><br/>
            To view project details, click 
            <a href="${process.env.URL}tasks/${newTask._id}/kanban/stage" target="_blank">here</a>. <br/><br/>
            Thanks, <br/>
            The proPeak Team
        `;

        if (email !== "XX") {
          var mailOptions = {
            from: config.from,
            to: email,
            // cc: emailOwner,
            subject: ` PROJECT_ARCHIVED - ${newTask.title}`,
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
              // addMyNotification(taskArr);
            })
            .catch((err) => {
              console.error("Failed to send email via RabbitMQ", err);
            });
        }
      } catch (error) {
        console.error("Error in sending email", error);
      }
    };

    // auditTaskAndSendMail(task, emailOwner, email);
    // }

    if (notification.length > 0) {
      for (const channel of notification) {
        const { emails } = channel;

        for (const email of emails) {
          await auditTaskAndSendMail(project, [], email);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Project has been ${
        newArchiveStatus ? "archived" : "unarchived"
      }.`,
    });
  } catch (e) {
    console.error("Error archiving project:", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Internal server error",
    });
  }
};

// POST request handler to add a custom field
exports.addCustomTaskField = async (req, res) => {
  try {
    const {
      key,
      label,
      type,
      projectId,
      groupId,
      level,
      isMandatory,
      companyId,
    } = req.body;

    console.log(req.body, "from req.body custom field");
    if (!projectId && !groupId) {
      return res
        .status(400)
        .json({ message: "Either projectId or groupId is required" });
    }
    if (!key || !label || !type || !level) {
      return res
        .status(200)
        .json({ success: false, message: "Missing required fields" });
    }
    // const existingField = await CustomTaskField.findOne({
    //   key,
    //   $or: [{ projectId }, { groupId }],
    //   level,
    //   isDeleted: false,
    // });

    // if (existingField) {
    //   return res.status(409).json({ message: "Key already exists" });
    // }

    // Uniqueness only within the same project or group
    const query = {
      key,
      level,
      isDeleted: false,
    };

    if (projectId) {
      query.projectId = projectId;
    } else if (groupId) {
      query.groupId = groupId;
    }

    const existingField = await CustomTaskField.findOne(query);

    if (existingField) {
      return res
        .status(409)
        .json({ message: "Key already exists in this project/group" });
    }

    const newField = new CustomTaskField({
      key,
      label,
      type,
      projectId,
      companyId,
      groupId,
      level,
      isMandatory,
      isDeleted: false,
    });

    // Save the custom field
    await newField.save();

    const savedFieldWithProject = await CustomTaskField.findById(
      newField._id
    ).populate({
      path: "projectId",
      model: "project",
      select: "title",
    });

    // console.log(savedFieldWithProject, "from new filed");
    try {
      const eventType = "CUSTOM_FIELD_CREATED";
      const notification = await handleNotifications(
        savedFieldWithProject,
        eventType
      );
      // console.log(notification, "from notification")
      const auditTaskAndSendMail = async (newTask, emailOwner, email) => {
        try {
          // let updatedDescription = newTask.description
          //   .split("\n")
          //   .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");
          const configPath =
            newTask.level === "project" ? "project-config" : "task-config";
          // let emailText = config.projectEmailFieldContent
          //   .replace("#title#", newTask.level)
          //   // .replace("#description#", updatedDescription)
          //   .replace("#projectName#", newTask.projectId.title)
          //   .replace("#key#", newTask.key)
          //   .replace("#type#", newTask.type)
          //   .replace("#label#", newTask.label)
          //   .replace("#projectId#", newTask.projectId._id)
          //   .replace("#configPath#", configPath);
          // .replace("#priority#", newTask.priority.toUpperCase())
          // .replace("#newTaskId#", newTask._id);

          let emailText = `
          Hi, <br/><br/>
          A custom field was created at the <strong>${newTask.level}</strong> level. <br/><br/>
          <strong>Project:</strong> ${newTask.projectId.title} <br/>
          <strong>Key:</strong> ${newTask.key} <br/>
          <strong>Label:</strong> ${newTask.label}<br/>
          <strong>Type:</strong> ${newTask.type} <br/><br/>
          To view custom field update details, click 
          <a href="${process.env.URL}projects/edit/${newTask.projectId._id}/${configPath}" target="_blank">here</a>. <br/><br/>
          Thanks, <br/>
          The proPeak Team
        `;

          let taskEmailLink = config.taskEmailLink.replace(
            "#projectId#",
            newTask.projectId._id
          );
          // .replace("#newTaskId#", newTask._id);

          if (email !== "XX") {
            var mailOptions = {
              from: config.from,
              to: email,
              // cc: emailOwner,
              subject: ` CUSTOM_FIELD_CREATED - At level "${newTask.level}"`,
              html: emailText,
            };

            // console.log(mailOptions, "from mailOptions")

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
                // addMyNotification(taskArr);
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
          // console.log(emails, "from emails")

          for (const email of emails) {
            await auditTaskAndSendMail(savedFieldWithProject, [], email);
          }
        }
      }
    } catch (notifyErr) {
      console.warn("Notification failed", notifyErr);
    }

    res.status(201).json({
      success: true,
      message: "Custom field created successfully",
      data: newField,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getCustomTasksField = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const level = req.query.level;

    let condition =
      projectId == "all"
        ? {}
        : {
            projectId: projectId,
            $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
          };

    if (level) {
      condition.level = level;
    }

    let customTasksField = await CustomTaskField.find(condition).populate(
      "projectId"
    );

    return res.json({
      customTasksField,
    });
  } catch (e) {
    return res.json({
      error: e,
    });
  }
};

exports.getCustomTasksFieldGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const level = req.query.level;

    let condition =
      groupId == "all"
        ? {}
        : {
            groupId: groupId,
            $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
          };

    if (level) {
      condition.level = level;
    }

    let customTasksField = await CustomTaskField.find(condition).populate(
      "groupId"
    );
    return res.json({
      customTasksField,
    });
  } catch (e) {
    return res.json({
      error: e,
    });
  }
};

exports.getCustomTaskField = async (req, res) => {
  try {
    const customFieldId = req.params.customFieldId;

    const customTaskField = await CustomTaskField.findById(customFieldId);

    return res.json({
      customTaskField,
    });
  } catch (e) {
    return res.json({
      error: e,
    });
  }
};

exports.updateCustomTaskField = async (req, res) => {
  try {
    const { key, label, type, level, isMandatory, companyId } = req.body;
    const customFieldId = req.params.customFieldId;
    console.log("test the custom field", customFieldId);

    // Check for required fields (excluding project ID as it shouldn't be updated)
    if (!key || !label || !type || !level) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find the custom field by ID
    const existingField = await CustomTaskField.findById(
      customFieldId
    ).populate("projectId");

    if (!existingField) {
      return res.status(404).json({ message: "Custom field not found" });
    }

    // Ensure unique key if it has changed
    if (existingField.key !== key) {
      const duplicateField = await CustomTaskField.findOne({ key });
      if (duplicateField) {
        return res
          .status(200)
          .json({ success: false, message: "Key already exists" });
      }
    }

    // Update the existing field data
    existingField.key = key;
    existingField.label = label;
    existingField.type = type;
    existingField.level = level;
    existingField.isMandatory = isMandatory;
    existingField.companyId = companyId;

    // Save the updated field
    await existingField.save();
    // try {
    //   const eventType = "CUSTOM_FIELD_CREATED";
    //   await sendNotification(existingField, eventType);
    // } catch (notifyErr) {
    //   console.warn("Notification failed", notifyErr);
    // }

    res.status(200).json({
      success: true,
      message: "Custom field updated successfully",
      data: existingField,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteCustomTaskField = async (req, res) => {
  try {
    const customFieldId = req.params.customFieldId;
    const existingField = await CustomTaskField.findOneAndUpdate(
      { _id: customFieldId },
      { isDeleted: true },
      { new: true }
    );
    if (!existingField) {
      return res.status(404).json({ message: "Custom field not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Custom field deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Project Type
exports.createProjectType = async (req, res) => {
  const { type } = req.body;

  try {
    // Check if the type already exists
    const existingType = await ProjectTypes.findOne({ type });
    if (existingType) {
      return res.status(409).json({ message: "Project type already exists" });
    }

    // Create new project type
    const newProjectType = new ProjectTypes({ type });
    await newProjectType.save();

    res.status(201).json({
      message: "Project type created successfully",
      data: newProjectType,
    });
  } catch (error) {
    console.error("Error creating project type:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getProjectTypes = async (req, res) => {
  try {
    const all = req.params.all;

    const condition = all === "all" ? {} : {}; // Adjust if needed
    const projectTypes = await ProjectTypes.find(condition);
    res.status(200).json({ projectTypes });
  } catch (error) {
    console.error("Error fetching project types:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getProjectsByCompanyId = async (req, res) => {
  try {
    // Run both queries in parallel
    const [totalProjects, userCount] = await Promise.all([
      Project.countDocuments({
        isDeleted: false,
        companyId: req.params.companyId,
      }),

      Project.aggregate([
        {
          $match: {
            isDeleted: false,
            companyId: req.params.companyId,
            projectUsers: { $exists: true, $not: { $size: 0 } }, // Filter upfront
          },
        },
        {
          $project: {
            projectUsers: 1,
            _id: 0,
          },
        },
        {
          $unwind: "$projectUsers",
        },
        {
          $group: {
            _id: null,
            uniqueUsers: { $addToSet: "$projectUsers" },
          },
        },
        {
          $project: {
            count: { $size: "$uniqueUsers" },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      projectTotal: totalProjects,
      projectMembers: userCount[0]?.count || 0,
    });
  } catch (e) {
    console.error("Error in getProjectsByCompanyId:", e);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getProjectsKanbanData = async (req, res) => {
  try {
    const { companyId, userId, stageId } = req.params;
    const archive = req.query.archive == "true";

    // Fetch all project stages
    const projectStages = await ProjectStage.find({
      companyId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ sequence: "asc" });

    // Fetch paginated projects for each stage separately
    const stagesWithProjects = await Promise.all(
      projectStages.map(async (stage) => {
        let projectWhereCondition = {
          projectStageId: stage._id,
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
          companyId,
          archive,
          projectType: { $ne: "Exhibition" },
        };

        if (userId !== "ALL") {
          projectWhereCondition.projectUsers = { $in: [userId] };
        }

        // const iprojects = await Project.aggregate([
        //   { $match: projectWhereCondition },

        //   // Ensure createdBy is cast to ObjectId if stored as string
        //   {
        //     $addFields: {
        //       createdByObjId: {
        //         $cond: [
        //           { $eq: [{ $type: "$createdBy" }, "objectId"] },
        //           "$createdBy",
        //           { $toObjectId: "$createdBy" }
        //         ]
        //       }
        //     }
        //   },

        //   // Lookup createdBy user
        //   {
        //     $lookup: {
        //       from: "users",
        //       localField: "createdByObjId",
        //       foreignField: "_id",
        //       as: "createdByUser"
        //     }
        //   },
        //   { $unwind: { path: "$createdByUser", preserveNullAndEmptyArrays: true } },

        //   // Lookup project users
        //   {
        //     $lookup: {
        //       from: "users",
        //       localField: "projectUsers",
        //       foreignField: "_id",
        //       as: "projectUsersData"
        //     }
        //   },

        //   // Lookup task count for each project
        //   {
        //     $lookup: {
        //       from: "tasks",
        //       let: { pid: "$_id" },
        //       pipeline: [
        //         {
        //           $match: {
        //             $expr: {
        //               $and: [
        //                 { $eq: ["$projectId", "$$pid"] },
        //                 { $eq: ["$isDeleted", false] }
        //               ]
        //             }
        //           }
        //         },
        //         { $count: "count" }
        //       ],
        //       as: "tasksCountData"
        //     }
        //   },
        //   {
        //     $addFields: {
        //       tasksCount: {
        //         $cond: [
        //           { $gt: [{ $size: "$tasksCountData" }, 0] },
        //           { $arrayElemAt: ["$tasksCountData.count", 0] },
        //           0
        //         ]
        //       }
        //     }
        //   },

        //   // Lookup if project is favorite for user
        //   {
        //     $lookup: {
        //       from: "favoriteprojects",
        //       let: { pid: "$_id" },
        //       pipeline: [
        //         {
        //           $match: {
        //             $expr: {
        //               $and: [
        //                 { $eq: ["$projectId", "$$pid"] },
        //                 { $eq: ["$userId", userId] }
        //               ]
        //             }
        //           }
        //         }
        //       ],
        //       as: "favData"
        //     }
        //   },

        //   // Final computed fields
        //   {
        //     $addFields: {
        //       isFavourite: { $gt: [{ $size: "$favData" }, 0] },
        //       projectUsers: {
        //         $map: {
        //           input: "$projectUsersData",
        //           as: "u",
        //           in: "$$u.name"
        //         }
        //       },
        //       createdBy: {
        //         $cond: [
        //           { $ifNull: ["$createdByUser.name", false] },
        //           "$createdByUser.name",
        //           "Unknown"
        //         ]
        //       }
        //     }
        //   },

        //   // 🧹 Clean up intermediate fields
        //   {
        // $project: {
        //   createdByUser: 0,
        //   createdByObjId: 0,
        //   projectUsersData: 0,
        //   tasksCountData: 0,
        //   favData: 0
        //     }
        //   }
        // ]);

        let iprojects = await Project.find(projectWhereCondition)
          .limit(10)
          .select("title createdBy projectUsers");
        return { ...stage.toObject(), projects: iprojects };
      })
    );

    const totalCount = await Project.countDocuments({
      isDeleted: false,
      companyId,
      archive,
    });

    return res.json({
      success: true,
      projectStages: stagesWithProjects,
      totalCount,
    });
  } catch (error) {
    console.log(error);
    return res.json({
      message: "error fetching project kanban",
      success: false,
    });
  }
};

exports.getKanbanProjects = async (req, res) => {
  try {
    const archive = req.query.archive == "true";
    let page = parseInt(req.query.page || "0");
    const limit = 10;
    const skip = page * limit;
    const { stageId, companyId, userId } = req.body;

    // Build base filter for project stages
    let stageFilter = {
      companyId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    };

    if (stageId && stageId !== "null" && stageId !== "ALL") {
      stageFilter._id = stageId;
    }

    const projectStages = await ProjectStage.find({
      companyId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ sequence: "asc" });

    const stagesWithProjects = await Promise.all(
      projectStages.map(async (stage) => {
        let projectWhereCondition = {
          projectStageId: stage._id,
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
          companyId,
          archive,
          projectType: { $ne: "Exhibition" },
        };

        if (userId !== "ALL") {
          projectWhereCondition.projectUsers = { $in: [userId] };
        }

        // Get total project count for pagination
        const totalCount = await Project.countDocuments(projectWhereCondition);
        const totalPages = Math.ceil(totalCount / limit);

        // Fetch paginated projects
        const iprojects = await Project.find(projectWhereCondition)
          .sort({ createdOn: -1 })
          .skip(skip)
          .limit(limit);

        // Enrich project data
        const projects = await Promise.all(
          iprojects.map(async (p) => {
            const users = await User.find({
              _id: { $in: p.projectUsers },
            }).select("name");
            const createdByUser = await User.findById(p.createdBy).select(
              "name"
            );
            const tasksCount = await Task.countDocuments({
              projectId: p._id,
              isDeleted: false,
            });
            const isFavourite = await FavoriteProject.findOne({
              projectId: p._id,
              userId,
            });

            return {
              ...p.toObject(),
              tasksCount,
              isFavourite: !!isFavourite,
              projectUsers: users.map((user) => user.name),
              createdBy: createdByUser ? createdByUser.name : "Unknown",
            };
          })
        );

        return {
          ...stage.toObject(),
          projects,
          totalCount,
          totalPages,
        };
      })
    );

    const globalTotalCount = await Project.countDocuments({
      isDeleted: false,
      companyId,
      archive,
    });

    const globalTotalPages = Math.ceil(globalTotalCount / limit);

    return res.json({
      success: true,
      projectStages: stagesWithProjects,
      totalCount: globalTotalCount,
      totalPages: globalTotalPages,
    });
  } catch (error) {
    console.log(error);
    return res.json({
      message: "error fetching project kanban",
      success: false,
    });
  }
};

// exports.getKanbanProjectsData = async (req, res) => {
//   try {
//     let page = parseInt(req.query.page || "0");
//     const limit = 10;
//     const skip = page * limit;
//     const {
//       stageId,
//       companyId,
//       userId,
//       archive,
//       // startDate,
//       // dueDateSort,
//       dueDate,
//       dateStartSort,
//       searchFilter,
//       startDateFilter,
//     } = req.body;

//     console.log("req.body...", req.body, "req.query", req.query);

//     if (!stageId || stageId === "null" || stageId === "ALL") {
//       return res.status(400).json({
//         success: false,
//         message: "stageId is required and cannot be ALL or null.",
//       });
//     }

//     // Project query filter
//     const projectWhereCondition = {
//       projectStageId: stageId || "673202ee15c8e180c21e9ad7",
//       $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
//       companyId,
//       archive: archive || false,
//       projectType: { $ne: "Exhibition" },
//     };

//     // if (searchFilter) {
//     //   const regex = new RegExp(searchFilter, "i");
//     //   projectWhereCondition.$or = [
//     //     { title: { $regex: regex } },
//     //     { description: { $regex: regex } },
//     //     { tag: { $regex: regex } },
//     //   ];
//     // }
//     if (searchFilter) {
//       const regex = new RegExp(searchFilter, "i");
//       projectWhereCondition.$and = [
//         {
//           $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
//         },
//         {
//           $or: [
//             { title: { $regex: regex } },
//             { description: { $regex: regex } },
//             { tag: { $regex: regex } },
//           ],
//         },
//       ];
//     }

//     // console.log("projectWhereCondition...", projectWhereCondition);

//     if (userId !== "ALL") {
//       projectWhereCondition.projectUsers = { $in: [userId] };
//     }

//     // if (startDate) {
//     //   projectWhereCondition.startdate = { $gte: new Date(startDate) };
//     // }
//     if (startDateFilter) {
//       projectWhereCondition.startdate = { $eq: new Date(startDateFilter) };
//     }

//     const totalCount = await Project.countDocuments(projectWhereCondition);
//     const totalPages = Math.ceil(totalCount / limit);

//     if (page >= totalPages && totalPages > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Page number exceeds available pages.",
//       });
//     }

//     // const iprojects = await Project.find(projectWhereCondition)
//     //   .sort({ createdOn: -1 })
//     //   .skip(skip)
//     //   .limit(limit);

//     let sortCondition;

//     if (dueDate) {
//       sortCondition = { enddate: dueDate === "asc" ? 1 : -1 };
//     } else if (dateStartSort) {
//       sortCondition = { startdate: dateStartSort === "asc" ? 1 : -1 };
//     }

//     const iprojects = await Project.find(projectWhereCondition)
//       .sort(sortCondition ? sortCondition : { createdOn: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const projects = await Promise.all(
//       iprojects.map(async (p) => {
//         const users = await User.find({ _id: { $in: p.projectUsers } }).select(
//           "name"
//         );
//         const createdByUser = await User.findById(p.createdBy).select("name");
//         const tasksCount = await Task.countDocuments({
//           projectId: p._id,
//           isDeleted: false,
//         });
//         const isFavourite = await FavoriteProject.findOne({
//           projectId: p._id,
//           userId,
//         });

//         return {
//           //...p.toObject(),
//           ...p,
//           tasksCount,
//           isFavourite: !!isFavourite,
//           projectUsers: users.map((user) => user.name),
//           createdBy: createdByUser ? createdByUser.name : "Unknown",
//         };
//       })
//     );

//     return res.json({
//       success: true,
//       projects,
//       totalCount,
//       totalPages,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.json({
//       message: "Error fetching kanban projects",
//       success: false,
//     });
//   }
// };

exports.getKanbanProjectsData = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "0");
    const limit = 10;
    const skip = page * limit;

    const {
      stageId,
      companyId,
      userId,
      archive,
      dueDate,
      dateStartSort,
      searchFilter,
      startDateFilter,
    } = req.body;

    if (!stageId || stageId === "null" || stageId === "ALL") {
      return res.status(400).json({
        success: false,
        message: "stageId is required and cannot be ALL or null.",
      });
    }

    const projectWhereCondition = {
      projectStageId: stageId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      companyId,
      archive: archive || false,
      projectType: { $ne: "Exhibition" },
    };

    if (searchFilter) {
      const regex = new RegExp(searchFilter, "i");
      projectWhereCondition.$and = [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        {
          $or: [
            { title: { $regex: regex } },
            { description: { $regex: regex } },
            { tag: { $regex: regex } },
          ],
        },
      ];
    }

    if (userId !== "ALL") {
      projectWhereCondition.projectUsers = { $in: [userId] };
    }

    if (startDateFilter) {
      projectWhereCondition.startdate = { $eq: new Date(startDateFilter) };
    }

    const totalCount = await Project.countDocuments(projectWhereCondition);
    const totalPages = Math.ceil(totalCount / limit);

    if (page >= totalPages && totalPages > 0) {
      return res.status(400).json({
        success: false,
        message: "Page number exceeds available pages.",
      });
    }

    const sortCondition = dueDate
      ? { enddate: dueDate === "asc" ? 1 : -1 }
      : dateStartSort
      ? { startdate: dateStartSort === "asc" ? 1 : -1 }
      : { createdOn: -1 };

    const iprojects = await Project.find(projectWhereCondition)
      .sort(sortCondition)
      .skip(skip)
      .limit(limit)
      .lean();

    const projectIds = iprojects.map((p) => p._id);
    const userIds = [
      ...new Set(iprojects.flatMap((p) => [...p.projectUsers, p.createdBy])),
    ];

    // 🔹 Batch user fetch
    const userDocs = await User.find({ _id: { $in: userIds } })
      .select("name")
      .lean();
    const usersMap = new Map(userDocs.map((u) => [u._id.toString(), u.name]));

    // 🔹 Batch task count
    const taskCounts = await Task.aggregate([
      { $match: { projectId: { $in: projectIds }, isDeleted: false } },
      { $group: { _id: "$projectId", count: { $sum: 1 } } },
    ]);
    const taskCountMap = new Map(
      taskCounts.map((tc) => [tc._id.toString(), tc.count])
    );

    // 🔹 Batch favorites
    const favorites = await FavoriteProject.find({
      projectId: { $in: projectIds },
      userId,
    }).lean();
    const favoriteSet = new Set(favorites.map((f) => f.projectId.toString()));

    // const projects = iprojects.map((p) => ({
    //   ...p,
    //   tasksCount: taskCountMap.get(p._id.toString()) || 0,
    //   isFavourite: favoriteSet.has(p._id.toString()),
    //   projectUsers: (p.projectUsers || []).map((uid) => {
    //     const user = usersMap.get(uid?.toString());
    //     return user || "Unknown"; // Fallback if null or undefined
    //   }),
    //   createdBy: usersMap.get(p.createdBy?.toString()) || "Unknown", // Fallback if null or undefined
    // }));

    const taskStageStats = await Task.aggregate([
      {
        $match: {
          isDeleted: false,
          projectId: { $in: projectIds },
        },
      },
      {
        $group: {
          _id: { projectId: "$projectId", status: "$status" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.projectId",
          total: { $sum: "$count" },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "completed"] }, "$count", 0],
            },
          },
          inprogress: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "inprogress"] }, "$count", 0],
            },
          },
          todo: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "todo"] }, "$count", 0],
            },
          },
          customStages: {
            $push: {
              $cond: [
                { $in: ["$_id.status", ["todo", "inprogress", "completed"]] },
                "$$REMOVE",
                { status: "$_id.status", count: "$count" },
              ],
            },
          },
        },
      },
    ]);

    const stageStatsMap = new Map();

    for (const stat of taskStageStats) {
      stageStatsMap.set(stat._id.toString(), {
        total: stat.total || 0,
        completed: stat.completed || 0,
        inProgress: stat.inprogress || 0,
        todo: stat.todo || 0,
        customStages: stat.customStages || [],
      });
    }

    const projects = iprojects.map((project) => {
      const projectId = project._id.toString();
      const stageData = stageStatsMap.get(projectId) || {
        total: 0,
        completed: 0,
        inProgress: 0,
        todo: 0,
        customStages: [],
      };

      const { total, completed, inProgress, todo, customStages } = stageData;

      return {
        ...project,
        tasksCount: total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        stageBreakdown: stageData,
        isFavourite: favoriteSet.has(projectId),
        todo,
        inProgress,
        completed,
        customStages,
        projectUsers: (project.projectUsers || []).map(
          (uid) => usersMap.get(uid?.toString()) || "Unknown"
        ),
        createdBy: usersMap.get(project.createdBy?.toString()) || "Unknown",
      };
    });

    return res.json({
      success: true,
      projects,
      totalCount,
      totalPages,
    });
  } catch (error) {
    console.error("Error in getKanbanProjectsData:", error);
    return res.json({
      message: "Error fetching kanban projects",
      success: false,
    });
  }
};

exports.getExhibitionKanbanData = async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const archive = req.query.archive == "true";

    const projectStages = await ProjectStage.find({
      companyId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ sequence: "asc" });

    const stagesWithProjects = await Promise.all(
      projectStages.map(async (stage) => {
        let projectWhereCondition = {
          projectStageId: stage._id,
          companyId,
          archive,
          projectType: "Exhibition",
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        };

        if (userId !== "ALL") {
          projectWhereCondition.projectUsers = { $in: [userId] };
        }

        let iprojects = await Project.find(projectWhereCondition)
          .limit(10)
          .select("title createdBy projectUsers");

        // let projects = await Promise.all(
        //   iprojects.map(async (p) => {
        //     const users = await User.find({
        //       _id: { $in: p.projectUsers },
        //     }).select("name");
        //     const createdByUser = await User.findById(p.createdBy).select(
        //       "name"
        //     );
        //     const tasksCount = await Task.countDocuments({
        //       projectId: p._id,
        //       isDeleted: false,
        //     });

        //     const isFavourite = await FavoriteProject.findOne({
        //       projectId: p._id,
        //       userId: userId,
        //     });

        //     return {
        //       ...p.toObject(),
        //       tasksCount,
        //       isFavourite: !!isFavourite,
        //       projectUsers: users.map((user) => user.name),
        //       createdBy: createdByUser ? createdByUser.name : "Unknown",
        //     };
        //   })
        // );
        return { ...stage.toObject(), projects: iprojects };
      })
    );

    const totalCount = await Project.countDocuments({
      companyId,
      archive,
      projectType: "Exhibition",
      isDeleted: false,
    });
    return res.json({
      success: true,
      projectStages: stagesWithProjects,
      totalCount,
    });
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Error fetching exhibition project kanban",
    });
  }
};
exports.getKanbanExhibition = async (req, res) => {
  try {
    const archive = req.query.archive === "true";
    const page = parseInt(req.query.page || "0");
    const limit = 10;
    const skip = page * limit;

    const { stageId, companyId, userId } = req.body;

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId is required.",
      });
    }

    // Base filter for project stages
    const stageFilter = {
      companyId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    };

    // Apply stageId filter if provided
    if (stageId && stageId !== "ALL" && stageId !== "null") {
      stageFilter._id = stageId;
    }

    const projectStages = await ProjectStage.find(stageFilter).sort({
      sequence: "asc",
    });

    const stagesWithProjects = await Promise.all(
      projectStages.map(async (stage) => {
        const projectWhereCondition = {
          projectStageId: stage._id,
          companyId,
          archive,
          projectType: "Exhibition",
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        };

        if (userId && userId !== "ALL") {
          projectWhereCondition.projectUsers = { $in: [userId] };
        }

        const totalCount = await Project.countDocuments(projectWhereCondition);
        const totalPages = Math.ceil(totalCount / limit);

        const iprojects = await Project.find(projectWhereCondition)
          .sort({ createdOn: -1 })
          .skip(skip)
          .limit(limit);

        const projects = await Promise.all(
          iprojects.map(async (p) => {
            const users = await User.find({
              _id: { $in: p.projectUsers },
            }).select("name");

            const createdByUser = await User.findById(p.createdBy).select(
              "name"
            );

            const tasksCount = await Task.countDocuments({
              projectId: p._id,
              isDeleted: false,
            });

            const isFavourite = await FavoriteProject.findOne({
              projectId: p._id,
              userId,
            });

            return {
              ...p.toObject(),
              tasksCount,
              isFavourite: !!isFavourite,
              projectUsers: users.map((u) => u.name),
              createdBy: createdByUser ? createdByUser.name : "Unknown",
            };
          })
        );

        return {
          ...stage.toObject(),
          projects,
          totalCount,
          totalPages,
        };
      })
    );

    const globalCountCondition = {
      companyId,
      archive,
      projectType: "Exhibition",
      isDeleted: false,
    };

    const globalTotalCount = await Project.countDocuments(globalCountCondition);
    const globalTotalPages = Math.ceil(globalTotalCount / limit);

    return res.json({
      success: true,
      projectStages: stagesWithProjects,
      totalCount: globalTotalCount,
      totalPages: globalTotalPages,
    });
  } catch (error) {
    console.error("getKanbanExhibition error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching kanban exhibition data",
    });
  }
};

// exports.getKanbanExhibitionData = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page || "0", 10);
//     const limit = 10;

//     if (!Number.isInteger(page) || page < 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid page number.",
//       });
//     }

//     const {
//       stageId,
//       companyId,
//       userId,
//       archive,
//       searchFilter,
//       startDateFilter,
//       dueDate,
//       dateStartSort,
//     } = req.body;

//     if (!stageId || stageId === "null" || stageId === "ALL") {
//       return res.status(400).json({
//         success: false,
//         message: "stageId is required and cannot be 'ALL' or null.",
//       });
//     }

//     if (!companyId) {
//       return res.status(400).json({
//         success: false,
//         message: "companyId is required.",
//       });
//     }

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "userId is required.",
//       });
//     }

//     const projectWhereCondition = {
//       projectStageId: stageId,
//       $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
//       companyId,
//       archive: archive || false,
//       projectType: "Exhibition",
//     };

//     if (searchFilter) {
//       const regex = new RegExp(searchFilter, "i");
//       projectWhereCondition.$or = [
//         { title: { $regex: regex } },
//         { description: { $regex: regex } },
//         { tag: { $regex: regex } },
//       ];
//     }

//     if (startDateFilter) {
//       projectWhereCondition.startdate = { $eq: new Date(startDateFilter) };
//     }

//     // if (userId !== "ALL") {
//     //   projectWhereCondition.projectUsers = { $in: [userId] };
//     // }

//     let sortCondition;

//     if (dueDate) {
//       sortCondition = { enddate: dueDate === "asc" ? 1 : -1 };
//     } else if (dateStartSort) {
//       sortCondition = { startdate: dateStartSort === "asc" ? 1 : -1 };
//     }

//     const totalCount = await Project.countDocuments(projectWhereCondition);
//     const totalPages = Math.ceil(totalCount / limit);

//     if (page >= totalPages && totalPages > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Page number exceeds available pages.",
//       });
//     }

//     const projectsRaw = await Project.find(projectWhereCondition)
//       .sort(sortCondition ? sortCondition : { createdOn: -1 })
//       .skip(page * limit)
//       .limit(limit)
//       .lean();

//     const projects = await Promise.all(
//       projectsRaw.map(async (p) => {
//         const users = await User.find({ _id: { $in: p.projectUsers } }).select(
//           "name"
//         );
//         const createdByUser = await User.findById(p.createdBy).select("name");
//         const tasksCount = await Task.countDocuments({
//           projectId: p._id,
//           isDeleted: false,
//         });
//         const isFavourite = await FavoriteProject.findOne({
//           projectId: p._id,
//           userId,
//         });

//         return {
//           // ...p.toObject(),
//           ...p,
//           tasksCount,
//           isFavourite: !!isFavourite,
//           projectUsers: users.map((u) => u.name),
//           createdBy: createdByUser?.name || "Unknown",
//         };
//       })
//     );

//     return res.json({
//       success: true,
//       projects,
//       totalCount,
//       totalPages,
//     });
//   } catch (error) {
//     console.error("Error in getKanbanExhibitionData:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching kanban projects",
//     });
//   }
// };

exports.getKanbanExhibitionData = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "0", 10);
    const limit = 10;
    const skip = page * limit;

    if (!Number.isInteger(page) || page < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid page number.",
      });
    }

    const {
      stageId,
      companyId,
      userId,
      archive,
      searchFilter,
      startDateFilter,
      dueDate,
      dateStartSort,
    } = req.body;

    if (!stageId || stageId === "null" || stageId === "ALL") {
      return res.status(400).json({
        success: false,
        message: "stageId is required and cannot be 'ALL' or null.",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId is required.",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required.",
      });
    }

    const projectWhereCondition = {
      projectStageId: stageId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      companyId,
      archive: archive || false,
      projectType: "Exhibition",
    };

    if (searchFilter) {
      const regex = new RegExp(searchFilter, "i");
      projectWhereCondition.$or = [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
        { tag: { $regex: regex } },
      ];
    }

    if (startDateFilter) {
      projectWhereCondition.startdate = { $eq: new Date(startDateFilter) };
    }

    const totalCount = await Project.countDocuments(projectWhereCondition);
    const totalPages = Math.ceil(totalCount / limit);

    if (page >= totalPages && totalPages > 0) {
      return res.status(400).json({
        success: false,
        message: "Page number exceeds available pages.",
      });
    }

    let sortCondition;

    if (dueDate) {
      sortCondition = { enddate: dueDate === "asc" ? 1 : -1 };
    } else if (dateStartSort) {
      sortCondition = { startdate: dateStartSort === "asc" ? 1 : -1 };
    }

    const projectsRaw = await Project.find(projectWhereCondition)
      .sort(sortCondition ? sortCondition : { createdOn: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const projectIds = projectsRaw.map((p) => p._id);
    const userIds = [
      ...new Set(projectsRaw.flatMap((p) => [...p.projectUsers, p.createdBy])),
    ];

    // 🔹 Batch user fetch
    const userDocs = await User.find({ _id: { $in: userIds } })
      .select("name")
      .lean();
    const usersMap = new Map(userDocs.map((u) => [u._id.toString(), u.name]));

    // 🔹 Batch task count
    const taskCounts = await Task.aggregate([
      { $match: { projectId: { $in: projectIds }, isDeleted: false } },
      { $group: { _id: "$projectId", count: { $sum: 1 } } },
    ]);
    const taskCountMap = new Map(
      taskCounts.map((tc) => [tc._id.toString(), tc.count])
    );

    // 🔹 Batch favorites
    const favorites = await FavoriteProject.find({
      projectId: { $in: projectIds },
      userId,
    }).lean();
    const favoriteSet = new Set(favorites.map((f) => f.projectId.toString()));

    // const projects = projectsRaw.map((p) => ({
    //   ...p,
    //   tasksCount: taskCountMap.get(p._id.toString()) || 0,
    //   isFavourite: favoriteSet.has(p._id.toString()),
    //   projectUsers: (p.projectUsers || []).map((uid) => {
    //     const user = usersMap.get(uid?.toString());
    //     return user || "Unknown"; // Fallback if null or undefined
    //   }),
    //   createdBy: usersMap.get(p.createdBy?.toString()) || "Unknown", // Fallback if null or undefined
    // }));

    const taskStageStats = await Task.aggregate([
      {
        $match: {
          isDeleted: false,
          projectId: { $in: projectIds },
        },
      },
      {
        $group: {
          _id: { projectId: "$projectId", status: "$status" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.projectId",
          total: { $sum: "$count" },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "completed"] }, "$count", 0],
            },
          },
          inprogress: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "inprogress"] }, "$count", 0],
            },
          },
          todo: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "todo"] }, "$count", 0],
            },
          },
          customStages: {
            $push: {
              $cond: [
                { $in: ["$_id.status", ["todo", "inprogress", "completed"]] },
                "$$REMOVE",
                { status: "$_id.status", count: "$count" },
              ],
            },
          },
        },
      },
    ]);

    const stageStatsMap = new Map();

    for (const stat of taskStageStats) {
      stageStatsMap.set(stat._id.toString(), {
        total: stat.total || 0,
        completed: stat.completed || 0,
        inProgress: stat.inprogress || 0,
        todo: stat.todo || 0,
        customStages: stat.customStages || [],
      });
    }

    const projects = projectsRaw.map((project) => {
      const projectId = project._id.toString();
      const stageData = stageStatsMap.get(projectId) || {
        total: 0,
        completed: 0,
        inProgress: 0,
        todo: 0,
        customStages: [],
      };

      const { total, completed, inProgress, todo, customStages } = stageData;

      return {
        ...project,
        tasksCount: total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        stageBreakdown: stageData,
        isFavourite: favoriteSet.has(projectId),
        todo,
        inProgress,
        completed,
        customStages,
        projectUsers: (project.projectUsers || []).map(
          (uid) => usersMap.get(uid?.toString()) || "Unknown"
        ),
        createdBy: usersMap.get(project.createdBy?.toString()) || "Unknown",
      };
    });

    return res.json({
      success: true,
      projects,
      totalCount,
      totalPages,
    });
  } catch (error) {
    console.error("Error in getKanbanExhibitionData:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching kanban exhibition data",
    });
  }
};

exports.getProjectKanbanDataByGroupId = async (req, res) => {
  try {
    const { companyId, userId, groupId } = req.params;
    const archive = req.query.archive === "true";
    const groupObjectId = mongoose.Types.ObjectId.isValid(groupId)
      ? new mongoose.Types.ObjectId(groupId)
      : null;

    if (!groupObjectId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid groupId" });
    }

    // // Fetch all project stages for the given company
    // const projectStages = await ProjectStage.find({
    //   companyId,
    //   $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    // }).sort({ sequence: "asc" });

    // 🔍 Step 1: Try fetching group-level project stages
    let projectStages = await GroupProjectStage.find({
      companyId,
      groupId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ sequence: "asc" });

    console.log("projectStages...", projectStages);

    const isUsingGlobalStages = projectStages.length === 0;

    if (isUsingGlobalStages) {
      projectStages = await ProjectStage.find({
        companyId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      }).sort({ sequence: "asc" });
    }

    // Fetch projects filtered by groupId
    const stagesWithProjects = await Promise.all(
      projectStages.map(async (stage) => {
        let projectWhereCondition = {
          projectStageId: stage._id,
          companyId,
          archive,
          projectType: { $ne: "Exhibition" },
          group: groupObjectId, // <-- Ensure correct ObjectId comparison
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        };

        if (userId !== "ALL") {
          projectWhereCondition.projectUsers = { $in: [userId] };
        }

        let iprojects = await Project.find(projectWhereCondition)
          .limit(10)
          .select("title createdBy projectUsers");

        // let projects = await Promise.all(
        //   iprojects.map(async (p) => {
        //     const users = await User.find({
        //       _id: { $in: p.projectUsers },
        //     }).select("name");
        //     const createdByUser = await User.findById(p.createdBy).select(
        //       "name"
        //     );

        //     const tasksCount = await Task.countDocuments({
        //       projectId: p._id,
        //       isDeleted: false,
        //     });

        //     const isFavourite = await FavoriteProject.findOne({
        //       projectId: p._id,
        //       userId: userId,
        //     });

        //     return {
        //       ...p.toObject(),
        //       tasksCount,
        //       isFavourite: !!isFavourite,
        //       projectUsers: users.map((user) => user.name),
        //       createdBy: createdByUser ? createdByUser.name : "Unknown",
        //     };
        //   })
        // );

        return { ...stage.toObject(), projects: iprojects || [] };
      })
    );

    const totalCount = await Project.countDocuments({
      companyId,
      archive,
      group: groupObjectId, // <-- Ensure correct ObjectId comparison
      isDeleted: false,
    });

    return res.json({
      success: true,
      projectStages: stagesWithProjects,
      totalCount,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching project kanban by groupId",
    });
  }
};

// exports.getKanbanProjectsByGroup = async (req, res) => {
//   try {
//     let page = parseInt(req.query.page || "0");
//     const limit = 10;
//     const skip = page * limit;
//     const {
//       groupId,
//       companyId,
//       userId,
//       archive,
//       stageId,
//       dueDate,
//       dateStartSort,
//       searchFilter,
//       startDateFilter,
//     } = req.body;
//     if (!groupId || groupId === "null" || groupId === "ALL") {
//       return res.status(400).json({
//         success: false,
//         message: "groupId is required and cannot be ALL or null.",
//       });
//     }

//     const groupObjectId = mongoose.Types.ObjectId.isValid(groupId)
//       ? new mongoose.Types.ObjectId(groupId)
//       : null;

//     if (!groupObjectId) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid groupId format.",
//       });
//     }

//     const projectWhereCondition = {
//       group: groupObjectId,
//       $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
//       companyId,
//       archive,
//       projectType: { $ne: "Exhibition" },
//     };

//     if (searchFilter) {
//       const regex = new RegExp(searchFilter, "i");
//       projectWhereCondition.$or = [
//         { title: { $regex: regex } },
//         { description: { $regex: regex } },
//         { tag: { $regex: regex } },
//       ];
//     }

//     if (stageId && stageId !== "ALL" && stageId !== "null") {
//       projectWhereCondition.projectStageId = stageId;
//     }

//     if (userId !== "ALL") {
//       projectWhereCondition.projectUsers = { $in: [userId] };
//     }

//     if (startDateFilter) {
//       projectWhereCondition.startdate = { $eq: new Date(startDateFilter) };
//     }

//     const totalCount = await Project.countDocuments(projectWhereCondition);
//     const totalPages = Math.ceil(totalCount / limit);
//     if (page >= totalPages && totalPages > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Page number exceeds available pages.",
//       });
//     }

//     // const iprojects = await Project.find(projectWhereCondition)
//     //   .sort({ createdOn: -1 })
//     //   .skip(skip)
//     //   .limit(limit);
//     let sortCondition;

//     if (dueDate) {
//       sortCondition = { enddate: dueDate === "asc" ? 1 : -1 };
//     } else if (dateStartSort) {
//       sortCondition = { startdate: dateStartSort === "asc" ? 1 : -1 };
//     }

//     const iprojects = await Project.find(projectWhereCondition)
//       .sort(sortCondition ? sortCondition : { createdOn: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const projects = await Promise.all(
//       iprojects.map(async (p) => {
//         const users = await User.find({ _id: { $in: p.projectUsers } }).select(
//           "name"
//         );
//         const createdByUser = await User.findById(p.createdBy).select("name");
//         const tasksCount = await Task.countDocuments({
//           projectId: p._id,
//           isDeleted: false,
//         });
//         const isFavourite = await FavoriteProject.findOne({
//           projectId: p._id,
//           userId,
//         });

//         return {
//           //...p.toObject(),
//           ...p,
//           tasksCount,
//           isFavourite: !!isFavourite,
//           projectUsers: users.map((user) => user.name),
//           createdBy: createdByUser ? createdByUser.name : "Unknown",
//         };
//       })
//     );

//     return res.json({
//       success: true,
//       projects,
//       totalCount,
//       totalPages,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.json({
//       success: false,
//       message: "Error fetching kanban projects by group",
//     });
//   }
// };

exports.getKanbanProjectsByGroup = async (req, res) => {
  try {
    let page = parseInt(req.query.page || "0");
    const limit = 10;
    const skip = page * limit;

    const {
      groupId,
      companyId,
      userId,
      archive,
      stageId,
      dueDate,
      dateStartSort,
      searchFilter,
      startDateFilter,
    } = req.body;

    // Validate groupId
    if (!groupId || groupId === "null" || groupId === "ALL") {
      return res.status(400).json({
        success: false,
        message: "groupId is required and cannot be ALL or null.",
      });
    }

    const groupObjectId = mongoose.Types.ObjectId.isValid(groupId)
      ? new mongoose.Types.ObjectId(groupId)
      : null;

    if (!groupObjectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid groupId format.",
      });
    }

    // const projectWhereCondition = {
    //   group: groupObjectId,
    //   $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    //   companyId,
    //   archive,
    //   projectType: { $ne: "Exhibition" },
    // };

    // if (searchFilter) {
    //   const regex = new RegExp(searchFilter, "i");
    //   projectWhereCondition.$and = [
    //     { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
    //     {
    //       $or: [
    //         { title: { $regex: regex } },
    //         { description: { $regex: regex } },
    //         { tag: { $regex: regex } },
    //       ],
    //     },
    //   ];
    // }

    const projectWhereCondition = {
      companyId,
      archive,
      projectType: { $ne: "Exhibition" },
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        {
          $or: [
            { group: groupObjectId },
            { referenceGroupIds: { $in: [groupObjectId] } },
          ],
        },
      ],
    };

    // merge search filter instead of overwriting
    if (searchFilter) {
      const regex = new RegExp(searchFilter, "i");
      projectWhereCondition.$and.push({
        $or: [
          { title: { $regex: regex } },
          { description: { $regex: regex } },
          { tag: { $regex: regex } },
        ],
      });
    }

    // if (stageId && stageId !== "ALL" && stageId !== "null") {
    //   projectWhereCondition.projectStageId = stageId;
    // }

    if (stageId && stageId !== "ALL" && stageId !== "null") {
      projectWhereCondition.$and.push({
        $or: [
          {
            group: groupObjectId,
            projectStageId: stageId,
          },
          {
            references: {
              $elemMatch: {
                groupId: groupObjectId,
                stageId: stageId,
              },
            },
          },
        ],
      });
    } else {
      // No stage filter: include all projects in the group or referenced in the group
      projectWhereCondition.$and.push({
        $or: [{ group: groupObjectId }, { referenceGroupIds: groupObjectId }],
      });
    }

    if (userId !== "ALL") {
      projectWhereCondition.projectUsers = { $in: [userId] };
    }

    if (startDateFilter) {
      projectWhereCondition.startdate = { $eq: new Date(startDateFilter) };
    }

    const totalCount = await Project.countDocuments(projectWhereCondition);
    const totalPages = Math.ceil(totalCount / limit);

    if (page >= totalPages && totalPages > 0) {
      return res.status(400).json({
        success: false,
        message: "Page number exceeds available pages.",
      });
    }

    // Set sorting condition based on due date or start date sorting
    let sortCondition;
    if (dueDate) {
      sortCondition = { enddate: dueDate === "asc" ? 1 : -1 };
    } else if (dateStartSort) {
      sortCondition = { startdate: dateStartSort === "asc" ? 1 : -1 };
    }

    // Fetch the projects based on the condition
    const iprojects = await Project.find(projectWhereCondition)
      .sort(sortCondition ? sortCondition : { createdOn: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const projectIds = iprojects.map((p) => p._id);
    const userIds = [
      ...new Set(iprojects.flatMap((p) => [...p.projectUsers, p.createdBy])),
    ];

    // Batch user fetch
    const userDocs = await User.find({ _id: { $in: userIds } })
      .select("name")
      .lean();
    const usersMap = new Map(userDocs.map((u) => [u._id.toString(), u.name]));

    // Batch task count
    const taskCounts = await Task.aggregate([
      { $match: { projectId: { $in: projectIds }, isDeleted: false } },
      { $group: { _id: "$projectId", count: { $sum: 1 } } },
    ]);
    const taskCountMap = new Map(
      taskCounts.map((tc) => [tc._id.toString(), tc.count])
    );

    // Batch favorites
    const favorites = await FavoriteProject.find({
      projectId: { $in: projectIds },
      userId,
    }).lean();
    const favoriteSet = new Set(favorites.map((f) => f.projectId.toString()));

    // Map the fetched projects with additional details
    // const projects = iprojects.map((p) => ({
    //   ...p,
    //   tasksCount: taskCountMap.get(p._id.toString()) || 0,
    //   isFavourite: favoriteSet.has(p._id.toString()),
    //   projectUsers: (p.projectUsers || []).map((uid) => {
    //     const user = usersMap.get(uid?.toString());
    //     return user || "Unknown"; // Fallback if null or undefined
    //   }),
    //   createdBy: usersMap.get(p.createdBy?.toString()) || "Unknown", // Fallback if null or undefined
    // }));

    const taskStageStats = await Task.aggregate([
      {
        $match: {
          isDeleted: false,
          projectId: { $in: projectIds },
        },
      },
      {
        $group: {
          _id: { projectId: "$projectId", status: "$status" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.projectId",
          total: { $sum: "$count" },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "completed"] }, "$count", 0],
            },
          },
          inprogress: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "inprogress"] }, "$count", 0],
            },
          },
          todo: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "todo"] }, "$count", 0],
            },
          },
          customStages: {
            $push: {
              $cond: [
                { $in: ["$_id.status", ["todo", "inprogress", "completed"]] },
                "$$REMOVE",
                { status: "$_id.status", count: "$count" },
              ],
            },
          },
        },
      },
    ]);

    const stageStatsMap = new Map();

    for (const stat of taskStageStats) {
      stageStatsMap.set(stat._id.toString(), {
        total: stat.total || 0,
        completed: stat.completed || 0,
        inProgress: stat.inprogress || 0,
        todo: stat.todo || 0,
        customStages: stat.customStages || [],
      });
    }

    const projects = iprojects.map((project) => {
      const projectId = project._id.toString();
      const stageData = stageStatsMap.get(projectId) || {
        total: 0,
        completed: 0,
        inProgress: 0,
        todo: 0,
        customStages: [],
      };

      const { total, completed, inProgress, todo, customStages } = stageData;

      return {
        ...project,
        tasksCount: total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        stageBreakdown: stageData,
        isFavourite: favoriteSet.has(projectId),
        todo,
        inProgress,
        completed,
        customStages,
        projectUsers: (project.projectUsers || []).map(
          (uid) => usersMap.get(uid?.toString()) || "Unknown"
        ),
        createdBy: usersMap.get(project.createdBy?.toString()) || "Unknown",
      };
    });

    return res.json({
      success: true,
      projects,
      totalCount,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Error fetching kanban projects by group",
    });
  }
};

exports.updateStage = async (req, res) => {
  try {
    const { projectId, newStageId, status } = req.body;

    const project = await Project.findByIdAndUpdate(
      projectId,
      {
        projectStageId: newStageId,
        modifiedOn: new Date(),
        status: status,
      },
      { new: true }
    );

    const eventType = "PROJECT_STAGE_CHANGED";
    const notification = await handleNotifications(project, eventType);

    const auditTaskAndSendMail = async (newTask, emailOwner, email) => {
      try {
        let updatedDescription = newTask.description
          .split("\n")
          .join("<br/> &nbsp; &nbsp; &nbsp; &nbsp; ");
        // let emailText = config.projectEmailCreateContent
        //   .replace("#title#", newTask.title)
        //   .replace("#description#", updatedDescription)
        //   .replace("#projectName#", newTask.title)
        //   .replace("#status#", newTask.status)
        //   .replace("#projectId#", newTask._id)
        // .replace("#priority#", newTask.priority.toUpperCase())
        // .replace("#newTaskId#", newTask._id);

        let emailText = `
        Hi, <br/><br/>
        project stage has been <strong>changed</strong>. <br/><br/>
        <strong>Project:</strong> ${newTask.title} <br/>
        <strong>Description:</strong><br/> &nbsp;&nbsp;&nbsp;&nbsp; ${updatedDescription} <br/><br/>
        <strong>Stage Changed:</strong> ${newTask.status} <br/>
        To view project details, click 
        <a href="${process.env.URL}tasks/${newTask._id}/kanban/stage" target="_blank">here</a>. <br/><br/>
        Thanks, <br/>
        The proPeak Team
      `;

        let taskEmailLink = config.taskEmailLink.replace(
          "#projectId#",
          newTask._id
        );
        // .replace("#newTaskId#", newTask._id);

        if (email !== "XX") {
          var mailOptions = {
            from: config.from,
            to: email,
            // cc: emailOwner,
            subject: ` PROJECT_STAGE_CHANGED - ${newTask.title}`,
            html: emailText,
          };

          // console.log(mailOptions, "from mailOptions")

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
              // addMyNotification(taskArr);
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
          await auditTaskAndSendMail(project, [], email);
        }
      }
    }

    return res.json({ success: true });
  } catch (error) {
    return res.json({ success: false });
  }
};

exports.getProjectsCalendar = async (req, res) => {
  try {
    const { companyId, calenderView, date, groupId } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to fetch projects for the calendar",
      });
    }

    const referenceDate = date ? new Date(date) : new Date();
    if (isNaN(referenceDate)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid date format. Please provide a valid date.",
      });
    }

    let dateRange = {};
    if (calenderView === "month") {
      dateRange = {
        startdate: { $gte: startOfMonth(referenceDate) },
        enddate: { $lte: endOfMonth(referenceDate) },
      };
    } else if (calenderView === "week") {
      dateRange = {
        startdate: { $gte: startOfWeek(referenceDate) },
        enddate: { $lte: endOfWeek(referenceDate) },
      };
    } else if (calenderView === "day") {
      dateRange = {
        startdate: { $gte: startOfDay(referenceDate) },
        enddate: { $lte: endOfDay(referenceDate) },
      };
    }

    const condition = {
      companyId,
      isDeleted: false,
      startdate: { $exists: true, $ne: null },
      enddate: { $exists: true, $ne: null },
      ...dateRange,
    };

    if (groupId) {
      condition.group = groupId;
    }

    const projects = await Project.find(condition).lean();
    const totalCount = await Project.countDocuments(condition);

    const calendarEvents = projects.map((project) => ({
      id: project._id,
      title: project.title,
      start: project.startdate,
      end: project.enddate,
      status: project.status || "No Status",
    }));

    res.json({
      success: true,
      totalCount,
      data: calendarEvents,
    });
  } catch (error) {
    console.error("Error in getProjectsCalendar:", error);
    res.status(500).json({
      success: false,
      msg: "Server error occurred while retrieving project calendar data",
      error: error.message,
    });
  }
};

exports.allProjects = async (req, res) => {
  try {
    const { companyId, pagination } = req.body;
    const page = parseInt(pagination?.page) || 1;
    const limit = parseInt(pagination?.limit) || 10;
    const skip = (page - 1) * limit;

    const [allprojects, totalCount] = await Promise.all([
      Project.find({ companyId, isDeleted: false })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Project.countDocuments({ companyId, isDeleted: false }),
    ]);

    return res.json({
      success: true,
      allprojects,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.allProjectsForGroup = async (req, res) => {
  try {
    const {
      companyId,
      groupId,
      pagination = { page: 1, limit: 10 },
    } = req.body;

    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    const condition = {
      companyId,
      isDeleted: false,
      group: groupId,
    };

    const allprojects = await Project.find(condition)
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      allprojects,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: "Server error occurred while retrieving projects",
      error: error.message,
    });
  }
};

exports.getProjectTableForGroup = async (req, res) => {
  try {
    const {
      companyId,
      pagination = { page: 1, limit: 10 },
      filters = [],
      searchFilter,
      sort,
      dateSort,
      dueDateSort,
      startDate,
      groupId,
      archive,
    } = req.body;
    // console.log(pagination, "from pagination");
    let sortOption = {};

    if (sort === "titleAsc") {
      sortOption = { title: 1 };
    } else if (sort === "titleDesc") {
      sortOption = { title: -1 };
    }

    if (dateSort === "asc") {
      sortOption = { startdate: 1 };
    } else if (dateSort === "desc") {
      sortOption = { startdate: -1 };
    }

    if (dueDateSort === "asc") {
      sortOption = { enddate: 1 };
    } else if (dueDateSort === "desc") {
      sortOption = { enddate: -1 };
    }

    if (!sort && !dateSort && !dueDateSort) {
      sortOption = { createdOn: 1 };
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to fetch tasks",
      });
    }

    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    // // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid company ID format." });
    }
    if (groupId && !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid group ID format.",
      });
    }

    // Base condition for fetching tasks
    // let condition = {
    //   companyId: new mongoose.Types.ObjectId(companyId),
    //   isDeleted: false,
    //   group: new mongoose.Types.ObjectId(groupId),
    //   archive: false,
    // };
    let condition = {
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false,
      archive,
    };

    // if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
    //   condition.group = new mongoose.Types.ObjectId(groupId);
    // }

    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      condition.$or = [
        { group: new mongoose.Types.ObjectId(groupId) },
        { referenceGroupIds: new mongoose.Types.ObjectId(groupId) },
      ];
    }

    // Apply search filter if provided
    if (searchFilter) {
      const regex = new RegExp(searchFilter, "i");
      condition.title = { $regex: regex };
    }

    if (startDate && !isNaN(new Date(startDate))) {
      const start = new Date(startDate);
      const end = new Date(startDate);
      end.setDate(end.getDate() + 1);

      condition.startdate = {
        $gte: start,
        $lt: end,
      };
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

        if (field === "userid") {
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
    const totalCount = await Project.countDocuments(condition);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch tasks with pagination and filtering
    const projects = await Project.find(condition)
      .skip(skip)
      .limit(limit)
      .populate("userid", "name")
      .populate({
        path: "group",
        select: "name",
        match: { _id: { $exists: true } },
      })
      .populate("projectTypeId", "projectType")
      .populate({
        path: "projectUsers",
        select: "name",
      })
      .populate({
        path: "notifyUsers",
        select: "name",
      })
      .populate({
        path: "userGroups",
        select: "groupName",
      })
      .sort(sortOption)
      .lean();

    res.json({
      success: true,
      data: projects,
      totalCount,
      page,
      totalPages,
      filters,
      searchFilter,
    });
  } catch (error) {
    console.error("Error in getProjectTableForGroup:", error);
    res.status(500).json({
      success: false,
      msg: "Server error occurred while retrieving tasks",
      error: error.message,
    });
  }
};

exports.getProjectTable = async (req, res) => {
  try {
    const {
      companyId,
      pagination = { page: 1, limit: 10 },
      filters = [],
      searchFilter,
      sort,
      dateSort,
      dueDateSort,
      startDate,
      archive,
    } = req.body;
    // console.log(pagination, "from pagination");
    let sortOption = {};

    console.log(searchFilter, "from searchfilter");

    if (sort === "titleAsc") {
      sortOption = { title: 1 };
    } else if (sort === "titleDesc") {
      sortOption = { title: -1 };
    }

    if (dateSort === "asc") {
      sortOption = { startdate: 1 };
    } else if (dateSort === "desc") {
      sortOption = { startdate: -1 };
    }

    if (dueDateSort === "asc") {
      sortOption = { enddate: 1 };
    } else if (dueDateSort === "desc") {
      sortOption = { enddate: -1 };
    }

    if (!sort && !dateSort && !dueDateSort) {
      sortOption = { createdOn: 1 };
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to fetch tasks",
      });
    }

    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid company ID format." });
    }

    // Base condition for fetching tasks
    let condition = {
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false,
      archive,
    };

    // Apply search filter if provided
    if (searchFilter) {
      const regex = new RegExp(searchFilter, "i");
      condition.title = { $regex: regex };
    }

    if (startDate && !isNaN(new Date(startDate))) {
      const start = new Date(startDate);
      const end = new Date(startDate);
      end.setDate(end.getDate() + 1);

      condition.startdate = {
        $gte: start,
        $lt: end,
      };
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

        if (field === "userid") {
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
    const totalCount = await Project.countDocuments(condition);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch tasks with pagination and filtering
    const projects = await Project.find(condition)
      .skip(skip)
      .limit(limit)
      .populate("userid", "name")
      .populate({
        path: "group",
        select: "name",
        match: { _id: { $exists: true } }, // skip invalid _id
      })
      .populate("projectTypeId", "projectType")
      .populate({
        path: "projectUsers",
        select: "name",
      })
      .populate({
        path: "notifyUsers",
        select: "name",
      })
      .populate({
        path: "userGroups",
        select: "groupName",
      })
      .sort(sortOption)
      .lean();

    console.log(projects, "from search Filter");

    res.json({
      success: true,
      data: projects,
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

exports.deleteSelectedProjects = async (req, res) => {
  const { projectIds, modifiedBy } = req.body;
  // Validate input
  if (!Array.isArray(projectIds) || projectIds.length === 0 || !modifiedBy) {
    return res.status(400).json({
      success: false,
      msg: "projectIds and modifiedBy must be provided and valid.",
    });
  }

  // Validate that projectIds are valid ObjectIds
  if (projectIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return res.status(400).json({
      success: false,
      msg: "Invalid taskIds format.",
    });
  }

  try {
    // Step 1: Fetch the tasks to be deleted
    const projectToDelete = await Project.find({ _id: { $in: projectIds } });
    // const fileIds = tasksToDelete.flatMap(task => task.uploadFiles.map(file => file.id));
    // const fileNames = tasksToDelete.flatMap((task) =>
    //   task.uploadFiles.map((file) => file.fileName)
    // );

    if (!projectToDelete || projectToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        msg: "No tasks found to delete.",
      });
    }

    // Step 2: Delete tasks
    const deletedProjects = await Project.updateMany(
      { _id: { $in: projectIds } },
      { $set: { isDeleted: true } }
    );

    // const deleteFile = await UploadFile.find({ fileName: { $in: fileNames } });

    // const uploadFileIds = deleteFile.map(file => file._id);

    // if (deleteFile)
    //   if (fileNames.length > 0) {
    //     await UploadFile.updateMany(
    //       { fileName: { $in: fileNames } },
    //       { $set: { isDeleted: true } }
    //     );
    //   }

    if (deletedProjects.deletedCount === 0) {
      return res.status(500).json({
        success: false,
        msg: "Failed to delete projects.",
      });
    }

    // // Step 3: Log the deletion of each task (if needed)
    // tasksToDelete.forEach((task) => {
    //   // Assuming you want to log the task deletion (optional)
    //   audit.insertAuditLog("", "Task", "deleted", task._id, modifiedBy);
    // });

    // Step 4: Send a success response
    res.json({
      success: true,
      msg: "Tasks deleted successfully!",
      deletedProjectsIds: projectIds,
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

exports.getGroupIdOfProject = async (req, res) => {
  const { projectId } = req.params;

  // Step 1: Validate projectId
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({
      success: false,
      msg: "Invalid or missing projectId.",
    });
  }

  try {
    // Step 2: Fetch the project and select only group field
    const project = await Project.findById(projectId).select("group");

    if (!project) {
      return res.status(404).json({
        success: false,
        msg: "Project not found.",
      });
    }

    if (!project.group) {
      return res.status(404).json({
        success: false,
        msg: "Group ID not found in this project.",
      });
    }

    // Step 3: Send response
    res.status(200).json({
      success: true,
      msg: "Group ID fetched successfully.",
      groupId: project.group.toString(),
    });
  } catch (err) {
    console.error("Error fetching groupId:", err);
    res.status(500).json({
      success: false,
      msg: "Failed to fetch groupId of project.",
      error: err.message,
    });
  }
};

exports.allProjectsExhibition = async (req, res) => {
  try {
    const { companyId, pagination = { page: 1, limit: 10 } } = req.body;

    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    const condition = {
      companyId,
      isDeleted: false,
      projectType: "Exhibition",
    };

    const allProjectsExhibition = await Project.find(condition)
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      allProjectsExhibition,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: "Server error occurred while retrieving projects",
      error: error.message,
    });
  }
};

exports.getProjectExhibitionTable = async (req, res) => {
  try {
    const {
      companyId,
      pagination = { page: 1, limit: 10 },
      filters = [],
      searchFilter,
      sort,
      dateSort,
      dueDateSort,
      startDate,
      archive,
    } = req.body;
    // console.log(pagination, "from pagination");
    let sortOption = {};

    if (sort === "titleAsc") {
      sortOption = { title: 1 };
    } else if (sort === "titleDesc") {
      sortOption = { title: -1 };
    }

    if (dateSort === "asc") {
      sortOption = { startdate: 1 };
    } else if (dateSort === "desc") {
      sortOption = { startdate: -1 };
    }

    if (dueDateSort === "asc") {
      sortOption = { enddate: 1 };
    } else if (dueDateSort === "desc") {
      sortOption = { enddate: -1 };
    }

    if (!sort && !dateSort && !dueDateSort) {
      sortOption = { createdOn: 1 };
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to fetch tasks",
      });
    }

    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid company ID format." });
    }

    // Base condition for fetching tasks
    let condition = {
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false,
      projectType: "Exhibition",
      archive,
    };

    // Apply search filter if provided
    if (searchFilter) {
      const regex = new RegExp(searchFilter, "i");
      condition.title = { $regex: regex };
    }

    if (startDate && !isNaN(new Date(startDate))) {
      const start = new Date(startDate);
      const end = new Date(startDate);
      end.setDate(end.getDate() + 1);

      condition.startdate = {
        $gte: start,
        $lt: end,
      };
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

        if (field === "userid") {
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
    const totalCount = await Project.countDocuments(condition);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch tasks with pagination and filtering
    const projects = await Project.find(condition)
      .skip(skip)
      .limit(limit)
      .populate("userid", "name")
      .populate({
        path: "group",
        select: "name",
        match: { _id: { $exists: true } }, // skip invalid _id
      })
      .populate("projectTypeId", "projectType")
      .populate({
        path: "projectUsers",
        select: "name",
      })
      .populate({
        path: "notifyUsers",
        select: "name",
      })
      .populate({
        path: "userGroups",
        select: "groupName",
      })
      .sort(sortOption)
      .lean();

    res.json({
      success: true,
      data: projects,
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

exports.selectedDeleteExhibition = async (req, res) => {
  const { projectIds, modifiedBy } = req.body;
  // Validate input
  if (!Array.isArray(projectIds) || projectIds.length === 0 || !modifiedBy) {
    return res.status(400).json({
      success: false,
      msg: "projectIds and modifiedBy must be provided and valid.",
    });
  }

  // Validate that projectIds are valid ObjectIds
  if (projectIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return res.status(400).json({
      success: false,
      msg: "Invalid taskIds format.",
    });
  }

  try {
    // Step 1: Fetch the tasks to be deleted
    const projectToDelete = await Project.find({ _id: { $in: projectIds } });
    // const fileIds = tasksToDelete.flatMap(task => task.uploadFiles.map(file => file.id));
    // const fileNames = tasksToDelete.flatMap((task) =>
    //   task.uploadFiles.map((file) => file.fileName)
    // );

    if (!projectToDelete || projectToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        msg: "No tasks found to delete.",
      });
    }

    // Step 2: Delete tasks
    const deletedProjects = await Project.updateMany(
      { _id: { $in: projectIds } },
      { $set: { isDeleted: true } }
    );

    // const deleteFile = await UploadFile.find({ fileName: { $in: fileNames } });

    // const uploadFileIds = deleteFile.map(file => file._id);

    // if (deleteFile)
    //   if (fileNames.length > 0) {
    //     await UploadFile.updateMany(
    //       { fileName: { $in: fileNames } },
    //       { $set: { isDeleted: true } }
    //     );
    //   }

    if (deletedProjects.deletedCount === 0) {
      return res.status(500).json({
        success: false,
        msg: "Failed to delete projects.",
      });
    }

    // // Step 3: Log the deletion of each task (if needed)
    // tasksToDelete.forEach((task) => {
    //   // Assuming you want to log the task deletion (optional)
    //   audit.insertAuditLog("", "Task", "deleted", task._id, modifiedBy);
    // });

    // Step 4: Send a success response
    res.json({
      success: true,
      msg: "Tasks deleted successfully!",
      deletedProjectsIds: projectIds,
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

exports.getProjectsExhibitionCalendar = async (req, res) => {
  try {
    const { companyId, calenderView, date } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to fetch projects for the calendar",
      });
    }

    const referenceDate = date ? new Date(date) : new Date();
    if (isNaN(referenceDate)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid date format. Please provide a valid date.",
      });
    }

    let dateRange = {};
    if (calenderView === "month") {
      dateRange = {
        startdate: { $gte: startOfMonth(referenceDate) },
        enddate: { $lte: endOfMonth(referenceDate) },
      };
    } else if (calenderView === "week") {
      dateRange = {
        startdate: { $gte: startOfWeek(referenceDate) },
        enddate: { $lte: endOfWeek(referenceDate) },
      };
    } else if (calenderView === "day") {
      dateRange = {
        startdate: { $gte: startOfDay(referenceDate) },
        enddate: { $lte: endOfDay(referenceDate) },
      };
    }

    const condition = {
      companyId,
      isDeleted: false,
      projectType: "Exhibition",
      startdate: { $exists: true, $ne: null },
      enddate: { $exists: true, $ne: null },
      ...dateRange,
    };

    const projects = await Project.find(condition).lean();
    const totalCount = await Project.countDocuments(condition);

    const calendarEvents = projects.map((project) => ({
      id: project._id,
      title: project.title,
      start: project.startdate,
      end: project.enddate,
      status: project.status || "No Status",
    }));

    res.json({
      success: true,
      data: calendarEvents,
      totalCount,
    });
  } catch (error) {
    console.error("Error in getProjectsCalendar:", error);
    res.status(500).json({
      success: false,
      msg: "Server error occurred while retrieving project calendar data",
      error: error.message,
    });
  }
};

exports.moveOrReference = async (req, res) => {
  const { projectIds, targetGroupId, targetStageId, action, modifiedBy } =
    req.body;

  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No projects selected." });
  }
  if (!targetGroupId) {
    return res
      .status(400)
      .json({ success: false, message: "Target group is required." });
  }
  if (!["move", "reference"].includes(action)) {
    return res.status(400).json({ success: false, message: "Invalid action." });
  }

  try {
    if (action === "move") {
      // ✅ Replace main group
      await Project.updateMany(
        { _id: { $in: projectIds } },
        {
          $set: {
            group: targetGroupId,
            ...(targetStageId ? { projectStageId: targetStageId } : {}),
            modifiedBy,
            modifiedOn: new Date(),
          },
        }
      );
    } else if (action === "reference") {
      // ✅ Add reference without overwriting the project's stage
      await Project.updateMany(
        { _id: { $in: projectIds } },
        {
          $addToSet: {
            referenceGroupIds: targetGroupId,
            references: { groupId: targetGroupId, stageId: targetStageId },
          },
          $set: {
            modifiedBy,
            modifiedOn: new Date(),
          },
        }
      );
      // // ✅ Add to referenceGroupIds (no duplicates)
      // await Project.updateMany(
      //   { _id: { $in: projectIds } },
      //   {
      //     $addToSet: { referenceGroupIds: targetGroupId },
      //     $set: {
      //       ...(targetStageId ? { projectStageId: targetStageId } : {}),
      //       modifiedBy,
      //       modifiedOn: new Date(),
      //     },
      //   }
      // );
    }

    return res.json({
      success: true,
      message: "Projects updated successfully",
    });
  } catch (err) {
    console.error("Error in moveOrReference:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
