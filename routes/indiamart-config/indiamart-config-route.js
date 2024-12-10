const express = require("express");
const router = express.Router();
const indiaMartLeadsController = require("../../controllers/indiamart-config/indiamart-config-controller");

router.post("/lead", indiaMartLeadsController.getLeads);

module.exports = router;
