const ProjectSetting = require("../../models/indiamart-integration/project-setting-model");
const GroupSetting = require("../../models/indiamart-integration/group-setting-model");
const mongoose = require("mongoose");
const axios = require("axios");
const Lead = require("../../models/indiamart-integration/indiamart-lead-model");
const Task = require("../../models/task/task-model");
const Project = require("../../models/project/project-model");
const User = require("../../models/user/user-model");
const TaskStage = require("../../models/task-stages/task-stages-model");
const GroupTaskStage = require("../../models/task-stages/group-task-stages-model");
const moment = require("moment");
const fetchLeads = require("../../webscrape");
//const { normalizeAddress } = require("../../utils/address");
const { parseAddressWithGroq } = require("../../utils/address-groq");
const levenshtein = require("fast-levenshtein");
const { getTaskStagesTitles } = require("../../utils/task-stage-helper");

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

  try {
    const projectSetting = await ProjectSetting.find({ companyId, projectId });

    if (!projectSetting.length) {
      return res.status(404).json({
        success: false,
        message: "No project settings found for the provided company ID",
      });
    }

    // console.log(
    //   `Fetched project settings: ${JSON.stringify(projectSetting, null, 2)}`
    // );

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
  try {
    const projectSetting = await ProjectSetting.findByIdAndUpdate(
      req.body.id,
      req.body,
      { new: true, runValidators: true }
    );

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
    const { groupId, taskStagesArr, ...rest } = req.body;

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

    const normalizedData = {
      ...rest,
      groupId,
      taskStagesArr: Array.isArray(taskStagesArr) ? taskStagesArr : [],
    };

    // Create a new GroupSetting
    //const groupSetting = new GroupSetting(req.body);
    const groupSetting = new GroupSetting(normalizedData);
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

  if (!projectSetting) {
    res
      .status(404)
      .json({ success: false, message: "Project settings not found." });
  }

  if (projectSetting.method == "API") {
    try {
      const response = await axios.get(url);

      const leadsData = response.data.RESPONSE;

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
  const {
    startDate,
    endDate,
    authKey,
    enabled,
    groupId,
    taskStageId,
    taskStagesArr,
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
  //console.log(groupSetting, "projectSetting.....................");
  if (!groupSetting) {
    res
      .status(404)
      .json({ success: false, message: "Project settings not found." });
  }

  if (groupSetting.method == "API") {
    try {
      const response = await axios.get(url);

      console.log("Total leads received:", response.data.RESPONSE?.length || 0);

      const leadsData = response.data.RESPONSE;
      console.log("leadsData...API...", leadsData);

      if (enabled) {
        for (const lead of leadsData) {
          const company = lead.SENDER_COMPANY?.trim();
          const name = lead.SENDER_NAME?.trim();

          let projectTitle =
            company && company.length > 0
              ? company
              : name && name.length > 0
              ? name
              : `Lead-${lead.SENDER_MOBILE || Date.now()}`;

          let address = `${lead.SENDER_ADDRESS}, City: ${lead.SENDER_CITY}, State: ${lead.SENDER_STATE}, Pincode: ${lead.SENDER_PINCODE}, Country: ${lead.SENDER_COUNTRY_ISO}`;

          //const normalizedAddress = normalizeAddress(address);
          let structuredAddress = await parseAddressWithGroq(address);
          const normalizedAddress = structuredAddress?.normalized || "";

          // let projectQuery = {
          //   companyId,
          //   group: new mongoose.Types.ObjectId(groupId),
          //   title: projectTitle,
          //   isDeleted: false,
          // };

          // if (normalizedAddress) {
          //   projectQuery["customFieldValues.address"] = normalizedAddress;
          // }

          // let existingProject = await Project.findOne(projectQuery);

          // Step 1: Find all projects with same company/group/title
          let projects = await Project.find({
            companyId,
            group: new mongoose.Types.ObjectId(groupId),
            title: projectTitle,
            isDeleted: false,
          });

          let existingProject = null;
          if (projects.length > 0 && normalizedAddress) {
            for (const proj of projects) {
              const existingAddress =
                proj.customFieldValues?.get("address") || "";

              // console.log(
              //   "Comparing:",
              //   "new:",
              //   normalizedAddress,
              //   "old:",
              //   existingAddress
              // );

              const distance = levenshtein.get(
                normalizedAddress,
                existingAddress
              );
              const maxLength = Math.max(
                normalizedAddress.length,
                existingAddress.length
              );
              const similarity = 1 - distance / maxLength;

              if (similarity >= 0.8) {
                // 80% threshold
                existingProject = proj;
                console.log(
                  `Duplicate project detected: ${projectTitle} (${Math.round(
                    similarity * 100
                  )}% match)`
                );
                break;
              }
            }
          }

          const regex = new RegExp(lead.label, "i");

          const users = await User.find({ name: { $regex: regex }, companyId });

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
            let taskStagesTitleArr = [];

            // if ((taskStagesArr && taskStagesArr.length > 0) || groupId) {
            //   // Find in TaskStage by IDs
            //   let taskStageDocs = [];
            //   if (taskStagesArr && taskStagesArr.length > 0) {
            //     taskStageDocs = await TaskStage.find({
            //       _id: { $in: taskStagesArr },
            //     }).select("title");
            //   }

            //   // Find in GroupTaskStage by groupId
            //   let groupTaskStageDocs = [];
            //   if (groupId) {
            //     groupTaskStageDocs = await GroupTaskStage.find({
            //       groupId: groupId,
            //     }).select("title");
            //   }

            //   // Merge and remove duplicates
            //   taskStagesTitleArr = [
            //     ...new Set([
            //       ...taskStageDocs.map((stage) => stage.title),
            //       ...groupTaskStageDocs.map((stage) => stage.title),
            //     ]),
            //   ];
            // }

            if ((taskStagesArr && taskStagesArr.length > 0) || groupId) {
              taskStagesTitleArr = await getTaskStagesTitles(
                taskStagesArr,
                groupId
              );
            }

            existingProject = new Project({
              companyId,
              title: projectTitle,
              description: projectTitle,
              startdate: lead.QUERY_TIME,
              enddate: new Date(),
              status: "todo",
              projectStageId,
              //taskStages: ["todo", "inprogress", "completed"],
              taskStages:
                taskStagesTitleArr.length > 0
                  ? taskStagesTitleArr
                  : ["todo", "inprogress", "completed"],
              userid: new mongoose.Types.ObjectId(projectOwnerId),
              createdBy: new mongoose.Types.ObjectId(userId),
              createdOn: new Date(),
              modifiedOn: new Date(),
              sendnotification: false,
              group: new mongoose.Types.ObjectId(groupId),
              isDeleted: false,
              miscellaneous: false,
              archive: false,
              customFieldValues: { address: normalizedAddress },
              projectUsers: projectUsers,
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
              // date: new Date(lead.QUERY_TIME).toLocaleDateString("IN"),
              date: moment(lead.QUERY_TIME).format("DD/MM/YYYY"),
              name: lead.SENDER_NAME,
              mobile_number: lead.SENDER_MOBILE,
              mobile_number_alt: lead.SENDER_MOBILE_ALT,
              email: lead.SENDER_EMAIL,
              email_alt: lead.SENDER_EMAIL_ALT,
              phone: lead.SENDER_PHONE,
              phone_alt: lead.SENDER_PHONE_ALT,
              company_name: lead.SENDER_COMPANY,
              address: normalizedAddress,
              leads_details: `${lead.QUERY_PRODUCT_NAME},${lead.QUERY_MESSAGE},${lead.QUERY_MCAT_NAME}`,
            },
            isDeleted: false,
          });

          await newTask.save();
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
      taskStagesArr,
      projectTypeId,
      projectOwnerId,
      notifyUserId,
      authKey,
      startDate,
      endDate,
    } = groupSetting;

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

        const regex = new RegExp(lead.label, "i");

        const users = await User.find({ name: { $regex: regex }, companyId });

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
          let taskStagesTitleArr = [];

          // if ((taskStagesArr && taskStagesArr.length > 0) || groupId) {
          //   // Find in TaskStage by IDs
          //   let taskStageDocs = [];
          //   if (taskStagesArr && taskStagesArr.length > 0) {
          //     taskStageDocs = await TaskStage.find({
          //       _id: { $in: taskStagesArr },
          //     }).select("title");
          //   }

          //   // Find in GroupTaskStage by groupId
          //   let groupTaskStageDocs = [];
          //   if (groupId) {
          //     groupTaskStageDocs = await GroupTaskStage.find({
          //       groupId: groupId,
          //     }).select("title");
          //   }

          //   // Merge and remove duplicates
          //   taskStagesTitleArr = [
          //     ...new Set([
          //       ...taskStageDocs.map((stage) => stage.title),
          //       ...groupTaskStageDocs.map((stage) => stage.title),
          //     ]),
          //   ];
          // }

          if ((taskStagesArr && taskStagesArr.length > 0) || groupId) {
            taskStagesTitleArr = await getTaskStagesTitles(
              taskStagesArr,
              groupId
            );
          }

          existingProject = new Project({
            companyId,
            title: lead.name,
            description: lead.name,
            startdate: lead.productDate,
            enddate: new Date(),
            status: "todo",
            projectStageId,
            //taskStages: ["todo", "inprogress", "completed"],
            taskStages:
              taskStagesTitleArr.length > 0
                ? taskStagesTitleArr
                : ["todo", "inprogress", "completed"],
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

          await newTask.save();
          console.log(`Task created for lead: ${lead.productName}`);
        } else {
          console.log(`Task already exists for product: ${lead.productName}`);
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

              if (!responseData?.product) {
                console.log("No product extracted, skipping task creation.");
                continue;
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
