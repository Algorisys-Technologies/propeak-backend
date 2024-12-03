const mongoose = require('mongoose');
const Project = require('../../models/project/project-model');
const User = require('../../models/user/user-model');
const Holiday = require("../../models/leave/holiday-model");
const dateUtil = require('../../utils/date-util')
const config = require("../../config/config");
const { logError, logInfo } = require('../../common/logger');

var users = [];
let projectTasks = [];

exports.getTaskStatusDataScheduler = ((req, res) => {
  try {
    User.find({
      isDeleted: false
    }, {
        _id: 1,
        email: 1,
        name: 1
      }, {
        lean: true
      })
      .then((result) => {
        //console.log("result in scheduler controller", result);
        users1 = result;

        let usersMap = {};
        for (let i = 0; i < users1.length; ++i) {
          if (!usersMap[users1[i]._id]) {
            usersMap[users1[i]._id] = users1[i];
          }
        }
        var projects = [];
        let dt = new Date();
        let dt1 = new Date();
        dt1.setUTCFullYear(dt.getFullYear()), dt1.setUTCMonth(dt.getMonth()), dt1.setUTCDate(dt.getDate());
        let projectFields = {
          $project: {
            _id: 1,
            title: 1,
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
            "tasks.completed": 1
          }
        };
        let taskCondition = {
          "tasks.completed": false,
          "tasks.status": {
            $ne: 'onHold'
          },
          $or: [{
            "tasks.startDate": dt1
          }, {
            "tasks.endDate": {
              '$lte': dt1
            }
          }],
          "tasks.isDeleted": false,
          $and: [{
            "tasks.userId": {
              $ne: undefined
            }
          }, {
            "tasks.userId": {
              $ne: null
            }
          }, {
            "tasks.userId": {
              $ne: ''
            }
          }]

        };
        let tasksUnwind = {
          $unwind: "$tasks"
        };
        let taskFilterCondition = {
          $match: taskCondition
        };
        let userCondition = {
          isDeleted: false
        };
        let statusCondition = {
          status: 'inprogress'
        };
        let projectCond = {
          $match: { $and: [userCondition, statusCondition] }
          // $match: userCondition
        };
        logInfo([projectCond, projectFields, tasksUnwind, taskFilterCondition], "getTaskStatusDataScheduler condition")
        Project.aggregate([projectCond, projectFields, tasksUnwind, taskFilterCondition])
          .then((result) => {
            // console.log("result",result);
            let usersTasks = {};

            for (let i = 0; i < result.length; ++i) {
              let u = {};
              let tasks = [];
              if (usersTasks[result[i].tasks.userId]) {

                let url = config.editlink + usersTasks[result[i].tasks.userId].projectId;
                let startDate = dateUtil.DateToString(result[i].tasks.startDate);
                let endDate = dateUtil.DateToString(result[i].tasks.endDate);

                var date = dateUtil.DateToString(new Date());
                let status = result[i].tasks.status;
                let completed = result[i].tasks.completed;
                if ((startDate < date) && (endDate > date) && !completed) {
                  status = 'Ongoing task';
                } else if ((startDate < date) && (endDate < date) && !completed) {
                  status = 'Incomplete task';
                } else if ((startDate === date) && completed) {
                  status = 'Todays task completed';
                } else if ((startDate === date) && !completed) {
                  status = 'Todays task';
                }
                let task = {
                  _id: result[i].tasks._id,
                  projectTitle: result[i].title,
                  title: '<a href=' + url + '>' + result[i].tasks.title + '</a>',
                  description: result[i].tasks.description,
                  status: status,
                  startDate: startDate,
                  endDate: endDate
                }
                usersTasks[result[i].tasks.userId].tasks.push(task);

              } else {
                u.projectId = result[i]._id;

                let userId = result[i].tasks.userId;
                let user = usersMap[userId];
                u.email = (user) ? user.email : '';
                u.username = (user) ? user.name : '';

                let startDate = dateUtil.DateToString(result[i].tasks.startDate);
                let endDate = dateUtil.DateToString(result[i].tasks.endDate);

                var date = dateUtil.DateToString(new Date());
                let status = result[i].tasks.status;
                let completed = result[i].tasks.completed;
                if ((startDate < date) && (endDate > date) && !completed) {
                  status = 'Ongoing task';
                } else if ((startDate < date) && (endDate < date) && !completed) {
                  status = 'Incomplete task';
                } else if ((startDate === date) && completed) {
                  status = 'Todays task completed';
                } else if ((startDate === date) && !completed) {
                  status = 'Todays task';
                }

                let url = config.editlink + u.projectId;

                let task = {
                  _id: result[i].tasks._id,
                  projectTitle: result[i].title,
                  title: '<a href=' + url + '>' + result[i].tasks.title + '</a>',
                  description: result[i].tasks.description,
                  status: status,
                  startDate: startDate,
                  endDate: endDate
                }
                u.tasks = [task];
                usersTasks[result[i].tasks.userId] = u;
              }
            }
            res.json({
              projects: usersTasks
            });
          });
      })

  }
  catch (e) {
    // console.log("e",e);
  }
})

