const mongoose = require('mongoose');


// Define the database model
const UploadGlobalRepositoryFileSchema = new mongoose.Schema({
    title: {
        type: String
    },
    fileName: {
        type: String 
    },
    description: {
        type: String
    },
    path: {
        type: String
    },
    createdOn: {
        type: Date
    },
    isDeleted: {
        type: Boolean
    },
    createdBy: {
        type: String
    },
    companyId:{
        type: String
    },
    isExtracted: {
        type: Boolean,
        default: false
      },
      vfolderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "vfolder"
      },
      accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
      },
      contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "contact",
      }
}, { versionKey: false });



const UploadRepositoryFile = module.exports = mongoose.model('UploadRepositoryFile', UploadGlobalRepositoryFileSchema);