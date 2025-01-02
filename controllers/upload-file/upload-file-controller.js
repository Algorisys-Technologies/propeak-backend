const mongoose = require("mongoose");
const uuidv4 = require("uuid/v4");
const fs = require("fs");
const path = require("path");
const config = require("../../config/config");
const audit = require("../audit-log/audit-log-controller");
const jwt = require("jsonwebtoken");
const secret = require("../../config/secret");
const User = require("../../models/user/user-model");
const Project = require("../../models/project/project-model");
const Task = require("../../models/task/task-model");
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");
const { logError, logInfo } = require("../../common/logger");
const TaskType = require("../../models/task/task-type-model");
const access = require("../../check-entitlements");
let uploadFolder = config.UPLOAD_PATH;
const objectId = require("../../common/common");
const { UploadFile } = require("../../models/upload-file/upload-file-model");
const TaskStage = require("../../models/task-stages/task-stages-model");
const moment = require("moment");

const errors = {
  NOT_AUTHORIZED: "Your are not authorized",
};
exports.tasksFileUpload = async (req, res) => {
  console.log(req.body, "rwquest body is here ");
  console.log(req.body.projectId, "req.body.projectId");
  const projectId = req.body.projectId;
  const userId = req.body.userId;
  const companyId = req.body.companyId;
  console.log(companyId, "companyIdcompanyIdcompanyId");
  console.log(req.files.taskFile.name, "req.files.taskFile.name");
  console.log("Received file:", req.files);
  console.log("task upload file");
  console.log("taskFileUpload before response:", req.body);
  let taskTypes = [];
  try {
    const result = await TaskType.find({});
    taskTypes = result.map((r) => r.title);
  } catch (err) {
    console.error("Error fetching task types:", err);
    return res.json({ error_code: 1, err_desc: "Error fetching task types" });
  }

  console.log(req.files.taskFile, "req.files.taskFile");
  console.log(taskTypes, "taskTypes");

  if (!req.files.taskFile) {
    return res.send({ error: "No files were uploaded." });
  }

  const uploadedFile = req.files.taskFile;
  console.log(uploadedFile, "uploadedFile");

  const fileUploaded = uploadedFile.name.split(".");
  const fileExtn = fileUploaded[fileUploaded.length - 1].toUpperCase();
  const validFileExtn = ["XLS", "XLSX"];
  const isValidFileExtn = validFileExtn.includes(fileExtn);

  console.log("Detected file extension:", fileExtn);
  console.log("Is valid file extension:", isValidFileExtn);

  if (isValidFileExtn) {
    const projectPath = path.join(uploadFolder, req.body.projectId);
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    uploadedFile.mv(
      path.join(projectPath, req.files.taskFile.name),
      function (err) {
        if (err) {
          return res.send({ error: "File Not Saved." });
        }
        console.log("File saved successfully, parsing file...");
        parseFile(projectPath, req.files.taskFile.name, companyId);
      }
    );
  } else {
    return res.send({
      error:
        "File format not supported! (Formats supported are: 'XLSX', 'XLS')",
    });
  }

  async function getTaskStageIdByTitle(statusTitle, companyId) {
    try {
      const taskStage = await TaskStage.findOne({
        title: statusTitle,
        companyId: companyId,
      });
      console.log(taskStage, "taskStage...........");
      return taskStage ? taskStage._id.toString() : null;
    } catch (err) {
      console.error("Error fetching taskStage ID:", err);
      return null;
    }
  }
  function normalizeFieldName(field) {
    return field
      .replace(/\s*\(yes\)|\s*\(no\)/i, "")
      .trim()
      .toLowerCase();
  }
  async function getUserIdByName(name, companyId) {
    try {
      const user = await User.findOne({ name: name, companyId });
      return user ? user._id.toString() : null;
    } catch (err) {
      console.error("Error fetching user ID:", err);
      return null;
    }
  }

  // async function parseFile(uploadFolder, filename, companyId) {
  //   const exceltojson = filename.endsWith(".xlsx") ? xlsxtojson : xlstojson;

  //   try {
  //     exceltojson(
  //       {
  //         input: path.join(uploadFolder, filename),
  //         output: null,
  //         lowerCaseHeaders: true,

  //       },
  //       async function (err, result) {
  //         if (err) {
  //           console.error("Error parsing file:", err);
  //           return res.json({ error_code: 1, err_desc: err, data: null });
  //         }

  //         let mapArray = {
  //           title: "title",
  //           status: "status",
  //           description: "description",
  //           tag: "tag",
  //           priority: "priority",
  //           selectusers: "userId",
  //           startdate: "startDate",
  //           enddate: "endDate",
  //           storypoint: "storyPoint",
  //           tasktype: "taskType",
  //         };

  //         const reqBodyKeys = Object.keys(req.body);
  //         reqBodyKeys.forEach((key) => {
  //           const formattedKey = key.toLowerCase().replace(/\s+/g, "");
  //           if (!mapArray[formattedKey]) {
  //             mapArray[formattedKey] = key;
  //           }
  //         });

  //         console.log("Dynamic mapArray:", mapArray);

  //         let tasks = [];
  //         let failedRecords = [];

  //         for (let index = 0; index < result.length; index++) {
  //           let row = result[index];
  //           let task = {};
  //           let customFieldValues = {};
  //           let hasValidFields = false;
  //           let missingFields = [];

  //           for (let field in row) {
  //             let normalizedField = normalizeFieldName(field);
  //             let mappedField = mapArray[normalizedField];

  //             if (mappedField) {
  //               task[mappedField] = row[field];
  //               hasValidFields = true;
  //             } else {
  //               customFieldValues[normalizedField] = row[field];
  //             }
  //           }

  //           // const convertDate = (dateStr) => {
  //           //   const [day, month, year] = dateStr.split("-").map(Number);
  //           //   return new Date(year + 2000, month - 1, day).toISOString();
  //           // };

  //           const convertDate = (dateStr) => {
  //             if (dateStr.includes("/")) {
  //               const [day, month, year] = dateStr.split("/").map(Number);
  //               return new Date(year, month - 1, day).toISOString();
  //             } else if (dateStr.includes("-")) {
  //               const [day, month, year] = dateStr.split("-").map(Number);
  //               return new Date(year, month - 1, day).toISOString();
  //             }
  //             return dateStr;
  //           };

  //           if (task.startDate) {
  //             task.startDate = convertDate(task.startDate);
  //           }
  //           if (task.endDate) {
  //             task.endDate = task.endDate ? convertDate(task.endDate) : "";
  //           }

  //           if (task.userId) {
  //             task.userId = await getUserIdByName(task.userId, companyId);
  //           }

  //           if (task.status) {
  //             const taskStageId = await getTaskStageIdByTitle(task.status, companyId);
  //             task.taskStageId = taskStageId;
  //           }

  //           if (!hasValidFields) {
  //             console.log(`Row ${index + 1} has no valid fields. Skipping...`);
  //             failedRecords.push({
  //               row: index + 1,
  //               reason: "Missing valid fields",
  //               missingFields: [],
  //             });
  //             continue;
  //           }

  //           task.status = task.status || "todo";
  //           task.category = task.category || "todo";
  //           task.completed = false;
  //           task.depId = "";
  //           task.isDeleted = false;
  //           task.createdOn = new Date();
  //           task.modifiedOn = new Date();
  //           task.createdBy = userId;
  //           task.projectId = projectId;
  //           task.companyId = companyId;
  //           task.modifiedBy = userId;
  //           task.sequence = "1";
  //           task.customFieldValues = customFieldValues;

  //           if (!task.title) missingFields.push("title");
  //           if (!task.storyPoint) missingFields.push("storyPoint");
  //           if (!task.taskType) missingFields.push("taskType");
  //           if (!task.status) missingFields.push("status");

  //           if (missingFields.length === 0) {
  //             tasks.push(task);
  //           } else {
  //             console.log(
  //               `Task at row ${index + 1} missing required fields:`,
  //               task,
  //               "Missing fields:",
  //               missingFields
  //             );
  //             failedRecords.push({
  //               row: index + 1,
  //               reason: "Missing required fields",
  //               missingFields: missingFields,
  //             });
  //           }
  //         }

  //         console.log("Tasks to be added:", tasks);

  //         if (tasks.length > 0) {
  //           try {
  //             await Task.insertMany(tasks);
  //             console.log("Tasks successfully added:", tasks);

  //             let missingFieldsSummary = failedRecords
  //               .map(
  //                 (fail) =>
  //                   `Row ${fail.row + 1}: [${fail.missingFields.join(", ")}]`
  //               )
  //               .join("; ");

  //             res.json({
  //               // error_code: 0,
  //               // err_desc: null,
  //               msg: `Tasks added successfully for ${tasks.length} records.`,
  //               failureMessage: `Tasks failed for ${failedRecords.length} records. Missing Fields: ${missingFieldsSummary}`,
  //               failedRecords,
  //               success: true,
  //             });
  //           } catch (err) {
  //             console.error("Error saving tasks:", err);
  //             res.json({
  //               // error_code: 1,
  //               msg: "Error saving tasks",
  //               success: false,
  //             });
  //           }
  //         } else {
  //           res.json({
  //             error: "Uploaded file is not in correct format",
  //           });
  //         }
  //       }
  //     );
  //   } catch (e) {
  //     console.error("parseFile error:", e);
  //     res.json({ error_code: 1, err_desc: "Corrupted excel file" });
  //   }
  // }

  async function parseFile(uploadFolder, filename, companyId) {
    const exceltojson = filename.endsWith(".xlsx") ? xlsxtojson : xlstojson;

    try {
      exceltojson(
        {
          input: path.join(uploadFolder, filename),
          output: null,
          lowerCaseHeaders: true,
        },
        async function (err, result) {
          if (err) {
            console.error("Error parsing file:", err);
            return res.json({ error_code: 1, err_desc: err, data: null });
          }

          let mapArray = {
            title: "title",
            status: "status",
            description: "description",
            tag: "tag",
            priority: "priority",
            selectusers: "userId",
            startdate: "startDate",
            enddate: "endDate",
            storypoint: "storyPoint",
            tasktype: "taskType",
          };

          const reqBodyKeys = Object.keys(req.body);
          reqBodyKeys.forEach((key) => {
            const formattedKey = key.toLowerCase().replace(/\s+/g, "");
            if (!mapArray[formattedKey]) {
              mapArray[formattedKey] = key;
            }
          });

          console.log("Dynamic mapArray:", mapArray);

          let tasks = [];
          let failedRecords = [];
          let consecutiveBlankRows = 0; // Counter for consecutive blank rows
          const maxBlankRows = 5; // Max allowed consecutive blank rows before stopping

          for (let index = 0; index < result.length; index++) {
            let row = result[index];
            let task = {};
            let customFieldValues = {};
            let hasValidFields = false;
            let missingFields = [];

            // Check if the row is blank (no relevant fields)
            if (Object.values(row).every((cell) => !cell)) {
              consecutiveBlankRows++; // Increment counter if row is blank
              if (consecutiveBlankRows >= maxBlankRows) {
                console.log(
                  "Stopping processing after encountering " +
                    maxBlankRows +
                    " consecutive blank rows."
                );
                break; // Stop processing further rows if too many blank rows
              }
              continue; // Skip processing this row and move to the next one
            } else {
              consecutiveBlankRows = 0; // Reset the blank row counter
            }

            // Process row data
            for (let field in row) {
              let normalizedField = normalizeFieldName(field);
              let mappedField = mapArray[normalizedField];

              if (mappedField) {
                task[mappedField] = row[field];
                hasValidFields = true;
              } else {
                customFieldValues[normalizedField] = row[field];
              }
            }

            // const convertDate = (dateStr) => {
            //   if (dateStr.includes("/")) {
            //     const [day, month, year] = dateStr.split("/").map(Number);
            //     return new Date(year, month - 1, day).toISOString();
            //   } else if (dateStr.includes("-")) {
            //     const [day, month, year] = dateStr.split("-").map(Number);
            //     return new Date(year, month - 1, day).toISOString();
            //   }
            //   return dateStr;
            // };

            function normalizeDate(value) {
              if (!value) return null;

              const formats = ["DD-MM-YYYY", "DD/MM/YYYY"];
              const parsedDate = moment(value, formats, true);

              if (!parsedDate.isValid()) {
                console.warn(
                  `Warning: Invalid date format encountered: ${value}`
                );
                return value; // Return the original value if the date format is invalid
              }

              return parsedDate.format("DD-MM-YYYY");
            }

            if (task.startDate) {
              task.startDate = normalizeDate(task.startDate);
            }
            if (task.endDate) {
              task.endDate = task.endDate ? normalizeDate(task.endDate) : "";
            }

            if (task.userId) {
              task.userId = await getUserIdByName(task.userId, companyId);
            }

            if (task.status) {
              const taskStageId = await getTaskStageIdByTitle(
                task.status,
                companyId
              );
              task.taskStageId = taskStageId;
            }

            if (!hasValidFields) {
              console.log(`Row ${index + 1} has no valid fields. Skipping...`);
              failedRecords.push({
                row: index + 1,
                reason: "Missing valid fields",
                missingFields: [],
              });
              continue;
            }

            task.status = task.status || "todo";
            task.category = task.category || "todo";
            task.completed = false;
            task.depId = "";
            task.isDeleted = false;
            task.createdOn = new Date();
            task.modifiedOn = new Date();
            task.createdBy = userId;
            task.projectId = projectId;
            task.companyId = companyId;
            task.modifiedBy = userId;
            task.sequence = "1";
            task.customFieldValues = customFieldValues;
            task.creation_mode = "MANUAL";
            task.lead_source = "EXCEL";
            if (!task.title) missingFields.push("title");
            if (!task.storyPoint) missingFields.push("storyPoint");
            if (!task.taskType) missingFields.push("taskType");
            if (!task.status) missingFields.push("status");

            if (missingFields.length === 0) {
              tasks.push(task);
            } else {
              console.log(
                `Task at row ${index + 1} missing required fields:`,
                task,
                "Missing fields:",
                missingFields
              );
              failedRecords.push({
                row: index + 1,
                reason: "Missing required fields",
                missingFields: missingFields,
              });
            }
          }

          console.log("Tasks to be added:", tasks);

          if (tasks.length > 0) {
            try {
              await Task.insertMany(tasks);
              console.log("Tasks successfully added:", tasks);

              let missingFieldsSummary = failedRecords
                .map(
                  (fail) =>
                    `Row ${fail.row + 1}: [${fail.missingFields.join(", ")}]`
                )
                .join("; ");

              res.json({
                msg: `Tasks added successfully for ${tasks.length} records.`,
                failureMessage: `Tasks failed for ${failedRecords.length} records. Missing Fields: ${missingFieldsSummary}`,
                failedRecords,
                success: true,
              });
            } catch (err) {
              console.error("Error saving tasks:", err);
              res.json({
                msg: "Error saving tasks",
                success: false,
              });
            }
          } else {
            res.json({
              error: "Uploaded file is not in correct format",
            });
          }
        }
      );
    } catch (e) {
      console.error("parseFile error:", e);
      res.json({ error_code: 1, err_desc: "Corrupted excel file" });
    }
  }
};
exports.uploadTaskFieldsConfig = (req, res) => {
  let userRole = req.userInfo.userRole.toLowerCase();
  let accessCheck = access.checkEntitlementsForUserRole(userRole);
  if (accessCheck === false) {
    return res.json({ err: errors.NOT_AUTHORIZED });
  }

  if (!req.files || !req.files.taskFieldsConfig) {
    return res.send({ error: "No files were uploaded." });
  }

  const projectId = req.body.projectId;
  const uploadedFile = req.files.taskFieldsConfig;
  const filename = "TaskFieldsConfig.xlsx";
  const targetDir = path.join(uploadFolder, projectId, "template");
  const filePath = path.join(targetDir, filename);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  uploadedFile.mv(filePath, function (err) {
    if (err) {
      console.error("Error saving file:", err);
      return res.send({ error: "File Not Saved." });
    }

    console.log("File saved successfully:", filePath);
    res.json({
      success: true,
      msg: "File uploaded and saved successfully.",
      filePath: filePath,
    });
  });
};
exports.getUploadFileByProjectId = async (req, res) => {
  console.log(req.body, "request bodys ?");
  try {
    const { projectId, taskId, currentPage = 1 } = req.body;
    const limit = 5;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        uploadFiles: [],
        totalPages: 0,
        currentPage: 0,
        msg: "Project ID is required.",
      });
    }

    const skip = currentPage * limit;

    let query = taskId ? { taskId } : { projectId, taskId: null };
    const uploadFiles = await UploadFile.find(query)
      .skip(limit * currentPage)
      .limit(limit);
    const totalDocuments = await UploadFile.countDocuments(query);
    const totalPages = Math.ceil(totalDocuments / limit);
    return res.json({
      success: true,
      uploadFiles,
      totalPages,
      currentPage,
    });
  } catch (error) {
    // Handle errors
    console.error("Error fetching uploaded files:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while fetching the uploaded files.",
    });
  }
};

