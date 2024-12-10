const axios = require("axios");
const IndiamartInquiry = require("../../models/indiamart-integration/indiamart-inquiry-model");
const moment = require("moment");
const Lead = require("../../models/indiamart-integration/indiamart-lead-model");
const Task = require("../../models/task/task-model");

exports.getLeads = async (req, res) => {
  const startTime = moment("2024-12-09T00:00:00").format("DD-MMM-YYYYHH:mm:ss");
  const endTime = moment("2024-12-09T23:59:59").format("DD-MMM-YYYYHH:mm:ss");

  const crmKey = "mRywEb5u4HfHTver432Y/1CPp1LEmzY=";

  if (!crmKey) {
    return res
      .status(400)
      .json({ message: "CRM key is missing. Please provide a valid CRM key." });
  }

  const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${crmKey}&start_time=${startTime}&end_time=${endTime}`;

  try {
    const response = await axios.get(url);
    console.log("API response:", response.data);

    const leadsData = response.data.RESPONSE;
    const tasks = leadsData.map((lead) => {
      console.log(lead, "data of lead..........");
      return {
        projectId: "673eb6d62e87a01115656930",
        taskStageId: "671b472f9ccb60f1a05dfca9",
        companyId: "66ebbbc2c5bb38ee351dc0b2",
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
    console.log(tasks, "tasks is here ");

    if (leadsData && leadsData.length > 0) {
      console.log(`${leadsData.length} leads received from API.`);

      const insertedTasks = await Task.insertMany(tasks);
      console.log(
        `${insertedTasks.length} tasks successfully inserted into the database.`
      );

      const insertedLeads = await Lead.insertMany(leadsData);
      console.log(
        `${insertedLeads.length} leads successfully inserted into the database.`
      );

      return res.status(200).json({
        message: "Leads and tasks fetched and stored successfully.",
        leads: leadsData,
        tasks: insertedTasks,
      });
    } else {
      console.log("No leads found for the provided time range.");
      return res
        .status(404)
        .json({ message: "No leads found for the provided time range." });
    }
  } catch (error) {
    console.error("Error occurred:", error.message);
    return res.status(500).json({
      message: "Error fetching data from IndiaMART API.",
      error: error.message,
    });
  }
};

// exports.getLeads = async (req, res) => {
//   const startTime = moment("2024-12-09T00:00:00").format("DD-MMM-YYYYHH:mm:ss");
//   const endTime = moment("2024-12-09T23:59:59").format("DD-MMM-YYYYHH:mm:ss");

//   const crmKey = "mRywEb5u4HfHTver432Y/1CPp1LEmzY=";

//   if (!crmKey) {
//     return res
//       .status(400)
//       .json({ message: "CRM key is missing. Please provide a valid CRM key." });
//   }

//   const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${crmKey}&start_time=${startTime}&end_time=${endTime}`;

//   try {
//     const response = await axios.get(url);
//     console.log("API response:", response.data);

//     const leadsData = response.data.RESPONSE;

//     if (leadsData && leadsData.length > 0) {
//       console.log(`${leadsData.length} leads received from API.`);

//       const insertedLeads = await Lead.insertMany(leadsData);
//       console.log(
//         `${insertedLeads.length} leads successfully inserted into the database.`
//       );

//       return res
//         .status(200)
//         .json({
//           message: "Leads fetched and stored successfully.",
//           leads: leadsData,
//         });
//     } else {
//       console.log("No leads found for the provided time range.");
//       return res
//         .status(404)
//         .json({ message: "No leads found for the provided time range." });
//     }
//   } catch (error) {
//     console.error("Error occurred:", error.message);
//     return res.status(500).json({
//       message: "Error fetching data from IndiaMART API.",
//       error: error.message,
//     });
//   }
// };
