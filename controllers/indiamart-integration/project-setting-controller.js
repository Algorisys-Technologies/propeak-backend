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

      const leadsData = response.data.RESPONSE;
      console.log(leadsData, "`leadsData`.....................");

      if (enabled) {
        for (const lead of leadsData) {
          // Check if a project already exists for the same SENDER_NAME
          let existingProject = await Project.findOne({
            companyId,
            group: new mongoose.Types.ObjectId(groupId),
            title: lead.SENDER_NAME,
            isDeleted: false,
          });

          console.log("Existing Project:", existingProject);

          if (!existingProject) {
            existingProject = new Project({
              companyId,
              title: lead.SENDER_NAME,
              description: lead.SENDER_NAME,
              startdate: new Date(),
              enddate: new Date(),
              status: "todo",
              projectStageId,
              taskStages: ["todo", "inprogress", "completed"],
              //userid: new mongoose.Types.ObjectId("6697895d67a0c74106a26a13"),
              userid: new mongoose.Types.ObjectId(userId),
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
              projectUsers: [new mongoose.Types.ObjectId(userId)],
              notifyUsers: [new mongoose.Types.ObjectId(userId)],
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
            console.log(`Project created: ${lead.SENDER_NAME}`);
          } else {
            console.log(
              `Project already exists: ${lead.SENDER_NAME} - Skipping.`
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
            description: `
                        Address: ${lead.SENDER_ADDRESS}, 
                        City: ${lead.SENDER_CITY}, 
                        State: ${lead.SENDER_STATE}, 
                        Pincode: ${lead.SENDER_PINCODE}, 
                        Country: ${lead.SENDER_COUNTRY_ISO}, 
                        Mobile: ${lead.SENDER_MOBILE_ALT}`,
            startDate: lead.QUERY_TIME,
            createdOn: new Date(),
            modifiedOn: new Date(),
            creation_mode: "AUTO",
            tag: [lead.label],
            lead_source: "INDIAMART",
            customFieldValues: {
              date: new Date(lead.QUERY_TIME).toLocaleDateString("IN"),
              name: lead.SENDER_NAME,
              mobile_number: lead.SENDER_MOBILE,
              company_name: lead.SENDER_COMPANY,
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
      authKey,
      startDate,
      endDate,
    } = groupSetting;

    console.log("GroupID check", groupId);

    console.log(authKey);

    let newStartDate = new Date(startDate);
    let newEndDate = new Date(endDate);

    try {
      // Fetch leads from IndiaMART API
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
        let existingProject = await Project.findOne({
          companyId,
          group: new mongoose.Types.ObjectId(groupId),
          title: lead.name,
          isDeleted: false,
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
            userid: new mongoose.Types.ObjectId(userId),
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
            projectUsers: [new mongoose.Types.ObjectId(userId)],
            notifyUsers: [new mongoose.Types.ObjectId(userId)],
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
          console.log(`Project already exists: ${lead.name} - Skipping.`);
        }

        // Prevent duplicate tasks
        const existingTask = await Task.findOne({
          projectId: existingProject._id,
          title: lead.productName,
          isDeleted: false,
        });

        console.log("existingTask", existingTask);

        if (existingTask) {
          console.log(
            `Task already exists for product: ${lead.productName} - Skipping.`
          );
          continue;
        }

        // Create new task
        const newTask = new Task({
          projectId: existingProject._id,
          taskStageId,
          //taskStageId: new mongoose.Types.ObjectId("6732031b15c8e180c21e9aee"),
          companyId,
          title: lead.productName,
          description: `Comapany: ${lead.name}\nContact: ${lead.mobile}\nDetails: ${lead.details}`,
          startDate: lead.startDate,
          createdOn: new Date(),
          modifiedOn: new Date(),
          creation_mode: "AUTO",
          tag: [lead.label],
          lead_source: "INDIAMART",
          customFieldValues: {
            date: new Date(startDate).toLocaleDateString("IN"),
            name: lead.name,
            mobile_number: lead.mobile,
            company_name: lead.name,
          },
          isDeleted: false,
        });

        console.log("newTask", newTask);

        await newTask.save();
        console.log(`Task created for lead: ${lead.productName}`);
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
