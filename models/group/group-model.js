const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    groupName: {
        type: String,
        required: true,
    },
    groupMembers: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User', 
    },
    isDeleted: {
        type: Boolean,
        default: false, 
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company', 
        required: true, 
    }
}, { versionKey: false });

const Group = module.exports = mongoose.model('group', GroupSchema);

// const mongoose = require('mongoose');

// // Define the database model
// const GroupSchema = new mongoose.Schema({
//     groupName: {
//         type: String
//     },
//     groupMembers: [],
//     isDeleted: {
//         type: Boolean
//     }
// },{
//     versionKey: false
// });

// const Group = module.exports = mongoose.model('group', GroupSchema);