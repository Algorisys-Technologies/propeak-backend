const Project = require('../models/project/project-model');
const User = require('../models/user/user-model');
const config = require('./../config/config');
const { ObjectId } = require('mongodb');
const {
    logError,
    logInfo
} = require('./logger');
try {
    const restrictCreation = (req, res, next) => {
        if (req.originalUrl === '/api/projects/addProject') {
            Project.find({
                // createdBy:req.userInfo.userId,
                isDeleted: false
            })
                .then((result) => {
                    if (result.length >= config.projectCreation && config.projectCreation !== 'unLimited') {
                        return res.json({
                            err: "you dont have access to create Project"
                        });
                    }
                    else {
                        next();
                    }
                })
                .catch((err) => {
                    logError(err, "Project Creation err");
                })
        }
        if (req.originalUrl === '/api/tasks/addTask') {
            let projectId = req.body.task.projectId;

            var projectCondition = {
                _id: new ObjectId(projectId)
            };

            Project.find(projectCondition)
                .then((result) => {
                    let taskCount = 0
                    if (result.length > 0) {
                        let tasks = []
                        if (result[0].tasks.length > 0)
                            for (let i = 0; i < result[0].tasks.length; i++) {
                                if (result[0].tasks[i].isDeleted === false) {
                                    //if(result[0].tasks[i].createdBy=== req.userInfo.userId){
                                    tasks.push(result[0].tasks[i])
                                }
                            }

                        taskCount = (tasks.length > 0) ? tasks.length : 0;
                    }

                    if (taskCount >= config.taskCreation && config.taskCreation !== 'unLimited') {
                        return res.json({
                            err: "you dont have access to create Task"
                        });
                    }
                    else {
                        next();
                    }
                })
                .catch((err) => {
                    logError(err, "Task Creation err");
                })

        }

        if (req.originalUrl === '/api/users/addUser') {
            User.find({ isDeleted: false })
                .then((result) => {
                    if (result.length >= config.userCreation && config.userCreation !== 'unLimited') {
                        return res.json({
                            err: "you dont have access to create User"
                        });
                    }
                    else {
                        next();
                    }
                })
                .catch((err) => {
                    logError(err, "User Creation err");
                })
        }
    }

    module.exports = restrictCreation;
}
catch (e) {
    console.log("error=", e);
}