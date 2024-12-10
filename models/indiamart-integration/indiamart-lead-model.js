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
      enum: ["Pending", "Processed", "Closed"],
      default: "Pending",
    },
  },
  {
    collection: "leads",
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("Lead", LeadSchema);











// const queryData = [
//     {
//       UNIQUE_QUERY_ID: '2915269571',
//       QUERY_TYPE: 'W',
//       QUERY_TIME: '2024-12-09 15:26:16',
//       SENDER_NAME: 'Vedant Bharat Shinde',
//       SENDER_MOBILE: '+91-7666189609',
//       SENDER_EMAIL: 'mr.vedantshinde4999@gmail.com',
//       SUBJECT: 'Requirement for Cosmetic Beads',
//       SENDER_COMPANY: 'Veritas Global',
//       SENDER_ADDRESS: 'A-104, Maitree Vihar, M.P. Road, Near Vishnu Vihar, Vasai, Vasai Virar, Maharashtra, 401303',
//       SENDER_CITY: 'Vasai Virar',
//       SENDER_STATE: 'Maharashtra',
//       SENDER_PINCODE: '401303',
//       SENDER_COUNTRY_ISO: 'IN',
//       SENDER_MOBILE_ALT: '+91-9834236470',
//       SENDER_PHONE: '',
//       SENDER_PHONE_ALT: '',
//       SENDER_EMAIL_ALT: '',
//       QUERY_PRODUCT_NAME: 'Cosmetic Beads',
//       QUERY_MESSAGE: 'Cosmetic Beads<br>Packaging Size : 5kg/ 5l<br>Probable Requirement Type : Business Use<br>',
//       QUERY_MCAT_NAME: 'Cosmetic Ingredients',
//       CALL_DURATION: '0',
//       RECEIVER_MOBILE: null,
//       RECEIVER_CATALOG: 'https://www.indiamart.com/kip-chemicals-mumbai/'
//     },
//     {
//       UNIQUE_QUERY_ID: '2915281891',
//       QUERY_TYPE: 'W',
//       QUERY_TIME: '2024-12-09 15:46:04',
//       SENDER_NAME: 'Vimal',
//       SENDER_MOBILE: '+91-7498356947',
//       SENDER_EMAIL: '',
//       SUBJECT: 'Requirement for Alkyl Polyglucoside (APG)',
//       SENDER_COMPANY: 'Vimal Chemical',
//       SENDER_ADDRESS: 'Nagpur, Maharashtra',
//       SENDER_CITY: 'Nagpur',
//       SENDER_STATE: 'Maharashtra',
//       SENDER_PINCODE: '',
//       SENDER_COUNTRY_ISO: 'IN',
//       SENDER_MOBILE_ALT: '',
//       SENDER_PHONE: '',
//       SENDER_PHONE_ALT: '',
//       SENDER_EMAIL_ALT: '',
//       QUERY_PRODUCT_NAME: 'Alkyl Polyglucoside (APG)',
//       QUERY_MESSAGE: 'I am interested in Alkyl Polyglucoside (APG)<br>',
//       QUERY_MCAT_NAME: 'Surfactants',
//       CALL_DURATION: '0',
//       RECEIVER_MOBILE: null,
//       RECEIVER_CATALOG: 'https://www.indiamart.com/kip-chemicals-mumbai/'
//     },
//     {
//       UNIQUE_QUERY_ID: '944436887',
//       QUERY_TYPE: 'B',
//       QUERY_TIME: '2024-12-09 15:47:48',
//       SENDER_NAME: 'Rajesh Gunti',
//       SENDER_MOBILE: '+91-8074822048',
//       SENDER_EMAIL: '',
//       SUBJECT: 'Requirement for Fabric Conditioner 1 Liter',
//       SENDER_COMPANY: '',
//       SENDER_ADDRESS: 'Hyderabad, Telangana',
//       SENDER_CITY: 'Hyderabad',
//       SENDER_STATE: 'Telangana',
//       SENDER_PINCODE: '',
//       SENDER_COUNTRY_ISO: 'IN',
//       SENDER_MOBILE_ALT: '',
//       SENDER_PHONE: '',
//       SENDER_PHONE_ALT: '',
//       SENDER_EMAIL_ALT: '',
//       QUERY_PRODUCT_NAME: 'Fabric Conditioner 1 Liter',
//       QUERY_MESSAGE: 'Requirement for Fabric Conditioner 1 Liter\n Quantity : 7357 Kg<br>Packaging Size : 5 L<br>Probable Order Value : Rs. 10 to 20 Lakh<br>Probable Requirement Type : Business Use<br>',
//       QUERY_MCAT_NAME: 'Fabric Softener',
//       CALL_DURATION: '0',
//       RECEIVER_MOBILE: null,
//       RECEIVER_CATALOG: 'https://www.indiamart.com/kip-chemicals-mumbai/'
//     },
//     {
//       UNIQUE_QUERY_ID: '944442310',
//       QUERY_TYPE: 'B',
//       QUERY_TIME: '2024-12-09 15:58:48',
//       SENDER_NAME: 'Saurav',
//       SENDER_MOBILE: '+91-7042375494',
//       SENDER_EMAIL: 'sauravyadav83413@gmail.com',
//       SUBJECT: 'Requirement for Acid Thickener',
//       SENDER_COMPANY: 'Saraswati',
//       SENDER_ADDRESS: 'Noida, Uttar Pradesh',
//       SENDER_CITY: 'Noida',
//       SENDER_STATE: 'Uttar Pradesh',
//       SENDER_PINCODE: '',
//       SENDER_COUNTRY_ISO: 'IN',
//       SENDER_MOBILE_ALT: '',
//       SENDER_PHONE: '',
//       SENDER_PHONE_ALT: '',
//       SENDER_EMAIL_ALT: '',
//       QUERY_PRODUCT_NAME: 'Acid Thickener',
//       QUERY_MESSAGE: 'I am interested in Acid Thickener<br>Quantity : 5000 Litre<br>Packaging Size : 50 kg<br>Probable Order Value : Rs. 9,56,000 - 15,00,000<br>Probable Requirement Type : Business Use<br>',
//       QUERY_MCAT_NAME: 'Acid Thickener',
//       CALL_DURATION: '0',
//       RECEIVER_MOBILE: null,
//       RECEIVER_CATALOG: 'https://www.indiamart.com/kip-chemicals-mumbai/'
//     },
//     {
//       UNIQUE_QUERY_ID: '2915306054',
//       QUERY_TYPE: 'W',
//       QUERY_TIME: '2024-12-09 16:28:15',
//       SENDER_NAME: 'Integrin Life Sciences',
//       SENDER_MOBILE: '+91-9100036633',
//       SENDER_EMAIL: 'purchase@integrinlifesciences.com',
//       SUBJECT: 'Requirement for Meta Chloro Anisole',
//       SENDER_COMPANY: 'Integrin Life Sciences Private Limited',
//       SENDER_ADDRESS: 'Plot No 69-71 75-77, Apiic Industrial Park, Tirumalagiri, Cyberabad, Andhra Pradesh, 521175',
//       SENDER_CITY: 'Cyberabad',
//       SENDER_STATE: 'Andhra Pradesh',
//       SENDER_PINCODE: '521175',
//       SENDER_COUNTRY_ISO: 'IN',
//       SENDER_MOBILE_ALT: '',
//       SENDER_PHONE: '',
//       SENDER_PHONE_ALT: '',
//       SENDER_EMAIL_ALT: '',
//       QUERY_PRODUCT_NAME: 'Meta Chloro Anisole',
//       QUERY_MESSAGE: 'Meta Chloro Anisole<br>Quantity : 1560<br>Quantity Unit : Kilogram(s)<br>Probable Order Value : Rs. 5 to 10 Lakh<br>Probable Requirement Type : Business Use<br>',
//       QUERY_MCAT_NAME: 'Meta Chloro Anisole',
//       CALL_DURATION: '0',
//       RECEIVER_MOBILE: null,
//       RECEIVER_CATALOG: 'https://www.indiamart.com/kip-chemicals-mumbai/'
//     },
//     {
//       UNIQUE_QUERY_ID: '1012974264',
//       QUERY_TYPE: 'B',
//       QUERY_TIME: '2024-12-09 21:39:36',
//       SENDER_NAME: 'Vishmi Supulsara',
//       SENDER_MOBILE: '+94-784644251',
//       SENDER_EMAIL: 'vishmisupulsara1@gmail.com',
//       SUBJECT: 'Requirement for Kojic Acid',
//       SENDER_COMPANY: '',
//       SENDER_ADDRESS: '',
//       SENDER_CITY: '',
//       SENDER_STATE: '',
//       SENDER_PINCODE: '',
//       SENDER_COUNTRY_ISO: 'LK',
//       SENDER_MOBILE_ALT: '',
//       SENDER_PHONE: '',
//       SENDER_PHONE_ALT: '',
//       SENDER_EMAIL_ALT: '',
//       QUERY_PRODUCT_NAME: 'Kojic Acid',
//       QUERY_MESSAGE: 'Requirement for Kojic Acid\n Quantity : 10 kg<br>Packaging Size : 25 Kg<br>Probable Requirement Type : Business Use<br>',
//       QUERY_MCAT_NAME: 'Kojic Acid',
//       CALL_DURATION: '0',
//       RECEIVER_MOBILE: null,
//       RECEIVER_CATALOG: 'https://www.indiamart.com/kip-chemicals-mumbai/'
//     },
//     {
//       UNIQUE_QUERY_ID: '1012974267',
//       QUERY_TYPE: 'B',
//       QUERY_TIME: '2024-12-09 21:40:19',
//       SENDER_NAME: 'Fedor',
//       SENDER_MOBILE: '+7-9814697301',
//       SENDER_EMAIL: 'ambercosmetics@inbox.ru',
//       SUBJECT: 'Requirement for CCTG Caprylic Capric Triglyceride',
//       SENDER_COMPANY: 'Amber cosmetics',
//       SENDER_ADDRESS: '',
//       SENDER_CITY: '',
//       SENDER_STATE: '',
//       SENDER_PINCODE: '',
//       SENDER_COUNTRY_ISO: 'RU',
//       SENDER_MOBILE_ALT: '',
//       SENDER_PHONE: '',
//       SENDER_PHONE_ALT: '',
//       SENDER_EMAIL_ALT: '',
//       QUERY_PRODUCT_NAME: 'CCTG Caprylic Capric Triglyceride',
//       QUERY_MESSAGE: 'Requirement for CCTG Caprylic Capric Triglyceride\n Form : Mumbai<br>Quantity : 100 kg<br>Packaging Type : Container<br>Probable Requirement Type : Business Use<br>',
//       QUERY_MCAT_NAME: 'Caprylic Capric Triglyceride',
//       CALL_DURATION: '0',
//       RECEIVER_MOBILE: null,
//       RECEIVER_CATALOG: 'https://www.indiamart.com/kip-chemicals-mumbai/'
//     },
//     {
//       UNIQUE_QUERY_ID: '1012974269',
//       QUERY_TYPE: 'B',
//       QUERY_TIME: '2024-12-09 21:40:40',
//       SENDER_NAME: 'Albert',
//       SENDER_MOBILE: '+7-9179287990',
//       SENDER_EMAIL: 'akhmetov.09@list.ru',
//       SUBJECT: 'Requirement for Monoethanolamine',
//       SENDER_COMPANY: 'Kartli',
//       SENDER_ADDRESS: '',
//       SENDER_CITY: '',
//       SENDER_STATE: '',
//       SENDER_PINCODE: '',
//       SENDER_COUNTRY_ISO: 'RU',
//       SENDER_MOBILE_ALT: '',
//       SENDER_PHONE: '',
//       SENDER_PHONE_ALT: '',
//       SENDER_EMAIL_ALT: '',
//       QUERY_PRODUCT_NAME: 'Monoethanolamine',
//       QUERY_MESSAGE: 'Requirement for Monoethanolamine\n Probable Requirement Type : Business Use<br>',
//       QUERY_MCAT_NAME: 'Ethanolamine',
//       CALL_DURATION: '0',
//       RECEIVER_MOBILE: null,
//       RECEIVER_CATALOG: 'https://www.indiamart.com/kip-chemicals-mumbai/'
//     }
//   ];



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
