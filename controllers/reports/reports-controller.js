const mongoose = require("mongoose");
const Project = require("../../models/project/project-model");
const Task = require("../../models/task/task-model");
const User = require("../../models/user/user-model");
const Token = require("../../models/Token/token");
const Company = require("../../models/company/company-model");
const { logError, logInfo } = require("../../common/logger");
const access = require("../../check-entitlements");
const dateUtil = require("../../utils/date-util");
const accessConfig = require("../../common/validate-entitlements");
const Holiday = require("../../models/leave/holiday-model");
const countDays = require("../../common/common");
const daysInYears = require("../../common/common");
const daysInMonths = require("../../common/common");
const Burndown = require("../../models/burndown/burndown-model");
const config = require("../../config/config");
const LeaveApplication = require("../../models/leave/leave-model");
const { ObjectId } = require("mongodb");
const totalSundays = require("../../common/common");

const errors = {
  SEARCH_PARAM_MISSING:
    "Please input either Year and Month /From and To for search",
  SERVER_ERROR: "Opps, something went wrong. Please try again.",
  NOT_AUTHORIZED: "Your are not authorized",
  SEARCH_PARAMETER_MISSING: "Please Select Both Year and Month ",
};

exports.getMonthlyTaskReport = async (req, res) => {
  try {
    const {
      projectId,
      reportParams: { year, month, dateFrom, dateTo },
      pagination = { page: 1, limit: 10 },
    } = req.body;
    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    // Validate project ID format
    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      console.log("Invalid project ID format.");
      return res.json({ err: "Invalid project ID format." });
    }
    let condition = { projectId: new mongoose.Types.ObjectId(projectId) };

    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      condition = {
        ...condition,
        startDate: { $gte: startDate, $lt: endDate },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };
    } else if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.json({ err: "Invalid date range provided." });
      }

      condition = {
        ...condition,
        startDate: { $gte: fromDate, $lte: toDate },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      console.log("Condition for tasks with custom date range:", condition);
    } else {
      return res.json({ err: "Required search parameters are missing." });
    }
    const totalCount = await Task.countDocuments(condition);
    // const tasks = await Task.find(condition).skip(skip).limit(limit).lean();
    const tasks = await Task.find(condition)
    .skip(skip)
    .limit(limit)
    .lean()
    .populate("projectId", "title")
    .populate("userId", "name")
    .populate({ path: "interested_products.product_id" });

    res.json({
      success: true,
      data: tasks.length > 0 ? tasks : [],
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error in getMonthlyTaskReport:", error);
    res.json({
      err: "Server error occurred while processing the task report.",
    });
  }
};

exports.getMonthlyTaskReportExcel = async (req, res) => {
  try {
    const {
      projectId,
      reportParams: { year, month, dateFrom, dateTo },
    } = req.body;

    console.log("Request body task report:", req.body);

    // Validate project ID format
    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      console.log("Invalid project ID format.");
      return res.json({ err: "Invalid project ID format." });
    }

    // Base filter condition
    let condition = { projectId: new mongoose.Types.ObjectId(projectId) };

    // Set date range based on year/month or custom date range
    if (year && month) {
      const startDate = new Date(year, month - 1, 1); // Start of the month
      const endDate = new Date(year, month, 1); // Start of the next month

      condition = {
        ...condition,
        startDate: { $gte: startDate, $lt: endDate },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      console.log("Condition for tasks with year/month range:", condition);
    } else if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      // Ensure the dates are valid
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.json({ err: "Invalid date range provided." });
      }

      condition = {
        ...condition,
        startDate: { $gte: fromDate, $lte: toDate },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      console.log("Condition for tasks with custom date range:", condition);
    } else {
      return res.json({ err: "Required search parameters are missing." });
    }

    // Fetch all matching tasks
    const tasks = await Task.find(condition).lean();
    console.log("Fetched tasks:", tasks);

    res.json({
      success: true,
      data: tasks.length > 0 ? tasks : [],
      totalCount: tasks.length,
    });
  } catch (error) {
    console.error("Error in getMonthlyTaskReport:", error);
    res.json({
      err: "Server error occurred while processing the task report.",
    });
  }
};

exports.getMonthlyTaskReportForCompany = async (req, res) => {
  try {
    const {
      companyId,
      reportParams: { year, month, dateFrom, dateTo },
      pagination = { page: 1, limit: 10 },
    } = req.body;

    console.log("Request body task report for company:", req.body);

    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    // Validate company ID format
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      console.log("Invalid company ID format.");
      return res.json({ err: "Invalid company ID format." });
    }

    // Get all projects for the specified company
    const projects = await Project.find({
      companyId: new mongoose.Types.ObjectId(companyId),
    }).select("_id");
    const projectIds = projects.map((project) => project._id);

    if (projectIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        totalCount: 0,
        page,
        totalPages: 0,
      });
    }

    // Base filter condition
    let condition = { projectId: { $in: projectIds } };

    // Set date range based on year/month or custom date range
    if (year && month) {
      const startDate = new Date(year, month - 1, 1); // Start of the month
      const endDate = new Date(year, month, 1); // Start of the next month

      condition = {
        ...condition,
        startDate: { $gte: startDate, $lt: endDate },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      console.log("Condition for tasks with year/month range:", condition);
    } else if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      // Ensure the dates are valid
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.json({ err: "Invalid date range provided." });
      }

      condition = {
        ...condition,
        startDate: { $gte: fromDate, $lte: toDate },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      console.log("Condition for tasks with custom date range:", condition);
    } else {
      return res.json({ err: "Required search parameters are missing." });
    }

    // Count total matching tasks
    const totalCount = await Task.countDocuments(condition);
    console.log("Total task count:", totalCount);

    // Fetch paginated tasks
    const tasks = await Task.find(condition)
      .skip(skip)
      .limit(limit)
      .lean()
      .populate("projectId", "title")
      .populate("userId", "name")
      .populate({ path: "interested_products.product_id" });

    console.log("Fetched tasks:", tasks);

    res.json({
      success: true,
      data: tasks.length > 0 ? tasks : [],
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error in getMonthlyTaskReportForCompany:", error);
    res.json({
      err: "Server error occurred while processing the task report.",
    });
  }
};

exports.getMonthlyUserReportForCompany = async (req, res) => {
  try {
    const {
      companyId,
      reportParams: { year, month, dateFrom, dateTo, userId },
      pagination = { page: 1, limit: 10 },
    } = req.body;

    console.log("Request body user report for company:", req.body);

    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    // Validate company ID and user ID format
    if (
      !mongoose.Types.ObjectId.isValid(companyId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      console.log("Invalid company ID or user ID format.");
      return res.json({ err: "Invalid company or user ID format." });
    }

    // Get all projects for the specified company
    const projects = await Project.find({
      companyId: new mongoose.Types.ObjectId(companyId),
    }).select("_id");
    const projectIds = projects.map((project) => project._id);

    if (projectIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        totalCount: 0,
        page,
        totalPages: 0,
      });
    }

    // Base filter condition for tasks within these projects and assigned to the specified user
    let condition = {
      projectId: { $in: projectIds },
      userId: new mongoose.Types.ObjectId(userId),
    };

    // Set date range based on year/month or custom date range
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      condition = {
        ...condition,
        startDate: { $gte: startDate, $lt: endDate },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      console.log("Condition for tasks with year/month range:", condition);
    } else if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      // Ensure the dates are valid
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.json({ err: "Invalid date range provided." });
      }

      condition = {
        ...condition,
        startDate: { $gte: fromDate, $lte: toDate },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      console.log("Condition for tasks with custom date range:", condition);
    } else {
      return res.json({ err: "Required search parameters are missing." });
    }

    // Count total matching tasks
    const totalCount = await Task.countDocuments(condition);
    console.log("Total user-specific task count:", totalCount);

    // Fetch paginated tasks
    const tasks = await Task.find(condition)
      .skip(skip)
      .limit(limit)
      .lean()
      .populate("projectId", "title")
      .populate("userId", "name");

    console.log("Fetched user-specific tasks:", tasks);

    res.json({
      success: true,
      data: tasks.length > 0 ? tasks : [],
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error in getMonthlyUserReportForCompany:", error);
    res.json({
      err: "Server error occurred while processing the user report.",
    });
  }
};

