const mongoose = require("mongoose");

const AccountSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
    // required: true
  },
  account_name: {
    type: String,
    required: true,
  },
  account_number: {
    type: String,
    unique: true,
  },
  industry: {
    type: String,
  },
  website: {
    type: String,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
   
  },
  billing_address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String },
  },
  shipping_address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String },
  },
  account_owner: {
    name: { type: String },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: false,
    },
  },
  annual_revenue: {
    type: Number,
  },
  number_of_employees: {
    type: Number,
  },
  account_type: {
    type: String,
    enum: ["Customer", "Partner", "Vendor"],
    default: "Customer",
  },
  description: {
    type: String,
  },
  contacts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "contact",
    },
  ],
  created_on: {
    type: Date,
    default: Date.now,
  },
  modified_on: {
    type: Date,
    default: Date.now,
  },
  tag: [{
    type: String
  }],
  vfolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "vfolder",
  },
  isDeleted: { type: Boolean, default: false },
});

module.exports = mongoose.model("account", AccountSchema);