// exports.getUploadFileByProjectId = async (req, res) => {
//   try {
//     const { projectId, taskId,currentPage } = req.body;
//       const limit = 5

//     let uploadFiles;
//     if (taskId) {
//       uploadFiles = await UploadFile.find({ taskId });
//     } else {
//       uploadFiles = await UploadFile.find({ projectId });
//     }

//     return res.json({ success: true, uploadFiles });
//   } catch {}
// };

exports.uploadFileGetByProjectId = (req, res) => {
  console.log("IS IT COMING HERE ?????????????");
  // let userRole = req.userInfo.userRole.toLowerCase();
  // let accessCheck = access.checkEntitlementsForUserRole(userRole);
  // if (accessCheck === false) {
  //   res.json({ err: errors.NOT_AUTHORIZED });
  //   return;
  // }
  console.log("req bosy data ", req.body);
  if (taskId) {
    UploadFile.find({ taskId: taskId })
      .then((result) => {
        let uploadFileResult = result[0].tasks.uploadFiles.filter((m) => {
          if (m.isDeleted !== true) {
            return m;
          }
        });
        res.json(uploadFileResult);
      })
      .catch((err) => {
        res.json({ err: errors.MESSAGE_DOESNT_EXIST });
      });
  } else {
    Project.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.projectId),
          $or: [{ isDeleted: false }, { isDeleted: null }],
        },
      },
      { $unwind: "$uploadFiles" },
      {
        $match: {
          $or: [
            { "uploadFiles.isDeleted": false },
            { "uploadFiles.isDeleted": null },
          ],
        },
      },
      { $project: { uploadFiles: 1 } },
    ])
      .then((result) => {
        let uploadFiles = [];
        result.map((r) => {
          uploadFiles.push(r.uploadFiles);
        });
        res.json(uploadFiles);
      })
      .catch((err) => {
        res
          .status(500)
          .json({ success: false, msg: `Something went wrong. ${err}` });
      });
  }
};

