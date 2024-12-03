const mongoose = require('mongoose');


// Define the database model
const MessageSchema = new mongoose.Schema({
  title: {
    type: String
  },
  isDeleted: {
    type: Boolean
  },
  createdOn: {
    type: Date
  },
  createdBy: {
    type: String,
    ref: "user"
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project"
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "task"
  }
}, { versionKey: false });
//module.exports =MessageSchema;
module.exports = { Message: mongoose.model('message', MessageSchema), MessageSchema: MessageSchema };