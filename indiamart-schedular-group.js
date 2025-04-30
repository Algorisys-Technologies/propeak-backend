const schedule = require("node-schedule");
const axios = require("axios");
const moment = require("moment");
const Lead = require("./models/indiamart-integration/indiamart-lead-model");
const Task = require("./models/task/task-model");
const User = require("./models/user/user-model");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Project = require("./models/project/project-model");

dotenv.config();

mongoose
  .connect(process.env.DB, {
    socketTimeoutMS: 0,
  })
  .then(() => console.log("Connected to the database.", "DB"));

const ProjectSetting = require("./models/indiamart-integration/project-setting-model");
const GroupSetting = require("./models/indiamart-integration/group-setting-model");
const {
  fetchEmailScheduleEveryHour,
  fetchEmailScheduleEvery10Min,
} = require("./config");
const fetchLeads = require("./webscrape");
schedule.scheduleJob(fetchEmailScheduleEveryHour, async () => {
  console.log("IndiaMART Lead Scheduler triggered...");

  try {
    const settings = await GroupSetting.find({
      enabled: true,
      isDeleted: false,
      fetchFrequetly: true,
    });

    console.log("setting check", settings);

    if (!settings.length) {
      console.log("No IndiaMART integration settings found.");
      return;
    }

    for (const setting of settings) {
      if (setting.method == "API") {
        const {
          companyId,
          userId,
          groupId,
          taskStageId,
          projectStageId,
          projectTypeId,
          projectOwnerId,
          notifyUserId,
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

          console.log("leadsData...API...", leadsData);

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

          console.log("leadsData final...", leadsData);

          for (const lead of leadsData) {
            // Check if a project already exists for the same SENDER_NAME
            let existingProject = await Project.findOne({
              companyId,
              group: new mongoose.Types.ObjectId(groupId),
              title: lead.SENDER_COMPANY,
              isDeleted: false,
            });

            const regex = new RegExp(lead.label, "i");

            const users = await User.find({
              name: { $regex: regex },
              companyId,
            });

            console.log("Existing Project:", existingProject);

            if (!existingProject) {
              existingProject = new Project({
                companyId,
                title: lead.SENDER_COMPANY,
                description: lead.SENDER_COMPANY,
                startdate: new Date(),
                enddate: new Date(),
                status: "todo",
                projectStageId,
                taskStages: ["todo", "inprogress", "completed"],
                userid: new mongoose.Types.ObjectId(projectOwnerId),
                createdBy: new mongoose.Types.ObjectId(userId),
                createdOn: new Date(),
                modifiedOn: new Date(),
                sendnotification: false,
                //group: new mongoose.Types.ObjectId("67d9109da7af4496e62ad5f6"),
                group: new mongoose.Types.ObjectId(groupId),
                isDeleted: false,
                miscellaneous: false,
                archive: false,
                customFieldValues: {},
                projectUsers: [
                  new mongoose.Types.ObjectId(userId),
                  new mongoose.Types.ObjectId(projectOwnerId),
                  new mongoose.Types.ObjectId(notifyUserId),
                  users[0]?._id || null,
                ],
                notifyUsers: [new mongoose.Types.ObjectId(notifyUserId)],
                messages: [],
                uploadFiles: [],
                tasks: [],
                customTaskFields: [],
                projectTypeId: new mongoose.Types.ObjectId(projectTypeId),
                creation_mode: "AUTO",
                lead_source: "INDIAMART",
                tag: [lead.label],
              });

              await existingProject.save();
              console.log(`Project created: ${lead.SENDER_COMPANY}`);
            } else {
              console.log(
                `Project already exists: ${lead.SENDER_COMPANY} - Skipping.`
              );
            }

            // Prevent duplicate tasks within the project
            const existingTask = await Task.findOne({
              projectId: existingProject._id,
              title: lead.SUBJECT, // Using SUBJECT as task title
              isDeleted: false,
            });

            console.log("Existing Task:", existingTask);

            if (existingTask) {
              console.log(
                `Task already exists for subject: ${lead.SUBJECT} - Skipping.`
              );
              continue;
            }

            // Create new task inside the project
            const newTask = new Task({
              projectId: existingProject._id,
              taskStageId,
              // taskStageId: new mongoose.Types.ObjectId(
              //   "6732031b15c8e180c21e9aee"
              // ),
              companyId,
              title: lead.SUBJECT, // Use lead subject as task title
              description: lead.SUBJECT,
              startDate: lead.QUERY_TIME,
              createdOn: new Date(),
              modifiedOn: new Date(),
              creation_mode: "AUTO",
              tag: [lead.label],
              lead_source: "INDIAMART",
              userId: users[0]?._id || null,
              customFieldValues: {
                date: new Date(lead.QUERY_TIME).toLocaleDateString("IN"),
                name: lead.SENDER_NAME,
                mobile_number: lead.SENDER_MOBILE,
                mobile_number_alt: lead.SENDER_MOBILE_ALT,
                email: lead.SENDER_EMAIL,
                email_alt: lead.SENDER_EMAIL_ALT,
                phone: lead.SENDER_PHONE,
                phone_alt: lead.SENDER_PHONE_ALT,
                company_name: lead.SENDER_COMPANY,
                address: `${lead.SENDER_ADDRESS}, 
                City: ${lead.SENDER_CITY}, 
                State: ${lead.SENDER_STATE}, 
                Pincode: ${lead.SENDER_PINCODE}, 
                Country: ${lead.SENDER_COUNTRY_ISO}`,
                leads_details: `${lead.QUERY_PRODUCT_NAME},${lead.QUERY_MESSAGE},${lead.QUERY_MCAT_NAME}`,
              },
              isDeleted: false,
            });

            await newTask.save();
            console.log(`Task created for lead: ${lead.SUBJECT}`);
          }

          await GroupSetting.updateOne(
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
      if (setting.method == "Web-Scrape") {
        // Web scraping code goes here
        const {
          companyId,
          userId,
          groupId,
          taskStageId,
          projectStageId,
          projectTypeId,
          projectOwnerId,
          notifyUserId,
          authKey,
          startDate,
          endDate,
          fetchFrequetly,
          lastFetched,
        } = setting;
        console.log(setting);
        console.log(authKey);

        let newStartDate;
        let newEndDate;

        if (fetchFrequetly) {
          newStartDate = new Date(lastFetched);
          newEndDate = new Date(new Date());
        } else {
          newStartDate = new Date(startDate);
          newEndDate = new Date(endDate);
        }

        try {
          // Fetch leads from IndiaMART API
          const [mobileNumber, password] = authKey.split(":");
          const start_dayToSelect = `${new Date(newStartDate).getDate()}`;
          const start_monthToSelect = `${new Date(newStartDate).getMonth()}`;
          const start_yearToSelect = `${new Date(newStartDate).getFullYear()}`;
          const end_dayToSelect = `${new Date(newEndDate).getDate()}`;
          const end_monthToSelect = `${new Date(newEndDate).getMonth()}`;
          const end_yearToSelect = `${new Date(newEndDate).getFullYear()}`;
          const data = await fetchLeads({
            mobileNumber,
            password,
            start_dayToSelect,
            start_monthToSelect,
            start_yearToSelect,
            end_dayToSelect,
            end_monthToSelect,
            end_yearToSelect,
            authKey,
          });
          const leadsData = data;
          if (!leadsData || leadsData.length === 0) {
            console.log("No new leads found from IndiaMART.");
            continue;
          }

          console.log(
            `Fetched ${leadsData.length} leads for companyId: ${companyId}`
          );

          for (const lead of leadsData) {
            // Check if a project already exists for the same SENDER_NAME
            let existingProject = await Project.findOne({
              companyId,
              group: new mongoose.Types.ObjectId(groupId),
              title: lead.name,
              isDeleted: false,
            });

            const regex = new RegExp(lead.label, "i");

            const users = await User.find({
              name: { $regex: regex },
              companyId,
            });

            console.log("existingProject", existingProject);

            if (!existingProject) {
              existingProject = new Project({
                companyId,
                title: lead.name,
                description: lead.name,
                startdate: new Date(),
                enddate: new Date(),
                status: "todo",
                projectStageId,
                // projectStageId: new mongoose.Types.ObjectId(
                //   "673202d015c8e180c21e9acf"
                // ),
                taskStages: ["todo", "inprogress", "completed"],
                userid: new mongoose.Types.ObjectId(projectOwnerId),
                createdBy: new mongoose.Types.ObjectId(userId),
                createdOn: new Date(),
                modifiedOn: new Date(),
                sendnotification: false,
                //group: new mongoose.Types.ObjectId("67d9109da7af4496e62ad5f6"),
                group: new mongoose.Types.ObjectId(groupId),
                isDeleted: false,
                miscellaneous: false,
                archive: false,
                customFieldValues: {},
                projectUsers: [
                  new mongoose.Types.ObjectId(userId),
                  new mongoose.Types.ObjectId(projectOwnerId),
                  new mongoose.Types.ObjectId(notifyUserId),
                  users[0]?._id || null,
                ],
                notifyUsers: [new mongoose.Types.ObjectId(notifyUserId)],
                messages: [],
                uploadFiles: [],
                tasks: [],
                customTaskFields: [],
                projectTypeId: new mongoose.Types.ObjectId(projectTypeId),
                creation_mode: "MANUAL",
                lead_source: "INDIAMART",
                tag: [lead.label],
              });

              console.log("existingProject creation", existingProject);

              await existingProject.save();
              console.log(`Project created: ${lead.name}`);
            } else {
              console.log(`Project already exists: ${lead.name}`);
            }

            // Prevent duplicate tasks
            const existingTask = await Task.findOne({
              projectId: existingProject._id,
              title: lead.productName,
              isDeleted: false,
            });

            if (!existingTask) {
              // Create new task
              const newTask = new Task({
                projectId: existingProject._id,
                taskStageId,
                //taskStageId: new mongoose.Types.ObjectId("6732031b15c8e180c21e9aee"),
                companyId,
                title: lead.productName,
                description: lead.productName,
                startDate: lead.productDate,
                createdOn: new Date(),
                modifiedOn: new Date(),
                creation_mode: "AUTO",
                tag: [lead.label],
                lead_source: "INDIAMART",
                userId: users[0]?._id || null,
                customFieldValues: {
                  date: moment(lead.productDate).format("DD/MM/YYYY"),
                  name: lead.contactPerson,
                  mobile_number: lead.mobile,
                  email: lead.email,
                  company_name: lead.name,
                  leads_details: lead.details,
                  address: lead.address,
                },
                isDeleted: false,
              });

              console.log("newTask", newTask);

              await newTask.save();
              console.log(`Task created for lead: ${lead.productName}`);
            } else {
              console.log(
                `Task already exists for product: ${lead.productName}`
              );
            }

            if (lead.leadDetail && Array.isArray(lead.leadDetail)) {
              for (const detail of lead.leadDetail) {
                try {
                  const response = await fetch(
                    "http://142.93.222.95:8000/extract_product",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(detail),
                    }
                  );

                  if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                  }

                  const responseData = await response.json();
                  console.log("JSON detail:", JSON.stringify(detail));
                  console.log("Extracted Product Data:", responseData);

                  if (!responseData?.product) {
                    console.log(
                      "No product extracted, skipping task creation."
                    );
                    continue; // Skip this iteration
                  }

                  // Prevent duplicate tasks
                  const existingTask = await Task.findOne({
                    projectId: existingProject._id,
                    title: responseData?.product,
                    isDeleted: false,
                  });

                  if (existingTask) {
                    console.log(
                      `Task already exists for product: ${responseData?.product} - Skipping.`
                    );
                    continue;
                  }

                  const formattedDate = moment(
                    responseData?.date,
                    "DD MMM YYYY, h:mm A"
                  );

                  // Create new task
                  const newTask = new Task({
                    projectId: existingProject._id,
                    taskStageId,
                    companyId,
                    title: responseData?.product,
                    description: responseData?.product,
                    startDate: formattedDate.isValid()
                      ? formattedDate.toDate()
                      : new Date(),
                    createdOn: new Date(),
                    modifiedOn: new Date(),
                    creation_mode: "AUTO",
                    tag: [lead.label],
                    lead_source: "INDIAMART",
                    userId: users[0]?._id || null,
                    customFieldValues: {
                      date: moment(responseData?.date).format("DD/MM/YYYY"),
                      name: lead.contactPerson,
                      mobile_number: lead.mobile,
                      email: lead.email,
                      company_name: lead.name,
                      leads_details: responseData?.message,
                      address: lead.address,
                    },
                    isDeleted: false,
                  });

                  console.log("newTask", newTask);

                  await newTask.save();
                  console.log(
                    `Task created for lead: ${responseData?.product}`
                  );
                } catch (error) {
                  console.error(
                    "Error calling extract_product API:",
                    error.message
                  );
                }
              }
            }
          }

          await GroupSetting.updateOne(
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
