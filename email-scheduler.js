const schedule = require("node-schedule");
const rabbitMQ = require("./rabbitmq/index.js");
const { sendEmail } = require("./common/mailer.js");
const config = require("./config.js");
const { logError, logInfo } = require("./common/logger.js");

try {
  const j = schedule.scheduleJob(config.fetchEmailSchedule, function () {
    rabbitMQ.receiveMessageFromQueue("message_queue").then((msg) => {
      console.log(msg);
      if (msg != "No messages in queue") {
        console.log(msg);

        let mailOptions = msg;

        let response = sendEmail(mailOptions);

        if (response.response) {
          logInfo(
            response,
            "taskController.createTask - Error occured while sending email " +
              mailOptions.to
          );
        } else {
          logInfo(
            "taskController.createTask - An e-mail has been sent to " +
              mailOptions.to +
              " with further instructions."
          );
        }
      }
    });
  });
} catch (e) {
  console.log(e);
  logInfo(e, "email-scheduler exception");
}