exports.postUploadFile = async (req, res) => {
  console.log(req.body);
  console.log(req.files.uploadFile, "files");
  const companyId = req.body.companyId;
  const projectId = req.body.projectId;

  // let userRole = req.userInfo.userRole.toLowerCase();
  // let accessCheck = access.checkEntitlementsForUserRole(userRole);
  // if (accessCheck === false) {
  //   res.json({ err: errors.NOT_AUTHORIZED });
  //   return;
  // }
  let uploadFile = {
    _id: req.body._id,
    taskId: req.body.taskId,
    fileName: req.files.taskFile.name,
    isDeleted: false,
    createdBy: req.body.userId,
    createdOn: new Date(),
    companyId: companyId,
    projectId: req.body.projectId,
  };

  const newuploadfile = new UploadFile(uploadFile);

  const result = await newuploadfile.save();

  const updatedProject = await Project.findOneAndUpdate(
    { _id: projectId },
    { $push: { uploadFiles: result._id } }
  );

  try {
    if (!req.files.uploadFile) {
      res.send({ error: "No files were uploaded." });
      return;
    }
    var taskId = req.body.taskId;
    var fileName = req.files.taskFile.name;
    var uploadedFile = req.files.uploadFile;
    let fileUploaded = uploadedFile.name.split(".");
    let fileExtn = fileUploaded[fileUploaded.length - 1].toUpperCase();

    let validFileExtn = [
      "PDF",
      "DOCX",
      "PNG",
      "JPEG",
      "JPG",
      "TXT",
      "PPT",
      "XLSX",
      "XLS",
      "PPTX",
    ];
    let isValidFileExtn = validFileExtn.filter((extn) => extn === fileExtn);
    if (isValidFileExtn.length > 0) {
      if (fs.existsSync(uploadFolder + "/" + projectId)) {
        if (taskId === "undefined") {
          uploadedFile.mv(
            uploadFolder + "/" + projectId + "/" + fileName,
            function (err) {
              if (err) {
                console.log(err);
                res.send({ error: "File Not Saved." });
              }
            }
          );
        } else if (
          fs.existsSync(uploadFolder + "/" + projectId + "/" + taskId)
        ) {
          uploadedFile.mv(
            uploadFolder + "/" + projectId + "/" + taskId + "/" + fileName,
            function (err) {
              if (err) {
                console.log(err);
                res.send({ error: "File Not Saved." });
              }
            }
          );
        } else {
          fs.mkdir(
            uploadFolder + "/" + projectId + "/" + taskId,
            function (err) {
              if (err) {
                return console.error(err);
              }
              uploadedFile.mv(
                uploadFolder + "/" + projectId + "/" + taskId + "/" + filename,
                function (err) {
                  if (err) {
                    res.send({ error: "File Not Saved." });
                  }
                }
              );
            }
          );
        }
      } else {
        fs.mkdir(uploadFolder + "/" + projectId, function (err) {
          if (err) {
            return console.error(err);
          }
          if (taskId !== "undefined") {
            fs.mkdir(
              uploadFolder + "/" + projectId + "/" + taskId,
              function (err) {
                if (err) {
                  return console.error(err);
                }
                uploadedFile.mv(
                  uploadFolder +
                    "/" +
                    projectId +
                    "/" +
                    taskId +
                    "/" +
                    filename,
                  function (err) {
                    if (err) {
                      res.send({ error: "File Not Saved." });
                    }
                  }
                );
              }
            );
          } else {
            uploadedFile.mv(
              uploadFolder + "/" + projectId + "/" + filename,
              function (err) {
                if (err) {
                  res.send({ error: "File Not Saved." });
                }
              }
            );
          }
        });
      }
    } else {
      res.send({
        error:
          "File format not supported!(Formats supported are: 'PDF', 'DOCX', 'PNG', 'JPEG', 'JPG', 'TXT', 'PPT', 'XLSX', 'XLS','PPTX')",
      });
    }
  } catch (err) {
    console.log(err);
  }
};

