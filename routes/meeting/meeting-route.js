const express = require("express");
const meetingController = require("../../controllers/meeting/meeting-controller");

const router = express.Router();

// Start a meeting
router.post("/start", meetingController.createMeeting);

// End a meeting
router.post("/end/:id", meetingController.endMeeting);
router.get("/getmeetings", meetingController.getMeetings);

module.exports = router;
