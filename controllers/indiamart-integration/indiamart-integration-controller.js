const IntegrationSetting = require("../../models/indiamart-integration/integration-settings-model");
const IndiamartInquiry = require("../../models/indiamart-integration/indiamart-inquiry-model");
const Lead = require("../../models/indiamart-integration/indiamart-lead-model");
const moment = require("moment");
const axios = require("axios");
const Task = require("../../models/task/task-model");

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
      return res.status(400).json({
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
exports.addIntegrationSettings = async (req, res) => {
  try {
    const { companyId, provider } = req.params;
    const { projectId, crmKey, taskStageId, startDate, endDate } = req.body;

    console.log("Incoming Request Body:", req.body);
    console.log("Company ID:", companyId);
    console.log("Provider:", provider);

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

    if (provider === "IndiaMART") {
      const settings = {};
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
          const leadsToInsert = leadsData.map((lead) => ({
            ...lead,
            projectId,
            taskStageId,
          }));

          const insertedLeads = await Lead.insertMany(leadsToInsert);

          const tasks = [];
          console.log("existing tasks...........");
          for (const lead of leadsData) {
            const existingTask = await Task.findOne({
              projectId,
              taskStageId,
              title: lead.SUBJECT,
              startDate: lead.QUERY_TIME,
            });
            console.log(existingTask, "existingTask.........");
            if (existingTask) {
              return res.status(400).json({
                success: false,
                message: "Leads are already exist. Please update them instead.",
              });
            }

            tasks.push({
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
              creation_mode:"AUTO",
              lead_source:"INDIAMART",
              isDeleted: false,
              createdOn: moment().toISOString(),
            });
          }

          if (tasks.length > 0) {
            const insertedTasks = await Task.insertMany(tasks);
            console.log(
              `${insertedTasks.length} new tasks successfully inserted into the database.`
            );
          } else {
            console.log(
              "No new tasks were created; all leads already have tasks."
            );
          }

          console.log(
            `${insertedLeads.length} leads successfully inserted into the database.`
          );

          settings["IndiaMART"] = { leads: leadsToInsert };
        } else {
          console.log("No leads found for the provided time range.");
        }
      } catch (error) {
        console.error("Error fetching data from IndiaMART API:", error.message);
      }
    }

    const newIntegrationSettings = new IntegrationSetting({
      companyId,
      integrationProvider: provider,
      settings: {},
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

// exports.addIntegrationSettings = async (req, res) => {
//   try {
//     const { companyId, provider } = req.params;
//     const { projectId, crmKey, taskStageId, startDate, endDate } = req.body;

//     console.log("Incoming Request Body:", req.body);
//     console.log("Company ID:", companyId);
//     console.log("Provider:", provider);
//     const existingSettings = await IntegrationSetting.findOne({
//       companyId,
//       integrationProvider: provider,
//     });

//     if (existingSettings) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Integration settings already exist. Please update them instead.",
//       });
//     }
//     if (provider === "IndiaMART") {
//       const settings = {};
//       if (!crmKey || !startDate || !endDate) {
//         return res.status(400).json({
//           message:
//             "Missing required fields. Please provide crmKey, startDate, and endDate.",
//         });
//       }

//       const formattedStartDate = moment(startDate).format(
//         "DD-MMM-YYYYHH:mm:ss"
//       );
//       const formattedEndDate = moment(endDate).format("DD-MMM-YYYYHH:mm:ss");

//       const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${crmKey}&start_time=${formattedStartDate}&end_time=${formattedEndDate}`;

//       try {
//         const response = await axios.get(url);
//         console.log("API response:", response.data);

//         const leadsData = response.data.RESPONSE;

//         if (leadsData && leadsData.length > 0) {
//           console.log(`${leadsData.length} leads received from API.`);
//           const leadsToInsert = leadsData.map((lead) => ({
//             ...lead,
//             projectId,
//             taskStageId,
//           }));

//           const insertedLeads = await Lead.insertMany(leadsToInsert);

//           const tasks = leadsData.map((lead) => {
//             console.log(lead, "data of lead..........");
//             return {
//               projectId: projectId,
//               taskStageId: taskStageId,
//               companyId: companyId,
//               title: lead.SUBJECT,
//               description: `
//               Address: ${lead.SENDER_ADDRESS},
//               City: ${lead.SENDER_CITY},
//               State: ${lead.SENDER_STATE},
//               Pincode: ${lead.SENDER_PINCODE},
//               Country: ${lead.SENDER_COUNTRY_ISO},
//               Mobile: ${lead.SENDER_MOBILE_ALT},`,
//               startDate: lead.QUERY_TIME,
//               customFieldValues: {
//                 date: moment().format("DD/MM/YY"),
//                 name: lead.SENDER_NAME,
//                 mobile_number: lead.SENDER_MOBILE,
//                 company_name: lead.SENDER_COMPANY,
//               },
//               isDeleted: false,
//               // createdBy: "System",
//               createdOn: moment().toISOString(),
//             };
//           });
//           console.log(tasks, "tasks is here ");
//           const insertedTasks = await Task.insertMany(tasks);
//           console.log(
//             `${insertedTasks.length} tasks successfully inserted into the database.`
//           );

//           console.log(
//             `${insertedLeads.length} leads successfully inserted into the database.`
//           );

//           settings["IndiaMART"] = { leads: leadsToInsert }; // Optionally store leads in settings
//         } else {
//           console.log("No leads found for the provided time range.");
//         }
//       } catch (error) {
//         console.error("Error fetching data from IndiaMART API:", error.message);
//       }
//     }
//     const newIntegrationSettings = new IntegrationSetting({
//       companyId,
//       integrationProvider: provider,
//       settings: {},
//       enabled: true,
//       createdOn: Date.now(),
//       modifiedOn: Date.now(),
//     });
//     await newIntegrationSettings.save();

//     return res.status(201).json({
//       success: true,
//       message: "Integration settings added successfully.",
//       settings: newIntegrationSettings,
//     });
//   } catch (error) {
//     console.error("Error adding integration settings:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

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