// exports.deleteUploadFile = (req, res) => {
//   let userRole = req.userInfo.userRole.toLowerCase();
//   let accessCheck = access.checkEntitlementsForUserRole(userRole);
//   if (accessCheck === false) {
//     res.json({ err: errors.NOT_AUTHORIZED });
//     return;
//   }
//   var data = req.body;
//   if (!data.filename) {
//     res.send({ error: "No files were uploaded." });
//     return;
//   }
//   if (data.taskId === undefined) {
//     var fileToBeDeleted =
//       uploadFolder + "/" + data.projectId + "/" + data.filename;

//     try {
//       fs.unlink(fileToBeDeleted, function (err) {
//         if (err) {
//           console.log(err);
//         } else {
//           // console.log(data.filename + " deleted sucessfully");
//         }
//       });
//     } catch (e) {
//       console.log(e);
//     }
//   } else {
//     var fileToBeDeleted =
//       uploadFolder +
//       "/" +
//       data.projectId +
//       "/" +
//       data.taskId +
//       "/" +
//       data.filename;

//     try {
//       fs.unlink(fileToBeDeleted, function (err) {
//         if (err) {
//           console.log(err);
//         } else {
//           // console.log(data.filename + " deleted sucessfully");
//         }
//       });
//     } catch (e) {
//       console.log(e);
//     }
//   }
//   if (req.body.taskId !== undefined) {
//     Project.findById(req.body.projectId)
//       .then((result) => {
//         let task = result.tasks.id(req.body.taskId);
//         let taskupload = task.uploadFiles.id(req.body.updatedFile._id);
//         taskupload.isDeleted = req.body.updatedFile.isDeleted;
//         return result.save();
//       })
//       .then((result) => {
//         res.send({ result });
//       });
//   } else {
//     Project.findOneAndUpdate(
//       { _id: req.body.projectId, "uploadFiles._id": req.body.updatedFile._id },
//       { $set: { "uploadFiles.$": req.body.updatedFile } },
//       { new: true }
//     ).then((result) => {
//       let userIdToken = req.userInfo.userName;
//       let field = "uploadFiles";
//       audit.insertAuditLog(
//         req.body.updatedFile.filename,
//         result.title,
//         "Project",
//         field,
//         "",
//         userIdToken,
//         result._id
//       );
//       res.json(result.uploadFiles);
//     });
//   }
// };

