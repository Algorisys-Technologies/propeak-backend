const mongoose = require("mongoose");
const Task = require("../../models/task/task-model");
const Project = require("../../models/project/project-model");
const { logError, logInfo } = require("../../common/logger");

exports.searchByTasksAndProjects = async (req, res) => {
  try {
    const { companyId, searchText, page } = req.body;

    const limit = 5;

    const searchQuery = new RegExp(searchText, "i");
    console.log("Using regex query:", searchQuery);

    // Build task query
    const taskQuery = {
      companyId: companyId,
      isDeleted: false,
      $or: [
        { title: { $regex: searchQuery } },
        { tag: { $regex: searchQuery } },
      ],
    };

    // Fetch tasks with pagination
    const tasks = await Task.find(taskQuery)
      .skip(limit * page)
      .limit(limit);

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
      .limit(limit);
    console.log("Projects found:", projects.length, projects);

    // Count total tasks and projects
    const totalTasks = await Task.countDocuments(taskQuery);
    const totalProjects = await Project.countDocuments(projectQuery);
    const totalResults = totalTasks + totalProjects;

    // Calculate total pages
    const totalPages = Math.ceil(totalResults / limit);

    return res.status(200).json({
      success: true,
      tasks,
      projects,
      totalPages,
    });
  } catch (error) {
    console.error("Error in searchByTasksAndProjects", error);
    return res.status(500).json({
      success: false,
      tasks: [],
      projects: [],
      totalPages: 0,
      message: "An error occurred while searching.",
      error: error.message,
    });
  }
};

// exports.searchByTasksAndProjects = async (req, res) => {
//   console.log("Search API called...");
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

//     // Search tasks
//     const tasks = await Task.find(taskQuery)
//       .skip(limit * page)
//       .limit(limit);
//     console.log("Tasks found:", tasks.length, tasks);

//     // Build project query
//     const projectQuery = {
//       companyId: companyId,
//       isDeleted: false,
//       $or: [
//         { title: { $regex: searchQuery } },
//         { tag: { $regex: searchQuery } },
//       ],
//     };

//     // Search projects
//     const projects = await Project.find(projectQuery)
//       .skip(limit * page)
//       .limit(limit);
//     console.log("Projects found:", projects.length, projects);

//     const totalPages = Math.ceil(
//       ((await Project.countDocuments(projectQuery)) +
//         (await Task.countDocuments(taskQuery))) /
//         20
//     );

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
