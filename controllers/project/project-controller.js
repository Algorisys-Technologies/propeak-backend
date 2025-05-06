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
const { request } = require("express");
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
const sendNotification = require("../../utils/send-notification");

exports.getAuditLog = (req, res) => {
  // let userRole = req.userInfo.userRole.toLowerCase();
  // let accessCheck = access.checkEntitlements(userRole);
  // let userAccess = req.userInfo.userAccess;
  // viewAuditLog = accessConfig.validateEntitlements(
  //   userAccess,
  //   req.body.id,
  //   "Audit Report",
  //   "view",
  //   userRole
  // );
  // if (accessCheck === false && !viewAuditLog) {
  //   res.json({ err: errors.NOT_AUTHORIZED });
  //   return;
  // }
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
  }).then(
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
  let userName = req.body.userName;
  const { title, companyId, status, taskStages, group } = req.body;
  const existingProject = await Project.findOne({ title, companyId });
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

  let newProject = new Project({
    _id: req.body._id,
    title: req.body.title,
    description: req.body.description,
    startdate: req.body.startdate,
    enddate: req.body.enddate,
    projectStageId: req.body.projectStageId,
    status: req.body.status,
    taskStages: req.body.taskStages?.map((taskStageTitle) => taskStageTitle),
    notifyUsers: req.body.notifyUsers?.map((userId) => userId),
    projectUsers: req.body.projectUsers?.map((userId) => userId),
    tag: req.body.tag,
    userid: req.body.userid,
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
  await sendNotification(newProject, eventType);

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
  logInfo(req.body, "req.body in update fields");
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
  });
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
    if (!companyId) {
      return res.status(400).json({
        message: "Company ID is required.",
      });
    }
    const projects = await Project.find({
      companyId: companyId,
      isDeleted: false,
    });
    if (projects.length === 0) {
      return res.status(404).json({
        message: "No projects found for the given company.",
      });
    }

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
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID is required." });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const newArchiveStatus = !project.archive;

    await Project.findByIdAndUpdate(
      projectId,
      { $set: { archive: newArchiveStatus } },
      { new: true }
    );

    const eventType = "PROJECT_ARCHIVED";
    console.log(project, "from project archived")
    const notificationResult = await sendNotification(project, eventType);

    console.log("Notification sent:", notificationResult);

    return res.status(200).json({
      success: true,
      message: `Project has been ${newArchiveStatus ? "archived" : "unarchived"}.`,
    });
  } catch (e) {
    console.error("Error archiving project:", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Internal server error",
    });
  }
};

// exports.archiveProject = async (req, res) => {
//   try {
//     logInfo(req.body, "archiveProject req.body");
//     const projectId = req.body.projectId;
//     const isArchived = (
//       await Project.findOne({
//         _id: projectId,
//       })
//     ).archive;

//     if (isArchived) {
//       await Project.findOneAndUpdate(
//         {
//           _id: projectId,
//         },
//         {
//           $set: {
//             archive: false,
//           },
//         }
//       );
//     } else {
//       await Project.findOneAndUpdate(
//         {
//           _id: projectId,
//         },
//         {
//           $set: {
//             archive: true,
//           },
//         }
//       );
//     }
//     return res.json({ success: true, message: "toggle archive" });
//   } catch (e) {
//     return res.json({ success: false, message: e });
//   }
// };

// customfields for tasks for specific projects

