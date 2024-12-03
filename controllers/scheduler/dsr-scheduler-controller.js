const mongoose = require('mongoose');
const Project = require('../../models/project/project-model');
const User = require('../../models/user/user-model');
const { logError, logInfo } = require('../../common/logger');
const dateUtil = require('../../utils/date-util');
const config = require("../../config/config");
const emailLog = require('../email-log/email-log-controller');
//const Holiday = require("../../models/leave/holiday-model");
var users = [];
let projectTasks = [];


exports.getDsrData = ((req, res) => {
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
            users = result;   
                getUser(users);                      

            //getUser(users);
        })

    let getUser = (users1) => {
        try {
            var data = [];
            Project.find({
                isDeleted: false,
                status: 'inprogress'
            }, {
                    title: 1,
                    _id: 1,
                    notifyUsers: 1,
                    "tasks.title": 1,
                    "tasks.status": 1,
                    "tasks.userId": 1,
                    "tasks.description": 1,
                    "tasks.subtasks": 1,
                    "tasks._id": 1,
                    "tasks.isDeleted": 1,
                    "tasks.completed": 1,
                    "tasks.category": 1,
                    "tasks.modifiedOn": 1,
                    "tasks.endDate": 1,
                    "tasks.messages": 1,
                    "tasks.storyPoint": 1,
                    "tasks.dateOfCompletion": 1
                })
                .then((result) => {

                    for (let i = 0; i < result.length; i++) {

                        let tasks = result[i].tasks.filter((t) => {

                            let date = dateUtil.DateToString(new Date());

                            let modifiedDate = dateUtil.DateToString(t.modifiedOn);

                            if ((t.userId !== undefined && t.userId !== null && t.userId !== '' && t.endDate !== null && t.endDate !== undefined)) {

                                return (t.isDeleted === false && ((t.status === "completed" && modifiedDate === date) ||
                                    t.status === "inprogress" || (t.status === "new" && dateUtil.DateToString(t.endDate) <= date)))
                            }
                        });

                        let taskS = [];
                        if (tasks.length > 0) {

                            for (let j = 0; j < tasks.length; j++) {
                                let completedSubtasks = [];

                                if (tasks[j].status === "inprogress") {
                                    completedSubtasks = (tasks[j].subtasks.length > 0) && tasks[j].subtasks.filter((s) => {
                                        return s.completed === true;
                                    })
                                } else {
                                    completedSubtasks = (tasks[j].subtasks.length > 0) && tasks[j].subtasks;
                                }

                                let subtaskTitle = [];
                                if (completedSubtasks.length > 0) {
                                    for (let i = 0; i < completedSubtasks.length; i++) {
                                        subtaskTitle.push(completedSubtasks[i].title);
                                    }
                                }
                                let endDate = dateUtil.DateToString(tasks[j].endDate);
                                var days = config.daysForMessageMail;
                                var date = new Date();
                                var last = new Date(date.getTime() - (days * 24 * 60 * 60 * 1000));
                                let messagesFromDate = dateUtil.DateToString(last);
                                let currentDate = dateUtil.DateToString(new Date());

                                let filteredMessages = tasks[j].messages.filter((m) => {
                                    let createdOn = dateUtil.DateToString(m.createdOn);
                                    return ((createdOn > messagesFromDate) || createdOn === currentDate);
                                })

                                let messages = (filteredMessages.length > 0) && filteredMessages.map((f) => {
                                    let user = users1.filter((u) => {
                                        return u._id.toString() === f.createdBy;
                                    })
                                    let message = {
                                        title: f.title,
                                        createdOn: dateUtil.DateToString(f.createdOn),
                                        createdBy: (user.length > 0) ? user[0].name : ""
                                    }
                                    return message;
                                })

                                let taskDetails = {
                                    title: tasks[j].title,
                                    description: tasks[j].description,
                                    userId: tasks[j].userId,
                                    status: tasks[j].status,
                                    storyPoint: tasks[j].storyPoint,
                                    endDate: tasks[j].endDate ? endDate : "",
                                    subtasks: (subtaskTitle.length > 0) ? subtaskTitle : [],
                                    messages: (messages.length > 0) ? messages : [],
                                    dateOfCompletion: tasks[j].dateOfCompletion ? tasks[j].dateOfCompletion : ""
                                }


                                taskS.push(taskDetails);
                            }
                        }

                        let ownerEmails = result[i].notifyUsers && result[i].notifyUsers.map((m) => {
                            return m.emailId;
                        })

                        if (taskS.length > 0) {
                            let dataObject = {
                                projectTitle: result[i].title,
                                projectId: result[i]._id,
                                ownerEmail: ownerEmails,
                                taskDetails: taskS
                            }

                            data.push(dataObject);
                        }


                    }

                    logInfo(users1, "getDsrData users");
                    logInfo(data, "getDsrData data");

                    res.json({
                        users: users1,
                        data: data
                    });
                });

        } catch (e) {
            logError(e, "getDsrData err")
        }
    }
})

exports.updateEmailLog = ((req, res) => {
    logInfo(req.body, "updateEmailLog req.body");
    emailLog.insertEmailLog(req.body.to, req.body.cc, req.body.subject, req.body.html);
    res.json({
        msg: "Email Log Saved Successfully"
    })
})