const mongoose = require('mongoose');

// Define the database model
const HideNotificationSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    // notificationId: {
    //     type: String
    // }
}, {
    collection: 'hidenotification'
}, {
    versionKey: false
});

//const HideNotification = module.exports = mongoose.model('hidenotification', HideNotificationSchema);

module.exports = {HideNotification:mongoose.model('hidenotification', HideNotificationSchema),HideNotificationSchema:HideNotificationSchema};