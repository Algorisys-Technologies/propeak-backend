const IntegrationSetting = require("../../models/indiamart-integration/integration-settings-model");
const IndiamartInquiry = require("../../models/indiamart-integration/indiamart-inquiry-model");
const Lead = require("../../models/indiamart-integration/indiamart-lead-model");
const moment = require("moment");
const axios = require("axios");
const Task = require("../../models/task/task-model");

//const bcrypt = require("bcryptjs");

// Fetch Integration Settings for a Company
// exports.getIntegrationSettings = async (req, res) => {
//   console.log("IntegrationSettings");
//   console.log("IntegrationSettings req", req.params, req.body);
//   try {
//     const { companyId, provider } = req.params;

//     const settings = await IntegrationSetting.findOne({
//       companyId,
//       integrationProvider: provider,
//     });

//     if (!settings) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Settings not found." });
//     }

//     return res.status(200).json({ success: true, settings });
//   } catch (error) {
//     console.error("Error fetching integration settings:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

exports.getIntegrationSettings = async (req, res) => {
  try {
    const { companyId, provider } = req.params;
    const { projectId } = req.body;

    // console.log("Fetching Integration Settings:");
    // console.log("Company ID:", companyId);
    // console.log("Provider:", provider);
    // console.log("Project ID:", projectId);

    // Build the query object
    const query = {
      companyId,
      integrationProvider: provider,
    };

    // If projectId is provided, add it to the query
    if (projectId) {
      query.projectId = projectId;
    }

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
    const { projectId, crmKey, taskStageId, startDate, endDate } = req.body;

    console.log("Incoming Request Body for Update:", req.body);
    console.log("Company ID:", companyId);
    console.log("Provider:", provider);

    // Find existing settings
    const existingSettings = await IntegrationSetting.findOne({
      projectId,
      integrationProvider: provider,
    });

    if (!existingSettings) {
      return res.status(404).json({
        success: false,
        message: "Integration settings not found. Please add them first.",
      });
    }

    // Update settings object
    if (provider === "IndiaMART") {
      if (crmKey) {
        existingSettings.settings["IndiaMART"].authKey = crmKey;
      }
      if (startDate && endDate) {
        const formattedStartDate = moment(startDate).format(
          "DD-MMM-YYYYHH:mm:ss"
        );
        const formattedEndDate = moment(endDate).format("DD-MMM-YYYYHH:mm:ss");

        const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${crmKey}&start_time=${formattedStartDate}&end_time=${formattedEndDate}`;

        try {
          const response = await axios.get(url);
          console.log("API response for update:", response.data);

          const leadsData = response.data.RESPONSE;

          if (leadsData && leadsData.length > 0) {
            console.log(
              `${leadsData.length} leads received from API for update.`
            );

            const leadsToInsert = leadsData.map((lead) => ({
              ...lead,
              projectId,
              taskStageId,
            }));

            const insertedLeads = await Lead.insertMany(leadsToInsert);
            console.log(
              `${insertedLeads.length} leads successfully updated in the database.`
            );

            existingSettings.settings["IndiaMART"].leads = leadsToInsert; // Update leads in settings
          } else {
            console.log("No leads found for the provided time range.");
          }
        } catch (error) {
          console.error(
            "Error fetching data from IndiaMART API during update:",
            error.message
          );
        }
      }
    }

    // Update common fields
    existingSettings.modifiedOn = Date.now();

    // Save updated settings
    await existingSettings.save();

    return res.status(200).json({
      success: true,
      message: "Integration settings updated successfully.",
      settings: existingSettings,
    });
  } catch (error) {
    console.error("Error updating integration settings:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.addIntegrationSettings = async (req, res) => {
  try {
    const { companyId, provider } = req.params;
    const { projectId, crmKey, taskStageId, startDate, endDate } = req.body;
    const settings = {};

    console.log("Incoming Request Body:", req.body);
    console.log("Company ID:", companyId);
    console.log("Provider:", provider);

    // Check if integration already exists
    const existingSettings = await IntegrationSetting.findOne({
      projectId,
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
      // Initialize the IndiaMART object in settings
      settings["IndiaMART"] = {};

      // Set authKey and filters
      settings["IndiaMART"].authKey = crmKey;
      // settings["IndiaMART"].filters = {
      //   leadType: ["SELLER"],
      //   priority: "High",
      // };

      // Fetch leads as part of integration settings creation
      if (!crmKey || !startDate || !endDate) {
        return res.status(400).json({
          message:
            "Missing required fields. Please provide crmKey, startDate, and endDate.",
        });
      }

      const formattedStartDate = moment(startDate).format(
        "DD-MMM-YYYYHH:mm:ss"
      );
      const formattedEndDate = moment(endDate).format("DD-MMM-YYYYHH:mm:ss");

      const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${crmKey}&start_time=${formattedStartDate}&end_time=${formattedEndDate}`;

      try {
        const response = await axios.get(url);
        console.log("API response:", response.data);

        const leadsData = response.data.RESPONSE;

        if (leadsData && leadsData.length > 0) {
          console.log(`${leadsData.length} leads received from API.`);

          // Add additional fields to leads if necessary
          const leadsToInsert = leadsData.map((lead) => ({
            ...lead,
            projectId,
            taskStageId,
          }));

          const insertedLeads = await Lead.insertMany(leadsToInsert);

          const tasks = leadsData.map((lead) => {
            return {
              projectId: projectId,
              taskStageId: taskStageId,
              companyId: companyId,
              title: lead.SUBJECT,
              description: `
              Address: ${lead.SENDER_ADDRESS}, 
              City: ${lead.SENDER_CITY}, 
              State: ${lead.SENDER_STATE}, 
              Pincode: ${lead.SENDER_PINCODE}, 
              Country: ${lead.SENDER_COUNTRY_ISO}, 
              Mobile: ${lead.SENDER_MOBILE_ALT},`,
              startDate: lead.QUERY_TIME,
              customFieldValues: {
                date: moment().format("DD/MM/YY"),
                name: lead.SENDER_NAME,
                mobile_number: lead.SENDER_MOBILE,
                company_name: lead.SENDER_COMPANY,
              },
              isDeleted: false,
              // createdBy: "System",
              createdOn: moment().toISOString(),
            };
          });
          //console.log(tasks, "tasks is here ");
          const insertedTasks = await Task.insertMany(tasks);
          console.log(
            `${insertedTasks.length} tasks successfully inserted into the database.`
          );

          console.log(
            `${insertedLeads.length} leads successfully inserted into the database.`
          );

          settings["IndiaMART"] = { leads: leadsToInsert }; // Optionally store leads in settings
        } else {
          console.log("No leads found for the provided time range.");
        }
      } catch (error) {
        console.error("Error fetching data from IndiaMART API:", error.message);
      }
    }

    // Create new integration settings with updated settings
    const newIntegrationSettings = new IntegrationSetting({
      companyId,
      projectId,
      taskStageId,
      integrationProvider: provider,
      settings,
      enabled: true,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
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

    if (!inquiryData.inquiryId) {
      const { v4: uuidv4 } = require("uuid");
      inquiryData.inquiryId = uuidv4(); // Generate a new inquiryId
      console.log(" inquiryData.inquiryId", inquiryData.inquiryId);
    }

    // Fetch Integration Settings
    const integrationSettings = await IntegrationSetting.findOne({
      companyId,
      integrationProvider: "IndiaMART",
      enabled: true,
    });

    console.log("integrationSettings......", integrationSettings);

    if (!integrationSettings) {
      return res
        .status(400)
        .json({ success: false, message: "Integration not enabled." });
    }

    // Apply Filters (if any)
    // const filters = integrationSettings.settings?.IndiaMART?.filters;
    // if (
    //   filters &&
    //   (!filters.leadType?.includes(inquiryData.leadType) ||
    //     (filters.priority && filters.priority !== inquiryData.priority))
    // ) {
    //   return res
    //     .status(400)
    //     .json({ success: false, message: "Lead does not match filters." });
    // }

    // console.log("filters", filters);

    // Save Inquiry
    const newInquiry = new IndiamartInquiry({
      companyId,
      inquiryId: inquiryData.inquiryId,
      inquiryDetails: inquiryData,
    });

    await newInquiry.save();

    console.log("newInquiry", newInquiry);

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
