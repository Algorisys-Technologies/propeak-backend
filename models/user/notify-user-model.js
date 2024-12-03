const mongoose = require('mongoose');


// Define the database model
const NotifyUserSchema = new mongoose.Schema({
  name: {
    type: String
  },
  userId: {
    type: String
  },
  emailId: {
    type: String
  }
}, { versionKey: false });



module.exports = {NotifyUsers:mongoose.model('notifyUser', NotifyUserSchema),NotifyUserSchema:NotifyUserSchema};