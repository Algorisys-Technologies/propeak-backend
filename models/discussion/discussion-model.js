const mongoose = require('mongoose');
// const {ReplyMessage,ReplyMessageSchema} = require('./replyMessage');

const DiscussionSchema = new mongoose.Schema({
    title: {
      type: String
    },
    projectId: {
      type: String
    },
    createdOn: {
      type: Date 
    },
    createdBy: {
      type: String //UTC date
    },
    isDeleted: {
      type: Boolean
    },
    replyMessages: []
  },{ versionKey: false });

module.exports = { Discussion: mongoose.model('discussion', DiscussionSchema), DiscussionSchema:DiscussionSchema };