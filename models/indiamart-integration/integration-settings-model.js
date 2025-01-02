const mongoose = require("mongoose");

const IntegrationSettingsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    integrationProvider: {
      type: String,
      enum: ["IndiaMART", "Salesforce", "Zoho"],
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    settings: {
      IndiaMART: [
        {
          keyName: { type: String, required: true },
          authKey: { type: String },
          method: {
            type: String,
            enum: ["API", "Web-Scrape"],
          },
        },
      ],
      Salesforce: [
        {
          keyName: { type: String, required: true },
          clientId: { type: String },
          clientSecret: { type: String },
          refreshToken: { type: String },
          baseUrl: { type: String },
          apiVersion: { type: String },
          method: {
            type: String,
            enum: ["API", "Web-Scrape"],
          },
        },
      ],
      Zoho: [
        {
          keyName: { type: String, required: true },
          clientId: { type: String },
          clientSecret: { type: String },
          refreshToken: { type: String },
          apiDomain: { type: String },
          moduleSync: { type: [String] },
          customMapping: { type: Object },
          method: {
            type: String,
            enum: ["API", "Web-Scrape"],
          },
        },
      ],
    },
    createdOn: { type: Date, default: Date.now },
    modifiedOn: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { collection: "integration_settings", versionKey: false }
);

module.exports = mongoose.model(
  "IntegrationSettings",
  IntegrationSettingsSchema
);
