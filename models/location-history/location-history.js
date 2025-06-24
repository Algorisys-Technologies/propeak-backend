const mongoose = require("mongoose")

const LocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'company', required: true, index: true },
  locationHistory: [
    {
      lat: { type: Number },
      lng: { type: Number },
      location: {type: String},
      timestamp: { type: Date, default: Date.now, index: true },
    },
  ],
});

LocationSchema.index({ userId: 1, companyId: 1 });
LocationSchema.index({ 
  userId: 1, 
  "locationHistory.timestamp": -1
});

LocationSchema.index({
  "locationHistory.lat": 1,
  "locationHistory.lng": 1
}, { 
  name: 'geospatial_index',
  sparse: true    
});

module.exports = { LocationHistory: mongoose.model('locationhistory', LocationSchema), LocationSchema: LocationSchema };