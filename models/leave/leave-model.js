const mongoose = require('mongoose');
//Database model
const LeaveApplicationSchema = new mongoose.Schema({
    userId: { type: String },//logged in userId
    userName: { type: String },//userName,
    fromEmail: { type: String },//emailId[0].email,
    fromDate: { type: String }, //this.state.fromDate,
    toDate: { type: String },//this.state.toDate,
    workingDays: { type: String },//this.state.workingDays,
    reason: { type: String },//this.state.leaveReason,
    leaveTypeId: { type: String },//leave type id for calculating the number of days pending
    leaveType: { type: String },//this.state.leaveType,
    status: { type: String },//1- pending 2- Approved 3- Rejected,
    rejectionReason: { type: String },
    leaveCategory: { type: String },
    createdBy: { type: String },//createdBy,
    createdOn: { type: String },//createdOn,
    modifiedBy: { type: String },//modifiedBy,
    modifiedOn: { type: String },
    isDeleted: { type: Boolean },//"false"
    leaveWithoutApproval: { type: Boolean }
}, { collection: 'leaveapplications' }, { versionKey: true })
const LeaveApplication = module.exports = mongoose.model("leaveapplications", LeaveApplicationSchema)