exports.getMonthlyUserReportForProject = async (req, res) => {
  try {
    const {
      projectId,
      reportParams: { year, month, dateFrom, dateTo, userId },
      pagination = { page: 1, limit: 10 },
    } = req.body;

    console.log("Request body user report for project:", req.body);

    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    // Validate project ID and user ID format
    if (
      !mongoose.Types.ObjectId.isValid(projectId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      console.log("Invalid project ID or user ID format.");
      return res.json({ err: "Invalid project or user ID format." });
    }

    // Base filter condition for tasks within the specified project and assigned to the specified user
    let condition = {
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
    };

    // Set date range based on year/month or custom date range
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      condition = {
        ...condition,
        startDate: { $gte: startDate, $lt: endDate },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      console.log("Condition for tasks with year/month range:", condition);
    } else if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      // Ensure the dates are valid
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.json({ err: "Invalid date range provided." });
      }

      condition = {
        ...condition,
        startDate: { $gte: fromDate, $lte: toDate },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      console.log("Condition for tasks with custom date range:", condition);
    } else {
      return res.json({ err: "Required search parameters are missing." });
    }

    // Count total matching tasks
    const totalCount = await Task.countDocuments(condition);
    console.log("Total user-specific task count for project:", totalCount);

    // Fetch paginated tasks
    const tasks = await Task.find(condition)
      .skip(skip)
      .limit(limit)
      .lean()
      .populate("projectId", "title")
      .populate("userId", "name");

    console.log("Fetched user-specific tasks for project:", tasks);

    res.json({
      success: true,
      data: tasks.length > 0 ? tasks : [],
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error in getMonthlyUserReportForProject:", error);
    res.json({
      err: "Server error occurred while processing the user report for project.",
    });
  }
};

// exports.getActiveUsersReportForCompany = async (req, res) => {
//   try {
//     const { companyId } = req.body;

//     // Validate company ID format
//     if (!mongoose.Types.ObjectId.isValid(companyId)) {
//       console.log("Invalid company ID format.");
//       return res.status(400).json({ err: "Invalid company ID format." });
//     }

//     console.log("Fetching active users for company ID:", companyId);

//     // Step 1: Fetch active user details for the specified company
//     const users = await User.find(
//       { companyId, isDeleted: false },
//       {
//         name: 1,
//         email: 1,
//         companyId: 1,
//       }
//     );

//     // Check if users were found
//     if (users.length === 0) {
//       return res.status(404).json({ success: true, data: [], totalCount: 0 });
//     }

//     // Step 2: Gather company IDs from the users (if needed)
//     const companyIds = users
//       .map((user) => user.companyId)
//       .filter((id) => id !== "");

//     // Step 3: Fetch company details for these IDs
//     const companies = await Company.find(
//       { _id: { $in: companyIds }, isDeleted: false },
//       { _id: 1, companyName: 1 }
//     );

//     // Step 4: Create a response that combines user and company details
//     const resultStore = users.map((user) => {
//       const company = companies.find(
//         (c) => c._id.toString() === user.companyId.toString()
//       );
//       return {
//         name: user.name,
//         email: user.email,
//         companyName: company ? company.companyName : "N/A",
//       };
//     });

//     // Step 5: Count total active users
//     const totalCount = users.length;

//     // Step 6: Return the result
//     return res.status(200).json({
//       success: true,
//       data: resultStore,
//       totalCount,
//     });
//   } catch (error) {
//     console.error("Error fetching active users report:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to load active users report.",
//       message: error.message,
//     });
//   }
// };

exports.getActiveUsersReportForCompany = async (req, res) => {
  try {
    const { companyId, pagination = { page: 1, limit: 10 } } = req.body;

    // Validate company ID format
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      console.log("Invalid company ID format.");
      return res.status(400).json({ err: "Invalid company ID format." });
    }

    console.log("Fetching active users for company ID:", companyId);

    // Step 1: Fetch total count of active users for the specified company
    const totalCount = await User.countDocuments({
      companyId,
      isDeleted: false,
    });

    // Step 2: Implement pagination logic
    const { page, limit: rawLimit } = pagination;
    const limit = parseInt(rawLimit, 10);
    const skip = (page - 1) * limit;

    // Step 3: Fetch active user details for the specified company with pagination
    const users = await User.find(
      { companyId, isDeleted: false },
      { name: 1, email: 1, companyId: 1 }
    )
      .skip(skip)
      .limit(limit);

    // Check if users were found
    if (users.length === 0) {
      return res
        .status(404)
        .json({ success: true, data: [], totalCount, page, totalPages: 0 });
    }

    // Step 4: Gather company IDs from the users (if needed)
    const companyIds = users
      .map((user) => user.companyId)
      .filter((id) => id !== "");

    // Step 5: Fetch company details for these IDs
    const companies = await Company.find(
      { _id: { $in: companyIds }, isDeleted: false },
      { _id: 1, companyName: 1 }
    );

    // Step 6: Create a response that combines user and company details
    const resultStore = users.map((user) => {
      const company = companies.find(
        (c) => c._id.toString() === user.companyId.toString()
      );
      return {
        name: user.name,
        email: user.email,
        companyName: company ? company.companyName : "N/A",
      };
    });

    // Step 7: Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Step 8: Return the result
    return res.status(200).json({
      success: true,
      data: resultStore,
      totalCount,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching active users report:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load active users report.",
      message: error.message,
    });
  }
};

exports.getIncompleteTaskCountReportForCompany = async (req, res) => {
  try {
    const { companyId } = req.body;

    // Validate company ID format
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      console.log("Invalid company ID format.");
      return res.status(400).json({ err: "Invalid company ID format." });
    }

    // Step 1: Get all project IDs associated with the company
    const projects = await Project.find({ companyId }).select("_id");
    const projectIds = projects.map((project) => project._id);

    if (projectIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No projects found for the specified company.",
      });
    }

    // Step 2: Base condition for incomplete tasks in these projects
    const condition = {
      projectId: { $in: projectIds },
      isDeleted: false,
      $or: [{ status: "todo" }, { status: "inprogress" }],
    };

    // Step 3: Aggregate incomplete tasks and group by user
    const result = await Task.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "users", // Ensure this matches your User collection name
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$userId",
          userName: { $first: "$userDetails.name" }, // Get the user's name
          newTaskCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "todo"] }, 1, 0],
            },
          },
          inProgressTaskCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "inprogress"] }, 1, 0],
            },
          },
        },
      },
    ]);

    if (result.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No incomplete tasks found.",
      });
    }

    // Format the response data
    const formattedResult = result.map((item) => ({
      userId: item._id,
      userName: item.userName, // Include the user's name
      newTaskCount: item.newTaskCount,
      inProgressTaskCount: item.inProgressTaskCount,
    }));

    res.json({
      success: true,
      data: formattedResult,
    });
  } catch (error) {
    console.error(
      "Error fetching incomplete task count report for company:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Failed to load incomplete task count report for company.",
    });
  }
};

