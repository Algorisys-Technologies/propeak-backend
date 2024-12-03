const LeaveApplication = require("../../models/leave/leave-model");
const userModel = require("../../models/user/user-model");
const LeaveType = require("../../models/leave/leave-type-model");
const Holiday = require("../../models/leave/holiday-model");
const holidayValidation = require("../../models/leave/holiday-validation");
const leaveValidation = require("../../models/leave/leave-validation");
const config = require("../../config/config");
const { sendEmail } = require("../../common/mailer");
const Leaves = require("../../models/leave/leave-rule-model");
const { logInfo } = require("../../common/logger");
const dateUtil = require("../../utils/date-util");
const pascalCase = require("pascal-case");

//Get all Leave Types
exports.leaveTypes_get_all = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find({ isActive: "true" });
    res.json(leaveTypes);
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

exports.getUserOnLeaveDetails = async (req, res) => {
  let todaysDate = dateUtil.DateToString(new Date());
  let userId = req.body.userId;

  try {
    const leaves = await LeaveApplication.find({
      isDeleted: false,
      userId: userId,
    }, {
      _id: 1,
      leaveType: 1,
      status: 1,
      userName: 1,
      fromEmail: 1,
      fromDate: 1,
      toDate: 1,
      workingDays: 1,
      createdOn: 1,
      leaveWithoutApproval: 1,
    });

    let onLeave = leaves.some(leave => {
      let startDate = dateUtil.DateToString(leave.fromDate);
      let endDate = dateUtil.DateToString(leave.toDate);
      return startDate === todaysDate || endDate === todaysDate;
    });

    res.json({ data: onLeave ? "On Leave" : "" });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

exports.getAllAppliedLeavesforAdmin = async (req, res) => {
  try {
    const leaves = await LeaveApplication.find({ isDeleted: false }, {
      _id: 1,
      leaveType: 1,
      status: 1,
      createdOn: 1,
      userName: 1,
      fromEmail: 1,
      fromDate: 1,
      toDate: 1,
      workingDays: 1,
      leaveWithoutApproval: 1,
    });

    const formattedLeaves = leaves.map(leave => ({
      leaveId: leave._id,
      userName: leave.userName,
      createdOn: dateUtil.DateToString(leave.createdOn),
      fromEmail: leave.fromEmail,
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      workingDays: leave.workingDays,
      leaveType: leave.leaveType,
      status: pascalCase(leave.status),
      leaveWithoutApproval: leave.leaveWithoutApproval,
    }));

    res.json(formattedLeaves);
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

exports.leaveApplicationSave = async (req, res) => {
  let newLeaveApplication = new LeaveApplication({
    ...req.body.leaveApplication,
    status: "pending",
    rejectionReason: "",
  });

  try {
    const result = await newLeaveApplication.save();
    logInfo(result, "Applied for leave");

    const loggedInUserId = req.userInfo.userId;
    const emailDetails = await getEmailDetails(loggedInUserId, req.body.leaveApplication);
    const mailOptions = buildMailOptions(req.body.leaveApplication.fromEmail, emailDetails);

    if (config.prodMode === "ON") {
      const response = await sendEmail(mailOptions);
      handleEmailResponse(response, mailOptions.to);
    } else {
      mailOptions.to = config.defaultEmail;
      const response = await sendEmail(mailOptions);
      handleEmailResponse(response, mailOptions.to);
    }

    res.json({ success: true, message: "Leave has been applied successfully." });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

const getEmailDetails = async (userId, leaveApplication) => {
  const user = await userModel.findOne({ _id: userId }, { reportingManagerId: 1 });
  const manager = await userModel.findOne({ _id: user.reportingManagerId });

  let toEmail = manager ? manager.email : config.defaultEmail;

  let bodyHtml = config.leaveEmailContent
    .replace("{fromDate}", leaveApplication.fromDate)
    .replace("{toDate}", leaveApplication.toDate)
    .replace("{workingDays}", leaveApplication.workingDays)
    .replace("{leaveType}", leaveApplication.leaveType)
    .replace("{reason}", leaveApplication.reason)
    .replace("{leaveId}", leaveApplication._id);

  let subject = config.leaveSubject
    .replace("{fromDate}", leaveApplication.fromDate)
    .replace("{toDate}", leaveApplication.toDate)
    .replace("{userName}", leaveApplication.userName);

  return { toEmail, subject, bodyHtml };
};

const buildMailOptions = (fromEmail, emailDetails) => ({
  from: fromEmail,
  to: emailDetails.toEmail,
  subject: emailDetails.subject,
  html: emailDetails.bodyHtml,
  cc: config.applytoEmail,
});

const handleEmailResponse = (response, toEmail) => {
  if (response.response) {
    logInfo(response, `Error occurred while sending email to ${toEmail}`);
  } else {
    logInfo(`An email has been sent to ${toEmail} with further instructions.`);
  }
};

exports.getAllLeaves = async (req, res) => {
  console.log("in get all leave")
  const { userRole, userId } = req.userInfo;
  let appliedLeaves = [], userAppliedLeaves = [];

  try {
    const leaves = await LeaveApplication.find({ userId, isDeleted: false });

    if (req.params.flag === "applied") {
      appliedLeaves = leaves.map(leave => ({
        leaveId: leave._id,
        leaveType: leave.leaveType,
        createdOn: dateUtil.DateToString(leave.createdOn),
        status: pascalCase(leave.status),
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        workingDays: leave.workingDays,
        leaveWithoutApproval: leave.leaveWithoutApproval,
      }));

      
      return res.json({ success: true, appliedLeaves, userAppliedLeaves });
    }

    const users = await userModel.find({ reportingManagerId: userId });
    const userIds = users.map(user => user._id);

    const userLeaves = await LeaveApplication.find({
      userId: { $in: userIds },
      status: req.params.flag === "pending" ? "pending" : { $in: ["approved", "rejected"] },
      isDeleted: false,
    });

    userAppliedLeaves = userLeaves.map(leave => ({
      leaveId: leave._id,
      leaveType: leave.leaveType,
      status: pascalCase(leave.status),
      userName: leave.userName,
      fromEmail: leave.fromEmail,
      createdOn: dateUtil.DateToString(leave.createdOn),
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      workingDays: leave.workingDays,
      leaveWithoutApproval: leave.leaveWithoutApproval,
    }));

    return res.json({ success: true, appliedLeaves, userAppliedLeaves });
  } catch (err) {
    return res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

exports.getDetails = async (req, res) => {
  try {
    const leaveDetails = await LeaveApplication.findById(req.params.leaveId);
    res.json({ success: true, leaveDetails });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

exports.approveReject = async (req, res) => {
  let loggedInUser = req.userInfo;
  let leaveApplication = {
    status: req.body.approvedRejected,
    rejectionReason: req.body.reasonRejection,
    modifiedBy: req.body.modifiedBy,
    modifiedOn: req.body.modifiedOn,
    leaveWithoutApproval: req.body.leaveWithoutApproval,
  };

  try {
    const result = await LeaveApplication.findByIdAndUpdate(req.body.leaveId, leaveApplication, { new: true });
    const emailDetails = {
      toEmail: req.body.toEmail,
      subject: config.approveRejectSubject
        .replace("{status}", leaveApplication.status)
        .replace("{fromDate}", result.fromDate)
        .replace("{toDate}", result.toDate),
      bodyHtml: config.approveRejectEmailContent
        .replace("{leaveStatus}", leaveApplication.status)
        .replace("{loggedInUser}", loggedInUser.userName)
        .replace("{reasonOfRejection}", leaveApplication.rejectionReason)
    };

    const mailOptions = buildMailOptions(req.body.fromEmail, emailDetails);
    const response = config.prodMode === "ON" ? await sendEmail(mailOptions) : await sendEmail({ ...mailOptions, to: config.defaultEmail });

    handleEmailResponse(response, mailOptions.to);

    res.json({ success: true, message: `Leave has been ${leaveApplication.status}` });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};


// Helper function for sending emails
const sendEmailWithFallback = async (mailOptions) => {
  try {
    if (config.prodMode === "ON") {
      const response = await sendEmail(mailOptions);
      if (response.response) {
        logInfo(response, `Error occurred while sending email to ${mailOptions.to}`);
      } else {
        logInfo(`An email has been sent to ${mailOptions.to} with further instructions.`);
      }
    } else {
      mailOptions.to = config.defaultEmail;
      const response = await sendEmail(mailOptions);
      if (response.response) {
        logInfo(response, `Error occurred while sending email to ${mailOptions.to}`);
      } else {
        logInfo(`An email has been sent to ${mailOptions.to} with further instructions.`);
      }
    }
  } catch (error) {
    logInfo(error, `Failed to send email to ${mailOptions.to}`);
  }
};

// Edit Leave
exports.editLeave = async (req, res) => {
  const newLeaveApplication = {
    userId: req.userInfo.userId,
    userName: req.body.userName,
    fromEmail: req.body.fromEmail,
    fromDate: req.body.fromDate,
    toDate: req.body.toDate,
    workingDays: req.body.workingDays,
    reason: req.body.reason,
    leaveType: req.body.leaveType,
    modifiedBy: req.body.modifiedBy,
    modifiedOn: req.body.modifiedOn,
    isDeleted: req.body.isDeleted,
    status: "pending",
    rejectionReason: "",
    leaveWithoutApproval: req.body.leaveWithoutApproval,
  };

  try {
    const result = await LeaveApplication.findOneAndUpdate(
      { _id: req.body.leaveId },
      newLeaveApplication,
      { context: "query", new: true }
    );
    logInfo(result, "Leave application updated");

    const user = await userModel.findById(req.userInfo.userId, { reportingManagerId: 1 });
    const manager = await userModel.findById(user.reportingManagerId);
    const toEmail = manager ? manager.email : config.defaultEmail;

    const bodyHtml = config.leaveEmailContent
      .replace("{fromDate}", req.body.fromDate)
      .replace("{toDate}", req.body.toDate)
      .replace("{workingDays}", req.body.workingDays)
      .replace("{leaveType}", req.body.leaveType)
      .replace("{reason}", req.body.reason)
      .replace("{leaveId}", result._id);

    const subject = config.leaveSubject
      .replace("{fromDate}", req.body.fromDate)
      .replace("{toDate}", req.body.toDate)
      .replace("{userName}", req.body.userName);

    const mailOptions = {
      from: req.body.fromEmail,
      to: toEmail,
      cc: config.applytoEmail,
      subject: subject,
      html: bodyHtml,
    };

    await sendEmailWithFallback(mailOptions);

    res.json({
      success: true,
      message: "Leave has been re-applied successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

// Delete Leave
exports.deleteLeave = async (req, res) => {
  try {
    const result = await LeaveApplication.findOneAndUpdate(
      { _id: req.body.leaveId },
      {
        $set: {
          isDeleted: true,
          modifiedOn: new Date(),
          modifiedBy: req.userInfo.userId,
        },
      },
      { new: true }
    );
    res.json({
      success: true,
      msg: "It has been deleted.",
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

// Approve Leave
exports.approveLeave = async (req, res) => {
  try {
    const result = await LeaveApplication.findOneAndUpdate(
      { _id: req.body.leaveId },
      {
        $set: {
          status: "Approved",
          modifiedOn: new Date(),
          modifiedBy: req.userInfo.userId,
        },
      },
      { new: true }
    );
    res.json({
      success: true,
      msg: "It has been approved.",
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

// Get Holiday List
exports.getHolidays = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const holidays = await Holiday.find({ year: currentYear, isActive: "1" });

    const holidayList = holidays.map(holiday => ({
      date: `${holiday.date}-${holiday.monthName}-${holiday.year}`,
      holiday: holiday.description,
    }));

    res.json({
      success: true,
      holidayList,
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

// Check for Balance Leaves
exports.CheckForBalanceLeaves = async (req, res) => {
  leaveValidation.init();
  const loggedInUserId = req.userInfo.userId;
  const newLeaveApplication = new LeaveApplication({
    fromDate: req.body.fromDate,
    toDate: req.body.toDate,
    workingDays: req.body.workingDays,
    reason: req.body.reason,
    leaveTypeId: req.body.leaveTypeId,
    leaveType: req.body.leaveType,
    leaveCategory: req.body.leaveCategory,
  });

  try {
    const approvedLeaves = await LeaveApplication.find({
      leaveTypeId: newLeaveApplication.leaveTypeId,
      userId: loggedInUserId,
      status: "approved",
      isDeleted: false,
    });

    const leavesTaken = approvedLeaves.reduce((total, leave) => {
      const fromDate = new Date(leave.fromDate).getTime();
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const financialYearStartDate = new Date(currentYear, 3, 1).getTime();
      const financialYearEndDate = new Date(currentYear + 1, 2, 31).getTime();

      if (fromDate >= financialYearStartDate && fromDate <= financialYearEndDate) {
        return total + parseFloat(leave.workingDays);
      }
      return total;
    }, 0);

    const totalLeaves = await Leaves.findOne({
      leaveTypeId: newLeaveApplication.leaveTypeId,
      financialyear: currentYear,
    });

    const validationResult = leaveValidation.checkForBalance(
      leavesTaken,
      newLeaveApplication.workingDays,
      newLeaveApplication.leaveTypeId,
      totalLeaves.maxinyear,
      totalLeaves.months || "",
      config.monthStart
    );

    res.json({
      success: true,
      leaveValidationResult: validationResult,
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

// Get All Holidays
exports.getAllHolidays = async (req, res) => {
  const currentYear = req.params?.year || new Date().getFullYear();

  try {
    const holidays = await Holiday.find({ year: currentYear }, { monthName: 1, month: 1, date: 1, description: 1, year: 1 });
    res.json({
      success: true,
      list: holidays,
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};

// Get All Leaves for Calendar
exports.getAllLeavesForCalendar = async (req, res) => {
  try {
    const leaves = await LeaveApplication.find(
      { isDeleted: false, status: "approved" },
      { _id: 1, leaveType: 1, status: 1, userName: 1, fromDate: 1, toDate: 1, workingDays: 1 }
    );

    const userReportsData = leaves.map(d => {
      const d1 = new Date(d.toDate);
      d1.setDate(d1.getDate() + 1);
      const endDate = dateUtil.DateToString(d1);

      return {
        id: d._id,
        start: d.fromDate,
        end: endDate,
        title: `${d.leaveType} - ${d.userName}`,
        leaveType: d.leaveType,
      };
    });

    res.json({
      success: true,
      result: userReportsData,
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: `Something went wrong ${err}` });
  }
};
