const mongoose = require('mongoose');
const User = require('../../models/user/user-model');
const dateUtil = require('../../utils/date-util')
const { logError, logInfo } = require('../../common/logger');
const config = require("../../config/config");
const LeaveApplication = require('../../models/leave/leave-model');


exports.getPendingLeaveApproveDataScheduler = ((req, res) => {
    try {
        let d = new Date();
        let dbDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()-1}`;
        var dt = dateUtil.DateToString(dbDate);
        // console.log(dt);
        // console.log("Welcome to Controller!");
        //console.log(new Date());

        LeaveApplication.find({
            isDeleted: false,
            status: "pending",
            fromDate: dt
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
                if (result.length > 0) {
                    for (let i = 0; i < result.length; i++) {
                        LeaveApplication.findOneAndUpdate({
                            _id: result[i]._id
                        }, {
                                $set: {
                                    status: "approved"
                                }
                            }, {
                                "new": true
                            })
                            .then((result1) => {
                                res.json({
                                    data: "Success"
                                   });
                            })
                    }
                }
                res.json({
                    success: true,
                    msg: `successfully leave approved`
                });
               
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