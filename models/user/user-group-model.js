const mongoose = require('mongoose');
const {GroupMembers,GroupMembersSchema} = require('../group-members/group-members-model');

// Define the database model
const UserGroupSchema = new mongoose.Schema({
  groupId: {
    type: String
  },
  groupName: {
    type: String
  },
  groupMembers: [GroupMembersSchema]
}, { versionKey: false });



module.exports = {UserGroups:mongoose.model('userGroup', UserGroupSchema),UserGroupSchema:UserGroupSchema};