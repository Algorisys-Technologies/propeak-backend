const express = require("express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var messageController = require("../../controllers/message/message-controller");

// READ (ONE)
// router.get('/:projectId/:taskId', messageController.message_get_by_projectId);

//READ (BY TASKIDS)
//router.get('/tasks/:taskIds', messageController.message_get_by_taskIds);
// READ (ALL)
// router.get('/', messageController.message_get_all);

// CREATE
router.post(
  "/add",
  // verifyToken,
  messageController.addMessage
);

router.post(
  "/",
  // verifyToken,
  messageController.getMessages
);

// DELETE
router.put(
  "/:id",
  // verifyToken,
  messageController.deleteMessage
);

module.exports = router;
