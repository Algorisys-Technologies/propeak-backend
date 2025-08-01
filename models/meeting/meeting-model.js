const mongoose = require("mongoose");

const MeetingSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    startTime: { type: Date, required: true },
    startLocation: { type: String, required: true },
    endTime: { type: Date },
    endLocation: {
      type: String,

      //required: true,
    },
    meetingDescription: { type: String, trim: true, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    status: {
      type: String,
      enum: ["LIVE", "COMPLETED"],
      default: "LIVE",
    },
    isDeleted: {
      type: Boolean,
    }
  },
  { timestamps: true }
);

MeetingSchema.index({ projectId: 1, companyId: 1 });
MeetingSchema.index({ userId: 1 });
MeetingSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("Meeting", MeetingSchema);
