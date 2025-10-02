const fs = require("fs");
const path = require("path");
const { UploadFile } = require("../models/upload-file/upload-file-model");
const Task = require("../models/task/task-model");
const { VALID_FILE_EXTENSIONS, MAGIC_SIGNATURES } = require("./constants");
const { readMagicBytes } = require("./read-magic-bytes");

async function validateAndSaveFiles(
  req,
  companyId,
  projectId,
  taskId,
  uploadFolder,
  createdBy,
  status,
) {
  if (!req.files || !req.files.uploadFiles) return;

  const uploadedFiles = Array.isArray(req.files.uploadFiles)
    ? req.files.uploadFiles
    : [req.files.uploadFiles];

  console.log("uploadedFiles.....here", uploadedFiles);

  for (const uploadedFile of uploadedFiles) {
    const fileExtn = uploadedFile.name.split(".").pop().toUpperCase();

    // Extension check
    if (!VALID_FILE_EXTENSIONS.includes(fileExtn)) continue;

    // const projectFolderPath = `${uploadFolder}/${companyId}/${projectId}/${taskId}`;
    const projectFolderPath = path.join(
      uploadFolder,
      String(companyId),
      String(projectId),
      String(taskId)
    );
    if (!fs.existsSync(projectFolderPath))
      fs.mkdirSync(projectFolderPath, { recursive: true });

    // const targetPath = `${projectFolderPath}/${uploadedFile.name}`;
    const targetPath = path.join(projectFolderPath, uploadedFile.name);

    await uploadedFile.mv(targetPath);

    // Magic-byte validation
    const signatures = MAGIC_SIGNATURES[fileExtn] || [];
    if (signatures.length > 0) {
      try {
        const magic = readMagicBytes(targetPath);
        const valid = signatures.some((sig) => magic.startsWith(sig));
        if (!valid) {
          fs.unlinkSync(targetPath); // remove invalid file
          console.warn(
            `File ${uploadedFile.name} failed magic-byte validation.`
          );
          continue; // skip this file
        }
      } catch (err) {
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        console.error(`Magic-byte check failed for ${uploadedFile.name}:`, err);
        continue;
      }
    }

    // Save metadata to DB
    const uploadFileDoc = new UploadFile({
      fileName: uploadedFile.name,
      taskId,
      projectId,
      companyId,
      createdBy,
      status,
      createdOn: new Date(),
      isDeleted: false,
    });

    console.log(uploadFileDoc, "from uploadFileDoc")

    const savedDoc = await uploadFileDoc.save();

    // Push file info to task's uploadFiles array
    await Task.findByIdAndUpdate(taskId, {
      $push: {
        uploadFiles: {
          _id: savedDoc._id,
          fileName: uploadedFile.name,
        },
      },
    });
  }
}

module.exports = { validateAndSaveFiles };

// const fs = require("fs");
// const { UploadFile } = require("../models/upload-file/upload-file-model");
// const Task = require("../models/task/task-model");
// const { VALID_FILE_EXTENSIONS } = require("./constants");

// async function validateAndSaveFiles(
//   req,
//   companyId,
//   projectId,
//   taskId,
//   uploadFolder,
//   userId
// ) {
//   if (!req.files || !req.files.uploadFiles) return;

//   const uploadedFiles = Array.isArray(req.files.uploadFiles)
//     ? req.files.uploadFiles
//     : [req.files.uploadFiles];

//   console.log("uploadedFiles.....", uploadedFiles);

//   for (const uploadedFile of uploadedFiles) {
//     const fileExtn = uploadedFile.name.split(".").pop().toUpperCase();
//     if (!VALID_FILE_EXTENSIONS.includes(fileExtn)) continue;

//     const projectFolderPath = `${uploadFolder}/${companyId}/${projectId}/${taskId}`;
//     if (!fs.existsSync(projectFolderPath))
//       fs.mkdirSync(projectFolderPath, { recursive: true });

//     await uploadedFile.mv(`${projectFolderPath}/${uploadedFile.name}`);

//     const uploadFileDoc = new UploadFile({
//       fileName: uploadedFile.name,
//       taskId,
//       projectId,
//       companyId,
//       createdBy: userId,
//       createdOn: new Date(),
//       isDeleted: false,
//     });

//     await uploadFileDoc.save();

//     // Push file info to task's uploadFiles array
//     await Task.findByIdAndUpdate(taskId, {
//       $push: {
//         uploadFiles: {
//           _id: uploadFileDoc._id,
//           fileName: uploadedFile.name,
//         },
//       },
//     });
//   }
// }

// module.exports = { validateAndSaveFiles };
