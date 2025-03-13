const express = require("express");
const router = express.Router();
const defaultStageController = require("../../controllers/stages/default-stages-controller");

router.post("/companyId", defaultStageController.getDefaultStagesByCompany);
router.post("/add", defaultStageController.createDefaultStages);
router.put("/:id", defaultStageController.updateDefaultStages);
router.post("/reorder", defaultStageController.reorderDefaultStages);
router.post("/:id", defaultStageController.deleteDefaultStage);

module.exports = router;
