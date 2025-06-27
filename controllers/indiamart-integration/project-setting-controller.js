const ProjectSetting = require("../../models/indiamart-integration/project-setting-model");
const GroupSetting = require("../../models/indiamart-integration/group-setting-model");
const mongoose = require("mongoose");
const axios = require("axios");
const Lead = require("../../models/indiamart-integration/indiamart-lead-model");
const Task = require("../../models/task/task-model");
const Project = require("../../models/project/project-model");
const User = require("../../models/user/user-model");
const moment = require("moment");
const fetchLeads = require("../../webscrape");

// Create a new Project Setting
exports.createProjectSetting = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project ID is required." });
    }

    const existingSetting = await ProjectSetting.findOne({ projectId });
    if (existingSetting) {
      return res.status(400).json({
        success: false,
        message: "Project settings for this project already exist.",
      });
    }

    // Create a new ProjectSetting
    const projectSetting = new ProjectSetting(req.body);
    await projectSetting.save();

    res.status(201).json({ success: true, data: projectSetting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllProjectSetting = async (req, res) => {
  const { companyId, projectId } = req.body;

  if (!companyId) {
    return res
      .status(400)
      .json({ success: false, message: "Company ID is required" });
  }

  console.log(`Received companyId from request body: ${companyId}`);

  try {
    const projectSetting = await ProjectSetting.find({ companyId, projectId });

    if (!projectSetting.length) {
      return res.status(404).json({
        success: false,
        message: "No project settings found for the provided company ID",
      });
    }

    console.log(
      `Fetched project settings: ${JSON.stringify(projectSetting, null, 2)}`
    );

    res.status(200).json({ success: true, data: projectSetting });
  } catch (error) {
    console.error(`Error fetching project settings: ${error.message}`, error);

    res.status(500).json({
      success: false,
      message: "An error occurred while fetching project settings",
    });
  }
};

// Get a single Project Setting by ID
exports.getProjectSettingById = async (req, res) => {
  try {
    const projectSetting = await ProjectSetting.findById(req.params.id)
      .populate("companyId", "companyName")
      .populate("projectId", "title")
      .populate("taskStageId", "name");

    if (!projectSetting) {
      return res
        .status(404)
        .json({ success: false, message: "Project Setting not found" });
    }

    res.status(200).json({ success: true, data: projectSetting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProjectSetting = async (req, res) => {
  console.log("update project setting................");
  console.log(req.body, "request body of update...........");
  try {
    const projectSetting = await ProjectSetting.findByIdAndUpdate(
      req.body.id,
      req.body,
      { new: true, runValidators: true }
    );

    console.log(projectSetting, "projectSetting....................");
    if (!projectSetting) {
      return res
        .status(404)
        .json({ success: false, message: "Project Setting not found" });
    }

    res.status(200).json({ success: true, data: projectSetting });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Create a new Group Setting
exports.createGroupSetting = async (req, res) => {
  try {
    const { groupId } = req.body;

    if (!groupId) {
      return res
        .status(400)
        .json({ success: false, message: "Group ID is required." });
    }

    const existingSetting = await GroupSetting.findOne({ groupId });
    if (existingSetting) {
      return res.status(400).json({
        success: false,
        message: "Group settings for this group already exist.",
      });
    }

    // Create a new GroupSetting
    const groupSetting = new GroupSetting(req.body);
    await groupSetting.save();

    res.status(201).json({ success: true, data: groupSetting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all Group Settings for a company or specific group
exports.getAllGroupSetting = async (req, res) => {
  const { companyId, groupId } = req.body;

  if (!companyId) {
    return res
      .status(400)
      .json({ success: false, message: "Company ID is required." });
  }

  try {
    const groupSettings = await GroupSetting.find({ companyId, groupId });

    if (!groupSettings.length) {
      return res.status(404).json({
        success: false,
        message: "No group settings found for the provided company ID.",
      });
    }

    res.status(200).json({ success: true, data: groupSettings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single Group Setting by ID
exports.getGroupSettingById = async (req, res) => {
  try {
    const groupSetting = await GroupSetting.findById(req.params.id)
      .populate("companyId", "companyName")
      .populate("groupId", "name")
      .populate("projectStageId", "name");

    if (!groupSetting) {
      return res
        .status(404)
        .json({ success: false, message: "Group Setting not found." });
    }

    res.status(200).json({ success: true, data: groupSetting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a Group Setting
exports.updateGroupSetting = async (req, res) => {
  try {
    const groupSetting = await GroupSetting.findByIdAndUpdate(
      req.body.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!groupSetting) {
      return res
        .status(404)
        .json({ success: false, message: "Group Setting not found." });
    }

    res.status(200).json({ success: true, data: groupSetting });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.fetchIndiaMartSettings = async (req, res) => {
  console.log("fetch email settings");
  console.log(req.body, "request body ...................");

  const {
    startDate,
    endDate,
    authKey,
    enabled,
    projectId,
    taskStageId,
    companyId,
    integrationProvider,
    method,
  } = req.body;

  if (!authKey) {
    return res.status(400).json({
      message: "CRM key is missing. Please provide a valid CRM key.",
    });
  }

  if (!companyId) {
    return res.status(400).json({
      message: "companyId is missing. Please provide a valid companyId.",
    });
  }
  const now = moment();
  const defaultStartDate = now.startOf("day").format("DD-MMM-YYYYHH:mm:ss");
  const defaultEndDate = now.endOf("day").format("DD-MMM-YYYYHH:mm:ss");

  const formattedStartDate = moment(startDate).isValid()
    ? moment(startDate).format("DD-MMM-YYYYHH:mm:ss")
    : defaultStartDate;
  const formattedEndDate = moment(endDate).isValid()
    ? moment(endDate).format("DD-MMM-YYYYHH:mm:ss")
    : defaultEndDate;

  const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${authKey}&start_time=${formattedStartDate}&end_time=${formattedEndDate}`;

  const projectSetting = await ProjectSetting.findOne({ projectId });
  console.log(projectSetting, "projectSetting.....................");
  if (!projectSetting) {
    res
      .status(404)
      .json({ success: false, message: "Project settings not found." });
  }

  if (projectSetting.method == "API") {
    try {
      const response = await axios.get(url);
      console.log("API response:", response.data);

      const leadsData = response.data.RESPONSE;
      console.log(leadsData, "leadsData.....................");

      if (enabled) {
        const tasks = leadsData.map((lead) => ({
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
            date: new Date(lead.QUERY_TIME).toLocaleDateString("IN"),
            name: lead.SENDER_NAME,
            mobile_number: lead.SENDER_MOBILE,
            company_name: lead.SENDER_COMPANY,
          },
          isDeleted: false,
          createdOn: new Date(),
          modifiedOn: new Date(),
          lead_source: "INDIAMART",
          creation_mode: "AUTO",
        }));

        const existingTasks = await Task.find({
          projectId: projectId,
          taskStageId: taskStageId,
          companyId: companyId,
          $or: tasks.map((task) => ({
            title: task.title,
            startDate: task.startDate,
          })),
        });

        const existingTaskTitles = existingTasks.map((task) => task.title);
        const newTasks = tasks.filter(
          (task) => !existingTaskTitles.includes(task.title)
        );

        if (newTasks.length > 0) {
          console.log(`${newTasks.length} new tasks identified.`);

          const insertedTasks = await Task.insertMany(newTasks);
          console.log(
            `${insertedTasks.length} tasks successfully inserted into the database.`
          );

          const insertedLeads = await Lead.insertMany(leadsData);
          console.log(
            `${insertedLeads.length} leads successfully inserted into the database.`
          );
        } else {
          console.log("No new tasks to insert.");
        }
      }

      res
        .status(200)
        .json({ success: true, message: "Leads fetched successfully." });
    } catch (error) {
      console.error("Error fetching IndiaMart settings: ", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  }
  if (projectSetting.method == "Web-Scrape") {
    const {
      companyId,
      projectId,
      taskStageId,
      authKey,
      startDate,
      endDate,
      fetchFrequetly,
      lastFetched,
    } = projectSetting;
    console.log(authKey);

    let newStartDate;
    let newEndDate;

    newStartDate = new Date(startDate);
    newEndDate = new Date(endDate);

    try {
      // Fetch leads from IndiaMART API
      const [mobileNumber, password] = authKey.split(":");
      const start_dayToSelect = new Date(newStartDate).getDate();
      const start_monthToSelect = new Date(newStartDate).getMonth();
      const start_yearToSelect = new Date(newStartDate).getFullYear();
      const end_dayToSelect = new Date(newEndDate).getDate();
      const end_monthToSelect = new Date(newEndDate).getMonth();
      const end_yearToSelect = new Date(newEndDate).getFullYear();
      const data = await fetchLeads({
        mobileNumber,
        password,
        start_dayToSelect,
        start_monthToSelect,
        start_yearToSelect,
        end_dayToSelect,
        end_monthToSelect,
        end_yearToSelect,
      });
      const leadsData = data;
      if (!leadsData || leadsData.length === 0) {
        console.log("No new leads found from IndiaMART.");
      }

      console.log(
        `Fetched ${leadsData.length} leads for companyId: ${companyId}`
      );

      console.log("manual leadsData final...", leadsData);

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

        const users = await User.find({ name: { $regex: regex }, companyId });

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
            company_name: lead.name,
          },
          isDeleted: false,
        });

        await newTask.save();
        console.log(`Task created for lead: ${lead.productName}`);
      }

      await ProjectSetting.updateOne(
        { _id: projectSetting._id },
        { lastFetched: new Date() }
      );
      res
        .status(200)
        .json({ success: true, message: "Leads fetched successfully." });
    } catch (error) {
      console.error(`Error fetching leads for companyId: ${companyId}`, error);
    }
  }
};

exports.fetchIndiaMartSettingsGroup = async (req, res) => {
  console.log("fetch email settings");
  console.log(req.body, "request body ...................");

  const {
    startDate,
    endDate,
    authKey,
    enabled,
    groupId,
    taskStageId,
    projectStageId,
    projectTypeId,
    projectOwnerId,
    notifyUserId,
    companyId,
    userId,
    integrationProvider,
    method,
  } = req.body;

  if (!authKey) {
    return res.status(400).json({
      message: "CRM key is missing. Please provide a valid CRM key.",
    });
  }

  if (!companyId) {
    return res.status(400).json({
      message: "companyId is missing. Please provide a valid companyId.",
    });
  }

  if (!userId) {
    return res.status(400).json({
      message: "userId is missing. Please provide a valid userId.",
    });
  }

  const now = moment();
  const defaultStartDate = now.startOf("day").format("DD-MMM-YYYYHH:mm:ss");
  const defaultEndDate = now.endOf("day").format("DD-MMM-YYYYHH:mm:ss");

  const formattedStartDate = moment(startDate).isValid()
    ? moment(startDate).format("DD-MMM-YYYYHH:mm:ss")
    : defaultStartDate;
  const formattedEndDate = moment(endDate).isValid()
    ? moment(endDate).format("DD-MMM-YYYYHH:mm:ss")
    : defaultEndDate;

  const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${authKey}&start_time=${formattedStartDate}&end_time=${formattedEndDate}`;

  const groupSetting = await GroupSetting.findOne({ groupId });
  console.log(groupSetting, "projectSetting.....................");
  if (!groupSetting) {
    res
      .status(404)
      .json({ success: false, message: "Project settings not found." });
  }

  if (groupSetting.method == "API") {
    try {
      const response = await axios.get(url);
      console.log("API response:", response.data);
      console.log("Total leads received:", response.data.RESPONSE?.length || 0);

      const leadsData = response.data.RESPONSE;
      //console.log("leadsData...API...", leadsData);

      if (enabled) {
        for (const lead of leadsData) {
          const projectTitle =
            lead.SENDER_COMPANY?.trim() ||
            `Lead-${lead.SENDER_MOBILE || Date.now()}`;

          // Check if a project already exists for the same SENDER_NAME
          let existingProject = await Project.findOne({
            companyId,
            group: new mongoose.Types.ObjectId(groupId),
            // title: lead.SENDER_COMPANY,
            title: projectTitle,
            isDeleted: false,
          });

          const regex = new RegExp(lead.label, "i");

          console.log("regex", regex, "lead.label", lead.label);

          const users = await User.find({ name: { $regex: regex }, companyId });

          console.log("users...", users);

          console.log("Existing Project:", existingProject);
          const projectUsers = Array.from(
            new Set(
              [
                new mongoose.Types.ObjectId(userId),
                new mongoose.Types.ObjectId(projectOwnerId),
                new mongoose.Types.ObjectId(notifyUserId),
                users[0]?._id, // This one is already an ObjectId
              ]
                .filter(Boolean)
                .map((id) => id.toString())
            ),
            (idStr) => new mongoose.Types.ObjectId(idStr)
          );

          if (!existingProject) {
            existingProject = new Project({
              companyId,
              // title: lead.SENDER_COMPANY,
              title: projectTitle,
              description: lead.SENDER_COMPANY,
              startdate: new Date(),
              enddate: new Date(),
              status: "todo",
              projectStageId,
              taskStages: ["todo", "inprogress", "completed"],
              //userid: new mongoose.Types.ObjectId("6697895d67a0c74106a26a13"),
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
              // projectUsers: [
              //   new mongoose.Types.ObjectId(userId),
              //   new mongoose.Types.ObjectId(projectOwnerId),
              //   new mongoose.Types.ObjectId(notifyUserId),
              //   users[0]?._id || null,
              // ],
              projectUsers: projectUsers,
              notifyUsers: [new mongoose.Types.ObjectId(notifyUserId)],
              messages: [],
              uploadFiles: [],
              tasks: [],
              customTaskFields: [],
              projectTypeId: new mongoose.Types.ObjectId(projectTypeId),
              // projectTypeId: new mongoose.Types.ObjectId(
              //   "673202c115c8e180c21e9ac7"
              // ),
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
            title: lead.SUBJECT,
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

        res
          .status(200)
          .json({ success: true, message: "Leads processed successfully." });
      }
    } catch (error) {
      console.error("Error processing leads from API: ", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  }

  if (groupSetting.method == "Web-Scrape") {
    const {
      companyId,
      userId,
      projectStageId,
      taskStageId,
      projectTypeId,
      projectOwnerId,
      notifyUserId,
      authKey,
      startDate,
      endDate,
    } = groupSetting;

    console.log("GroupID check", groupId);

    console.log(authKey);

    let newStartDate = new Date(startDate);
    let newEndDate = new Date(endDate);

    try {
      const [mobileNumber, password] = authKey.split(":");
      const start_dayToSelect = newStartDate.getDate();
      const start_monthToSelect = newStartDate.getMonth();
      const start_yearToSelect = newStartDate.getFullYear();
      const end_dayToSelect = newEndDate.getDate();
      const end_monthToSelect = newEndDate.getMonth();
      const end_yearToSelect = newEndDate.getFullYear();

      const leadsData = await fetchLeads({
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

      if (!leadsData || leadsData.length === 0) {
        console.log("No new leads found from IndiaMART.");
        return;
      }

      console.log(
        `Fetched ${leadsData.length} leads for companyId: ${companyId}`
      );

      for (const lead of leadsData) {
        // Check if a project already exists for the same SENDER_NAME
        // let existingProject = await Project.findOne({
        //   companyId,
        //   group: new mongoose.Types.ObjectId(groupId),
        //   title: lead.name,
        //   isDeleted: false,
        // });

        // let existingProject = await Project.findOne({
        //   companyId,
        //   group: new mongoose.Types.ObjectId(groupId),
        //   title: lead.name,
        //   isDeleted: false,
        //   "customFieldValues.address": lead.address,
        // });

        let projectQuery = {
          companyId,
          group: new mongoose.Types.ObjectId(groupId),
          title: lead.name,
          isDeleted: false,
        };

        if (lead.address) {
          projectQuery["customFieldValues.address"] = lead.address;
        }

        let existingProject = await Project.findOne(projectQuery);
        // let existingProject = null;
        // let existingTitleProject = await Project.findOne({
        //   companyId,
        //   group: new mongoose.Types.ObjectId(groupId),
        //   title: lead.name,
        //   isDeleted: false,
        // });

        // // If address is present, check for matching project with same address
        // if (lead.address && existingTitleProject) {
        //   if (
        //     existingTitleProject.customFieldValues?.address &&
        //     existingTitleProject.customFieldValues.address
        //       .trim()
        //       .toLowerCase() === lead.address.trim().toLowerCase()
        //   ) {
        //     existingProject = existingTitleProject;
        //   }
        // }

        const regex = new RegExp(lead.label, "i");

        const users = await User.find({ name: { $regex: regex }, companyId });

        console.log("users...", users);

        // console.log("existingProject", existingProject);
        const projectUsers = Array.from(
          new Set(
            [
              new mongoose.Types.ObjectId(userId),
              new mongoose.Types.ObjectId(projectOwnerId),
              new mongoose.Types.ObjectId(notifyUserId),
              users[0]?._id, // This one is already an ObjectId
            ]
              .filter(Boolean)
              .map((id) => id.toString())
          ),
          (idStr) => new mongoose.Types.ObjectId(idStr)
        );

        if (!existingProject) {
          existingProject = new Project({
            companyId,
            title: lead.name,
            description: lead.name,
            startdate: lead.productDate,
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
            customFieldValues: {
              address: lead.address,
            },
            // projectUsers: [
            //   new mongoose.Types.ObjectId(userId),
            //   new mongoose.Types.ObjectId(projectOwnerId),
            //   new mongoose.Types.ObjectId(notifyUserId),
            //   users[0]?._id || null,
            // ],
            projectUsers: projectUsers,
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

          // console.log("existingProject creation", existingProject);

          await existingProject.save();
          console.log(`Project created: ${lead.name}`);
        } else {
          //console.log(`Project already exists: ${lead.name} - Skipping.`);
          console.log(`Project already exists: ${lead.name}`);
        }

        // Prevent duplicate tasks
        const existingTask = await Task.findOne({
          projectId: existingProject._id,
          title: lead.productName,
          isDeleted: false,
        });

        //console.log("existingTask", existingTask);

        // if (existingTask) {
        //   console.log(
        //     `Task already exists for product: ${lead.productName} - Skipping.`
        //   );
        //   continue;
        // }

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
          console.log(`Task already exists for product: ${lead.productName}`);
        }

        //console.log("lead-leadDetail...", lead.leadDetail);

        if (lead.leadDetail && Array.isArray(lead.leadDetail)) {
          for (const detail of lead.leadDetail) {
            //console.log("detail...", JSON.stringify(detail));
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
              //console.log("JSON detail:", JSON.stringify(detail));
              //console.log("Extracted Product Data:", responseData);

              if (!responseData?.product) {
                console.log("No product extracted, skipping task creation.");
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

              // const formattedDate = moment(
              //   responseData?.date,
              //   "DD MMM YYYY, h:mm A"
              // );

              // Create new task
              const newTask = new Task({
                projectId: existingProject._id,
                taskStageId,
                companyId,
                title: responseData?.product,
                description: responseData?.product,
                startDate: responseData?.date,
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
              console.log(`Task created for lead: ${responseData?.product}`);
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
        { _id: groupSetting._id },
        { lastFetched: new Date() }
      );

      res
        .status(200)
        .json({ success: true, message: "Leads processed successfully." });
    } catch (error) {
      console.error(
        `Error processing leads for companyId: ${companyId}`,
        error
      );
    }
  }
};
