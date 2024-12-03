const express = require('express');
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var leaveApplication_controller = require('../../controllers/leaves/leaves-controller');
const checkRole = require("../../verify-token/check-role");
//Read All LeaveTypes
router.get('/', verifyToken, leaveApplication_controller.leaveTypes_get_all);

//saving data
router.post("/", verifyToken, leaveApplication_controller.leaveApplicationSave);

//listpage
router.post("/getAllLeaves/", verifyToken, leaveApplication_controller.getAllLeaves);

//getting details of leave
router.get("/getDetails/:leaveId", verifyToken, leaveApplication_controller.getDetails);

//Setting approved reject of leaves
router.post("/approveReject/", verifyToken, leaveApplication_controller.approveReject);

//editing the pending request
router.post("/editLeave/", verifyToken, leaveApplication_controller.editLeave);

//deletethe pending request
router.post("/deleteLeave/", verifyToken, leaveApplication_controller.deleteLeave);

//Approve the pending request
router.post("/approveLeave/", verifyToken, leaveApplication_controller.approveLeave);

//get all holidays
router.get("/getHolidays/", verifyToken, leaveApplication_controller.getHolidays);

//get all LeavesDetails ForCalendar
// router.get("/getAllLeavesForCalendar/", verifyToken, leaveApplication_controller.getAllLeavesForCalendar);


//check the eligibility for leave
router.post("/checkEligibility/", verifyToken, leaveApplication_controller.CheckForBalanceLeaves);

//getallleaves for admin
router.get("/getAllAppliedLeavesforAdmin/", verifyToken, checkRole, leaveApplication_controller.getAllAppliedLeavesforAdmin);


router.post("/getUserOnLeaveDetails/", verifyToken, leaveApplication_controller.getUserOnLeaveDetails);

module.exports = router;