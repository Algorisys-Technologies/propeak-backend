const mongoose = require('mongoose');
const Project = require('../../models/project/project-model');
const User = require('../../models/user/user-model');
const {
    logError,
    logInfo
} = require('../../common/logger');
const dateUtil = require('../../utils/date-util');
const config = require("../../config/config");
const emailLog = require('../email-log/email-log-controller');
const Holiday = require("../../models/leave/holiday-model");

const getHolidayData = async (req, res) => {
    await Holiday.find({
            isActive: 1
        }, {
            _id: 1,
            date: 1,
            month: 1,
            year: 1
        }, {
            lean: true
        })
        .then(async (results) => {
            let holidayList = []
            if (results.length > 0) {
                for (let i = 0; i < results.length; i++) {
                    if (results[i].monthName !== '' && results[i].year !== '') {
                        holidayList.push(
                            results[i]
                        )
                    }
                }
            }
            res.json({
                holiday: holidayList
            });
        })

}

module.exports = {
    getHolidayData: getHolidayData
}