exports.getMonthlyUserReport = (req, res) => {
  try {
    logInfo("getMonthlyUserReport userInfo=");
    logInfo(req.userInfo, "getMonthlyUserReport userInfo=");
    logInfo(req.body, "getMonthlyUserReport");
    let projectId = req.body.projectId;
    let { year, month, dateFrom, dateTo, userId } = req.body.reportParams;
    // let userRole = req.userInfo.userRole.toLowerCase();
    // let loggedInUserId = req.userInfo.userId;

    // let accessCheck = access.checkEntitlements(userRole);
    // if (accessCheck === false) {
    //   res.json({ err: errors.NOT_AUTHORIZED });
    //   return;
    // }
    let projects = [];
    let condition = {};
    console.log(projects, "projects");
    let projectFields = {
      $project: {
        _id: 1,
        title: 1,
        userid: 1,
        "tasks.title": 1,
        "tasks._id": 1,
        "tasks.userId": 1,
        "tasks.startDate": 1,
        "tasks.endDate": 1,
        "tasks.isDeleted": 1,
        "tasks.status": 1,
        "tasks.storyPoint": 1,
        "tasks.messages": 1,
        "tasks.dateOfCompletion": 1,
      },
    };
    console.log(projectFields, "projectFields");
    let unwindTasks = {
      $unwind: "$tasks",
    };
    console.log(unwindTasks, "unwindTasks");
    let projectCondition = "";

    if (dateFrom === "" && dateTo === "") {
      condition = {
        $and: [
          {
            "tasks.startDate": {
              $gte: new Date(year, month, 1),
            },
          },
          {
            "tasks.startDate": {
              $lte: new Date(year, 1 + parseInt(month, 10), 1),
            },
          },
        ],
        "tasks.isDeleted": false,
        "tasks.userId": userId,
      };
    } else if (
      (year === "" || parseInt(year, 10) === -1) &&
      (month === "" || parseInt(month, 10) === -1)
    ) {
      condition = {
        $and: [
          {
            "tasks.startDate": {
              $gte: new Date(dateFrom),
            },
          },
          {
            "tasks.startDate": {
              $lte: new Date(dateTo),
            },
          },
        ],
        "tasks.isDeleted": false,
        "tasks.userId": userId,
      };
    } else {
      res.json({
        err: errors.SEARCH_PARAM_MISSING,
      });
      return;
    }
    let taskFilterCondition = {
      $match: condition,
    };
    let userCondition = {
      isDeleted: false,
    };
    // if (userRole === "owner") {
    //   userCondition.userid = loggedInUserId;
    // }
    let projectCond = {};
    if (projectId) {
      projectCond = {
        $match: {
          _id: mongoose.Types.ObjectId(projectId),
        },
      };
    } else {
      projectCond = {
        $match: userCondition,
      };
    }

    logInfo(
      [projectCond, projectFields, unwindTasks, taskFilterCondition],
      "getMonthlyTaskReport filtercondition="
    );
    Project.aggregate([
      projectCond,
      projectFields,
      unwindTasks,
      taskFilterCondition,
    ])
      .then((result) => {
        let tasks = result.map((p) => {
          // let assignedUser=p.projectUsers.filter((u)=>u.userId===p.tasks.userId);
          // let userName=(assignedUser && Array.isArray(assignedUser) && assignedUser.length>0) ? assignedUser[0].name:"";
          let messages =
            p.tasks.messages.length > 0 &&
            p.tasks.messages.map((m, i) => {
              let msg = "";
              msg +=
                i +
                1 +
                ". " +
                m.title +
                " - " +
                dateUtil.DateToString(m.createdOn);
              return msg;
            });
          let overdueDays = 0;
          let currentDate = new Date();

          if (p.tasks.status === "completed") {
            overdueDays = parseInt(
              (new Date(dateUtil.DateToString(p.tasks.dateOfCompletion)) -
                new Date(dateUtil.DateToString(p.tasks.endDate))) /
                (1000 * 60 * 60 * 24)
            );
          } else if (p.tasks.endDate < currentDate) {
            overdueDays = parseInt(
              (new Date(dateUtil.DateToString(currentDate)) -
                new Date(dateUtil.DateToString(p.tasks.endDate))) /
                (1000 * 60 * 60 * 24)
            );
          }

          let task = {
            projectId: p._id,
            userId: p.tasks.userId,
            // userName:userName,
            projectTitle: p.title,
            title: p.tasks.title,
            taskId: p.tasks._id,
            // description: p.tasks.description,
            // category:p.tasks.category,
            dateOfCompletion: p.tasks.dateOfCompletion,
            status: p.tasks.status,
            storyPoint: p.tasks.storyPoint,
            startDate: p.tasks.startDate,
            endDate: p.tasks.endDate,
            overdueDays: overdueDays,
            messages: messages,
          };
          return task;
        });
        logInfo("before response getMonthlyUserReport tasks=");
        res.json({
          success: true,
          data: tasks,
        });
      })
      .catch((err) => {
        res.json({
          err: errors.SERVER_ERROR,
        });
      });
  } catch (e) {
    logError(e, "getMonthlyUserReport error");
  }
};

// exports.getActiveUsersReport = (req, res) => {
//   Token.find({}, { userId: 1 }).then((result) => {
//     var userIds = [];
//     for (let i = 0; i < result.length; i++) {
//       userIds.push(result[i].userId);
//     }
//     User.find(
//       {
//         _id: {
//           $in: userIds,
//         },
//         isDeleted: false,
//       },
//       { name: 1, email: 1, companyId: 1 }
//     ).then((result) => {
//       var companyIds = [];
//       let resultStore = [];
//       for (let i = 0; i < result.length; i++) {
//         if (result[i].companyId !== "") {
//           companyIds.push(result[i].companyId);
//         }
//       }

//       Company.find(
//         {
//           _id: {
//             $in: companyIds,
//           },
//           isDeleted: false,
//         },
//         { companyId: 1, companyName: 1 }
//       ).then((result1) => {
//         for (let i = 0; i < result.length; i++) {
//           if (result[i].companyId !== "") {
//             for (let j = 0; j < result1.length; j++) {
//               if (result[i].companyId === result1[j]._id.toString()) {
//                 let obj = {
//                   name: result[i].name,
//                   email: result[i].email,
//                   companyName: result1[j].companyName,
//                 };

//                 resultStore.push(obj);
//                 break;
//               }
//             }
//           }
//         }
//         return res.json(resultStore);
//       });
//     });
//   });
// };
exports.getActiveUsersReport = async (req, res) => {
  try {
    const { companyId } = req.body; // Make sure companyId is passed in the request body
    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }
    console.log("company id ", companyId);
    // Step 1: Fetch user details for the specified company
    const users = await User.find(
      { companyId, isDeleted: false },
      {
        name: 1,
        email: 1,
        companyId: 1,
      }
    );

    // Check if users were found
    if (users.length === 0) {
      return res
        .status(404)
        .json({ error: "No active users found for this company." });
    }

    // Step 2: Gather company IDs from the users (if needed)
    const companyIds = users
      .map((user) => user.companyId)
      .filter((id) => id !== "");

    // Step 3: Fetch company details for these IDs
    const companies = await Company.find(
      { _id: { $in: companyIds }, isDeleted: false },
      { _id: 1, companyName: 1 }
    );

    // Step 4: Create a response that combines user and company details
    const resultStore = users.map((user) => {
      const company = companies.find(
        (c) => c._id.toString() === user.companyId.toString()
      );
      return {
        name: user.name,
        email: user.email,
        companyName: company ? company.companyName : "N/A",
      };
    });

    // Step 5: Return the result
    return res.status(200).json({ success: true, users: resultStore });
  } catch (error) {
    console.error("Error fetching active users report:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load active users report.",
      message: error.message,
    });
  }
};

