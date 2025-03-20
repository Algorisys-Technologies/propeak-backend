const Meeting = require("../../models/meeting/meeting-model");
const rabbitMQ = require("../../rabbitmq");
const nodemailer = require("nodemailer");
const User = require("../../models/user/user-model");
const Project = require("../../models/project/project-model");
const activeClients = new Map();
const config = require("../../config/config");

const errors = {
  REGISTER_EMAIL_TAKEN: "Email is unavailable",
  RESET_PASSWORD: "An error has occured while reseting password",
  REGISTER_GENERAL_ERROR: "An error has occured while adding/updating user",
  LOGIN_INVALID: "Invalid Email/Password combination",
  LOGIN_GENERAL_ERROR: "Invalid user credentials",
  RESET_EXPIRE: "Your link has expired, kindly reset again",
  PASSWORDS_DONT_MATCH: "Passwords do not match",
  LOGIN_GENERAL_ERROR_DELETE: "An error has occured while deleting user",
  NOT_AUTHORIZED: "Your are not authorized",
};

exports.createMeeting = async (req, res) => {
  try {
    const {
      projectId,
      userId,
      startLocation,
      meetingDescription,
      createdBy,
      companyId,
    } = req.body;

    const newMeeting = await Meeting.create({
      projectId,
      userId,
      startTime: new Date(),
      startLocation,
      meetingDescription,
      createdBy,
      companyId,
      status: "LIVE",
    });

    const companyClients = activeClients.get(companyId);
    if (companyClients) {
      companyClients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "start-meeting",
            userId,
            companyId,
            status: "LIVE",
          })
        );
      });
    }

    return res.status(201).json({
      success: true,
      message: "Meeting started successfully",
      data: newMeeting,
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.endMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { endLocation, meetingDescription } = req.body;

    // Update meeting details
    const meeting = await Meeting.findByIdAndUpdate(
      id,
      {
        endTime: new Date(),
        endLocation,
        meetingDescription,
        status: "COMPLETED",
      },
      { new: true }
    );

    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    // Fetch the owner (ADMIN) of the company
    const owner = await User.findOne({
      role: "ADMIN",

      companyId: meeting.companyId,
    });

    if (!owner || !owner.email) {
      console.error("owner not found for company:", meeting.companyId);
    } else {
      console.log("Publishing meeting email job to RabbitMQ...");

      const mailOptions = {
        from: config.from,
        to: owner.email,
        subject: "ProPeak Management System - Meeting Summary",
        html: `
          <p>Dear ${owner.name || "Sir"},</p>
      
          <p>The meeting has been successfully completed in the <strong>ProPeak Management System</strong>.</p>
      
          <p><strong>Meeting Details:</strong></p>
          <ul>
            <li><strong>Start Time:</strong> ${new Date(
              meeting.startTime
            ).toLocaleString()}</li>
            <li><strong>Start Location:</strong> ${
              meeting.startLocation || "Not provided"
            }</li>
            <li><strong>End Time:</strong> ${new Date(
              meeting.endTime
            ).toLocaleString()}</li>
            <li><strong>End Location:</strong> ${
              meeting.endLocation || "Not provided"
            }</li>
            <li><strong>Description:</strong> ${
              meeting.meetingDescription || "No description provided"
            }</li>
          </ul>
      
          <p>If you have any questions, please contact your administrator.</p>
      
          <p>Best Regards,</p>
          <p><strong>ProPeak Team</strong></p>
        `,
      };

      // Publish email job to RabbitMQ
      await rabbitMQ.sendMessageToQueue(
        mailOptions,
        "message_queue",
        "msgRoute"
      );

      console.log("Meeting email job published to RabbitMQ");
    }

    // Notify active clients about meeting completion
    const companyClients = activeClients.get(meeting.companyId);
    if (companyClients) {
      companyClients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "end-meeting",
            userId: meeting.userId,
            companyId: meeting.companyId,
            status: "COMPLETED",
          })
        );
      });
    }

    return res.status(200).json({
      success: true,
      message: "Meeting ended successfully",
      data: meeting,
    });
  } catch (error) {
    console.error("Error ending meeting:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      companyId: req.query.companyId,
      // projectId: req.query.projectId,
    }).lean();

    return res.status(200).json({
      success: true,
      message: "Meetings fetched successfully",
      data: meetings,
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
exports.getAllMeetings = async (req, res) => {
  try {
    const { companyId, currentPage = 1, limit = 5 } = req.body;
    console.log(companyId, "is this company id is coming ");

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required.",
      });
    }

    const page = Math.max(Number(currentPage), 1); // Ensure page is at least 1
    const skip = (page - 1) * limit;

    // const meetings = await Meeting.find({ companyId })
    //   .skip(skip)
    //   .limit(Number(limit))
    //   .lean();
    const meetings = await Meeting.find({ companyId })
      .populate({
        path: "userId",
        select: "name", // Fetch only the name field of the user
      })
      .populate({
        path: "projectId",
        select: "title", // Fetch only the title field of the project
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();
    const totalMeetings = await Meeting.countDocuments({ companyId });
    const totalPages = Math.ceil(totalMeetings / limit);

    return res.status(200).json({
      success: true,
      message: "Meetings fetched successfully",
      data: meetings,
      totalPages,
      currentPage: page,
      totalMeetings,
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
