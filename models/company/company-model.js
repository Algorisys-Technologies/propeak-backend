const mongoose = require("mongoose");

// Define the database model
const CompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
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

const Company = (module.exports = mongoose.model("company", CompanySchema));
