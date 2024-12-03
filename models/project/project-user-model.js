const mongoose = require('mongoose');


// Define the database model
const ProjectUserSchema = new mongoose.Schema({
  name: {
    type: String
  },
  userId: {
    type: String
  }
}, { versionKey: false });



module.exports = {ProjectUsers:mongoose.model('projectuser', ProjectUserSchema),ProjectUserSchema:ProjectUserSchema};