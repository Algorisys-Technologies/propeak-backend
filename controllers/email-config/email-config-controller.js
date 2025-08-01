const EmailConfig = require("../../models/email-config/email-config-model.js");
const { logError, logInfo } = require("../../common/logger");
const cacheManager = require("../../redis");
const errors = {
  CONFIG_DOESNT_EXIST: "Email Configuration does not exist",
  ADDCONFIGERROR: "Error occurred while adding the email configuration",
  EDITCONFIGERROR: "Error occurred while updating the email configuration",
  DELETECONFIGERROR: "Error occurred while deleting the email configuration",
};
const { fetchEmail } = require("../../fetch-email.js");

exports.getAllEmailConfigs = async (req, res) => {
  try {
    const { companyId, projectId } = req.body;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to fetch email configurations.",
      });
    }

    const emailConfigs = await EmailConfig.find({
      companyId,
      projectId,
      isDeleted: false,
    });
    if (!emailConfigs || emailConfigs.length === 0) {
      return res.status(404).json({
        success: false,
        msg: "No email configurations found for the provided company.",
      });
    }

    res.json({
      success: true,
      message: "Email configurations retrieved successfully!",
      emailConfigs,
    });
  } catch (err) {
    console.error("Error occurred while fetching email configurations:", err);
    res
      .status(500)
      .json({ success: false, msg: "Error fetching email configurations" });
  }
};

exports.getEmailConfigById = async (req, res) => {
  try {
    const userCompanyId = req.userInfo.companyId;
    const emailConfig = await EmailConfig.findOne({
      _id: req.params.id,
      companyId: userCompanyId,
      isDeleted: false,
    });

    if (!emailConfig) {
      return res.status(404).json({
        success: false,
        msg: errors.CONFIG_DOESNT_EXIST,
      });
    }

    res.json({ data: emailConfig });
  } catch (err) {
    console.error("Error occurred:", err);
    res
      .status(500)
      .json({ success: false, msg: `Something went wrong. ${err.message}` });
  }
};

exports.createEmailConfig = async (req, res) => {
  console.log(req.body, "request data coming..................");
  try {
    const {
      companyId,
      projectId,
      userId,
      taskStageId,
      lastFetched,
      lastToFetched,
      username,
      password,
      host,
      port,
      tls,
      emailPatterns,
      // schedule,
    } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to create an email configuration.",
      });
    }

    // Ensure the schedule.daysOfWeek is formatted correctly
    // const daysOfWeek = schedule?.daysOfWeek || [];

    const newEmailConfig = new EmailConfig({

      taskStageId,
      lastFetched,
      lastToFetched,
      companyId,
      projectId,
      smtpSettings: {
        host: host,
        port: port,
        tls: tls,
      },
      emailPatterns,
      // schedule: {
      //   frequency: schedule?.frequency,
      //   time_of_day: schedule?.timeOfDay, 
      //   days_of_week: daysOfWeek,
      // },
      authentication: [{ username, password }],
      userId,

    });

    console.log(newEmailConfig, "newEmailConfig............");

    const result = await newEmailConfig.save();
    console.log(result, "result..........");

    res.json({
      success: true,
      message: "Email Configuration created successfully!",
      result,
    });
  } catch (err) {
    console.error("Error occurred while creating email configuration:", err);
    res
      .status(500)
      .json({ success: false, msg: "Error adding email configuration" });
  }
};

// Update EmailConfig
exports.updateEmailConfig = async (req, res) => {
  console.log(req.body, "request data coming..................");

  const {
    id,
    userId,
    taskStageId,
    lastFetched,
    lastToFetched,
    companyId,
    projectId,
    tls,
    username,
    password,
    host,
    port,
    emailPatterns
    // schedule,
  } = req.body;

  try {
    // Validate that companyId is provided
    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to update the email configuration.",
      });
    }

    // Ensure the schedule.daysOfWeek is formatted correctly
    // const daysOfWeek = schedule?.daysOfWeek || [];

    // Find the existing email configuration and update it
    const updatedEmailConfig = await EmailConfig.findOneAndUpdate(
      { _id: id, companyId: companyId, isDeleted: false }, // Ensure companyId matches and the config is not deleted
      {
        userId,
        taskStageId,
        lastFetched,
        lastToFetched,
        smtpSettings: {
          host,
          port,
          tls
        },
        projectId,
        emailPatterns,
        // schedule: {
        //   frequency: schedule?.frequency,
        //   time_of_day: schedule?.timeOfDay,
        //   days_of_week: daysOfWeek,
        // },
        authentication: [{ username, password }],
      },
      { new: true }
    );

    if (!updatedEmailConfig) {
      return res.status(404).json({
        success: false,
        msg: "Email configuration does not exist or has been deleted.",
      });
    }

    console.log(updatedEmailConfig, "updatedEmailConfig............");

    res.json({
      success: true,
      message: "Email Configuration updated successfully!",
      updatedEmailConfig,
    });
  } catch (err) {
    console.error("Error occurred while updating email configuration:", err);
    res
      .status(500)
      .json({ success: false, msg: "Error updating email configuration." });
  }
};

exports.deleteEmailConfig = async (req, res) => {
  console.log("is it coming here ??????");
  try {
    const emailConfigId = req.params.id;
    console.log(emailConfigId, "emailConfigId...........");
    const deletedConfig = await EmailConfig.findByIdAndUpdate(
      emailConfigId,
      { isDeleted: true },
      { new: true }
    );
    console.log(deletedConfig, "deletedConfig..........");
    if (!deletedConfig) {
      return res
        .status(404)
        .json({ success: false, msg: errors.CONFIG_DOESNT_EXIST });
    }

    res.json({
      success: true,
      message: "Email Configuration deleted successfully!",
    });
  } catch (err) {
    console.error("Error occurred while deleting email configuration:", err);
    res.status(500).json({ success: false, msg: errors.DELETECONFIGERROR });
  }
};

exports.fetchNowEmailConfig = async (req, res) => {
  const EmailConfigId = req.body.id;
  try {
    const emailConfig = await EmailConfig.findOne({ isDeleted: false, _id: EmailConfigId })
    let emailAccounts = []
    emailConfig.authentication.forEach((auth) => {
      emailAccounts.push({ user: auth.username, password: auth.password, host: emailConfig.smtpSettings.host, port: emailConfig.smtpSettings.port, tls: emailConfig.smtpSettings.tls })
    })

    const { companyId, projectId } = emailConfig;

    const emails = await fetchEmail(
      {
        emailTaskConfig: emailConfig,
        projectId,
        taskStageId: emailConfig.taskStageId,
        companyId,
        userId: emailConfig.userId,
        emailAccounts
      }
    );
    return res.json({success: true, message: "Successfully Fetched Emails."})
  } catch (error) {
    console.error("Error fetching emails:", error);
    return res.json({success: false, message: "Error while Fetching Emails."})
  }
}
