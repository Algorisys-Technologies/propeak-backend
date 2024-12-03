const express = require('express');
const locationController = require("../../controllers/location-history/location-history-controller")

const router = express.Router();


router.get('/all', locationController.getAllLocationHistory)

router.get('/:userId', locationController.getLocationHistoryByUserId)

router.post('/update', locationController.addLocationHistory)

router.delete('/:userId', locationController.deleteLocationHistory)

module.exports = router;




