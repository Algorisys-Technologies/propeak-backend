//const express = require("express");
const express = require("ultimate-express");
const meetingController = require("../../controllers/meeting/meeting-controller");

const router = express.Router();

// Start a meeting
router.post("/start", meetingController.createMeeting);

// End a meeting
router.post("/end/:id", meetingController.endMeeting);
router.get("/getmeetings", meetingController.getMeetings);
router.post("/companyId", meetingController.getAllMeetings);
router.post("/delete", meetingController.deleteMeeting);
module.exports = router;
