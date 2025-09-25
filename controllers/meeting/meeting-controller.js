const mongoose = require("mongoose");
const Meeting = require("../../models/meeting/meeting-model");
const rabbitMQ = require("../../rabbitmq");
const nodemailer = require("nodemailer");
const User = require("../../models/user/user-model");
const Project = require("../../models/project/project-model");
const activeClients = new Map();
const config = require("../../config/config");
const { DEFAULT_PAGE, DEFAULT_QUERY, DEFAULT_LIMIT } = require("../../utils/defaultValues");

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
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    // Fetch the owner (ADMIN) of the company
    const owner = await User.findOne({
      role: "ADMIN",
      companyId: meeting.companyId,
    });

    // Fetch the meeting creator's user details
    const currentUser = await User.findOne({
      _id: meeting.userId,
    });

    console.log(currentUser, "currentUser is here ............");

    let reportingManager = null;
    if (currentUser?.reportingManagerId) {
      reportingManager = await User.findOne({
        _id: currentUser.reportingManagerId,
      });

      console.log(reportingManager, "reportingManager..............");
    }

    if (!owner || !owner.email) {
      console.error("Owner not found for company:", meeting.companyId);
    }

    if (reportingManager?.email) {
      console.log("Publishing meeting email job to RabbitMQ...");

      const mailOptions = {
        from: config.from,
        to: reportingManager.email, // Send email to Reporting Manager
        subject: "ProPeak Management System - Meeting Summary",
        html: `
          <p>Dear ${reportingManager.name || "Sir"},</p>
      
          <p>The meeting has been successfully completed in the <strong>ProPeak Management System</strong>.</p>
      
          <p><strong>Meeting Details:</strong></p>
          <ul>
            <li><strong>Start Time:</strong> ${new Date(meeting.startTime).toLocaleString()}</li>
            <li><strong>Start Location:</strong> ${meeting.startLocation || "Not provided"}</li>
            <li><strong>End Time:</strong> ${new Date(meeting.endTime).toLocaleString()}</li>
            <li><strong>End Location:</strong> ${meeting.endLocation || "Not provided"}</li>
            <li><strong>Description:</strong> ${meeting.meetingDescription || "No description provided"}</li>
          </ul>
      
          <p>If you have any questions, please contact your administrator.</p>
      
          <p>Best Regards,</p>
          <p><strong>ProPeak Team</strong></p>
        `,
      };

      // Publish email job to RabbitMQ
      await rabbitMQ.sendMessageToQueue(mailOptions, "message_queue", "msgRoute");

      console.log("Meeting email job published to RabbitMQ");
    } else {
      console.error("Reporting Manager not found or missing email.");
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
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// exports.endMeeting = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { endLocation, meetingDescription } = req.body;

//     // Update meeting details
//     const meeting = await Meeting.findByIdAndUpdate(
//       id,
//       {
//         endTime: new Date(),
//         endLocation,
//         meetingDescription,
//         status: "COMPLETED",
//       },
//       { new: true }
//     );

//     if (!meeting) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Meeting not found" });
//     }

//     // Fetch the owner (ADMIN) of the company
//     const owner = await User.findOne({
//       role: "ADMIN",
//       companyId: meeting.companyId,
//     });

//     const currentUser = await User.findOne({
//       _id: meeting.userId, // Assuming 'meeting.userId' holds the meeting creator's ID
//     });
//     console.log(currentUser, "currentUser is here ............")

//     if (!currentUser || !currentUser.reportingManagerId) {
//       console.error(
//         "User or Reporting Manager ID not found for meeting:",
//         meeting._id
//       );
//     } else {
//       // Fetch the reporting manager details using the reportingManagerId
//       const reportingManager = await User.findOne({
//         _id: currentUser.reportingManagerId,
//       });
//       console.log(reportingManager, "reportingManager..............")
//       if (!reportingManager || !reportingManager.email) {
//         console.error(
//           "Reporting Manager not found for ID:",
//           currentUser.reportingManagerId
//         );
//       } else {
//         console.log("Publishing meeting email job to RabbitMQ...");
//       }
//     }

//     if (!owner || !owner.email) {
//       console.error("owner not found for company:", meeting.companyId);
//     } else {
//       console.log("Publishing meeting email job to RabbitMQ...");

//       const mailOptions = {
//         from: config.from,
//         to: reportingManager.email,
//         subject: "ProPeak Management System - Meeting Summary",
//         html: `
//           <p>Dear ${owner.name || "Sir"},</p>
      
//           <p>The meeting has been successfully completed in the <strong>ProPeak Management System</strong>.</p>
      
//           <p><strong>Meeting Details:</strong></p>
//           <ul>
//             <li><strong>Start Time:</strong> ${new Date(
//               meeting.startTime
//             ).toLocaleString()}</li>
//             <li><strong>Start Location:</strong> ${
//               meeting.startLocation || "Not provided"
//             }</li>
//             <li><strong>End Time:</strong> ${new Date(
//               meeting.endTime
//             ).toLocaleString()}</li>
//             <li><strong>End Location:</strong> ${
//               meeting.endLocation || "Not provided"
//             }</li>
//             <li><strong>Description:</strong> ${
//               meeting.meetingDescription || "No description provided"
//             }</li>
//           </ul>
      
//           <p>If you have any questions, please contact your administrator.</p>
      
//           <p>Best Regards,</p>
//           <p><strong>ProPeak Team</strong></p>
//         `,
//       };

//       // Publish email job to RabbitMQ
//       await rabbitMQ.sendMessageToQueue(
//         mailOptions,
//         "message_queue",
//         "msgRoute"
//       );

//       console.log("Meeting email job published to RabbitMQ");
//     }

//     // Notify active clients about meeting completion
//     const companyClients = activeClients.get(meeting.companyId);
//     if (companyClients) {
//       companyClients.forEach((client) => {
//         client.send(
//           JSON.stringify({
//             event: "end-meeting",
//             userId: meeting.userId,
//             companyId: meeting.companyId,
//             status: "COMPLETED",
//           })
//         );
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Meeting ended successfully",
//       data: meeting,
//     });
//   } catch (error) {
//     console.error("Error ending meeting:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };

exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      companyId: req.query.companyId,
      // projectId: req.query.projectId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
      .populate({
        path: "userId",
        select: "name",
      })
      .populate({
        path: "projectId",
        select: "title",
      })
      .lean();

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
    const { companyId, currentPage = DEFAULT_PAGE, projectIdData, userIdData } = req.body;
    let selectedProjectId, companyIdData, selectedUserId = null;
    const projectId = projectIdData;
    const userId = userIdData;
    if (mongoose.Types.ObjectId.isValid(companyId)) {
      companyIdData = new mongoose.Types.ObjectId(companyId);
    }
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      selectedProjectId = new mongoose.Types.ObjectId(projectId);
    }
    if (mongoose.Types.ObjectId.isValid(userId)) {
      selectedUserId = new mongoose.Types.ObjectId(userId);
    }
    const limit = DEFAULT_LIMIT
    const queryConditions = [{ companyId }];
    if (selectedProjectId) {
      queryConditions.push({ projectId: selectedProjectId._id });
    }

    if (selectedUserId) {
      queryConditions.push({ userId: selectedUserId._id });
    }
    // console.log(companyId, "is this company id is coming ");

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required.",
      });
    }

    // const page = Math.max(Number(currentPage), 1);
    // const skip = (page - 1) * limit;

    // const meetings = await Meeting.find({ companyId })
    //   .skip(skip)
    //   .limit(Number(limit))
    //   .lean();
    // console.log(selectedProjectId, "from select project Id")
    const meetings = await Meeting.find({
      $and: queryConditions,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
      .populate({
        path: "userId",
        select: "name", // Fetch only the name field of the user
      })
      .populate({
        path: "projectId",
        select: "title", // Fetch only the title field of the project
      })
      .skip(limit * currentPage)
      .limit(Number(limit))
    const totalMeetings = await Meeting.countDocuments({ 
      $and: queryConditions,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }); 
    const totalPages = Math.ceil(
      await Meeting.countDocuments({
        $and: queryConditions,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      }) / limit
    );

    return res.status(200).json({
      success: true,
      message: "Meetings fetched successfully",
      data: meetings,
      totalPages,
      currentPage,
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


exports.deleteMeeting = async (req, res) => {
  const meetingId = req.body.meetingId;
  try{
    if(meetingId){
      await Meeting.updateOne(
        {_id: meetingId},
        {$set: {isDeleted: true}}
      )
      return res.status(200).json({
        success: true,
        message: "Meetings Deleted successfully",
      });
    }
    return res.status(400).json({
      success: false,
      message: "Meetings Id not Found!",
    });
  }catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}