exports.deleteUploadFile = (req, res) => {
  console.log(req.body, "delete...");
  const data = req.body;

  if (!data.updatedFile || !data.updatedFile.fileName) {
    return res.send({ error: "No files were uploaded." });
  }

  const filePathParts = [
    uploadFolder,
    data.companyId,
    data.updatedFile.projectId,
  ];

  // Only include taskId if it exists
  if (data.updatedFile.taskId) {
    filePathParts.push(data.updatedFile.taskId);
  }

  filePathParts.push(data.updatedFile.fileName);
  const fileToBeDeleted = path.join(...filePathParts);
  console.log(`Attempting to delete file at: ${fileToBeDeleted}`);

  fs.access(fileToBeDeleted, fs.constants.F_OK, (err) => {
    if (err) {
      console.log(`File not found: ${fileToBeDeleted}`);
      // return res.status(404).json({ error: "File not found." });
    }

    fs.unlink(fileToBeDeleted, (err) => {
      if (err) {
        console.log(err);
        // return res
        //   .status(500)
        //   .json({ error: "Error deleting file", details: err });
      }
      console.log(data.updatedFile.fileName + " deleted successfully");

      // Delete the UploadFile document after successful deletion
      UploadFile.deleteOne({ _id: data.updatedFile._id })
        .then(async (deleteResult) => {
          if (deleteResult.deletedCount === 0) {
            console.log("Document not found in database, could not delete.");
            return res
              .status(404)
              .json({ error: "File not found in database" });
          }

          console.log(
            "Document deleted successfully from database:",
            deleteResult
          );

          if (data.updatedFile.taskId) {
            let result = await Task.findOneAndUpdate(
              { _id: data.updatedFile.taskId },
              { $pull: { uploadFiles: { _id: data.updatedFile._id } } },
              { new: true }
            );

            res.json({
              success: true,
              message: "File deleted successfully",
              uploadFiles: result.uploadFiles,
            });
          }
          // Optionally update Project if needed
          Project.findOneAndUpdate(
            { _id: data.updatedFile.projectId },
            { $pull: { uploadFiles: { _id: data.updatedFile._id } } },
            { new: true }
          )
            .then((result) => {
              if (!result) {
                return res.status(404).json({
                  error: "Project or file not found in project collection",
                });
              }
              res.json({
                success: true,
                message: "File deleted successfully",
                uploadFiles: result.uploadFiles,
              });
            })
            .catch((error) => {
              console.log("Project update failed:", error);
              res
                .status(500)
                .json({ error: "Project update failed", details: error });
            });
        })
        .catch((error) => {
          console.log("UploadFile delete failed:", error);
          res
            .status(500)
            .json({ error: "UploadFile delete failed", details: error });
        });
    });
  });
};

