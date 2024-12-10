const axios = require("axios");
const IndiamartInquiry = require("../../models/indiamart-integration/indiamart-inquiry-model");
const moment = require("moment");
const Lead = require("../../models/indiamart-integration/indiamart-lead-model");
exports.getIndiaMARTLeads = async (req, res) => {
  //   const { auth_key, GLUSR_MOBILE, companyId } = req.body;
  const companyId = "66ebbbc2c5bb38ee351dc0b2";
  const GLUSR_MOBILE = "9892492782";
  const auth_key = "mRywEb5u4HfHTver432Y/1CPp1LEmzY=";

  if (!auth_key || !GLUSR_MOBILE || !companyId) {
    return res.status(400).json({
      success: false,
      message: "auth_key, GLUSR_MOBILE, and companyId are required.",
    });
  }

  try {
    // Fetch data from the IndiaMART Pull API
    const response = await axios.get(
      //   "https://mapi.indiamart.com/wservce/enquiry/listing/",
      // "https://seller.indiamart.com/messagecentre",

      "https://seller.indiamart.com/leadmanager/crmapi",
      {
        params: {
          AUTH_KEY: auth_key,
          GLUSR_MOBILE,
        },
      }
    );
    console.log(
      await response.json(),
      "response...........................from indiamart get"
    );
    const { RESPONSE } = response.data;

    if (!RESPONSE || !Array.isArray(RESPONSE)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response from IndiaMART API.",
      });
    }

    const savedLeads = [];

    for (const lead of RESPONSE) {
      // Check if the lead already exists
      const existingLead = await IndiamartInquiry.findOne({
        inquiryId: lead.UNIQUE_QUERY_ID,
        companyId,
      });

      if (!existingLead) {
        const newLead = new IndiamartInquiry({
          companyId,
          inquiryId: lead.UNIQUE_QUERY_ID,
          inquiryDetails: lead,
        });

        await newLead.save();
        savedLeads.push(newLead);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Leads fetched and saved successfully.",
      savedLeads,
    });
  } catch (error) {
    console.error("Error fetching IndiaMART leads:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads.",
      error: error.message,
    });
  }
};

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

    if (leadsData && leadsData.length > 0) {
      console.log(`${leadsData.length} leads received from API.`);

      const insertedLeads = await Lead.insertMany(leadsData);
      console.log(
        `${insertedLeads.length} leads successfully inserted into the database.`
      );

      return res
        .status(200)
        .json({
          message: "Leads fetched and stored successfully.",
          leads: leadsData,
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
