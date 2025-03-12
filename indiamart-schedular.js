const schedule = require("node-schedule");
const axios = require("axios");
const moment = require("moment");
const Lead = require("./models/indiamart-integration/indiamart-lead-model");
const Task = require("./models/task/task-model");
const User = require("./models/user/user-model");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

mongoose
  .connect(process.env.DB, {
    socketTimeoutMS: 0,
  })
  .then(() => console.log("Connected to the database.", "DB"));

const ProjectSetting = require("./models/indiamart-integration/project-setting-model");
const { fetchEmailScheduleEveryHour } = require("./config");
const fetchLeads = require("./webscrape");
schedule.scheduleJob(fetchEmailScheduleEveryHour, async () => {
  console.log("IndiaMART Lead Scheduler triggered...");

  try {
    const settings = await ProjectSetting.find({
      enabled: true,
      isDeleted: false,
      fetchFrequetly: true
    });

    if (!settings.length) {
      console.log("No IndiaMART integration settings found.");
      return;
    }

    for (const setting of settings) {

      if(setting.method== "API") {
        const {
          companyId,
          projectId,
          taskStageId,
          authKey,
          startDate,
          endDate,
          fetchFrequetly,
          lastFetched,
        } = setting;
        console.log(authKey);
  
        let newStartDate;
        let newEndDate;
  
        if (fetchFrequetly) {
          newStartDate = moment(lastFetched).format("DD-MMM-YYYYHH:mm:ss");
          newEndDate = moment(new Date()).format("DD-MMM-YYYYHH:mm:ss");
        } else {
          newStartDate = moment(startDate).format("DD-MMM-YYYYHH:mm:ss");
          newEndDate = moment(endDate).format("DD-MMM-YYYYHH:mm:ss");
        }
  
        // API URL for fetching IndiaMART leads
        const apiUrl = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${authKey}&start_time=${newStartDate}&end_time=${newEndDate}`;
  
        try {
          // Fetch leads from IndiaMART API
          const response = await axios.get(apiUrl);
          const leadsData = response.data.RESPONSE;
  
          if (!leadsData || leadsData.length === 0) {
            console.log("No new leads found from IndiaMART.");
            continue;
          }
          const insertedLeads = await Lead.insertMany(leadsData);
          console.log(
            `${insertedLeads.length} leads successfully inserted into the database.`
          );
  
          console.log(
            `Fetched ${leadsData.length} leads for companyId: ${companyId}`
          );
  
          for (const lead of leadsData) {
            // Check for existing tasks to avoid duplicates
            const existingTask = await Task.findOne({
              projectId,
              taskStageId,
              title: lead.SUBJECT,
              startDate: lead.QUERY_TIME,
              isDeleted: false,
            });
  
            if (existingTask) {
              console.log(
                `Task already exists for lead: ${lead.SUBJECT} - Skipping.`
              );
              continue;
            }
  
            // Create new task for the lead
            const newTask = new Task({
              projectId,
              taskStageId,
              companyId,
              title: lead.SUBJECT,
              description: `
                  Address: ${lead.SENDER_ADDRESS}, 
                  City: ${lead.SENDER_CITY}, 
                  State: ${lead.SENDER_STATE}, 
                  Pincode: ${lead.SENDER_PINCODE}, 
                  Country: ${lead.SENDER_COUNTRY_ISO}, 
                  Mobile: ${lead.SENDER_MOBILE_ALT},`,
              startDate: lead.QUERY_TIME,
              createdOn: new Date(),
              modifiedOn: new Date(),
              creation_mode: "AUTO",
              lead_source: "INDIAMART",
              customFieldValues: {
                date: new Date(lead.QUERY_TIME).toLocaleDateString("IN"),
                name: lead.SENDER_NAME,
                mobile_number: lead.SENDER_MOBILE,
                email: lead.SENDER_EMAIL,
                company_name: lead.SENDER_COMPANY,
              },
              isDeleted: false,
            });
  
            await newTask.save();
            console.log(`Task created for lead: ${lead.SUBJECT}`);
          }
  
          await ProjectSetting.updateOne(
            { _id: setting._id },
            { lastFetched: new Date() }
          );
        } catch (error) {
          console.error(
            `Error fetching leads for companyId: ${companyId}`,
            error
          );
        }
      }
      if(setting.method== "Web-Scrape") {
        // Web scraping code goes here
        const {
          companyId,
          projectId,
          taskStageId,
          authKey,
          startDate,
          endDate,
          fetchFrequetly,
          lastFetched,
        } = setting;
        console.log(setting)
        console.log(authKey);

        let newStartDate;
        let newEndDate;

        if (fetchFrequetly) {
          newStartDate = new Date(lastFetched)
          newEndDate = new Date(new Date())
        } else {
          newStartDate = new Date(startDate)
          newEndDate = new Date(endDate)
        }
  
  
        try {
          // Fetch leads from IndiaMART API
          const [mobileNumber, password] = authKey.split(":");
          const start_dayToSelect = `${new Date(newStartDate).getDate()}`
          const start_monthToSelect = `${new Date(newStartDate).getMonth()}`
          const start_yearToSelect = `${new Date(newStartDate).getFullYear()}`
          const end_dayToSelect = `${new Date(newEndDate).getDate()}`
          const end_monthToSelect = `${new Date(newEndDate).getMonth()}`
          const end_yearToSelect = `${new Date(newEndDate).getFullYear()}`
          const data = await fetchLeads({mobileNumber, password, start_dayToSelect, start_monthToSelect, start_yearToSelect, end_dayToSelect, end_monthToSelect, end_yearToSelect});
          const leadsData = data;
          if (!leadsData || leadsData.length === 0) {
            console.log("No new leads found from IndiaMART.");
            continue;
          }
          
  
          console.log(
            `Fetched ${leadsData.length} leads for companyId: ${companyId}`
          );
  
          for (const lead of leadsData) {
            // Check for existing tasks to avoid duplicates
            const existingTask = await Task.findOne({
              projectId,
              taskStageId,
              title: lead.productName,
              description: lead.details,
              isDeleted: false,
            });
  
            if (existingTask) {
              console.log(
                `Task already exists for lead: ${lead.SUBJECT} - Skipping.`
              );
              continue;
            }

            const regex = new RegExp(lead.label, "i");

            const users = await User.find({ name: {$regex: regex},companyId });
  
            // Create new task for the lead
            const newTask = new Task({
              projectId,
              taskStageId,
              companyId,
              title: lead.productName,
              description: lead.details,
              startDate: lead.startDate,
              createdOn: new Date(),
              modifiedOn: new Date(),
              creation_mode: "AUTO",
              tag: [lead.label],
              lead_source: "INDIAMART",
              userId: users[0]?._id || null,
              customFieldValues: {
                date: new Date(startDate).toLocaleDateString("IN"),
                name: lead.name,
                mobile_number: lead.mobile,
                email: lead.email,
                company_name: lead.name,
              },
              isDeleted: false,
            });
  
            await newTask.save();
            console.log(`Task created for lead: ${lead.productName}`);
          }
  
          await ProjectSetting.updateOne(
            { _id: setting._id },
            { lastFetched: new Date() }
          );
        } catch (error) {
          console.error(
            `Error fetching leads for companyId: ${companyId}`,
            error
          );
        }


      }
   
    }
  } catch (error) {
    console.error("Error in IndiaMART Lead Scheduler:", error);
  }
});
