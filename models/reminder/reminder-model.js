const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the Reminder schema
const ReminderSchema = new Schema(
  {
    reminderEnabled: {
      type: Boolean,
      default: false,
    },
    // reminderTime: {
    //   type: Date,
    //   required: true,
    // },
    reminderTime: {
      type: String,
      required: true,
      //   match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    frequency: {
      type: String,
      enum: ["one-time", "daily", "weekly", "monthly"],
      required: true,
    },
    notificationMethods: {
      email: {
        type: Boolean,
        default: false,
      },
      inApp: {
        type: Boolean,
        default: false,
      },
      sms: {
        type: Boolean,
        default: false,
      },
    },
    // selectedTask: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Task",
    //   required: true,
    // },
    projectId: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "reminders",
    versionKey: false,
  }
);

const Reminder = mongoose.model("Reminder", ReminderSchema);

module.exports = Reminder;
