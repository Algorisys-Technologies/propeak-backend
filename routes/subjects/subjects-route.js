//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var subjectController = require("../../controllers/subject/subject-controller");

// GET
router.get("/", verifyToken, subjectController.getAllSubjects);

//get messages by subjectId
router.get(
  "/messages/:subjectId",
  verifyToken,
  subjectController.getMessagesBySubjectId
);

router.get(
  "/project/:projectId",
  verifyToken,
  subjectController.getProjectSubjects
);

// CREATE
router.post("/", verifyToken, subjectController.addSubjectForChats);

//Add Message under one subject
router.post("/addMessage", verifyToken, subjectController.addMessage);

//EDIT
router.post("/edit", verifyToken, subjectController.editSubjectForChats);

// DELETE
router.post("/delete", verifyToken, subjectController.deleteSubjectForChats);

// Delete Messages by subjectId
router.post(
  "/deleteMessage",
  verifyToken,
  subjectController.deleteMessagesBySubjectId
);

module.exports = router;
