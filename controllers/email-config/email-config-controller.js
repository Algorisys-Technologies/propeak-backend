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
const { encrypt, decrypt } = require("../../utils/crypto.server");

// exports.getAllEmailConfigs = async (req, res) => {
//   try {
//     const { companyId, projectId } = req.body;
//     if (!companyId) {
//       return res.status(400).json({
//         success: false,
//         msg: "Company ID is required to fetch email configurations.",
//       });
//     }

//     const emailConfigs = await EmailConfig.find({
//       companyId,
//       projectId,
//       isDeleted: false,
//     });
//     if (!emailConfigs || emailConfigs.length === 0) {
//       return res.status(404).json({
//         success: false,
//         msg: "No email configurations found for the provided company.",
//       });
//     }

//     res.json({
//       success: true,
//       message: "Email configurations retrieved successfully!",
//       emailConfigs,
//     });
//   } catch (err) {
//     console.error("Error occurred while fetching email configurations:", err);
//     res
//       .status(500)
//       .json({ success: false, msg: "Error fetching email configurations" });
//   }
// };

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

    // Decrypt passwords
    const decryptedConfigs = emailConfigs.map((config) => {
      const obj = config.toObject ? config.toObject() : config;
      obj.authentication = obj.authentication.map((auth) => ({
        username: auth.username,
        password: decrypt(auth.password, companyId),
      }));
      return obj;
    });

    res.json({
      success: true,
      message: "Email configurations retrieved successfully!",
      emailConfigs: decryptedConfigs,
    });
  } catch (err) {
    console.error("Error occurred while fetching email configurations:", err);
    res
      .status(500)
      .json({ success: false, msg: "Error fetching email configurations" });
  }
};

// exports.getEmailConfigById = async (req, res) => {
//   try {
//     const userCompanyId = req.userInfo.companyId;
//     const emailConfig = await EmailConfig.findOne({
//       _id: req.params.id,
//       companyId: userCompanyId,
//       isDeleted: false,
//     });

//     if (!emailConfig) {
//       return res.status(404).json({
//         success: false,
//         msg: errors.CONFIG_DOESNT_EXIST,
//       });
//     }

//     res.json({ data: emailConfig });
//   } catch (err) {
//     console.error("Error occurred:", err);
//     res
//       .status(500)
//       .json({ success: false, msg: `Something went wrong. ${err.message}` });
//   }
// };

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

    // Decrypt password
    const obj = emailConfig.toObject ? emailConfig.toObject() : emailConfig;
    obj.authentication = obj.authentication.map((auth) => ({
      username: auth.username,
      password: decrypt(auth.password, userCompanyId),
    }));

    res.json({ data: obj });
  } catch (err) {
    console.error("Error occurred:", err);
    res
      .status(500)
      .json({ success: false, msg: `Something went wrong. ${err.message}` });
  }
};

// exports.createEmailConfig = async (req, res) => {

//   try {
//     const {
//       companyId,
//       projectId,
//       userId,
//       taskStageId,
//       lastFetched,
//       lastToFetched,
//       username,
//       password,
//       host,
//       port,
//       tls,
//       emailPatterns,
//       // schedule,
//     } = req.body;

//     if (!companyId) {
//       return res.status(400).json({
//         success: false,
//         msg: "Company ID is required to create an email configuration.",
//       });
//     }

//     // Ensure the schedule.daysOfWeek is formatted correctly
//     // const daysOfWeek = schedule?.daysOfWeek || [];

//     const newEmailConfig = new EmailConfig({
//       taskStageId,
//       lastFetched,
//       lastToFetched,
//       companyId,
//       projectId,
//       smtpSettings: {
//         host: host,
//         port: port,
//         tls: tls,
//       },
//       emailPatterns,
//       // schedule: {
//       //   frequency: schedule?.frequency,
//       //   time_of_day: schedule?.timeOfDay,
//       //   days_of_week: daysOfWeek,
//       // },
//       authentication: [{ username, password }],
//       userId,
//     });

//     const result = await newEmailConfig.save();

//     res.json({
//       success: true,
//       message: "Email Configuration created successfully!",
//       result,
//     });
//   } catch (err) {
//     console.error("Error occurred while creating email configuration:", err);
//     res
//       .status(500)
//       .json({ success: false, msg: "Error adding email configuration" });
//   }
// };

exports.createEmailConfig = async (req, res) => {
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
    } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to create an email configuration.",
      });
    }

    const newEmailConfig = new EmailConfig({
      taskStageId,
      lastFetched,
      lastToFetched,
      companyId,
      projectId,
      smtpSettings: { host, port, tls },
      emailPatterns,
      authentication: [{ username, password: encrypt(password, companyId) }],
      userId,
    });

    const result = await newEmailConfig.save();

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

// // Update EmailConfig
// exports.updateEmailConfig = async (req, res) => {

