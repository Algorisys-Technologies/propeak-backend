const mongoose = require('mongoose');
const Project = require('../../models/project/project-model');
//const User = require('../../models/user/user-model');
//const Holiday = require("../../models/leave/holiday-model");
const dateUtil = require('../../utils/date-util')
const config = require("../../config/config");
const {
    logError,
    logInfo
} = require('../../common/logger');
const Burndown = require('../../models/burndown/burndown-model');


exports.getBurndownDataScheduler = ((req, res) => {
    try {
        let projectFields = {
            $project: {
                _id: 1,
                title: 1,
                "tasks.title": 1,
                "tasks.startDate": 1,
                "tasks.endDate": 1,
                "tasks.isDeleted": 1,
                "tasks.category": 1,
                "tasks.status": 1,
                "tasks.completed": 1,
                "tasks.storyPoint": 1
            }
        };
        let taskCondition = {
            "tasks.isDeleted": false,

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
            $match: {
                $and: [userCondition, statusCondition]
            }
        };
        let group = {
            $group: {
                _id: {
                    _id: '$_id',
                    category: '$tasks.category',
                },
                count: {
                    $sum: 1
                },
                
                storyPoint: {
                    $sum: '$tasks.storyPoint'
                },
            }
        };
        logInfo([projectCond, projectFields, taskFilterCondition, group], "getBurndownDataScheduler condition")
        Project.aggregate([projectCond, projectFields, tasksUnwind, taskFilterCondition, group])
            .then((result) => {
                // console.log("result", result);
                let burndownArray = []
                if (result.length > 0) {
                    let tasksByProjectId = {}
                    for (let i = 0; i < result.length; i++) {

                        let completedCount = 0;
                        let todoCount = 0;
                        let inprogressCount = 0;
                        let completedStoryPoint = 0;
                        let todoStoryPoint = 0;
                        let inprogressStoryPoint = 0;
                        
                        if (tasksByProjectId[result[i]._id._id]) {
                            let cat = result[i]._id.category;
                            tasksByProjectId[result[i]._id._id][cat] = result[i].count;
                            if (result[i]._id.category === 'completed') {

                                tasksByProjectId[result[i]._id._id].completedStoryPoint = result[i].storyPoint;
                            } else if (result[i]._id.category === 'todo') {

                                tasksByProjectId[result[i]._id._id].todoStoryPoint = result[i].storyPoint;
                            } else {

                                tasksByProjectId[result[i]._id._id].inprogressStoryPoint = result[i].storyPoint;
                            }

                        } else {
                            if (result[i]._id.category === 'completed') {
                                completedCount = result[i].count,
                                    completedStoryPoint = result[i].storyPoint 
                            } else if (result[i]._id.category === 'todo') {
                                todoCount = result[i].count
                                todoStoryPoint = result[i].storyPoint 
                            } else {
                                inprogressCount = result[i].count;
                                inprogressStoryPoint = result[i].storyPoint 
                            }

                            tasksByProjectId[result[i]._id._id] = {
                                projectId: result[i]._id._id,
                                todo: todoCount,
                                inprogress: inprogressCount,
                                completed: completedCount,
                                todoStoryPoint: todoStoryPoint,
                                inprogressStoryPoint: inprogressStoryPoint,
                                completedStoryPoint: completedStoryPoint,

                            };
                        }
                    }
                    // console.log("tasksByProjectId", tasksByProjectId);
                    let keys = Object.keys(tasksByProjectId)
                    
                    for (let i = 0; i < keys.length; i++){
                        tasksByProjectId[keys[i]].date = new Date();
                        burndownArray.push(tasksByProjectId[keys[i]])
                    }
                   //console.log("burndownArray", burndownArray);
                    Burndown.insertMany(burndownArray)    
                        .then((result1) => {
                            //console.log("result1", result1);
                            res.json({
                                projects: "Success"
                            });
                        })
                        .catch((err) => {
                           // console.log("Burndown.insertMany err", err);
                            logError(err, "getBurndownDataScheduler Burndown.insertMany  err");
                        })
                } 
            })
            .catch((err) => {
                //console.log("err", err);
                logError(err, "getBurndownDataScheduler err");
            })
    } catch (e) {
        logInfo("getBurndownDataScheduler", e)
    }


})