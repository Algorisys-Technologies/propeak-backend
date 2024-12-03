const mongoose = require('mongoose');
//Database model
const LeavesSchema = new mongoose.Schema({
    leaveTypeId: { type: String },//leave type id for calculating the number of days pending
    type: { type: String },//this.state.leaveType,
    maxinyear: { type: String },//1- pending 2- Approved 3- Rejected,
    financialyear: { type: String },
    monthly: { type: String },//createdBy,
    addeom: { type: String },//createdOn,
    months: { type: String },//modifiedBy,
    joinedInMId: { type: String },
    maxaccumulation: { type: String }//"false"
})
const Leaves = module.exports = mongoose.model("leaves", LeavesSchema);