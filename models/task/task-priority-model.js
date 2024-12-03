const mongoose = require('mongoose');


// Define the database model
const TaskPrioritySchema = new mongoose.Schema({
    priority: {
    type: String
  },
  displayName: {
    type: String
  },
},{ collection: 'taskpriorities' }, { versionKey: false });

const TaskPriority = module.exports = mongoose.model('taskPriority', TaskPrioritySchema);

