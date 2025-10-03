const fs = require("fs");
const path = require("path");
const { UploadFile } = require("../models/upload-file/upload-file-model");
const Task = require("../models/task/task-model");
const Project = require("../models/project/project-model");
const { VALID_FILE_EXTENSIONS, MAGIC_SIGNATURES } = require("./constants");
const { readMagicBytes } = require("./read-magic-bytes");

async function uploadProjectFiles({
  files,
  companyId,
  projectId,
  taskId = null,
  uploadFolder,
  userId,
  _id = undefined,
  status,
}) {
  if (!files || !files.uploadFile) {
    throw new Error("No files were uploaded.");
  }

  const fileArray = Array.isArray(files.uploadFile)
    ? files.uploadFile
    : [files.uploadFile];

  const uploadedFilesData = [];

  for (const uploadedFile of fileArray) {
    const fileName = uploadedFile.name;
    const ext = fileName.split(".").pop().toUpperCase();

    // --- 1️⃣ Extension check ---
    if (!VALID_FILE_EXTENSIONS.includes(ext)) {
      uploadedFilesData.push({
        fileName,
        success: false,
        error: "File extension not supported!",
      });
      continue;
    }

    const folderPath = taskId
      ? path.join(uploadFolder, companyId, projectId, taskId)
      : path.join(uploadFolder, companyId, projectId);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const targetPath = path.join(folderPath, fileName);

    // Temporarily move file to check magic bytes
    await uploadedFile.mv(targetPath);

    // --- 2️⃣ Magic-byte validation ---
    try {
      const signatures = MAGIC_SIGNATURES[ext] || [];
      if (signatures.length > 0) {
        const magic = readMagicBytes(targetPath);
        const valid = signatures.some((sig) => magic.startsWith(sig));
        if (!valid) {
          fs.unlinkSync(targetPath); // remove invalid file
          uploadedFilesData.push({
            fileName,
            success: false,
            error: "Invalid file content (magic bytes mismatch).",
          });
          continue;
        }
      }
    } catch (err) {
      // Clean up if magic-byte check fails unexpectedly
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      uploadedFilesData.push({
        fileName,
        success: false,
        error: "Magic-byte validation failed.",
      });
      continue;
    }

    // --- 3️⃣ Save metadata to DB ---
    const uploadFileData = {
      _id,
      fileName,
      isDeleted: false,
      createdBy: userId,
      createdOn: new Date(),
      companyId,
      projectId,
      taskId,
      status,
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

    uploadedFilesData.push({ fileName, success: true, id: savedDoc._id });
  }

  return uploadedFilesData;
}

module.exports = { uploadProjectFiles };

// const fs = require("fs");
// const { UploadFile } = require("../models/upload-file/upload-file-model");
// const Task = require("../models/task/task-model");
// const Project = require("../models/project/project-model");
// const { VALID_FILE_EXTENSIONS } = require("./constants");

// async function uploadProjectFiles({
//   files,
//   companyId,
//   projectId,
//   taskId = null,
//   uploadFolder,
//   userId,
//   _id = undefined,
// }) {
//   if (!files || !files.uploadFile) {
//     throw new Error("No files were uploaded.");
//   }

//   console.log("files...mmm", files);

//   // Always work with an array of files
//   const fileArray = Array.isArray(files.uploadFile)
//     ? files.uploadFile
//     : [files.uploadFile];

//   const uploadedFilesData = [];

//   for (const uploadedFile of fileArray) {
//     const fileName = uploadedFile.name;
//     const ext = fileName.split(".").pop().toUpperCase();

//     if (!VALID_FILE_EXTENSIONS.includes(ext)) {
//       uploadedFilesData.push({
//         fileName,
//         success: false,
//         error: "File format not supported!",
//       });
//       continue;
//     }

//     // Build target path
//     const folderPath = taskId
//       ? `${uploadFolder}/${companyId}/${projectId}/${taskId}`
//       : `${uploadFolder}/${companyId}/${projectId}`;

//     if (!fs.existsSync(folderPath)) {
//       fs.mkdirSync(folderPath, { recursive: true });
//     }

//     // Move file to folder
//     await uploadedFile.mv(`${folderPath}/${fileName}`);

//     // Save metadata to DB
//     const uploadFileData = {
//       _id,
//       fileName,
//       isDeleted: false,
//       createdBy: userId,
//       createdOn: new Date(),
//       companyId,
//       projectId,
//       taskId,
//     };

//     const newUploadFile = new UploadFile(uploadFileData);
//     const savedDoc = await newUploadFile.save();

//     // Link file to task or project
//     if (taskId) {
//       await Task.findByIdAndUpdate(taskId, {
//         $push: { uploadFiles: savedDoc._id },
//       });
//     } else {
//       await Project.findByIdAndUpdate(projectId, {
//         $push: { uploadFiles: savedDoc._id },
//       });
//     }

//     uploadedFilesData.push({
//       fileName,
//       success: true,
//       id: savedDoc._id,
//     });
//   }

//   return uploadedFilesData;
// }

// module.exports = { uploadProjectFiles };
