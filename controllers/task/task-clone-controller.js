const mongoose = require('mongoose');
const Task = require('../../models/task/task-model');
const SubTask = require('../../models/sub-task/subtask-model');
const uuidv4 = require('uuid/v4');
const nodemailer = require('nodemailer');
const User = require('../../models/user/user-model');
const audit = require('../audit-log/audit-log-controller');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const secret = require('../../config/secret');
const config = require("../../config/config");
const Project = require('../../models/project/project-model');
const { logError, logInfo } = require('../../common/logger');
const errors = {
  TASK_DOESNT_EXIST: 'Task does not exist',
  ADD_CLONE_TASK_ERROR: 'Error occurred while adding the  Clone Task',
};
const objectId = require('../../common/common');

exports.taskClone = (async (req, res) => {

  try{
  logInfo(req.body, "taskClone");

  console.log("in taskclone");
  const task = await Task.findById(req.body.taskId)
  
      let taskId = objectId.mongoObjectId();
     var newTask = {
       _id: taskId,
        userId: task.userId,
        title: 'Clone of ' + task.title,
        description: task.description,
        completed: false,
        category: 'todo',
        taskStageId: task.taskStageId,
        projectId: task.projectId,
        tag: task.tag,
        status: 'new',
        storyPoint: task.storyPoint,
        startDate: task.startDate,
        endDate: task.endDate,
        depId: '',
        taskType: task.taskType,
        priority:task.priority,
        createdOn: new Date(),
        createdBy: task.createdBy,
        modifiedOn: new Date(),
        modifiedBy: task.modifiedBy,
        isDeleted: false,
        sequence:  1,
        subtasks: task.subtasks,
        messages: [],
        uploadFiles: [],
        companyId: task.companyId
      }

      await new Task(newTask).save()

      return res.json({success: true, message: "task cloned"})

    }catch(e){
      console.log(e)
      return res.json({success: false, message: "task cloned"})
    }

      
    })




