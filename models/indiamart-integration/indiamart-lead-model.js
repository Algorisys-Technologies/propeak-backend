// const mongoose = require("mongoose");
const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "company",
    },
    UNIQUE_QUERY_ID: {
      type: String,
    },
    QUERY_TYPE: {
      type: String,
    },
    QUERY_TIME: {
      type: Date,
    },
    SENDER_NAME: {
      type: String,
    },
    SENDER_MOBILE: {
      type: String,
    },
    SENDER_EMAIL: {
      type: String,
    },
    SUBJECT: {
      type: String,
    },
    SENDER_COMPANY: {
      type: String,
    },
    SENDER_ADDRESS: {
      type: String,
    },
    SENDER_CITY: {
      type: String,
    },
    SENDER_STATE: {
      type: String,
    },
    SENDER_PINCODE: {
      type: String,
    },
    SENDER_COUNTRY_ISO: {
      type: String,
    },
    SENDER_MOBILE_ALT: {
      type: String,
      default: "",
    },
    SENDER_PHONE: {
      type: String,
      default: "",
    },
    SENDER_PHONE_ALT: {
      type: String,
      default: "",
    },
    SENDER_EMAIL_ALT: {
      type: String,
      default: "",
    },
    QUERY_PRODUCT_NAME: {
      type: String,
    },
    QUERY_MESSAGE: {
      type: String,
    },

    CALL_DURATION: {
      type: String,
      default: "0",
    },
    RECEIVER_MOBILE: {
      type: String,
      default: null,
    },
    RECEIVER_CATALOG: {
      type: String,
      default: "",
    },
    QUERY_PRODUCT_NAME: {
      type: String,
    },
    QUERY_MESSAGE: {
      type: String,
    },
    QUERY_MCAT_NAME: {
      type: String,
    },
    RECEIVER_CATALOG: {
      type: String,
    },
    RECEIVER_MOBILE: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Pending", "Processed", "Closed","todo"],
      default: "todo",
    },
  },
  {
    collection: "leads",
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("Lead", LeadSchema);














// const LeadSchema = new mongoose.Schema(
//   {
//     companyId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "company",
//     //   required: true,
//     },
//     uniqueQueryId: {
//       type: String,
//       required: true,
//     },
//     queryType: {
//       type: String,
//     //   required: true,
//     },
//     queryTime: {
//       type: Date,
//     //   required: true,
//     },
//     senderDetails: {
//       name: { type: String},
//       mobile: { type: String},
//       email: { type: String, default: "" },
//       company: { type: String, default: "" },
//       address: { type: String, default: "" },
//       city: { type: String, default: "" },
//       state: { type: String, default: "" },
//       pincode: { type: String, default: "" },
//       countryIso: { type: String, default: "" },
//       alternateMobile: { type: String, default: "" },
//       phone: { type: String, default: "" },
//       alternatePhone: { type: String, default: "" },
//       alternateEmail: { type: String, default: "" },
//     },
//     queryDetails: {
//       productName: { type: String },
//       message: { type: String},
//       mcatName: { type: String, default: "" },
//     },
//     receiverDetails: {
//       mobile: { type: String, default: null },
//       catalog: { type: String, default: "" },
//     },
//     status: {
//       type: String,
//       enum: ["Pending", "Processed", "Closed"],
//       default: "Pending",
//     },
//     callDuration: {
//       type: String,
//       default: "0",
//     },
//   },
//   {
//     collection: "leads",
//     versionKey: false,
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model("Lead", LeadSchema);
