const schedule = require("node-schedule");
const config = require("./config");
const { fetchEmail } = require("./fetch-email");
const mongoose = require("mongoose");
const EmailConfig = require("./models/email-config/email-config-model");

mongoose
  .connect(process.env.DB, {
    socketTimeoutMS: 0,
  })
  .then(() => console.log("Connected to the database.", "DB"));

try {
  const fetchEmailJob = schedule.scheduleJob(
    config.fetchEmailScheduleEveryHour,
    async function () {
      console.log("Running fetchEmail...");
      try {
        const emailConfigs = await EmailConfig.find({ isDeleted: false });

        if (emailConfigs.length <= 0) {
          console.log("No active email configuration found.");
          return;
        }

        let emailAccounts = [];

        emailConfigs.forEach(async (emailConfig) => {
          emailConfig.authentication.forEach((auth) => {
            emailAccounts.push({
              user: auth.username,
              password: auth.password,
              host: emailConfig.smtpSettings.host,
              port: emailConfig.smtpSettings.port,
              tls: emailConfig.smtpSettings.tls,
            });
          });

          const { companyId, projectId } = emailConfig;

          const emails = await fetchEmail({
            emailTaskConfig: emailConfig,
            projectId,
            taskStageId: emailConfig.taskStageId,
            companyId,
            userId: emailConfig.userId,
            emailAccounts,
          });

        });
      } catch (error) {
        console.error("Error fetching emails:", error);
      }
    }
  );
} catch (error) {
  console.error("Error scheduling fetchEmail job:", error);
}
