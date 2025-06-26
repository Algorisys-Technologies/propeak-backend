const mongoose = require("mongoose");

// Define the database model
const CompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      index: true
    },
    companyCode: {
      type: String,
    },
    country: {
      type: String,
    },
    address: {
      type: String,
    },
    contact: {
      type: String,
    },
    logo: {
      type: String,
    },
    numberOfUsers: {
      type: Number,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      index: true
    },
    trackingInterval: {
      type: Number,
    },
    geoTrackingTime: {
      startHour: {
        type: Number,
        min: 0,
        max: 23,
        default: 9,
      },
      endHour: {
        type: Number,
        min: 0,
        max: 23,
        default: 18,
      },
    },
  },
  { collection: "company" },
  {
    versionKey: false,
  }
);

CompanySchema.index(
  { companyName: 1, logo: 1 },
  { 
    name: 'login_company_lookup',
    partialFilterExpression: { 
      isDeleted: { $ne: true },
      _id: { $exists: true } 
    }
  }
);

// For text search (optional)
CompanySchema.index({ companyName: 'text' });

const Company = (module.exports = mongoose.model("company", CompanySchema));
