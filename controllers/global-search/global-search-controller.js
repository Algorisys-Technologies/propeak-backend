const mongoose = require("mongoose");
const Task = require("../../models/task/task-model");
const Project = require("../../models/project/project-model");
const { logError, logInfo } = require("../../common/logger");
const Account = require("../../models/account/account-model");
const Contact = require("../../models/contact/contact-model");
const UploadRepositoryFile = require("../../models/global-level-repository/global-level-repository-model");
const {
  DEFAULT_PAGE,
  DEFAULT_QUERY,
  DEFAULT_LIMIT,
} = require("../../utils/defaultValues");

exports.searchByTasksAndProjects = async (req, res) => {
  try {
    const {
      companyId,
      searchText = DEFAULT_QUERY,
      page = DEFAULT_PAGE,
    } = req.body;

    const limit = DEFAULT_LIMIT;

    //const searchQuery = new RegExp(searchText, "i");
    const searchQuery = new RegExp(searchText);
    // console.log("Using regex query:", searchQuery);

    // Build task query
    const taskQuery = {
      companyId: companyId,
      isDeleted: false,
      $or: [
        { title: { $regex: searchQuery } },
        { tag: { $regex: searchQuery } },
        { "customFieldValues.company_name": { $regex: searchQuery } },
      ],
    };

    // Fetch tasks with pagination
    const tasks = await Task.find(taskQuery)
      .skip(limit * page)
      .limit(limit)
      .populate({
        path: "projectId",
        populate: {
          path: "group",
          model: "groupMaster",
        },
      });

    // Build project query
    const projectQuery = {
      companyId: companyId,
      isDeleted: false,
      $or: [
        { title: { $regex: searchQuery } },
        { tag: { $regex: searchQuery } },
      ],
    };

    // Fetch projects with pagination
    const projects = await Project.find(projectQuery)
      .skip(limit * page)
      .limit(limit)
      .populate("group", "name");

    // Build account query
    const accountQuery = {
      companyId: companyId,
      isDeleted: false,
      $or: [
        { account_name: { $regex: searchQuery } },
        { tag: { $regex: searchQuery } },
      ],
    };

    // Fetch accounts with pagination
    const accounts = await Account.find(accountQuery)
      .skip(limit * page)
      .limit(limit);

    // Build contact query
    const contactQuery = {
      companyId: companyId,
      isDeleted: false,
      $or: [
        { title: { $regex: searchQuery } },
        { tag: { $regex: searchQuery } },
        { first_name: { $regex: searchQuery } },
        { last_name: { $regex: searchQuery } },
      ],
    };

    // Fetch contacts with pagination
    const contacts = await Contact.find(contactQuery)
      .skip(limit * page)
      .limit(limit);

    const visitingCardsQuery = {
      companyId: companyId,
      isDeleted: false,
      path: "/contacts",
      $or: [
        { fileName: { $regex: searchQuery } },
        { title: { $regex: searchQuery } },
      ],
    };
    const visitingCards = await UploadRepositoryFile.find(visitingCardsQuery)
      .skip(limit * page)
      .limit(limit);

    // Count total tasks, projects, accounts, and contacts
    const totalTasks = await Task.countDocuments(taskQuery);
    const totalProjects = await Project.countDocuments(projectQuery);
    const totalAccounts = await Account.countDocuments(accountQuery);
    const totalContacts = await Contact.countDocuments(contactQuery);
    const totalVisitingCards = await UploadRepositoryFile.countDocuments(
      visitingCardsQuery
    );
    const totalResults =
      totalTasks +
      totalProjects +
      totalAccounts +
      totalContacts +
      totalVisitingCards;

    // Calculate total pages
    const totalPages = Math.ceil(totalResults / limit);

    return res.status(200).json({
      success: true,
      tasks,
      projects,
      accounts,
      contacts,
      totalPages,
      visitingCards,
    });
  } catch (error) {
    console.error("Error in searchByTasksProjectsAccountsContacts", error);
    return res.status(500).json({
      success: false,
      tasks: [],
      projects: [],
      accounts: [],
      contacts: [],
      totalPages: 0,
      message: "An error occurred while searching.",
      error: error.message,
    });
  }
};

// exports.searchByTasksAndProjects = async (req, res) => {
//   try {
//     const { companyId, searchText, page } = req.body;

//     const limit = 5;

//     const searchQuery = new RegExp(searchText, "i");
//     console.log("Using regex query:", searchQuery);

//     // Build task query
//     const taskQuery = {
//       companyId: companyId,
//       isDeleted: false,
//       $or: [
//         { title: { $regex: searchQuery } },
//         { tag: { $regex: searchQuery } },
//       ],
//     };

//     // Fetch tasks with pagination
//     const tasks = await Task.find(taskQuery)
//       .skip(limit * page)
//       .limit(limit);

//     // Build project query
//     const projectQuery = {
//       companyId: companyId,
//       isDeleted: false,
//       $or: [
//         { title: { $regex: searchQuery } },
//         { tag: { $regex: searchQuery } },
//       ],
//     };

//     // Fetch projects with pagination
//     const projects = await Project.find(projectQuery)
//       .skip(limit * page)
//       .limit(limit);
//     console.log("Projects found:", projects.length, projects);

//     // Count total tasks and projects
//     const totalTasks = await Task.countDocuments(taskQuery);
//     const totalProjects = await Project.countDocuments(projectQuery);
//     const totalResults = totalTasks + totalProjects;

//     // Calculate total pages
//     const totalPages = Math.ceil(totalResults / limit);

//     return res.status(200).json({
//       success: true,
//       tasks,
//       projects,
//       totalPages,
//     });
//   } catch (error) {
//     console.error("Error in searchByTasksAndProjects", error);
//     return res.status(500).json({
//       success: false,
//       tasks: [],
//       projects: [],
//       totalPages: 0,
//       message: "An error occurred while searching.",
//       error: error.message,
//     });
//   }
// };