// exports.getActiveUsersReport = async (req, res) => {
//   const userRole = req.userInfo.userRole.toLowerCase();
//   const userCompanyId = req.userInfo.companyId;

//   try {
//     // Step 1: Fetch all user IDs from the Token collection
//     const tokens = await Token.find({}, { userId: 1 });
//     const userIds = tokens.map((token) => token.userId);

//     // Step 2: Determine the query based on user role
//     let userQuery = {
//       _id: { $in: userIds },
//       isDeleted: false,
//     };

//     if (userRole === "owner" || userRole === "user") {
//       // Restrict to users within the same company for owners and regular users
//       userQuery.companyId = userCompanyId;
//     }

//     // Step 3: Fetch user details based on the constructed query
//     const users = await User.find(userQuery, {
//       name: 1,
//       email: 1,
//       companyId: 1,
//     });

//     // Step 4: Gather company IDs from the users
//     const companyIds = users
//       .map((user) => user.companyId)
//       .filter((id) => id !== "");

//     // Step 5: Fetch company details for these IDs
//     const companies = await Company.find(
//       { _id: { $in: companyIds }, isDeleted: false },
//       { companyId: 1, companyName: 1 }
//     );

//     // Step 6: Create a response that combines user and company details
//     const resultStore = users.map((user) => {
//       const company = companies.find(
//         (c) => c._id.toString() === user.companyId.toString()
//       );
//       return {
//         name: user.name,
//         email: user.email,
//         companyName: company ? company.companyName : "N/A",
//       };
//     });

//     // Step 7: Return the result
//     return res.json(resultStore);
//   } catch (err) {
//     console.error("Error fetching active users report:", err);
//     return res.status(500).json({
//       success: false,
//       msg: `Something went wrong. ${err.message}`,
//     });
//   }
// };

exports.getUserTaskCountReport = (req, res) => {
  try {
    logInfo("getUserTaskCountReport userInfo=");
    logInfo(req.userInfo, "getUserTaskCountReport userInfo=");
    logInfo(req.body, "getUserTaskCountReport");
    let { year, month, userId } = req.body.reportParams;
    let userRole = req.userInfo.userRole.toLowerCase();
    let loggedInUserId = req.userInfo.userId;

    let accessCheck = access.checkEntitlements(userRole);
    if (accessCheck === false) {
      res.json({
        err: errors.NOT_AUTHORIZED,
      });
      return;
    }
    let projects = [];
    let condition = {};

    let projectFields = {
      $project: {
        _id: 1,
        "tasks.title": 1,
        "tasks._id": 1,
        "tasks.userId": 1,
        // "tasks.startDate": 1,
        // "tasks.endDate": 1,
        "tasks.isDeleted": 1,
        "tasks.storyPoint": 1,
        //"tasks.status": 1,
        "tasks.dateOfCompletion": 1,
      },
    };
    let unwindTasks = {
      $unwind: "$tasks",
    };
    if (userId === undefined || userId === null || userId === "") {
      if (month === "" || parseInt(month, 10) === -1) {
        condition = {
          $and: [
            {
              "tasks.dateOfCompletion": {
                $ne: undefined,
              },
            },
            {
              "tasks.dateOfCompletion": {
                $ne: null,
              },
            },
            {
              "tasks.dateOfCompletion": {
                $ne: "",
              },
            },
            {
              "tasks.dateOfCompletion": {
                $gt: new Date(year, 0, 1).toISOString(),
              },
            },
            {
              "tasks.dateOfCompletion": {
                $lte: new Date(year, 1 + parseInt(10), 31 + 1).toISOString(),
              },
            },
          ],

          "tasks.isDeleted": false,
        };
      } else {
        condition = {
          $and: [
            {
              "tasks.dateOfCompletion": {
                $ne: undefined,
              },
            },
            {
              "tasks.dateOfCompletion": {
                $ne: null,
              },
            },
            {
              "tasks.dateOfCompletion": {
                $ne: "",
              },
            },
            {
              "tasks.dateOfCompletion": {
                $gt: new Date(year, month - 1, 1).toISOString(),
              },
            },
            {
              "tasks.dateOfCompletion": {
                $lte: new Date(year, parseInt(month, 10), 1).toISOString(),
              },
            },
          ],
          "tasks.isDeleted": false,
        };
      }
    } else {
      if (month === "" || parseInt(month, 10) === -1) {
        condition = {
          $and: [
            {
              "tasks.dateOfCompletion": {
                $ne: undefined,
              },
            },
            {
              "tasks.dateOfCompletion": {
                $ne: null,
              },
            },
            {
              "tasks.dateOfCompletion": {
                $ne: "",
              },
            },
            {
              "tasks.dateOfCompletion": {
                $gt: new Date(year, 0, 1).toISOString(),
              },
            },
            {
              "tasks.dateOfCompletion": {
                $lte: new Date(year, 1 + parseInt(10), 31 + 1).toISOString(),
              },
            },
          ],
          "tasks.userId": userId,
          "tasks.isDeleted": false,
        };
      } else {
        condition = {
          $and: [
            {
              "tasks.dateOfCompletion": {
                $ne: undefined,
              },
            },
            {
              "tasks.dateOfCompletion": {
                $ne: null,
              },
            },
            {
              "tasks.dateOfCompletion": {
                $ne: "",
              },
            },
            {
              "tasks.dateOfCompletion": {
                $gt: new Date(year, month - 1, 1).toISOString(),
              },
            },
            {
              "tasks.dateOfCompletion": {
                $lte: new Date(year, parseInt(month, 10), 1).toISOString(),
              },
            },
          ],
          "tasks.userId": userId,
          "tasks.isDeleted": false,
        };
      }
    }

    let taskFilterCondition = {
      $match: condition,
    };
    let groupCondition = {
      $group: {
        _id: "$userId",
        storyPoint: {
          $sum: Number("$storyPoint"),
        },
        count: {
          $sum: 1,
        },
      },
    };
    let userCondition = {
      isDeleted: false,
    };
    let projectCond = {};
    projectCond = {
      $match: userCondition,
    };
    // groupCondition
    logInfo(
      [projectCond, projectFields, unwindTasks, taskFilterCondition],
      "getUserTaskCountReport filtercondition="
    );
    Project.aggregate([
      projectCond,
      projectFields,
      unwindTasks,
      taskFilterCondition,
    ])
      .then((result) => {
        //console.log("result data check", result);
        let storyPoint;
        let taskCount = 0;
        let userTaskCount;
        let tasksByuserId = {};

        if (month === "" || parseInt(month, 10) === -1) {
          Holiday.find({
            year: year,
            isActive: "1",
          }).then((result1) => {
            let holidayCount = result1 && result1.length;
            let count = countDays.getDays("Sunday", year, "year");
            let totalSundayCount = count.length;
            //let minWorkingHours = 9;
            let totalCount = holidayCount + totalSundayCount;
            let daysInYear = daysInYears.daysInYear(year);
            let workingHours =
              (daysInYear - totalCount) * config.minWorkingHours;
            if (result.length > 0) {
              for (let i = 0; i < result.length; i++) {
                if (
                  result[i].tasks.userId !== undefined &&
                  result[i].tasks.userId !== null &&
                  result[i].tasks.userId !== ""
                ) {
                  if (tasksByuserId[result[i].tasks.userId]) {
                    storyPoint =
                      tasksByuserId[result[i].tasks.userId].storyPoint +
                      result[i].tasks.storyPoint;
                    userTaskCount =
                      tasksByuserId[result[i].tasks.userId].taskCount + 1;

                    let percentage = (storyPoint / workingHours) * 100;
                    tasksByuserId[result[i].tasks.userId].storyPoint =
                      storyPoint;
                    tasksByuserId[result[i].tasks.userId].taskCount =
                      userTaskCount;
                    tasksByuserId[result[i].tasks.userId].taskCount =
                      userTaskCount;
                    tasksByuserId[result[i].tasks.userId].percentage =
                      percentage.toFixed(2);
                  } else {
                    storyPoint = 0;
                    userTaskCount = 0;
                    storyPoint = storyPoint + result[i].tasks.storyPoint;
                    userTaskCount = userTaskCount + 1;
                    tasksByuserId[result[i].tasks.userId] = {
                      storyPoint: storyPoint,
                      taskCount: userTaskCount,
                      workingHours: workingHours,
                    };
                  }
                }
              }
            }
            let tasks = [];
            tasks.push(tasksByuserId);

            logInfo("before response getUserTaskCountReport tasks=");
            res.json({
              success: true,
              data: tasks,
            });
          });
        } else {
          Holiday.find({
            month: month,
            isActive: "1",
          }).then((result1) => {
            let holidayCount = result1 && result1.length;
            let monthvalue = month < 10 ? "0" + month : month;
            let count = totalSundays.sundaysInMonth(monthvalue, year);
            let totalSundayCount = count.length;
            //let minWorkingHours = 9;
            let totalCount = holidayCount + totalSundayCount;
            // console.log("totalCount", totalCount);
            let daysInMonth = daysInMonths.daysInMonth(month, year);
            // console.log("daysInMonth", daysInMonth);
            let workingHours =
              (daysInMonth - totalCount) * config.minWorkingHours;

            if (result.length > 0) {
              for (let i = 0; i < result.length; i++) {
                if (
                  result[i].tasks.userId !== undefined &&
                  result[i].tasks.userId !== null &&
                  result[i].tasks.userId !== ""
                ) {
                  if (tasksByuserId[result[i].tasks.userId]) {
                    storyPoint =
                      tasksByuserId[result[i].tasks.userId].storyPoint +
                      result[i].tasks.storyPoint;
                    userTaskCount =
                      tasksByuserId[result[i].tasks.userId].taskCount + 1;

                    let percentage = (storyPoint / workingHours) * 100;
                    tasksByuserId[result[i].tasks.userId].storyPoint =
                      storyPoint;
                    tasksByuserId[result[i].tasks.userId].taskCount =
                      userTaskCount;
                    tasksByuserId[result[i].tasks.userId].taskCount =
                      userTaskCount;
                    tasksByuserId[result[i].tasks.userId].percentage =
                      percentage.toFixed(2);
                  } else {
                    storyPoint = 0;
                    userTaskCount = 0;
                    storyPoint = storyPoint + result[i].tasks.storyPoint;
                    userTaskCount = userTaskCount + 1;
                    tasksByuserId[result[i].tasks.userId] = {
                      storyPoint: storyPoint,
                      taskCount: userTaskCount,
                      workingHours: workingHours,
                    };
                  }
                }
              }
            }
            let tasks = [];
            tasks.push(tasksByuserId);

            logInfo("before response getUserTaskCountReport tasks=");
            res.json({
              success: true,
              data: tasks,
            });
          });
        }
      })
      .catch((err) => {
        res.json({
          err: errors.SERVER_ERROR,
        });
      });
  } catch (e) {
    logError(e, "getUserTaskCountReport error");
  }
};

