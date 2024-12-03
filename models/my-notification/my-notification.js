const mongoose = require('mongoose');
const Schema = mongoose.Schema;
//const {HideNotification,HideNotificationSchema} = require('./hidenotification');

// Define the database model
const MyNotificationSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    subject: {
        type: String
    },
    url: {
        type: String
    },
    read: {
        type: Boolean
    },
    createdOn: {
        type: String
    },
    createdBy: {
        type: String
    },
    modifiedOn:{
        type: String
    },
    modifiedBy: {
        type: String
    }
}, { versionKey: false });

const MyNotification = module.exports = mongoose.model('mynotification', MyNotificationSchema);