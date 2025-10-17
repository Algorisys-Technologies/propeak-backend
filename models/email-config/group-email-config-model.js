const mongoose = require("mongoose");

const GroupEmailConfigSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
      required: true,
    },
    projectStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "projectStage",
      required: true,
    },
    projectTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "projectType",
      required: true,
    },
    authentication: [
      {
        username: { type: String, required: true },
        password: { type: String, required: true },
      },
    ],
    smtpSettings: {
      host: { type: String, required: true },
      port: { type: Number, required: true },
      tls: { type: Boolean, default: true },
    },
    emailPatterns: [
      {
        pattern_name: { type: String, required: true },
        subject: { type: String, required: true },
        body_contains: { type: String, required: true },
        from: { type: String, required: true },
        priority: {
          type: String,
          enum: ["low", "medium", "high"],
          default: "medium",
        },
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    lastFetched: { type: Date },
    lastToFetched: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("groupEmailConfig", GroupEmailConfigSchema);
