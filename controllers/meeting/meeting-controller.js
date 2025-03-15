const Meeting = require("../../models/meeting/meeting-model");
const nodemailer = require("nodemailer");

const activeClients = new Map();

// Create Meeting
exports.createMeeting = async (req, res) => {
  console.log("is this coming here or not ???")
  console.log("request coming what ??", req.body)
  try {
    const { projectId, userId, startLocation, meetingDescription, createdBy, companyId } = req.body;

    const newMeeting = await Meeting.create({
      projectId,
      userId,
      startTime: new Date(),
      startLocation,
      meetingDescription,
      createdBy,
      companyId,
    });

    const companyClients = activeClients.get(companyId);
    if (companyClients) {
      companyClients.forEach((client) => {
        client.send(JSON.stringify({
          event: "start-meeting",
          userId,
          companyId,
          status: "LIVE",
        }));
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

// End Meeting
exports.endMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { endLocation } = req.body;

    const meeting = await Meeting.findByIdAndUpdate(
      id,
      { endTime: new Date(), endLocation },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    await sendMeetingEmail(meeting);

    const companyClients = activeClients.get(meeting.companyId);
    if (companyClients) {
      companyClients.forEach((client) => {
        client.send(JSON.stringify({
          event: "end-meeting",
          userId: meeting.userId,
          companyId: meeting.companyId,
          status: "COMPLETED",
        }));
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

// Send Email to Sachin Sir
const sendMeetingEmail = async (meeting) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "sachin.sir@example.com",
    subject: "Meeting Details",
    text: `
      Meeting Details:
      --------------------------
      Project ID: ${meeting.projectId}
      User ID: ${meeting.userId}
      Start Time: ${meeting.startTime}
      Start Location: ${meeting.startLocation}
      End Time: ${meeting.endTime}
      End Location: ${meeting.endLocation}
      Description: ${meeting.meetingDescription}
    `,
  };

  await transporter.sendMail(mailOptions);
};
