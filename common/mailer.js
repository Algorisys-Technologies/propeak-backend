// const config = require("../config/config");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { logError, logInfo } = require("./logger");
let transporter = null;

const sendEmail = async (mailOptions) => {
  try {
    if (transporter === null) {
      transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure, // use SSL
        auth: config.auth,
      });
    }
    let response = await transporter.sendMail(mailOptions);

    // console.log("message sending ", response)

    // console.log("mailOptions",mailOptions);
    // console.log("userId",userId);
    return response;
  } catch (e) {
    logInfo(e, "Error occured while sending email ");
  }
};

module.exports = {
  sendEmail,
};
