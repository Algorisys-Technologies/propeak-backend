const mongoose = require('mongoose');


// Define the database model
const UploadFileSchema = new mongoose.Schema({
  isDeleted: {
    type: Boolean
  },
  fileName : {
    type: String
  },
  createdOn:{
      type:Date
  },
  createdBy: {
    type: String
  },
  projectId: {

    type: mongoose.Schema.Types.ObjectId,
    ref: "project"
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "task"
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "company"
  }
}, { versionKey: false });

 module.exports = {UploadFile :mongoose.model('uploadFile', UploadFileSchema),UploadFileSchema:UploadFileSchema};