// exports.getIncompleteTaskCountReport = (req, res) => {
//   let userCondition = {
//     isDeleted: false,
//   };
//   let projectCond = {};
//   projectCond = {
//     $match: userCondition,
//   };
//   let projectFields = {
//     $project: {
//       _id: 1,
//       "tasks.title": 1,
//       "tasks._id": 1,
//       "tasks.userId": 1,
//       "tasks.startDate": 1,
//       "tasks.endDate": 1,
//       "tasks.isDeleted": 1,
//       "tasks.status": 1,
//       "tasks.storyPoint": 1,
//       "tasks.dateOfCompletion": 1,
//     },
//   };
//   let unwindTasks = {
//     $unwind: "$tasks",
//   };
//   condition = {
//     $or: [
//       {
//         "tasks.status": { $eq: "new" },
//       },
//       {
//         "tasks.status": { $eq: "inprogress" },
//       },
//     ],
//     "tasks.isDeleted": false,
//   };
//   let taskFilterCondition = {
//     $match: condition,
//   };
//   try {
//     Project.aggregate([
//       projectCond,
//       projectFields,
//       unwindTasks,
//       taskFilterCondition,
//     ])
//       .then((result) => {
//         tasksByuserId = {};
//         let newtaskCount;
//         let inprogresstaskCount;

//         if (result.length > 0) {
//           for (let i = 0; i < result.length; i++) {
//             if (result[i].tasks.userId !== "") {
//               if (tasksByuserId[result[i].tasks.userId]) {
//                 if (result[i].tasks.status === "new") {
//                   newtaskCount =
//                     tasksByuserId[result[i].tasks.userId].newtaskCount + 1;
//                 } else {
//                   inprogresstaskCount =
//                     tasksByuserId[result[i].tasks.userId].inprogresstaskCount +
//                     1;
//                 }
//                 tasksByuserId[result[i].tasks.userId].newtaskCount =
//                   newtaskCount;
//                 tasksByuserId[result[i].tasks.userId].inprogresstaskCount =
//                   inprogresstaskCount;
//               } else {
//                 newtaskCount = 0;
//                 inprogresstaskCount = 0;
//                 if (result[i].tasks.status === "new") {
//                   newtaskCount = 1;
//                 } else {
//                   inprogresstaskCount = 1;
//                 }
//                 newtaskCount = newtaskCount;
//                 inprogresstaskCount = inprogresstaskCount;
//                 //console.log("newtaskCount",newtaskCount);
//                 // console.log("inprogresstaskCount",inprogresstaskCount);
//                 tasksByuserId[result[i].tasks.userId] = {
//                   newtaskCount: newtaskCount,
//                   inprogresstaskCount: inprogresstaskCount,
//                 };
//               }
//             }
//           }
//           //console.log("newtaskCount",newtaskCount);
//           // console.log("inprogresstaskCount", inprogresstaskCount);
//           //console.log("tasksByuserId", tasksByuserId);
//           let tasks = [];
//           tasks.push(tasksByuserId);
//           res.json({
//             data: tasks,
//           });
//         }
//       })
//       .catch((err) => {
//         res.json({
//           err: errors.SERVER_ERROR,
//         });
//       });
//   } catch (e) {
//     logError(e, "getUserTaskCountReport error");
//   }
// };

