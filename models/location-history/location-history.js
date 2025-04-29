const mongoose = require("mongoose")

const LocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'company', required: true },
  locationHistory: [
    {
      lat: { type: Number },
      lng: { type: Number },
      location: {type: String},
      timestamp: { type: Date, default: Date.now },
    },
  ],
  startTime: { type: Date, default: null },  // This will be set when the user logs in (start tracking)
  endTime: { type: Date, default: null },
});

module.exports = { LocationHistory: mongoose.model('locationhistory', LocationSchema), LocationSchema: LocationSchema };