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
});

module.exports = { LocationHistory: mongoose.model('locationhistory', LocationSchema), LocationSchema: LocationSchema };