exports.getIncompleteTaskCountReport = async (req, res) => {
  const userRole = req.userInfo.userRole.toLowerCase();
  const userCompanyId = req.userInfo.companyId;

  let userCondition = {
    isDeleted: false,
  };

  // Apply company-based filtering for 'owner' or 'user'
  if (userRole === "owner" || userRole === "user") {
    userCondition.companyId = userCompanyId;
  }

  let projectCond = {
    $match: userCondition,
  };

  let projectFields = {
    $project: {
      _id: 1,
      "tasks.title": 1,
      "tasks._id": 1,
      "tasks.userId": 1,
      "tasks.startDate": 1,
      "tasks.endDate": 1,
      "tasks.isDeleted": 1,
      "tasks.status": 1,
      "tasks.storyPoint": 1,
      "tasks.dateOfCompletion": 1,
    },
  };

  let unwindTasks = {
    $unwind: "$tasks",
  };

  let condition = {
    $or: [
      { "tasks.status": { $eq: "new" } },
      { "tasks.status": { $eq: "inprogress" } },
    ],
    "tasks.isDeleted": false,
  };

  let taskFilterCondition = {
    $match: condition,
  };

  try {
    const result = await Project.aggregate([
      projectCond,
      projectFields,
      unwindTasks,
      taskFilterCondition,
    ]);

    let tasksByuserId = {};
    let newtaskCount;
    let inprogresstaskCount;

    if (result.length > 0) {
      for (let i = 0; i < result.length; i++) {
        if (result[i].tasks.userId !== "") {
          if (tasksByuserId[result[i].tasks.userId]) {
            if (result[i].tasks.status === "new") {
              newtaskCount =
                tasksByuserId[result[i].tasks.userId].newtaskCount + 1;
            } else {
              inprogresstaskCount =
                tasksByuserId[result[i].tasks.userId].inprogresstaskCount + 1;
            }
            tasksByuserId[result[i].tasks.userId].newtaskCount = newtaskCount;
            tasksByuserId[result[i].tasks.userId].inprogresstaskCount =
              inprogresstaskCount;
          } else {
            newtaskCount = 0;
            inprogresstaskCount = 0;
            if (result[i].tasks.status === "new") {
              newtaskCount = 1;
            } else {
              inprogresstaskCount = 1;
            }
            tasksByuserId[result[i].tasks.userId] = {
              newtaskCount: newtaskCount,
              inprogresstaskCount: inprogresstaskCount,
            };
          }
        }
      }

      let tasks = [];
      tasks.push(tasksByuserId);

      return res.json({
        data: tasks,
      });
    } else {
      return res.json({
        data: [],
      });
    }
  } catch (err) {
    console.error("Error fetching incomplete task count report:", err);
    return res.status(500).json({
      success: false,
      msg: `Something went wrong. ${err.message}`,
    });
  }
};

// exports.getProjectProgressReport = async (req, res) => {
//   try {
//     const { projectId } = req.body;

//     console.log("projectId", projectId);
//     const results = await Project.find({
//       _id: new mongoose.Types.ObjectId(projectId),
//     }).exec();

//     console.log("previous result", results);

//     const resultArray = results.map((result) => {
//       const d1 = new Date(result.date);
//       const date = dateUtil.DateToString(
//         `${d1.getFullYear()}-${d1.getMonth() + 1}-${d1.getDate()}`
//       );

//       return {
//         projectId: result.projectId,
//         todo: result.todo,
//         inprogress: result.inprogress,
//         completed: result.completed,
//         todoStoryPoint: result.todoStoryPoint,
//         inprogressStoryPoint: result.inprogressStoryPoint,
//         completedStoryPoint: result.completedStoryPoint,
//         date,
//       };
//     });

//     console.log("result", resultArray);

//     res.json({ data: resultArray });
//   } catch (err) {
//     logError(err, "getProjectProgressReport error");
//     res.status(500).json({ err: errors.SERVER_ERROR });
//   }
// };

exports.getProjectProgressReport = async (req, res) => {
  try {
    const { projectId } = req.body;

    console.log("projectId", projectId);

    const results = await Project.find({
      _id: new mongoose.Types.ObjectId(projectId),
    }).exec();

    console.log("previous result", results);

    const resultArray = results.map((result) => {
      // Use startdate or createdOn for date formatting
      const d1 =
        result.createdOn || result.startdate
          ? new Date(result.createdOn || result.startdate)
          : new Date();
      const date = dateUtil.DateToString(
        `${d1.getFullYear()}-${d1.getMonth() + 1}-${d1.getDate()}`
      );

      return {
        projectId: result._id.toString(),
        todo: result.taskStages.includes("todo") ? 1 : 0,
        inprogress: result.taskStages.includes("inprogress") ? 1 : 0,
        completed: result.taskStages.includes("completed") ? 1 : 0,
        todoStoryPoint: 0,
        inprogressStoryPoint: 0,
        completedStoryPoint: 0,
        date,
      };
    });

    console.log("result", resultArray);

    res.json({ data: resultArray });
  } catch (err) {
    logError(err, "getProjectProgressReport error");
    res.status(500).json({ err: errors.SERVER_ERROR });
  }
};

// exports.getProjectProgressReport = async (req, res) => {
//   try {
//     const { projectId } = req.body;
//     const userRole = req.userInfo.userRole.toLowerCase();
//     const userCompanyId = req.userInfo.companyId;

//     let projectCondition = { projectId };

//     // Apply company-based filtering for 'owner' or 'user'
//     if (userRole === "owner" || userRole === "user") {
//       projectCondition.companyId = userCompanyId;
//     }

//     const results = await Burndown.find(projectCondition).exec();

//     const resultArray = results.map((result) => {
//       const d1 = new Date(result.date);
//       const date = dateUtil.DateToString(
//         `${d1.getFullYear()}-${d1.getMonth() + 1}-${d1.getDate()}`
//       );

//       return {
//         projectId: result.projectId,
//         todo: result.todo,
//         inprogress: result.inprogress,
//         completed: result.completed,
//         todoStoryPoint: result.todoStoryPoint,
//         inprogressStoryPoint: result.inprogressStoryPoint,
//         completedStoryPoint: result.completedStoryPoint,
//         date,
//       };
//     });

//     res.json({ data: resultArray });
//   } catch (err) {
//     logError(err, "getProjectProgressReport error");
//     res.status(500).json({ err: errors.SERVER_ERROR });
//   }
// };

