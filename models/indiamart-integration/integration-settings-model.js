const mongoose = require("mongoose");

const IntegrationSettingsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    taskStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskStage",
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
      IndiaMART: {
        authKey: { type: String }, // IndiaMART Push API auth key
        //callbackUrl: { type: String }, // Webhook URL for IndiaMART
        filters: {
          leadType: { type: [String] }, // Filter by lead type ("BUYER" or "SELLER")
          priority: { type: String }, // Priority filter
        },
      },
      Salesforce: {
        clientId: { type: String }, // OAuth client ID
        clientSecret: { type: String }, // OAuth client secret
        refreshToken: { type: String }, // Used to renew access tokens
        baseUrl: { type: String }, // Salesforce instance URL
        apiVersion: { type: String }, // API version
      },
      Zoho: {
        clientId: { type: String }, // OAuth client ID
        clientSecret: { type: String }, // OAuth client secret
        refreshToken: { type: String }, // Token for access renewal
        apiDomain: { type: String }, // Zoho accounts API domain
        moduleSync: { type: [String] }, // Modules to sync with Zoho
        customMapping: { type: Object }, // Custom mapping for CRM fields
      },
    },
    schedule: {
      frequency: {
        type: String,
        enum: ["hourly", "daily", "weekly"],
        default: "daily",
      },
      timeOfDay: { type: String },
      lastRun: { type: Date },
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
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
