const mongoose = require('mongoose');
const User = require('../../models/user/user-model');
const dateUtil = require('../../utils/date-util')
const {
    logError,
    logInfo
} = require('../../common/logger');
const config = require("../../config/config");
const LeaveApplication = require('../../models/leave/leave-model');

exports.getUserDataScheduler = ((req, res) => {
    try {
        User.find({
            isDeleted: false,
            isLocked: true

        }, {
                _id: 1,
                email: 1,
                name: 1,
                lockedDateTime: 1,
                isLocked: 1
            }, {
                lean: true
            })
            .then((result) => {
                //console.log("getUserDataScheduler result", result);
                logInfo("getUserDataScheduler result", result)
                if (result.length > 0) {
                    for (let i = 0; i < result.length; i++) {
                        var d = new Date(result[i].lockedDateTime);
                        let hour = d.getHours() + config.unLockAccountHour;
                        let minute = d.getMinutes();
                        let seconds = d.getSeconds();

                        let dbTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(),
                            parseInt(hour), parseInt(minute), parseInt(seconds));
                        //    console.log("dbTime" , dbTime);
                        var now = new Date()
                        let hour1 = now.getHours();
                        let minute1 = now.getMinutes();
                        let seconds1 = now.getSeconds();
                        let currTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                            parseInt(hour1), parseInt(minute1), parseInt(seconds1));
                        // console.log('currTime', currTime);
                        if (dbTime.getTime() === currTime.getTime()) {
                            //   console.log("in if");
                            User.findOneAndUpdate({
                                _id: result[i]._id
                            }, {
                                    $set: {
                                        isLocked: false,
                                        lockedDateTime: new Date()
                                    }
                                }, {
                                    "new": true
                                })
                                .then((result) => {

                                    res.json({
                                        data: "Success"
                                    });
                                })
                        }

                    }
                }
            })

    }
    catch (e) {
        console.log(e)
    }

})



exports.getLeaveDataScheduler = ((req, res) => {
    try {
        LeaveApplication.find({
            isDeleted: false,
            status: "approved"
        }, {
                "_id": 1,
                "userId": 1,
                "leaveType": 1,
                "status": 1,
                "userName": 1,
                "fromEmail": 1,
                "fromDate": 1,
                "toDate": 1,
                "workingDays": 1

            })
            .then((result) => {
                var userIds = [];
                for (let i = 0; i < result.length; i++) {
                    userIds.push(result[i].userId);
                }
                User.find({
                    isDeleted: false,
                    _id: {
                        $in: userIds
                    },
                }, {
                        name: 1,
                        reportingManagerId: 1
                    }, 
                    {
                        lean: true
                    })
                    .then((result1) => {
                        let reportingManagerIds = [];
                        for (let j = 0; j < result1.length; j++) {
                            reportingManagerIds.push(result1[j].reportingManagerId);
                        }
                        User.find({
                            isDeleted: false,
                            _id: {
                                $in: reportingManagerIds
                            },
                        }, {
                                name: 1,
                                reportingManagerId: 1,
                                email: 1
                            }, {
                                lean: true
                            })
                            .then((result2) => {
                                let leaveDataArray = [];
                                let userArray = []
                                for (let j = 0; j < result1.length; j++) {
                                    for (let k = 0; k < result2.length; k++) {
                                        if (result1[j].reportingManagerId === result2[k]._id.toString()) {
                                            let userObj = {
                                                reportingManagerEmail: result2[k].email,
                                                reportingManagerName: result2[k].name,
                                                usrName: result1[j].name,
                                                userId: result1[j]._id.toString()
                                            }
                                            userArray.push(userObj)

                                        }
                                    }
                                }
                                for (let i = 0; i < result.length; i++) {
                                    for (let k = 0; k < userArray.length; k++) {
                                        if (result[i].userId === userArray[k].userId) {
                                            let leaveObj = {
                                                // _id: result[i]._id,
                                                // userId: result[i].userId,
                                                // leaveType: result[i].leaveType,
                                                // status: result[i].status,
                                                userName: result[i].userName,
                                                //fromEmail: result[i].fromEmail,
                                                fromDate: result[i].fromDate,
                                                toDate: result[i].toDate,
                                                // workingDays: result[i].workingDays,
                                                reportingManagerEmail: userArray[k].reportingManagerEmail,
                                                //reportingManagerName: userArray[k].reportingManagerName,
                                            }
                                            leaveDataArray.push(leaveObj)

                                        }


                                    }
                                }
                                let data = []
                                for (let i = 0; i < leaveDataArray.length; i++) {
                                    let d = new Date(leaveDataArray[i].fromDate);

                                    let dbDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate() - config.beforeThreeDay}`;

                                    let date = dateUtil.DateToString(dbDate);
                                    let dbDate1 = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate() - config.beforeSevenDay}`;

                                    let date1 = dateUtil.DateToString(dbDate1);
                                    let now = new Date()
                                    let currentDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
                                    let todayDate = dateUtil.DateToString(currentDate)
                                    if (date === todayDate || date1 === todayDate) {
                                        data.push(leaveDataArray[i])
                                    }
                                }
                                let leaveData1 = {};
                                for (let d = 0; d < data.length; d++) {

                                    if (leaveData1[data[d].reportingManagerEmail]) {
                                        leaveData1[data[d].reportingManagerEmail].push(data[d]);
                                    }
                                    else {
                                        leaveData1[data[d].reportingManagerEmail] = [data[d]];
                                    }

                                }

                                res.json(leaveData1);
                            })

                    })



            }).catch((err) => {
                res.json({
                    success: false,
                    msg: `Something went wrong ${err}`
                });
            })


    }
    catch (e) {
        console.log(e)
    }

})


