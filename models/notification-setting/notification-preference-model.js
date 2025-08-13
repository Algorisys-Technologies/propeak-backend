const mongoose = require("mongoose");

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: Boolean,
      default: false,
      index: true,
    },
    inApp: {
      type: Boolean,
      default: false,
      index: true,
    },
    muteEvents: {
      type: [String], // array of eventType strings like "TASK_CREATED"
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

// Compound indexes for potential frequent queries
NotificationPreferenceSchema.index({ email: 1, inApp: 1 });
NotificationPreferenceSchema.index({ muteEvents: 1 });

module.exports = mongoose.model(
  "NotificationPreference",
  NotificationPreferenceSchema
);
