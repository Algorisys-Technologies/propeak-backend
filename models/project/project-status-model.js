const mongoose = require('mongoose');

// Define the database model
const ProjectStatusSchema = new mongoose.Schema({
  displayName: {
    type: String
  },
  title:{
    type: String
  }
}, { collection: 'projectstatus' },{ versionKey: false });

// Use the unique validator plugin
// UserSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

const ProjectStatus = module.exports = mongoose.model('projectstatus', ProjectStatusSchema);