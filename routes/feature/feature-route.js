//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const featureController = require("../../controllers/feature/feature-controller");

router.get("/GetFeatures", featureController.getAllFeatures);
router.get("/GetSystemFeatures", featureController.GetSystemFeatures);

router.post("/GetFeatureById", featureController.getFeatureById);
router.post("/CreateFeature", featureController.createFeature);
router.put("/UpdateFeature/:id", featureController.updateFeature);
router.delete("/DeleteFeature/:id", featureController.deleteFeature);

module.exports = router;
