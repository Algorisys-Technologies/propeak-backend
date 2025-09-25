const fs = require("fs");
const { UploadFile } = require("../models/upload-file/upload-file-model");
const Task = require("../models/task/task-model");
const Project = require("../models/project/project-model");
const { VALID_FILE_EXTENSIONS } = require("./constants");

async function uploadProjectFiles({
  files,
  companyId,
  projectId,
  taskId = null,
  uploadFolder,
  userId,
  _id = undefined,
}) {
  if (!files || !files.uploadFile) {
    throw new Error("No files were uploaded.");
  }

  console.log("files...mmm", files);

  // Always work with an array of files
  const fileArray = Array.isArray(files.uploadFile)
    ? files.uploadFile
    : [files.uploadFile];

  const uploadedFilesData = [];

  for (const uploadedFile of fileArray) {
    const fileName = uploadedFile.name;
    const ext = fileName.split(".").pop().toUpperCase();

    if (!VALID_FILE_EXTENSIONS.includes(ext)) {
      uploadedFilesData.push({
        fileName,
        success: false,
        error: "File format not supported!",
      });
      continue;
    }

    // Build target path
    const folderPath = taskId
      ? `${uploadFolder}/${companyId}/${projectId}/${taskId}`
      : `${uploadFolder}/${companyId}/${projectId}`;

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Move file to folder
    await uploadedFile.mv(`${folderPath}/${fileName}`);

    // Save metadata to DB
    const uploadFileData = {
      _id,
      fileName,
      isDeleted: false,
      createdBy: userId,
      createdOn: new Date(),
      companyId,
      projectId,
      taskId,
    };

    const newUploadFile = new UploadFile(uploadFileData);
    const savedDoc = await newUploadFile.save();

    // Link file to task or project
    if (taskId) {
      await Task.findByIdAndUpdate(taskId, {
        $push: { uploadFiles: savedDoc._id },
      });
    } else {
      await Project.findByIdAndUpdate(projectId, {
        $push: { uploadFiles: savedDoc._id },
      });
    }

    uploadedFilesData.push({
      fileName,
      success: true,
      id: savedDoc._id,
    });
  }

  return uploadedFilesData;
}

module.exports = { uploadProjectFiles };
