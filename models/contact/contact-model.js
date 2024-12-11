const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
    // required: true,
  },
  first_name: {
    type: String,
    // required: true,
  },
  last_name: {
    type: String,
    // required: true,
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  mobile: {
    type: String,
  },
  title: {
    type: String,
  },
  department: {
    type: String,
  },
  account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "account",
    // required: true,
  },
  account_name: {
    type: String,
  },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String },
  },
  contact_owner: {
    name: {
      type: String,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      // required: true,
    },
  },
  secondary_address:{
    type: String,
  },
  lead_source: {
    type: String,
  },
  description: {
    type: String,
  },
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

  isDeleted: { type: Boolean, default: false },
  creationMode: {
    type: String
  }
});

module.exports = mongoose.model("contact", ContactSchema);
