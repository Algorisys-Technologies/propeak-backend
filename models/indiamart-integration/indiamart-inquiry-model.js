const mongoose = require("mongoose");

const IndiamartInquirySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    inquiryId: {
      type: String,
      required: true,
    },
    inquiryDetails: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Processed", "Closed"],
      default: "Pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "indiamart_inquiries",
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("IndiamartInquiry", IndiamartInquirySchema);
