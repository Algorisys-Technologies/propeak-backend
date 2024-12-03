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
    trackingInterval : {
      type: Number
    }
  },
  { collection: "company" },
  {
    versionKey: false,
  }
);

const Company = (module.exports = mongoose.model("company", CompanySchema));
