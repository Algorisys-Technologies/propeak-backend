const mongoose = require('mongoose');
const Project = require('../../models/project/project-model');
const User = require('../../models/user/user-model');
const { logError, logInfo } = require('../../common/logger');
const dateUtil = require('../../utils/date-util');
const config = require("../../config/config");
const emailLog = require('../email-log/email-log-controller');
//const Holiday = require("../../models/leave/holiday-model");
var users = [];
// let projectTasks = [];


exports.getData = ((req, res) => {
    User.find({
        isDeleted: false,
        role: { $in: ['admin', 'owner'] }
    }, {
            _id: 1,
            email: 1,
            name: 1
        }, {
            lean: true
        })
        .then((result) => {
            // console.log("result in scheduler cotroller", result);
            users = result;
            Project.find({
                isDeleted: false
            }, {
                    title: 1,
                    _id: 1,
                    notifyUsers: 1,
                    "tasks.title": 1,
                    "tasks.status": 1,
                    "tasks.userId": 1,
                    "tasks._id": 1,
                    "tasks.isDeleted": 1,
                    "tasks.endDate": 1,
                    "tasks.dateOfCompletion": 1,
                    "tasks.priority": 1
                })
                .then(async (result1) => {
                    // console.log("result1", result1);

                    if (result1 && (result1.length > 0)) {
                        let userProject = {};
                        // console.log("users.length", users.length);
                        for (let i = 0; i < users.length; i++) {
                            // console.log("users[i]", users[i].name);
                            for (let j = 0; j < result1.length; j++) {
                                // console.log("result1[j]", result1[j].title);
                                let tasks = [];
                                let date = dateUtil.DateToString(new Date());
                                if (result1[j].tasks.length > 0) {
                                    // for (let l = 0; l < result1[j].tasks.length; l++) {
                                    //     console.log("result1[j].tasks endDate", result1[j].tasks[l].endDate);
                                    //     console.log("result1[j].title tasks", result1[j].title);
                                    //     result1[j].tasks[l].projectTitle = result1[j].title;
                                    //     console.log("result1[j].tasks[l]", result1[j].tasks[l]);
                                    //     let date = dateUtil.DateToString(new Date());
                                    //     let endDate = "";
                                    //     if (result1[j].tasks[l].endDate !== null && result1[j].tasks[l].endDate !== undefined) {
                                    //         endDate = dateUtil.DateToString(result1[j].tasks[l].endDate);
                                    //     }
                                    //     if (result1[j].tasks[l].isDeleted === false && endDate >= date) {

                                    //         tasks.push(result1[j].tasks[l]);
                                    //     }
                                    //     // if (result1[j].tasks[l].endDate < )

                                    // }

                                    tasks = result1[j].tasks.filter((task) => {
                                        // let task = Object.assign({}, t);

                                        // let date = dateUtil.DateToString(new Date());

                                        if (task.endDate !== null && task.endDate !== undefined && task.endDate !== '') {
                                            let endDate = "";
                                            endDate = dateUtil.DateToString(task.endDate);
                                            return task.isDeleted === false && task.status !== 'completed' && endDate < date
                                        }



                                    });

                                }

                                // console.log("tasks", tasks);

                                let filteredTasks = [];
                                if (tasks.length > 0) {
                                    // filteredTasks = tasks.map(async (t) => {
                                    for (let z = 0; z < tasks.length; z++) {

                                        let overdueDays = "";
                                        if (tasks[z].dateOfCompletion) {
                                            let completedDate = dateUtil.DateToString(tasks[z].dateOfCompletion);

                                            overdueDays = parseInt((new Date(completedDate) - new Date(tasks[z].endDate)) / (1000 * 60 * 60 * 24));

                                        } else {
                                            overdueDays = parseInt((new Date(date) - new Date(tasks[z].endDate)) / (1000 * 60 * 60 * 24));
                                        }

                                        // console.log("tasks[z].userId", tasks[z].userId);
                                        let user = '';
                                        if (tasks[z].userId) {
                                            let res = await User.findById(tasks[z].userId)
                                            if (res) {
                                                user = res.name;
                                            } else {
                                                // console.log("user not found");
                                            }
                                        }


                                        let taskObj = {
                                            projectName: result1[j].title,
                                            taskName: tasks[z].title,
                                            taskPriority: tasks[z].priority ? tasks[z].priority : "",
                                            taskDueDate: tasks[z].endDate ? dateUtil.DateToString(tasks[z].endDate) : "",
                                            noOfDaysOverdue: overdueDays,
                                            userName: user
                                        }
                                        filteredTasks.push(taskObj);

                                    }

                                }


                                if (result1[j].notifyUsers.length > 0) {
                                    // console.log("result1[j].notifyUsers.length", result1[j].notifyUsers.length);
                                    // console.log("result1[j].notifyUsers", result1[j].notifyUsers);
                                    for (let k = 0; k < result1[j].notifyUsers.length; k++) {
                                        // console.log("result1[j].notifyUsers[k].name", result1[j].notifyUsers[k].name);
                                        if (users[i]._id.toString() === result1[j].notifyUsers[k].userId) {
                                            // console.log("userProject[users[i].email]", userProject[users[i].email]);
                                            if (userProject[users[i].email]) {
                                                // console.log("in if filteredTasks", filteredTasks);
                                                if (filteredTasks.length > 0) {
                                                    userProject[users[i].email].push(filteredTasks);
                                                }
                                                // console.log("if userProjects", userProject);
                                            } else {
                                                // console.log("in else new key adding to obj filteredTasks", filteredTasks);
                                                if (filteredTasks.length > 0) {
                                                    userProject[users[i].email] = [filteredTasks];
                                                }
                                                // console.log(" else  userProject", userProject);
                                            }
                                            // console.log("out userProject", userProject);
                                        }
                                    }
                                }
                            }
                        }
                        // console.log("userProject", userProject);
                        res.json(userProject);
                    }

                })
                .catch((err) => {
                    logError("dailySummaryReportScheduler getData err", err);
                })

        })


})

// exports.updateEmailLog = ((req, res) => {
//     logInfo(req.body, "updateEmailLog req.body");
//     emailLog.insertEmailLog(req.body.to, req.body.cc, req.body.subject, req.body.html);
//     res.json({
//         msg: "Email Log Saved Successfully"
//     })
// })