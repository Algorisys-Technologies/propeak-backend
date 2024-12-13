const ProjectSetting = require("../../models/indiamart-integration/project-setting-model");
const mongoose = require("mongoose");
const axios = require("axios");
const Lead = require("../../models/indiamart-integration/indiamart-lead-model");
const Task = require("../../models/task/task-model");
const moment = require("moment");

// Create a new Project Setting
exports.createProjectSettings = async (req, res) => {
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

exports.getAllProjectSettings = async (req, res) => {
  const { companyId, projectId } = req.body;

  if (!companyId) {
    return res
      .status(400)
      .json({ success: false, message: "Company ID is required" });
  }

  console.log(`Received companyId from request body: ${companyId}`);

  try {
    const projectSettings = await ProjectSetting.find({ companyId, projectId });

    if (!projectSettings.length) {
      return res.status(404).json({
        success: false,
        message: "No project settings found for the provided company ID",
      });
    }

    console.log(
      `Fetched project settings: ${JSON.stringify(projectSettings, null, 2)}`
    );

    res.status(200).json({ success: true, data: projectSettings });
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

exports.updateProjectSettings = async (req, res) => {
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

  console.log("Constructed URL: ", url);
  const projectSettings = await ProjectSetting.findOne({ projectId });
  if (projectSettings) {
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
            date: moment().format("DD/MM/YY"),
            name: lead.SENDER_NAME,
            mobile_number: lead.SENDER_MOBILE,
            company_name: lead.SENDER_COMPANY,
          },
          isDeleted: false,
          createdOn: moment().toISOString(),
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

      res.status(200).json({ success: true,  message: "Leads fetched successfully." });
    } catch (error) {
      console.error("Error fetching IndiaMart settings: ", error);
      res.status(500).json({ success: false,  message: "Internal server error." });
    }
  } else {
    res.status(404).json({ success: false,  message: "Project settings not found." });
  }
};
