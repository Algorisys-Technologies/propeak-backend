const EmailConfig = require("../../models/email-config/email-config-model");
const mongoose = require("mongoose");


// Create a new email configuration
exports.createEmailConfig = async (req, res) => {
  console.log("is it coming in the email config ????")
  console.log("is it coming in the email config ????")

  try {
    console.log("is it coming in the email config ????")
    const {
      authentication,
      smtpSettings,
      emailPatterns,
      schedule,
    } = req.body;
    const companyId = req.body.companyId;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID is required." });
    }

    const newConfig = new EmailConfig({
      companyId,
      authentication,
      smtpSettings,
      emailPatterns,
      schedule,
    });

    await newConfig.save();
    return res.status(201).json({ success: true, config: newConfig });
  } catch (error) {
    console.error("Error creating email configuration:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Fetch all email configurations
exports.getAllEmailConfigs = async (req, res) => {
  try {
    const { companyId } = req.query;
    const configs = await EmailConfig.find({ companyId, isDeleted: false });

    return res.status(200).json({ success: true, configs });
  } catch (error) {
    console.error("Error fetching email configurations:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update an existing email configuration
exports.updateEmailConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updatedConfig = await EmailConfig.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!updatedConfig) {
      return res.status(404).json({ success: false, message: "Configuration not found." });
    }

    return res.status(200).json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error("Error updating email configuration:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Soft delete email configuration
exports.deleteEmailConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedConfig = await EmailConfig.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!deletedConfig) {
      return res.status(404).json({ success: false, message: "Configuration not found." });
    }

    return res.status(200).json({ success: true, message: "Configuration deleted." });
  } catch (error) {
    console.error("Error deleting email configuration:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
