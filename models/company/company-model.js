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
      unique: true,
      sparse: true
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
    trackingInterval : {
      type: Number
    }
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
