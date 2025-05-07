const mongoose = require("mongoose");

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
    },
    email: {
      type: Boolean,
      default: false,
    },
    inApp: {
      type: Boolean,
      default: false,
    },
    muteEvents: {
      type: [String], // array of eventType strings like "TASK_CREATED"
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model(
  "NotificationPreference",
  NotificationPreferenceSchema
);
