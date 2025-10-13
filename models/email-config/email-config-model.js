const mongoose = require("mongoose");

const EmailConfigSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "project",
  },
  taskStageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "taskStage",
  },
  authentication: [
    {
      username: { type: String },
      password: { type: String },
    },
  ],
  smtpSettings: {
    host: { type: String },
    port: { type: Number },
    tls: { type: Boolean },
  },
  emailPatterns: [
    {
      pattern_name: { type: String },
      subject: { type: String },
      body_contains: { type: String },
      from: { type: String },
      priority: {
        type: String,
        enum: ["low", "medium", "high"],
      },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    },
  ],

  // schedule: {
  //   frequency: {
  //     type: String,
  //     enum: ["hourly", "daily", "weekly"],
  //   },
  //   time_of_day: {
  //     type: String,
  //     validate: {
  //       validator: function (v) {
  //         return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
  //       },
  //       message: (props) => `${props.value} is not a valid time format!`,
  //     },
  //   },
  //   days_of_week: {
  //     type: [String],
  //     enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  //   },
  // },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  lastFetched: {
    type: Date,
  },
  lastToFetched: {
    type: Date,
  },
  isDeleted: { type: Boolean, default: false },
});

module.exports = mongoose.model("emailconfig", EmailConfigSchema);