exports.postUploadFileByProjectId = async (req, res) => {
  console.log(req.body);
  console.log(req.files.uploadFile, "files");
  const companyId = req.body.companyId;
  const projectId = req.body.projectId;
  const taskId = req.body.taskId || null;

  let uploadFile = {
    _id: req.body._id,
    fileName: req.body.fileName,
    isDeleted: false,
    createdBy: req.body.userId,
    createdOn: new Date(),
    companyId: companyId,
    projectId: projectId,
    taskId: taskId,
  };

  const newuploadfile = new UploadFile(uploadFile);
  const result = await newuploadfile.save();

  if (taskId) {
    await Task.findOneAndUpdate(
      { _id: taskId },
      { $push: { uploadFiles: result._id } }
    );
  } else {
    await Project.findOneAndUpdate(
      { _id: projectId },
      { $push: { uploadFiles: result._id } }
    );
  }

  try {
    if (!req.files.uploadFile) {
      res.send({ error: "No files were uploaded." });
      return;
    }

    const fileName = req.body.fileName;
    const uploadedFile = req.files.uploadFile;
    const fileUploaded = uploadedFile.name.split(".");
    const fileExtn = fileUploaded[fileUploaded.length - 1].toUpperCase();

    const validFileExtn = [
      "PDF",
      "DOCX",
      "PNG",
      "JPEG",
      "JPG",
      "TXT",
      "PPT",
      "XLSX",
      "XLS",
      "PPTX",
    ];

    if (validFileExtn.includes(fileExtn)) {
      let projectFolderPath;
      if (taskId) {
        projectFolderPath = `${uploadFolder}/${companyId}/${projectId}/${taskId}`;
      } else {
        projectFolderPath = `${uploadFolder}/${companyId}/${projectId}`;
      }

      if (!fs.existsSync(projectFolderPath)) {
        fs.mkdirSync(projectFolderPath, { recursive: true });
      }

      uploadedFile.mv(`${projectFolderPath}/${fileName}`, function (err) {
        if (err) {
          console.log(err);
          res.send({ error: "File Not Saved." });
        }
      });
    } else {
      res.send({
        error:
          "File format not supported!(Formats supported are: 'PDF', 'DOCX', 'PNG', 'JPEG', 'JPG', 'TXT', 'PPT', 'XLSX', 'XLS', 'PPTX')",
      });
    }
  } catch (err) {
    console.log(err);
  }
};