// POST request handler to add a custom field
exports.addCustomTaskField = async (req, res) => {
  try {
    const { key, label, type, projectId, groupId, level, isMandatory } =
      req.body;
    if (!projectId && !groupId) {
      return res
        .status(400)
        .json({ message: "Either projectId or groupId is required" });
    }
    if (!key || !label || !type || !level) {
      return res.status(400).json({ message: "Missing required fields" });
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
      groupId,
      level,
      isMandatory,
      isDeleted: false,
    });

    // Save the custom field
    await newField.save();

    res
      .status(201)
      .json({ message: "Custom field created successfully", data: newField });
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
    const { key, label, type, level, isMandatory } = req.body;
    const customFieldId = req.params.customFieldId;

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
        return res.status(409).json({ message: "Key already exists" });
      }
    }

    // Update the existing field data
    existingField.key = key;
    existingField.label = label;
    existingField.type = type;
    existingField.level = level;
    existingField.isMandatory = isMandatory;

    // Save the updated field
    await existingField.save();

    res.status(200).json({
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

    res.status(200).json({ message: "Custom field deleted successfully" });
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
    const projects = await Project.find({
      isDeleted: false,
      companyId: req.params.companyId,
    });

    const result = await Project.aggregate([
      {
        $match: {
          isDeleted: false,
          companyId: req.params.companyId,
        },
      },
      {
        $project: {
          projectUsers: 1,
        },
      },
      {
        $unwind: "$projectUsers",
      },
      {
        $match: {
          projectUsers: { $ne: null }, // Remove nulls
        },
      },
      {
        $group: {
          _id: "$projectUsers",
        },
      },
      {
        $count: "uniqueProjectUsersCount",
      },
    ]);
    return res.json({
      success: true,
      projects: projects,
      projectMembers: result[0]?.uniqueProjectUsersCount,
    });
  } catch (e) {
    return res.json({
      success: false,
      message: e.message,
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

        let iprojects = await Project.find(projectWhereCondition).limit(10);
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

exports.getKanbanProjectsData = async (req, res) => {
  try {
    let page = parseInt(req.query.page || "0");
    const limit = 10;
    const skip = page * limit;
    const { stageId, companyId, userId, archive } = req.body;
    if (!stageId || stageId === "null" || stageId === "ALL") {
      return res.status(400).json({
        success: false,
        message: "stageId is required and cannot be ALL or null.",
      });
    }

    // Project query filter
    const projectWhereCondition = {
      projectStageId: stageId || "673202ee15c8e180c21e9ad7",
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      companyId,
      archive: archive || false,
      projectType: { $ne: "Exhibition" },
    };
    if (userId !== "ALL") {
      projectWhereCondition.projectUsers = { $in: [userId] };
    }

    const totalCount = await Project.countDocuments(projectWhereCondition);
    const totalPages = Math.ceil(totalCount / limit);
    if (page < 0 || page >= totalPages) {
      return res.status(400).json({
        success: false,
        message: "Invalid page number.",
      });
    }

    const iprojects = await Project.find(projectWhereCondition)
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);
    const projects = await Promise.all(
      iprojects.map(async (p) => {
        const users = await User.find({ _id: { $in: p.projectUsers } }).select(
          "name"
        );
        const createdByUser = await User.findById(p.createdBy).select("name");
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

    return res.json({
      success: true,
      projects,
      totalCount,
      totalPages,
    });
  } catch (error) {
    console.log(error);
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

        let iprojects = await Project.find(projectWhereCondition).limit(10);

        let projects = await Promise.all(
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
              userId: userId,
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
        return { ...stage.toObject(), projects };
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
exports.getKanbanExhibitionData = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "0", 10);
    const limit = 10;

    if (!Number.isInteger(page) || page < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid page number.",
      });
    }

    const { stageId, companyId, userId, archive } = req.body;

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
      archive: archive === true, // defaults to false if not true
      projectType: "Exhibition",
    };

    if (userId !== "ALL") {
      projectWhereCondition.projectUsers = { $in: [userId] };
    }

    const totalCount = await Project.countDocuments(projectWhereCondition);
    const totalPages = Math.ceil(totalCount / limit);

    if (page >= totalPages && totalPages > 0) {
      return res.status(400).json({
        success: false,
        message: "Page number exceeds available pages.",
      });
    }

    const projectsRaw = await Project.find(projectWhereCondition)
      .sort({ createdOn: -1 })
      .skip(page * limit)
      .limit(limit);

    const projects = await Promise.all(
      projectsRaw.map(async (p) => {
        const users = await User.find({ _id: { $in: p.projectUsers } }).select(
          "name"
        );
        const createdByUser = await User.findById(p.createdBy).select("name");
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
          createdBy: createdByUser?.name || "Unknown",
        };
      })
    );

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
      message: "Error fetching kanban projects",
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

    // Fetch all project stages for the given company
    const projectStages = await ProjectStage.find({
      companyId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ sequence: "asc" });

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

        let iprojects = await Project.find(projectWhereCondition).limit(10);

        let projects = await Promise.all(
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
              userId: userId,
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

        return { ...stage.toObject(), projects };
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

exports.getKanbanProjectsByGroup = async (req, res) => {
  try {
    let page = parseInt(req.query.page || "0");
    const limit = 10;
    const skip = page * limit;
    const { groupId, companyId, userId, archive, stageId } = req.body;
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

    const projectWhereCondition = {
      group: groupObjectId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      companyId,
      archive: archive || false,
      projectType: { $ne: "Exhibition" },
    };

    if (stageId && stageId !== "ALL" && stageId !== "null") {
      projectWhereCondition.projectStageId = stageId;
    }

    if (userId !== "ALL") {
      projectWhereCondition.projectUsers = { $in: [userId] };
    }

    const totalCount = await Project.countDocuments(projectWhereCondition);
    const totalPages = Math.ceil(totalCount / limit);
    if (page < 0 || page >= totalPages) {
      return res.status(400).json({
        success: false,
        message: "Invalid page number.",
      });
    }

    const iprojects = await Project.find(projectWhereCondition)
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);

    const projects = await Promise.all(
      iprojects.map(async (p) => {
        const users = await User.find({ _id: { $in: p.projectUsers } }).select(
          "name"
        );
        const createdByUser = await User.findById(p.createdBy).select("name");
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
      { _id: projectId },
      { projectStageId: newStageId, modifiedOn: new Date(), status: status }
    );

    const eventType = "STAGE_CHANGED";
    await sendNotification(project, eventType);

    return res.json({ success: true });
  } catch (error) {
    return res.json({ success: false });
  }
};
