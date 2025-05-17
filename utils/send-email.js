// utils/sendEmail.js
const rabbitMQ = require("../rabbitmq");
const config = require("../config/config");

/**
 * Publishes an email job to RabbitMQ.
 *
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 */
async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: config.from,
    to,
    subject,
    html,
  };
  const check = await rabbitMQ.sendMessageToQueue(
    mailOptions,
    "message_queue",
    "msgRoute"
  );
  console.log("Email job published to RabbitMQ queue");
}

module.exports = sendEmail;
