const IntegrationSetting = require("../../models/indiamart-integration/integration-settings-model");
const IndiamartInquiry = require("../../models/indiamart-integration/indiamart-inquiry-model");
//const bcrypt = require("bcryptjs");

// Fetch Integration Settings for a Company
exports.getIntegrationSettings = async (req, res) => {
  console.log("IntegrationSettings");
  console.log("IntegrationSettings req", req.params, req.body);
  try {
    const { companyId, provider } = req.params;

    const settings = await IntegrationSetting.findOne({
      companyId,
      integrationProvider: provider,
    });

    if (!settings) {
      return res
        .status(404)
        .json({ success: false, message: "Settings not found." });
    }

    return res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error("Error fetching integration settings:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Update Integration Settings
// exports.updateIntegrationSettings = async (req, res) => {
//   try {
//     const { companyId, provider } = req.params;
//     const { settings, schedule } = req.body;

//     const updatedSettings = await IntegrationSetting.findOneAndUpdate(
//       { companyId, integrationProvider: provider },
//       {
//         $set: { settings, schedule, modifiedOn: Date.now() },
//       },
//       { new: true }
//     );

//     if (!updatedSettings) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Settings not found." });
//     }

//     return res.status(200).json({ success: true, settings: updatedSettings });
//   } catch (error) {
//     console.error("Error updating integration settings:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// Update Integration Settings
exports.updateIntegrationSettings = async (req, res) => {
  try {
    const { companyId, provider } = req.params;
    const { settings, schedule } = req.body;

    console.log("Updating settings for Company ID:", companyId);
    console.log("Provider:", provider);
    console.log("New Settings:", settings);
    console.log("New Schedule:", schedule);

    // Ensure settings and schedule are provided
    if (!settings || !schedule) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Settings and schedule are required.",
        });
    }

    // Find the existing settings and update them
    const updatedSettings = await IntegrationSetting.findOneAndUpdate(
      { companyId, integrationProvider: provider },
      {
        $set: { settings, schedule, modifiedOn: Date.now() },
      },
      { new: true } // Returns the updated document
    );

    // If no matching settings are found
    if (!updatedSettings) {
      return res
        .status(404)
        .json({ success: false, message: "Settings not found." });
    }

    return res.status(200).json({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error("Error updating integration settings:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Create Integration Settings
exports.addIntegrationSettings = async (req, res) => {
  try {
    const { companyId, provider } = req.params;
    const { settings = {}, schedule, authKey, callbackUrl, filters } = req.body;

    console.log("Incoming Request Body:", req.body);
    console.log("Company ID:", companyId);
    console.log("Provider:", provider);

    // Check if integration already exists
    const existingSettings = await IntegrationSetting.findOne({
      companyId,
      integrationProvider: provider,
    });

    if (existingSettings) {
      return res.status(400).json({
        success: false,
        message:
          "Integration settings already exist. Please update them instead.",
      });
    }

    // Ensure 'IndiaMART' settings exist in the structure
    if (provider === "IndiaMART") {
      // Initialize 'IndiaMART' settings if they don't exist
      if (!settings["IndiaMART"]) {
        settings["IndiaMART"] = {}; // Create 'IndiaMART' object if it doesn't exist
      }

      // Now safely assign values to the IndiaMART settings
      settings["IndiaMART"].authKey = authKey;
      settings["IndiaMART"].callbackUrl = callbackUrl;

      // Set filters if provided, or use default filters
      settings["IndiaMART"].filters = filters || {
        leadType: ["BUYER", "SELLER"], // Default filter
        priority: "High", // Default priority
      };
    }

    // Create new integration settings with updated settings
    const newIntegrationSettings = new IntegrationSetting({
      companyId,
      integrationProvider: provider,
      settings, // This now includes IndiaMART settings with authKey, callbackUrl, and filters
      schedule,
      enabled: true,
      createdOn: Date.now(),
      modifiedOn: Date.now(),
    });

    // Save the new integration settings to the database
    await newIntegrationSettings.save();

    return res.status(201).json({
      success: true,
      message: "Integration settings added successfully.",
      settings: newIntegrationSettings,
    });
  } catch (error) {
    console.error("Error adding integration settings:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// IndiaMART Webhook Handler
exports.handleIndiamartWebhook = async (req, res) => {
  try {
    const { companyId } = req.params;
    const inquiryData = req.body;

    console.log("companyId", companyId, "inquiryData", inquiryData);

    // Fetch Integration Settings
    const integrationSettings = await IntegrationSetting.findOne({
      companyId,
      integrationProvider: "IndiaMART",
      enabled: true,
    });

    if (!integrationSettings) {
      return res
        .status(400)
        .json({ success: false, message: "Integration not enabled." });
    }

    // Apply Filters (if any)
    const filters = integrationSettings.settings?.IndiaMART?.filters;
    if (
      filters &&
      (!filters.leadType?.includes(inquiryData.leadType) ||
        (filters.priority && filters.priority !== inquiryData.priority))
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Lead does not match filters." });
    }

    // Save Inquiry
    const newInquiry = new IndiamartInquiry({
      companyId,
      inquiryId: inquiryData.inquiryId,
      inquiryDetails: inquiryData,
    });

    await newInquiry.save();

    return res.status(201).json({ success: true, inquiry: newInquiry });
  } catch (error) {
    console.error("Error handling IndiaMART webhook:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// // Fetch Active Integrations for a Company (with optional provider filter)
// exports.getActiveIntegrations = async (req, res) => {
//   try {
//     const { companyId, provider } = req.params;
//     const query = {
//       companyId,
//       enabled: true,
//     };

//     if (provider) {
//       query.integrationProvider = provider;
//     }

//     const activeIntegrations = await IntegrationSetting.find(query);

//     if (!activeIntegrations || activeIntegrations.length === 0) {
//       return res
//         .status(404)
//         .json({ success: false, message: "No active integrations found." });
//     }

//     return res
//       .status(200)
//       .json({ success: true, integrations: activeIntegrations });
//   } catch (error) {
//     console.error("Error fetching active integrations:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };
