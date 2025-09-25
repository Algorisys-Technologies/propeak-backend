const fs = require("fs");
const { UploadFile } = require("../models/upload-file/upload-file-model");
const Task = require("../models/task/task-model");
const { VALID_FILE_EXTENSIONS } = require("./constants");

async function validateAndSaveFiles(
  req,
  companyId,
  projectId,
  taskId,
  uploadFolder,
  userId
) {
  if (!req.files || !req.files.uploadFiles) return;

  const uploadedFiles = Array.isArray(req.files.uploadFiles)
    ? req.files.uploadFiles
    : [req.files.uploadFiles];

  console.log("uploadedFiles.....", uploadedFiles);

  for (const uploadedFile of uploadedFiles) {
    const fileExtn = uploadedFile.name.split(".").pop().toUpperCase();
    if (!VALID_FILE_EXTENSIONS.includes(fileExtn)) continue;

    const projectFolderPath = `${uploadFolder}/${companyId}/${projectId}/${taskId}`;
    if (!fs.existsSync(projectFolderPath))
      fs.mkdirSync(projectFolderPath, { recursive: true });

    await uploadedFile.mv(`${projectFolderPath}/${uploadedFile.name}`);

    const uploadFileDoc = new UploadFile({
      fileName: uploadedFile.name,
      taskId,
      projectId,
      companyId,
      createdBy: userId,
      createdOn: new Date(),
      isDeleted: false,
    });

    await uploadFileDoc.save();

    // Push file info to task's uploadFiles array
    await Task.findByIdAndUpdate(taskId, {
      $push: {
        uploadFiles: {
          _id: uploadFileDoc._id,
          fileName: uploadedFile.name,
        },
      },
    });
  }
}

module.exports = { validateAndSaveFiles };

// const fs = require("fs");
// const UploadFile = require("../models/upload-file/upload-file-model");
// const Task = require("../models/task/task-model");

// // ✅ Magic number signatures for allowed file types
// const magicNumbers = {
//   PDF: [0x25, 0x50, 0x44, 0x46],
//   DOCX: [0x50, 0x4b, 0x03, 0x04],
//   PPTX: [0x50, 0x4b, 0x03, 0x04],
//   XLSX: [0x50, 0x4b, 0x03, 0x04],
//   PNG: [0x89, 0x50, 0x4e, 0x47],
//   JPG: [0xff, 0xd8, 0xff],
//   JPEG: [0xff, 0xd8, 0xff],
//   TXT: null,
//   PPT: null,
//   XLS: null,
// };

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

//   const validFileExtn = Object.keys(magicNumbers);

//   for (const uploadedFile of uploadedFiles) {
//     const fileExtn = uploadedFile.name.split(".").pop().toUpperCase();
//     if (!validFileExtn.includes(fileExtn)) continue;

//     // ✅ Check magic numbers if defined
//     const fileBuffer = uploadedFile.data.slice(0, 4);
//     const fileHeader = Array.from(fileBuffer);

//     if (magicNumbers[fileExtn]) {
//       const expected = magicNumbers[fileExtn];
//       const isValid = expected.every((byte, idx) => fileHeader[idx] === byte);
//       if (!isValid) {
//         console.warn(`Magic number mismatch for file: ${uploadedFile.name}`);
//         continue; // skip invalid files
//       }
//     }

//     // ✅ Ensure directory exists
//     const projectFolderPath = `${uploadFolder}/${companyId}/${projectId}/${taskId}`;
//     if (!fs.existsSync(projectFolderPath))
//       fs.mkdirSync(projectFolderPath, { recursive: true });

//     // ✅ Move file to destination
//     await uploadedFile.mv(`${projectFolderPath}/${uploadedFile.name}`);

//     // ✅ Save in UploadFile collection
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

//     // ✅ Push reference to Task.uploadFiles
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
