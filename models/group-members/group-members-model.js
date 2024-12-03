const mongoose = require('mongoose');


// Define the database model
const GroupMembersSchema = new mongoose.Schema({
  id: {
    type: String
  },
  name: {
    type: String
  }
}, { versionKey: false });



module.exports = {GroupMembers:mongoose.model('groupmember', GroupMembersSchema),GroupMembersSchema:GroupMembersSchema};