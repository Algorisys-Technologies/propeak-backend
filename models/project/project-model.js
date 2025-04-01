const mongoose = require("mongoose");
const { Message, MessageSchema } = require("../message/message-model");

// Define the database model
const ProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    startdate: {
      type: Date,
    },
    tag: [
      {
        type: String,
      },
    ],
    enddate: {
      type: Date,
    },
    status: {
      type: String,
    },
    projectStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "projectStage",
    },
    taskStages: {
      type: Array,
    },
    userid: {
      type: String,
    },
    createdBy: {
      type: String,
    },
    createdOn: {
      type: Date,
    },
    modifiedBy: {
      type: String,
    },
    modifiedOn: {
      type: Date,
    },
    sendnotification: {
      type: Boolean,
    },
    companyId: {
      type: String,
    },
    userGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userGroup",
      },
    ],
    // group: {
    //   type: String,
    // },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "groupMaster",
      default: null,
    },
    projectType: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
    },
    miscellaneous: {
      type: Boolean,
    },
    archive: {
      type: Boolean,
    },
    customFieldValues: {
      type: Map,
    },
    projectUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "projectuser",
      },
    ],
    notifyUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "notifyuser",
      },
    ],

    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "message",
      },
    ],
    uploadFiles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "uploadFile",
      },
    ],
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "task",
      },
    ],

    customTaskFields: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "custom-task-field",
      },
    ],

    projectTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "projecttype",
    },
    creation_mode: {
      type: String,
      enum: ["AUTO", "MANUAL"],
    },
    lead_source: {
      type: String,
      enum: ["INDIAMART", "EMAIL", "USER", "EXCEL", "OTHERS"],
    },
  },
  { versionKey: false }
);

const Project = (module.exports = mongoose.model("project", ProjectSchema));

// const mongoose = require("mongoose");
// // const Category = require('../models/category');
// // const {User,UserSchema} = require('./user');
// const {
//   ProjectUsers,
//   ProjectUserSchema,
// } = require("../project/project-user-model");
// const { NotifyUsers, NotifyUserSchema } = require("../user/notify-user-model");
// const { UserGroups, UserGroupSchema } = require("../user/user-group-model");
// const { Message, MessageSchema } = require("../message/message-model");
// const {
//   UploadFile,
//   UploadFileSchema,
// } = require("../upload-file/upload-file-model");
// const { Tasks, TaskSchema } = require("../task/task-model");
// const {
//   CustomTaskField,
//   CustomTaskFieldSchema,
// } = require("./custom-task-field-model");

// // Define the database model
// const ProjectSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//     },
//     description: {
//       type: String,
//     },
//     startdate: {
//       type: String,
//     },
//     enddate: {
//       type: String,
//     },
//     status: {
//       type: String,
//     },
//     category: {
//       type: String,
//     },
//     userid: {
//       type: String,
//     },
//     createdBy: {
//       type: String,
//     },
//     createdOn: {
//       type: String,
//     },
//     modifiedBy: {
//       type: String,
//     },
//     modifiedOn: {
//       type: String,
//     },
//     sendnotification: {
//       type: String,
//     },
//     companyId: {
//       type: String,
//     },
//     userGroups: [UserGroupSchema],
//     group: {
//       type: String,
//     },
//     isDeleted: {
//       type: Boolean,
//     },
//     miscellaneous: {
//       type: Boolean,
//     },
//     archive: {
//       type: Boolean,
//     },
//     customFieldValues: {
//       type: Map,
//     },
//     projectUsers: [ProjectUserSchema],
//     notifyUsers: [NotifyUserSchema],

//     // period:{
//     //   type:String
//     // },

//     messages: [MessageSchema],
//     uploadFiles: [UploadFileSchema],
//     tasks: [TaskSchema],

//     customTaskFields: [CustomTaskFieldSchema],

//     projectTypeId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "projecttype",
//     },
//   },
//   { versionKey: false }
// );

// // // Use the unique validator plugin
// // ProjectSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

// const Project = (module.exports = mongoose.model("project", ProjectSchema));