exports.getUserPerformanceReport = (req, res) => {
  try {
    console.log("Request Body:", req.body);

    // Extract request parameters
    let userId = req.body.userId;
    let projectId = req.body.projectId;
    let year = req.body.year;
    let month = req.body.month;
    let dateFrom = req.body.dateFrom;
    let dateTo = req.body.dateTo;

    // Debugging logs for parameters
    console.log("Year:", year);
    console.log("Month:", month);
    console.log("DateFrom:", dateFrom);
    console.log("DateTo:", dateTo);

    // Adjust the date range to handle full month and time zone issues
    let startDate, endDate;
    if (year && month) {
      // Create date range for full month (e.g., 2024-10-01 to 2024-10-31)
      startDate = new Date(Date.UTC(year, month - 1, 1)); // Start of the month (UTC)
      endDate = new Date(Date.UTC(year, month, 0)); // End of the month (UTC)
    } else if (dateFrom && dateTo) {
      // Use custom date range if provided
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
    }

    console.log("Adjusted Start Date:", startDate);
    console.log("Adjusted End Date:", endDate);

    // Initial match for the tasks collection directly
    let taskCondition = {
      isDeleted: false,
      userId: new mongoose.Types.ObjectId(userId),
      startDate: { $gte: startDate, $lte: endDate },
      projectId: new mongoose.Types.ObjectId(projectId), // Ensure we are matching the correct project
    };

    console.log("Task Filter Condition:", taskCondition);

    // Aggregation pipeline
    Task.aggregate([
      { $match: taskCondition }, // Match tasks based on user and project
      {
        $group: {
          _id: {
            projectId: "$projectId",
            status: "$status",
            userId: "$userId",
            startDate: "$startDate",
            endDate: "$endDate",
            storyPoint: "$storyPoint",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          projectId: "$_id.projectId",
          status: "$_id.status",
          userId: "$_id.userId",
          startDate: "$_id.startDate",
          endDate: "$_id.endDate",
          storyPoint: "$_id.storyPoint",
          count: 1,
        },
      },
    ])
      .then((result) => {
        console.log("Aggregation result:", result);

        if (!result || result.length === 0) {
          return res.json({ err: "No data found" });
        }

        let tasksByProjectId = {};
        let date = new Date().toISOString().split("T")[0]; // Current date in ISO format

        // Process aggregation results
        result.forEach((item) => {
          let { projectId, status, startDate, endDate, storyPoint, count } =
            item;

          let overdueCount = 0;
          let completedCount = 0;
          let todoCount = 0;
          let inprogressCount = 0;

          // Check task status and categorize
          if (status === "completed") {
            completedCount = count;
            let dbDate = new Date(endDate).toISOString().split("T")[0];
            if (dbDate < date) overdueCount++;
          } else if (status === "new") {
            todoCount = count;
            let dbDate = new Date(endDate).toISOString().split("T")[0];
            if (dbDate < date) overdueCount++;
          } else {
            inprogressCount = count;
            let dbDate = new Date(endDate).toISOString().split("T")[0];
            if (dbDate < date) overdueCount++;
          }

          // Aggregate results by projectId
          if (!tasksByProjectId[projectId]) {
            tasksByProjectId[projectId] = {
              projectId: projectId,
              completed: 0,
              todo: 0,
              inprogress: 0,
              storyPoint: 0,
              overDue: 0,
            };
          }

          tasksByProjectId[projectId].completed += completedCount;
          tasksByProjectId[projectId].todo += todoCount;
          tasksByProjectId[projectId].inprogress += inprogressCount;
          tasksByProjectId[projectId].overDue += overdueCount;
          tasksByProjectId[projectId].storyPoint += storyPoint;
        });

        let projectCountArray = Object.values(tasksByProjectId).map(
          (project) => ({
            projectId: project.projectId,
            Completed: project.completed,
            Todo: project.todo,
            Inprogress: project.inprogress,
            Storypoint: project.storyPoint,
            Overdue: project.overDue,
          })
        );

        console.log("Project Count Array:", projectCountArray);

        res.json({ data: projectCountArray });
      })
      .catch((err) => {
        console.error("Error in aggregation:", err);
        res.json({ err: err.message });
      });
  } catch (error) {
    console.error("Error:", error);
    res.json({ err: error.message });
  }
};

// exports.getUserPerformanceReport = (req, res) => {
//   try {
//     console.log("req", req.body);
//     let userId = req.body.userId;
//     let projectId = req.body.projectId;
//     let year = req.body.year;
//     let month = req.body.month;
//     let dateFrom = req.body.dateFrom;
//     let dateTo = req.body.dateTo;
//     let projectFields = {
//       $project: {
//         _id: 1,
//         title: 1,
//         userid: 1,
//         status: 1,
//         "tasks.title": 1,
//         "tasks._id": 1,
//         "tasks.userId": 1,
//         "tasks.description": 1,
//         "tasks.startDate": 1,
//         "tasks.endDate": 1,
//         "tasks.isDeleted": 1,
//         "tasks.category": 1,
//         "tasks.status": 1,
//         "tasks.completed": 1,
//         "tasks.dateOfCompletion": 1,
//         "tasks.storyPoint": 1,
//       },
//     };
//     let taskCondition = {
//       "tasks.status": { $ne: "onHold" },
//       $and: [
//         {
//           "tasks.endDate": {
//             $ne: undefined,
//           },
//         },
//         {
//           "tasks.endDate": {
//             $ne: null,
//           },
//         },
//         {
//           "tasks.endDate": {
//             $ne: "",
//           },
//         },
//       ],
//       "tasks.isDeleted": false,
//       "tasks.userId": userId,
//     };

//     console.log("taskCondition", taskCondition);
//     if (
//       userId &&
//       (year === "" || parseInt(year, 10) === -1) &&
//       (month === "" || parseInt(month, 10) === -1) &&
//       dateFrom === "" &&
//       dateTo === ""
//     ) {
//       taskCondition = taskCondition;
//     } else if (
//       userId &&
//       dateFrom === "" &&
//       dateTo === "" &&
//       (year !== "" || parseInt(year, 10) !== -1) &&
//       (month !== "" || parseInt(month, 10) !== -1)
//     ) {
//       taskCondition["tasks.startDate"] = {
//         $gte: new Date(year, month, 1),
//         $lte: new Date(year, 1 + parseInt(month, 10), 1),
//       };
//     } else if (
//       userId &&
//       (year === "" || parseInt(year, 10) === -1) &&
//       (month === "" || parseInt(month, 10) === -1) &&
//       dateFrom !== "" &&
//       dateTo !== ""
//     ) {
//       taskCondition["tasks.startDate"] = {
//         $gte: new Date(dateFrom),
//         $lte: new Date(dateTo),
//       };
//     } else {
//       res.json({
//         err: errors.SEARCH_PARAM_MISSING,
//       });
//       return;
//     }

//     let projCondition = {
//       isDeleted: false,
//     };
//     if (projectId) {
//       projCondition["_id"] = new ObjectId(projectId);
//     }
//     let projectCond = {
//       $match: projCondition,
//     };

//     console.log("projectCond", projectCond);

//     let tasksUnwind = {
//       $unwind: "$tasks",
//     };

//     console.log("tasksUnwind", tasksUnwind);

//     let taskFilterCondition = {
//       $match: taskCondition,
//     };

//     let group = {
//       $group: {
//         _id: {
//           _id: "$_id",
//           title: "$title",
//           taksTitle: "$tasks.title",
//           userId: "$tasks.userId",
//           status: "$tasks.status",
//           dateOfCompletion: "$tasks.dateOfCompletion",
//           category: "$tasks.category",
//           startDate: "$tasks.startDate",
//           endDate: "$tasks.endDate",
//           storyPoint: "$tasks.storyPoint",
//         },
//         count: {
//           $sum: 1,
//         },
//       },
//     };
//     logInfo(
//       [projectCond, projectFields, tasksUnwind, taskFilterCondition, group],
//       "getUserPerformanceReport"
//     );
//     console.log("getUserPerformanceReport", [
//       projectCond,
//       projectFields,
//       tasksUnwind,
//       taskFilterCondition,
//       group,
//     ]);

//     Project.aggregate([
//       projectCond,
//       projectFields,
//       tasksUnwind,
//       taskFilterCondition,
//       group,
//     ])
//       .then((result) => {
//         let projectCountArray = [];
//         // if (result.length > 0) {
//         let tasksByProjectId = {};
//         let date = dateUtil.DateToString(new Date());

//         for (let i = 0; i < result.length; i++) {
//           let completedCount = 0;
//           let todoCount = 0;
//           let inprogressCount = 0;
//           let storyPoint = 0;
//           let overDueCount = 0;

//           if (tasksByProjectId[result[i]._id._id]) {
//             if (result[i]._id.status === "completed") {
//               tasksByProjectId[result[i]._id._id].completed += result[i].count;
//               let dbDate = dateUtil.DateToString(result[i]._id.endDate);
//               let dateOfCompletion = dateUtil.DateToString(
//                 result[i]._id.dateOfCompletion
//               );
//               if (dbDate < dateOfCompletion) {
//                 overDueCount++;
//               }
//             } else if (result[i]._id.status === "new") {
//               tasksByProjectId[result[i]._id._id].todo += result[i].count;
//               let dbDate = dateUtil.DateToString(result[i]._id.endDate);
//               if (dbDate < date) {
//                 overDueCount++;
//               }
//             } else {
//               tasksByProjectId[result[i]._id._id].inprogress += result[i].count;
//               let dbDate = dateUtil.DateToString(result[i]._id.endDate);
//               if (dbDate < date) {
//                 overDueCount++;
//               }
//             }
//             tasksByProjectId[result[i]._id._id].overDue += overDueCount;
//             tasksByProjectId[result[i]._id._id].storyPoint +=
//               result[i]._id.storyPoint;
//           } else {
//             if (result[i]._id.status === "completed") {
//               completedCount = result[i].count;
//               let dbDate = dateUtil.DateToString(result[i]._id.endDate);
//               let dateOfCompletion = dateUtil.DateToString(
//                 result[i]._id.dateOfCompletion
//               );
//               if (dbDate < dateOfCompletion) {
//                 overDueCount++;
//               }
//             } else if (result[i]._id.status === "new") {
//               todoCount = result[i].count;
//               let dbDate = dateUtil.DateToString(result[i]._id.endDate);
//               if (dbDate < date) {
//                 overDueCount++;
//               }
//             } else {
//               inprogressCount = result[i].count;
//               let dbDate = dateUtil.DateToString(result[i]._id.endDate);
//               if (dbDate < date) {
//                 overDueCount++;
//               }
//             }
//             storyPoint = result[i]._id.storyPoint;
//             tasksByProjectId[result[i]._id._id] = {
//               projectId: result[i]._id._id,
//               title: result[i]._id.title,
//               todo: todoCount,
//               inprogress: inprogressCount,
//               completed: completedCount,
//               storyPoint: storyPoint,
//               overDue: overDueCount,
//               userId: result[i]._id.userId,
//             };
//           }
//         }
//         // console.log("tasksByProjectId", tasksByProjectId);
//         let keys = Object.keys(tasksByProjectId);

//         for (let i = 0; i < keys.length; i++) {
//           let projectObj = {
//             Completed: tasksByProjectId[keys[i]].completed,
//             Todo: tasksByProjectId[keys[i]].todo,
//             Inprogress: tasksByProjectId[keys[i]].inprogress,
//             Storypoint: tasksByProjectId[keys[i]].storyPoint,
//             Overdue: tasksByProjectId[keys[i]].overDue,
//             projectId: tasksByProjectId[keys[i]].projectId,
//             title: tasksByProjectId[keys[i]].title,
//           };
//           projectCountArray.push(projectObj);
//         }
//         //leave count
//         let leaveArray = [];
//         let leaveCondition = {};

//         if (dateFrom === "" && dateTo === "") {
//           leaveCondition = {
//             isDeleted: false,
//             userId: userId,
//           };
//         } else {
//           leaveCondition = {
//             isDeleted: false,
//             userId: userId,
//             fromDate: {
//               $gte: dateUtil.DateToString(dateFrom),
//               $lte: dateUtil.DateToString(dateTo),
//             },
//           };
//         }
//         LeaveApplication.find(leaveCondition, {
//           _id: 1,
//           userId: 1,
//           userName: 1,
//           leaveType: 1,
//           isDeleted: 1,
//           status: 1,
//           fromDate: 1,
//         }).then((result1) => {
//           if (result1.length > 0) {
//             let totalLeave = 0;
//             let unApprvedLeaveCount = 0;
//             let unpaidLeaveCount = 0;
//             let sickLeaveCount = 0;
//             let casualLeaveCount = 0;
//             let compoffLeaveCount = 0;
//             let maternityLeaveCount = 0;
//             let paternityLeaveCount = 0;
//             let leaveObj = {};
//             let obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8;
//             for (let i = 0; i < result1.length; i++) {
//               totalLeave = result1.length;
//               if (result1[i].status === "pending") {
//                 unApprvedLeaveCount++;
//               }
//               if (result1[i].leaveType === "Sick Leave") {
//                 sickLeaveCount++;
//               }
//               if (result1[i].leaveType === "Casual Leave") {
//                 casualLeaveCount++;
//               }
//               if (result1[i].leaveType === "Un-paid") {
//                 unpaidLeaveCount++;
//               }
//               if (result1[i].leaveType === "Maternity Leave") {
//                 maternityLeaveCount++;
//               }
//               if (result1[i].leaveType === "Comp Off") {
//                 compoffLeaveCount++;
//               }
//               if (result1[i].leaveType === "Paternity Leave") {
//                 paternityLeaveCount++;
//               }

//               leaveObj = {
//                 TotalLeave: totalLeave,
//                 UnapprovedLeaveCount: unApprvedLeaveCount,
//                 UnpaidLeaveCount: unpaidLeaveCount,
//                 SickLeaveCount: sickLeaveCount,
//                 CasualLeaveCount: casualLeaveCount,
//                 CompoffLeaveCount: compoffLeaveCount,
//                 MaternityLeaveCount: maternityLeaveCount,
//                 PaternityLeaveCount: paternityLeaveCount,
//               };
//               // obj1={
//               //     name:"Total Leave",
//               //     count:totalLeave
//               // }
//               obj2 = {
//                 name: "Unapproved",
//                 count: unApprvedLeaveCount,
//               };
//               obj3 = {
//                 name: "Unpaid",
//                 count: unpaidLeaveCount,
//               };
//               obj4 = {
//                 name: "Sick",
//                 count: sickLeaveCount,
//               };
//               obj5 = {
//                 name: "Casual",
//                 count: casualLeaveCount,
//               };
//               obj6 = {
//                 name: "Compoff",
//                 count: compoffLeaveCount,
//               };
//               obj7 = {
//                 name: "Maternity",
//                 count: maternityLeaveCount,
//               };
//               obj8 = {
//                 name: "Paternity",
//                 count: paternityLeaveCount,
//               };
//             }
//             // leaveArray.push(leaveObj);
//             // leaveArray.push(obj1);
//             leaveArray.push(obj2);
//             leaveArray.push(obj3);
//             leaveArray.push(obj4);
//             leaveArray.push(obj5);
//             leaveArray.push(obj6);
//             leaveArray.push(obj7);
//             leaveArray.push(obj8);
//           }

//           let projectData = [];
//           let completedTotal = 0;
//           let inprogressTotal = 0;
//           let overdueTotal = 0;
//           let storypointTotal = 0;
//           let todoTotal = 0;
//           for (let i = 0; i < projectCountArray.length; i++) {
//             if (projectCountArray[i].Completed >= 0) {
//               completedTotal += projectCountArray[i].Completed;
//             }
//             if (projectCountArray[i].Inprogress >= 0) {
//               inprogressTotal += projectCountArray[i].Inprogress;
//             }
//             if (projectCountArray[i].Overdue >= 0) {
//               overdueTotal += projectCountArray[i].Overdue;
//             }
//             if (projectCountArray[i].Storypoint >= 0) {
//               storypointTotal += projectCountArray[i].Storypoint;
//             }
//             if (projectCountArray[i].Todo >= 0) {
//               todoTotal += projectCountArray[i].Todo;
//             }
//           }
//           projectData.push(
//             { name: "Completed", value: completedTotal },
//             { name: "Todo", value: todoTotal },
//             { name: "Storypoint", value: storypointTotal },
//             { name: "Overdue", value: overdueTotal },
//             { name: "Inprogress", value: inprogressTotal }
//           );
//           console.log("projectData", projectData);
//           res.json({
//             projectListData: projectData,
//             leaveData: leaveArray,
//             projectTableData: projectCountArray,
//           });
//         });
//         // }
//         // else {
//         //     res.json({
//         //         projectListData: [],
//         //         leaveData:[]
//         //     });
//         // }
//       })
//       .catch((err) => {
//         res.json({
//           err: errors.SERVER_ERROR,
//         });
//       });
//   } catch (e) {
//     console.log(e);
//   }
// };
