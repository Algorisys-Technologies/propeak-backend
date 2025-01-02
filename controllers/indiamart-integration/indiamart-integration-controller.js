const IntegrationSetting = require("../../models/indiamart-integration/integration-settings-model");
const IndiamartInquiry = require("../../models/indiamart-integration/indiamart-inquiry-model");
const Lead = require("../../models/indiamart-integration/indiamart-lead-model");
const moment = require("moment");
const axios = require("axios");
const Task = require("../../models/task/task-model");

exports.getIntegrationSettings = async (req, res) => {
  try {
    const { companyId } = req.params;

    // console.log("Fetching Integration Settings:");
    // console.log("Company ID:", companyId);

    // Build the query object
    const query = {
      companyId,
    };

    // Fetch integration settings from the database
    const integrationSettings = await IntegrationSetting.find(query);

    if (!integrationSettings || integrationSettings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No integration settings found for the provided criteria.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Integration settings retrieved successfully.",
      data: integrationSettings,
    });
  } catch (error) {
    console.error("Error retrieving integration settings:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateIntegrationSettings = async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      crmKey,
      integrationProvider: provider,
      crmKeyId,
      method,
      keyname,
    } = req.body;

    console.log("keyname", keyname);

    // Ensure all required parameters are present
    if (!companyId || !provider || !crmKey || !crmKeyId || !keyname) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters: companyId, provider, crmKey, keyname, or crmKeyId.",
      });
    }

    // Fetch existing integration settings
    const existingSettings = await IntegrationSetting.findOne({
      companyId,
      integrationProvider: provider,
    });

    if (!existingSettings) {
      return res.status(404).json({
        success: false,
        message: "Integration settings not found. Please add them first.",
      });
    }

    const providerSettings = existingSettings.settings[provider];

    if (!providerSettings) {
      return res.status(400).json({
        success: false,
        message: `No settings found for provider: ${provider}.`,
      });
    }

    // Ensure crmKeyId is cast to string for comparison
    const crmKeyIndex = providerSettings.findIndex(
      (key) => key._id.toString() === crmKeyId
    );

    if (crmKeyIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "CRM Key Id not found.",
      });
    }

    // Check for duplicates in crmKey or keyname
    const isDuplicate = providerSettings.some(
      (key, index) =>
        index !== crmKeyIndex &&
        (key.authKey === crmKey ||
          key.clientId === crmKey ||
          key.keyName === keyname)
    );

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message:
          "This CRM key or keyname already exists for the selected provider.",
      });
    }

    // Update the key based on the provider's structure
    const keyField = provider === "IndiaMART" ? "authKey" : "clientId";
    providerSettings[crmKeyIndex][keyField] = crmKey;
    providerSettings[crmKeyIndex].keyName = keyname;
    providerSettings[crmKeyIndex].method = method;

    // Update the modified timestamp and save the updated settings
    existingSettings.modifiedOn = Date.now();
    await existingSettings.save();

    return res.status(200).json({
      success: true,
      message: "Integration settings updated successfully.",
      settings: existingSettings,
    });
  } catch (error) {
    console.error("Error updating integration settings:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating integration settings.",
      error: error.message,
    });
  }
};

exports.addIntegrationSettings = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { crmKey, integrationProvider: provider, keyname, method } = req.body;

    if (!companyId || !provider || !crmKey || !keyname) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters: companyId, provider, crmKey, or keyname.",
      });
    }

    const existingSettings = await IntegrationSetting.findOne({
      companyId,
      integrationProvider: provider,
    });

    if (existingSettings) {
      // Check if the CRM key already exists for the provider
      const isDuplicate = existingSettings.settings[provider].some(
        (integration) =>
          integration.authKey === crmKey ||
          integration.clientId === crmKey ||
          integration.keyName === keyname
      );

      if (isDuplicate) {
        return res.status(400).json({
          success: false,
          message:
            "This CRM key or keyname already exists for the selected provider.",
        });
      }

      // If settings exist for the provider, push the new integration into the array
      const newIntegration = {};

      if (provider === "IndiaMART") {
        newIntegration["keyName"] = keyname;
        newIntegration["authKey"] = crmKey;
        newIntegration["method"] = method;
        existingSettings.settings["IndiaMART"].push(newIntegration);
      } else if (provider === "Salesforce") {
        newIntegration["keyName"] = keyname;
        newIntegration["clientId"] = crmKey;
        newIntegration["method"] = method;
        existingSettings.settings["Salesforce"].push(newIntegration);
      } else if (provider === "Zoho") {
        newIntegration["keyName"] = keyname;
        newIntegration["clientId"] = crmKey;
        newIntegration["method"] = method;
        existingSettings.settings["Zoho"].push(newIntegration);
      } else {
        return res.status(400).json({
          success: false,
          message: `Unsupported integration provider: ${provider}`,
        });
      }

      // Update the `modifiedOn` timestamp and save the updated settings
      existingSettings.modifiedOn = Date.now();
      await existingSettings.save();

      return res.status(200).json({
        success: true,
        message: "Integration added successfully.",
        settings: existingSettings,
      });
    } else {
      // If no existing settings, create new ones with the provider's settings
      const settings = {};

      if (provider === "IndiaMART") {
        settings["IndiaMART"] = [{ keyName: keyname, authKey: crmKey , method: method }];
      } else if (provider === "Salesforce") {
        settings["Salesforce"] = [{ keyName: keyname, clientId: crmKey,  method: method }];
      } else if (provider === "Zoho") {
        settings["Zoho"] = [{ keyName: keyname, clientId: crmKey,  method: method }];
      } else {
        return res.status(400).json({
          success: false,
          message: `Unsupported integration provider: ${provider}`,
        });
      }

      console.log("settings", settings);

      const newIntegrationSettings = new IntegrationSetting({
        companyId,
        integrationProvider: provider,
        settings,
        enabled: true,
        createdOn: Date.now(),
        modifiedOn: Date.now(),
      });

      await newIntegrationSettings.save();

      return res.status(201).json({
        success: true,
        message: "Integration settings added successfully.",
        settings: newIntegrationSettings,
      });
    }
  } catch (error) {
    console.error("Error adding integration settings:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while adding integration settings.",
      error: error.message,
    });
  }
};

exports.deleteIntegrationSettings = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { integrationProvider: provider, crmKeyId } = req.body;

    // Ensure all required parameters are present
    if (!companyId || !provider || !crmKeyId) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters: companyId, provider, or crmKeyId.",
      });
    }

    // Fetch existing integration settings
    const existingSettings = await IntegrationSetting.findOne({
      companyId,
      integrationProvider: provider,
    });

    if (!existingSettings) {
      return res.status(404).json({
        success: false,
        message: "Integration settings not found. Please add them first.",
      });
    }

    const providerSettings = existingSettings.settings[provider];

    if (!providerSettings) {
      return res.status(400).json({
        success: false,
        message: `No settings found for provider: ${provider}.`,
      });
    }

    // Find the index of the CRM key to delete
    const crmKeyIndex = providerSettings.findIndex(
      (key) => key._id.toString() === crmKeyId
    );

    if (crmKeyIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "CRM Key Id not found.",
      });
    }

    // Remove the CRM key from the provider's settings
    providerSettings.splice(crmKeyIndex, 1);

    // Update the modified timestamp and save the updated settings
    existingSettings.modifiedOn = Date.now();
    await existingSettings.save();

    return res.status(200).json({
      success: true,
      message: "CRM Key deleted successfully.",
      settings: existingSettings,
    });
  } catch (error) {
    console.error("Error deleting integration settings:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting integration settings.",
      error: error.message,
    });
  }
};


