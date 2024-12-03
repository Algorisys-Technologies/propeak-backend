const mongoose = require('mongoose');
const UploadFile = require('../../models/upload-file/upload-file-model');
const uuidv4 = require("uuid/v4");
const fs = require('fs');
const path = require('path');
const config = require("../../config/config");
const audit = require('../audit-log/audit-log-controller');
const jwt = require('jsonwebtoken');
const secret = require('../../config/secret');
const User = require('../../models/user/user-model');
const Project = require('../../models/project/project-model');
const Task = require('../../models/task/task-model');
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");
const {
    logError,
    logInfo
} = require('../../common/logger');
const TaskType = require('../../models/task/task-type-model');
const access = require('../../check-entitlements');
// let uploadFolder = './uploads';
let uploadFolder = config.UPLOAD_PATH

exports.createProfile = (req, res) => {

    let UploadFile = {
        _id: req.userInfo.userId,
        // taskId: req.body.taskId,
        filename: req.userInfo.profilePicture,
        isDeleted: false,
        createdOn: new Date(),
    }
    // console.log(UploadFile);
    try {
        if (req.userInfo.userId !== 'undefined') {
            if (!req.files.uploadFile) {
                res.send({
                    "error": "No files were uploaded."
                });
                return;
            }

            var filename = req.body.filename;
            var uploadedFile = req.files.uploadFile;
            let fileUploaded = uploadedFile.name.split('.');
            let fileExtn = fileUploaded[fileUploaded.length - 1].toUpperCase();

            let validFileExtn = ['PDF', 'DOCX', 'PNG', 'JPEG', 'JPG', 'TXT', 'PPT', 'XLSX', 'XLS', 'PPTX'];
            let isValidFileExtn = validFileExtn.filter((extn) => extn === fileExtn);
            if (isValidFileExtn.length > 0) {
                if (!fs.existsSync(uploadFolder + "/" + req.userInfo.userId)) {
                    fs.mkdir(uploadFolder + '/' + req.userInfo.userId, function (err) {
                        if (err) {
                            //console.log(err);
                            return res.send({
                                "error": "File Not Saved"
                            });
                        }

                    });
                }
                uploadedFile.mv(uploadFolder + "/" + req.userInfo.userId + "/" + filename, function (err) {
                    //console.log("upload profile pic", err);
                    if (err) {
                        //console.log("upload path", uploadFolder + "/" + req.userInfo.userId + "/" + filename);

                        res.send({
                            "error": "File Not Saved." + err
                        });
                    } else {

                        User.findOneAndUpdate({
                            "_id": req.userInfo.userId
                        }, {
                                $set: {
                                    profilePicture: filename
                                }
                            })
                            .then((newresult) => {
                                res.json({
                                    success: true,
                                    msg: `Successfully Uploaded!`,
                                    newresult: UploadFile
                                })
                            })
                    }

                });

            } else {
                res.send({
                    "error": "File format not supported!(Formats supported are: 'PDF', 'DOCX', 'PNG', 'JPEG', 'JPG', 'TXT', 'PPT', 'XLSX', 'XLS','PPTX')"
                });
            }
        }
    } catch (err) {
        // console.log(err);
    }
}