const mongoose = require('mongoose');

//Defination the database model
const LeaveTypeSchema = new mongoose.Schema({
    id:{
        type:String
    },
    leaveType : {
        type:String
    },
    isActive:{
        type: String
    }
}, { collection: 'leavetype' },{ versionKey: false })
const LeaveType = module.exports = mongoose.model("leavetype",LeaveTypeSchema);