//   const {
//     id,
//     userId,
//     taskStageId,
//     lastFetched,
//     lastToFetched,
//     companyId,
//     projectId,
//     tls,
//     username,
//     password,
//     host,
//     port,
//     emailPatterns,
//     // schedule,
//   } = req.body;

//   try {
//     // Validate that companyId is provided
//     if (!companyId) {
//       return res.status(400).json({
//         success: false,
//         msg: "Company ID is required to update the email configuration.",
//       });
//     }

//     // Ensure the schedule.daysOfWeek is formatted correctly
//     // const daysOfWeek = schedule?.daysOfWeek || [];

//     // Find the existing email configuration and update it
//     const updatedEmailConfig = await EmailConfig.findOneAndUpdate(
//       { _id: id, companyId: companyId, isDeleted: false }, // Ensure companyId matches and the config is not deleted
//       {
//         userId,
//         taskStageId,
//         lastFetched,
//         lastToFetched,
//         smtpSettings: {
//           host,
//           port,
//           tls,
//         },
//         projectId,
//         emailPatterns,
//         // schedule: {
//         //   frequency: schedule?.frequency,
//         //   time_of_day: schedule?.timeOfDay,
//         //   days_of_week: daysOfWeek,
//         // },
//         authentication: [{ username, password }],
//       },
//       { new: true }
//     );

//     if (!updatedEmailConfig) {
//       return res.status(404).json({
//         success: false,
//         msg: "Email configuration does not exist or has been deleted.",
//       });
//     }

//     res.json({
//       success: true,
//       message: "Email Configuration updated successfully!",
//       updatedEmailConfig,
//     });
//   } catch (err) {
//     console.error("Error occurred while updating email configuration:", err);
//     res
//       .status(500)
//       .json({ success: false, msg: "Error updating email configuration." });
//   }
// };

exports.updateEmailConfig = async (req, res) => {
  try {
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
      emailPatterns,
    } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to update the email configuration.",
      });
    }

    const updatedEmailConfig = await EmailConfig.findOneAndUpdate(
      { _id: id, companyId, isDeleted: false },
      {
        userId,
        taskStageId,
        lastFetched,
        lastToFetched,
        smtpSettings: { host, port, tls },
        projectId,
        emailPatterns,
        authentication: [{ username, password: encrypt(password, companyId) }],
      },
      { new: true }
    );

    if (!updatedEmailConfig) {
      return res.status(404).json({
        success: false,
        msg: "Email configuration does not exist or has been deleted.",
      });
    }

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
  try {
    const emailConfigId = req.params.id;

    const deletedConfig = await EmailConfig.findByIdAndUpdate(
      emailConfigId,
      { isDeleted: true },
      { new: true }
    );

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

// exports.fetchNowEmailConfig = async (req, res) => {
//   const EmailConfigId = req.body.id;
//   try {
//     const emailConfig = await EmailConfig.findOne({
//       isDeleted: false,
//       _id: EmailConfigId,
//     });
//     let emailAccounts = [];
//     emailConfig.authentication.forEach((auth) => {
//       emailAccounts.push({
//         user: auth.username,
//         password: auth.password,
//         host: emailConfig.smtpSettings.host,
//         port: emailConfig.smtpSettings.port,
//         tls: emailConfig.smtpSettings.tls,
//       });
//     });

//     const { companyId, projectId } = emailConfig;

//     const emails = await fetchEmail({
//       emailTaskConfig: emailConfig,
//       projectId,
//       taskStageId: emailConfig.taskStageId,
//       companyId,
//       userId: emailConfig.userId,
//       emailAccounts,
//     });
//     return res.json({ success: true, message: "Successfully Fetched Emails." });
//   } catch (error) {
//     console.error("Error fetching emails:", error);
//     return res.json({
//       success: false,
//       message: "Error while Fetching Emails.",
//     });
//   }
// };

exports.fetchNowEmailConfig = async (req, res) => {
  try {
    const { id } = req.body;
    const emailConfig = await EmailConfig.findOne({
      isDeleted: false,
      _id: id,
    });

    if (!emailConfig) {
      return res
        .status(404)
        .json({ success: false, message: "Email config not found" });
    }

    const emailAccounts = emailConfig.authentication.map((auth) => ({
      user: auth.username,
      password: decrypt(auth.password, emailConfig.companyId),
      host: emailConfig.smtpSettings.host,
      port: emailConfig.smtpSettings.port,
      tls: emailConfig.smtpSettings.tls,
    }));

    const emails = await fetchEmail({
      emailTaskConfig: emailConfig,
      projectId: emailConfig.projectId,
      taskStageId: emailConfig.taskStageId,
      companyId: emailConfig.companyId,
      userId: emailConfig.userId,
      emailAccounts,
    });

    return res.json({ success: true, message: "Successfully Fetched Emails." });
  } catch (error) {
    console.error("Error fetching emails:", error);
    return res.json({
      success: false,
      message: "Error while Fetching Emails.",
    });
  }
};
