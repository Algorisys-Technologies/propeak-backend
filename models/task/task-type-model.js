const mongoose = require('mongoose');

// Define the database model
const TaskTypeSchema = new mongoose.Schema({
  displayName: {
    type: String
  },
  title:{
    type: String
  }
}, { versionKey: false });

// Use the unique validator plugin
// UserSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

const TaskType = module.exports = mongoose.model('taskType', TaskTypeSchema);