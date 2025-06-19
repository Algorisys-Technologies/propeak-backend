//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const groupController = require("../../controllers/project/group-master-controller");

router.get("/:companyId", groupController.getGroups);
router.post("/add", groupController.createGroup);
router.put("/:id", groupController.updateGroup);
router.post("/:id", groupController.deleteGroup);

module.exports = router;
