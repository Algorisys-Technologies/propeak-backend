const mongoose = require("mongoose");

const AttachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    content: { type: Buffer, required: true },
  },
  { _id: false }
);

const FetchEmailSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    subject: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    bodyText: { type: String, default: "" },
    status: {
      type: String,
      enum: ["seen", "unseen"],
      default: "unseen",
    },
    attachments: [AttachmentSchema],
  },
  { versionKey: false }
);

const FetchEmail = mongoose.model("FetchEmail", FetchEmailSchema);

module.exports = { FetchEmail, FetchEmailSchema };