exports.downloadUploadFile = (req, res) => {
  // this routes all types of file
  let userRole = req.userInfo.userRole.toLowerCase();
  let accessCheck = access.checkEntitlementsForUserRole(userRole);
  if (accessCheck === false) {
    res.json({ err: errors.NOT_AUTHORIZED });
    return;
  }
  var data = req.params;
  if (data.taskId === "undefined") {
    var abpath = path.join(
      uploadFolder + "/" + data.projectId + "/",
      data.filename
    );
  } else {
    var abpath = path.join(
      uploadFolder + "/" + data.projectId + "/" + data.taskId + "/",
      data.filename
    );
  }

  res.download(abpath, (err) => {
    if (err) {
      console.log(err);
    }
  });
};

exports.downloadProjectUploadFile = (req, res) => {
  console.log("downloadprojectfile....");

  const data = req.params;
  const abpath = path.join(uploadFolder, data.projectId, data.filename);

  res.download(abpath, (err) => {
    if (err) {
      console.log(err);
    }
  });
};

exports.viewUploadFile = (req, res) => {
  // let userRole = req.userInfo.userRole.toLowerCase();
  // let accessCheck = access.checkEntitlementsForUserRole(userRole);
  // if (accessCheck === false) {
  //   res.json({ err: errors.NOT_AUTHORIZED });
  //   return;
  // }

  const data = req.params;
  let abpath;

  if (!data.taskId) {
    abpath = path.join(
      uploadFolder + "/" + data.projectId + "/",
      data.filename
    );
  } else {
    abpath = path.join(
      uploadFolder + "/" + data.projectId + "/" + data.taskId + "/",
      data.filename
    );
  }

  res.setHeader("Content-Type", "application/pdf");
  res.sendFile(abpath, (err) => {
    if (err) {
      console.log(err);
      res.status(500).send({ err: "File could not be sent" });
    }
  });
};

exports.viewUploadFileByProjectId = (req, res) => {
  console.log("view......");
  const data = req.params;
  const abpath = path.join(
    uploadFolder + "/" + data.projectId + "/" + "/",
    data.filename
  );

  // Check if the file exists
  if (!fs.existsSync(abpath)) {
    console.error("File not found:", abpath);
    return res.status(404).json({ success: false, error: "File not found" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.sendFile(abpath, (err) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, error: "File could not be sent" });
    }
  });
};
