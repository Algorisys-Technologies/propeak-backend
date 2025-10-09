const GroupEmailConfig = require("../../models/email-config/group-email-config-model");
const { encrypt, decrypt } = require("../../utils/crypto.server");
const {
  decryptEmailConfigs,
  decryptSingleEmailConfig,
} = require("../../utils/email-config-decrypt.js");
// const { fetchEmail } = require("../../fetch-email.js");

// ------------------- GET ALL GROUP EMAIL CONFIGS -------------------
exports.getAllGroupEmailConfigs = async (req, res) => {
  try {
    const { companyId, groupId } = req.body;
    if (!companyId || !groupId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID and Group ID are required.",
      });
    }

    const configs = await GroupEmailConfig.find({
      companyId,
      groupId,
      isDeleted: false,
    });

    if (!configs || configs.length === 0) {
      return res.status(404).json({
        success: false,
        msg: "No group email configurations found.",
      });
    }

    const decryptedConfigs = decryptEmailConfigs(configs, companyId);

    res.json({
      success: true,
      message: "Group email configurations retrieved successfully.",
      emailConfigs: decryptedConfigs,
    });
  } catch (err) {
    console.error("Error fetching group email configs:", err);
    res
      .status(500)
      .json({ success: false, msg: "Error fetching group email configs." });
  }
};

// ------------------- GET GROUP EMAIL CONFIG BY ID -------------------
exports.getGroupEmailConfigById = async (req, res) => {
  try {
    const { companyId } = req.userInfo; // assuming req.userInfo is populated
    const config = await GroupEmailConfig.findOne({
      _id: req.params.id,
      companyId,
      isDeleted: false,
    });

    if (!config) {
      return res
        .status(404)
        .json({ success: false, msg: "Group email config not found." });
    }

    const decryptedConfig = decryptSingleEmailConfig(config, companyId);

    res.json({ success: true, data: decryptedConfig });
  } catch (err) {
    console.error("Error fetching group email config by ID:", err);
    res
      .status(500)
      .json({ success: false, msg: err.message || "Error fetching config." });
  }
};

// ------------------- CREATE GROUP EMAIL CONFIG -------------------
exports.createGroupEmailConfig = async (req, res) => {
  try {
    const {
      companyId,
      groupId,
      projectStageId,
      userId,
      lastFetched,
      lastToFetched,
      username,
      password,
      host,
      port,
      tls,
      emailPatterns,
    } = req.body;

    if (!companyId || !groupId || !projectStageId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID, Group ID, and Project Stage ID are required.",
      });
    }

    const newConfig = new GroupEmailConfig({
      companyId,
      groupId,
      projectStageId,
      userId,
      lastFetched,
      lastToFetched,
      smtpSettings: { host, port, tls },
      emailPatterns,
      authentication: [{ username, password: encrypt(password, companyId) }],
    });

    const result = await newConfig.save();

    res.json({
      success: true,
      message: "Group email config created successfully.",
      result,
    });
  } catch (err) {
    console.error("Error creating group email config:", err);
    res
      .status(500)
      .json({ success: false, msg: "Error creating group email config." });
  }
};

// ------------------- UPDATE GROUP EMAIL CONFIG -------------------
exports.updateGroupEmailConfig = async (req, res) => {
  try {
    const {
      id,
      companyId,
      groupId,
      projectStageId,
      userId,
      lastFetched,
      lastToFetched,
      username,
      password,
      host,
      port,
      tls,
      emailPatterns,
    } = req.body;

    if (!companyId || !id) {
      return res.status(400).json({
        success: false,
        msg: "Company ID and Config ID are required.",
      });
    }

    const updatedConfig = await GroupEmailConfig.findOneAndUpdate(
      { _id: id, companyId, isDeleted: false },
      {
        groupId,
        projectStageId,
        userId,
        lastFetched,
        lastToFetched,
        smtpSettings: { host, port, tls },
        emailPatterns,
        authentication: [{ username, password: encrypt(password, companyId) }],
      },
      { new: true }
    );

    if (!updatedConfig) {
      return res
        .status(404)
        .json({ success: false, msg: "Group email config not found." });
    }

    res.json({
      success: true,
      message: "Group email config updated successfully.",
      updatedConfig,
    });
  } catch (err) {
    console.error("Error updating group email config:", err);
    res
      .status(500)
      .json({ success: false, msg: "Error updating group email config." });
  }
};

// ------------------- DELETE GROUP EMAIL CONFIG -------------------
exports.deleteGroupEmailConfig = async (req, res) => {
  try {
    const id = req.params.id;
    const deletedConfig = await GroupEmailConfig.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!deletedConfig) {
      return res
        .status(404)
        .json({ success: false, msg: "Group email config not found." });
    }

    res.json({
      success: true,
      message: "Group email config deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting group email config:", err);
    res
      .status(500)
      .json({ success: false, msg: "Error deleting group email config." });
  }
};

// // ------------------- FETCH NOW GROUP EMAIL CONFIG -------------------
// exports.fetchNowGroupEmailConfig = async (req, res) => {
//   try {
//     const { id } = req.body;
//     const config = await GroupEmailConfig.findOne({
//       _id: id,
//       isDeleted: false,
//     });

//     if (!config)
//       return res
//         .status(404)
//         .json({ success: false, message: "Group email config not found." });

//     const emailAccounts = config.authentication.map((auth) => ({
//       user: auth.username,
//       password: decrypt(auth.password, config.companyId),
//       host: config.smtpSettings.host,
//       port: config.smtpSettings.port,
//       tls: config.smtpSettings.tls,
//     }));

//     await fetchEmail({
//       emailTaskConfig: config,
//       projectId: null,
//       taskStageId: config.projectStageId,
//       companyId: config.companyId,
//       userId: config.userId,
//       emailAccounts,
//     });

//     res.json({ success: true, message: "Successfully fetched emails." });
//   } catch (err) {
//     console.error("Error fetching emails:", err);
//     res.status(500).json({ success: false, message: "Error fetching emails." });
//   }
// };
