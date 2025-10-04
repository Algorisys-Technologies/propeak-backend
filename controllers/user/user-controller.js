const mongoose = require("mongoose");
const User = require("../../models/user/user-model");
var bodyParser = require("body-parser");
const uuidv4 = require("uuid/v4");
const secret = require("../../config/secret");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const async = require("async");
const ProjectUsers = require("../../models/project/project-user-model");
const config = require("../../config/config");
const audit = require("../audit-log/audit-log-controller");
const Project = require("../../models/project/project-model");
const AccessRight = require("../../models/access-right/access-right-model");
const { sendEmail } = require("../../common/mailer");
const { addMyNotification } = require("../../common/add-my-notifications");
const {
  generateAccessToken,
  generateRefreshToken,
  decodeToken,
} = require("../../verify-token/token-management");
const { ACCESS_TOKEN, REFRESH_TOKEN } = require("../../common/const");
const Token = require("../../models/Token/token");
const tokenController = require("../token/token-controller");
const access = require("../../check-entitlements");
const sortData = require("../../common/common");
const DefaultAppLevelAccessRight = require("../../models/access-right/defaultapplevelaccessright-model");
// const DefaultProjectAssign = require('../../models/project/project-model');
// const ProjectUserSchema = require('../../models/project/project-user-model');
const AppLevelAccessRight = require("../../models/access-right/applevelaccessright-model");
const { logError, logInfo } = require("../../common/logger");
const cacheManager = require("../../redis");
const rabbitMQ = require("../../rabbitmq");
// const objectId = require('../../common/common');
const Company = require("../../models/company/company-model");

const bcrypt = require("bcrypt");
const Role = require("../../models/role/role-model");
const UserRole = require("../../models/user/user-roles-model");

const errors = {
  REGISTER_EMAIL_TAKEN: "Email is unavailable",
  RESET_PASSWORD: "An error has occured while reseting password",
  REGISTER_GENERAL_ERROR: "An error has occured while adding/updating user",
  LOGIN_INVALID: "Invalid Email/Password combination",
  LOGIN_GENERAL_ERROR: "Invalid user credentials",
  RESET_EXPIRE: "Your link has expired, kindly reset again",
  PASSWORDS_DONT_MATCH: "Passwords do not match",
  LOGIN_GENERAL_ERROR_DELETE: "An error has occured while deleting user",
  NOT_AUTHORIZED: "Your are not authorized",
};
const { DEFAULT_PAGE, DEFAULT_QUERY, DEFAULT_LIMIT } = require("../../utils/defaultValues");


exports.getUser = (req, res) => {
  //res.setHeader(ACCESS_TOKEN, req.token);
  let userRole = req.userInfo.userRole.toLowerCase();
  let accessCheck = access.checkEntitlements(userRole);
  if (accessCheck === false) {
    res.json({
      err: errors.NOT_AUTHORIZED,
    });
    return;
  }
  User.findOne(
    {
      _id: req.params.id,
    },
    {
      _id: 1,
      name: 1,
      email: 1,
      role: 1,
      isDeleted: 1,
      companyId: 1,
      reportingManagerId: 1,
      contactNumber: 1,
      alternateNumber: 1,
      gender: 1,
      dob: 1,
      isActive: 1,
      isLocked: 1,
      dateOfJoining: 1,
      designation: 1,
      bloodGroup: 1,
      currentAddress: 1,
      permanentAddress: 1,
      panNo: 1,
      addharNo: 1,
      passportNo: 1,
      passportName: 1,
      passportissueDate: 1,
      passportexpiryDate: 1,
      placeOfIssue: 1,
      createdBy: 1,
      createdOn: 1,
      modifiedBy: 1,
      modifiedOn: 1,
    }
  )
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.json({
        err: errors.LOGIN_GENERAL_ERROR,
      });
    });
};
// exports.getUsers = async (req, res) => {
//   const { companyId } = req.body; // Extract companyId from request body
//   try {
//     // Fetch users associated with the given companyId and not deleted
//     const users = await User.find({
//       isDeleted: false,
//       companyId: companyId, // Filter users by companyId
//     });

//     // console.log(users, "users");

//     if (users.length === 0) {
//       return res
//         .status(404)
//         .json({ success: false, msg: "No users found for this company." });
//     }

//     res.json({ success: true, data: users });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// };

exports.selectUsers = async(req, res) => {
  try{
    const { companyId } = req.body;
    const users = await User.find({
      isDeleted: false,
      companyId,
    }).select("_id name email currentLocation");
    return res.status(200).json(users);
  }catch(err){
    return res.status(500).json({
      success: false,
      msg: `Something went wrong. ${err.message}`,
    });
  }
}

exports.getUsers = async (req, res) => {
  try {
    const { companyId, page = DEFAULT_PAGE } = req.body;
    const { q = DEFAULT_QUERY } = req.query;
    const limit = DEFAULT_LIMIT;

    const orConditions = [];
    
    if (q) {
      const regex = new RegExp(q, "i");

      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) {
        // Email input → search email
        orConditions.push({ email: { $regex: regex } });
      } else {
        // Otherwise → search name and role
        orConditions.push(
          { name: { $regex: regex } },
          { role: { $regex: regex } }
        );
      }
    }

    const searchFilter = orConditions.length > 0 ? { $or: orConditions } : {};

    const query = {
      isDeleted: false,
      ...(companyId ? { companyId } : {}),
      ...searchFilter,
    };

    const result = await User.find(query)
      .skip(limit * page)
      .limit(limit);

    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      success: true,
      data: result,
      totalCount,
      totalPages,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({
      success: false,
      msg: `Something went wrong. ${err.message}`,
    });
  }
};

exports.getProjectUsers = async (req, res) => {
  try {
    const { projectId } = req.body;

    // Validate if projectId is provided and valid
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "Valid project ID is required." });
    }

    // Fetch the project to get the associated projectUsers array
    const project = await Project.findById(projectId).select("projectUsers");
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    const { projectUsers } = project;

    // Fetch user details for each user ID in projectUsers
    const users = await User.find(
      { _id: { $in: projectUsers }, isDeleted: false },
      {
        _id: 1,
        name: 1,
        email: 1,
        role: 1,
        companyId: 1,
        isActive: 1,
        // reportingManagerId: 1,
        // contactNumber: 1,
        // alternateNumber: 1,
        // gender: 1,
        // dob: 1,
        // dateOfJoining: 1,
        // designation: 1,
        // bloodGroup: 1,
        // currentAddress: 1,
        // permanentAddress: 1,
        // panNo: 1,
        // addharNo: 1,
        // passportNo: 1,
        // passportName: 1,
        // passportissueDate: 1,
        // passportexpiryDate: 1,
        // placeOfIssue: 1,
        // createdBy: 1,
        // createdOn: 1,
        // modifiedBy: 1,
        // modifiedOn: 1,
      }
    );

    return res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching project users:", err);
    return res.status(500).json({
      success: false,
      msg: `Something went wrong. ${err.message}`,
    });
  }
};

exports.postAddUser = async (req, res) => {
  try {
    const companyId = req.body.companyId;
    const company = await Company.findById(companyId);

    if(req.body.name == "" || req.body.email == "" || req.body.password == "" || req.body.dob == ""){
      return res
        .status(400)
        .send("All fields marked with an asterisk (*) are mandatory.");
    }

    const isUserExists = await User.findOne({email: req.body.email, companyId, isDeleted: false})

    if(isUserExists){
      return res.json({success: false, message: "User Already Exists" })
    }
    console.log(companyId, "companyId from the API");
    console.log(company, "Retrieved company object");
    if (!company || company.numberOfUsers <= 0) {
      return res.json({
        success: false,
        message: "User limit reached or company not found.",
        err: "User limit reached or company not found.",
      });
    }
    const password = req.body.password;
    let hashedPassword = await bcrypt.hash(password, 10);

    console.log("hashedPassword", hashedPassword);
    console.log(req.body.passportIssueDate, " passport issues date..............")
    const newUser = new User({
      name: req.body.name,
      role: req.body.role,
      email: req.body.email.toLowerCase(),
      password: hashedPassword,
      isDeleted: req.body.isDeleted || false,
      companyId,
      reportingManagerId: req.body.reportingManagerId,
      contactNumber: req.body.contactNumber,
      alternateNumber: req.body.alternateNumber || "",
      gender: req.body.gender,
      dob: req.body.dob || "",
      isActive: req.body.isActive || true,
      isLocked: req.body.isLocked || false,
      dateOfJoining: req.body.dateOfJoining || "",
      designation: req.body.designation || "",
      bloodGroup: req.body.bloodGroup || "",
      currentAddress: req.body.currentAddress || "",
      permanentAddress: req.body.permanentAddress || "",
      panNo: req.body.panNo || "",
      addharNo: req.body.addharNo || "",
      passportNo: req.body.passportNo || "",
      passportName: req.body.passportName || "",
      passportissueDate: req.body.passportIssueDate || "",
      passportexpiryDate: req.body.passportexpiryDate || "",
      placeOfIssue: req.body.placeOfIssue || "",
      createdBy: req.body.createdBy || "",
      createdOn: new Date(),
      modifiedBy: req.body.createdBy || "",
      modifiedOn: new Date(),
      isGeoTrackingEnabled: req.body.isGeoTrackingEnabled
    });

    const role = await Role.findOne({ name: req.body.role });

    const savedUser = await newUser.save();

    await UserRole.deleteMany({ userId: savedUser._id });
    await UserRole.create({ roleId: role._id, userId: savedUser._id });

    const mailOptions = {
      from: config.from,
      to: savedUser.email,
      subject: "Project Management System - New Account Created",
      html: `Hi, <br> You are receiving this because your account has been created in the proPeak Management System.<br>
             Please reset your account password by clicking on the following link, ${config.link}.<br><br> Thanks, <br> proPeak Team`,
    };

    const userArr = {
      subject: mailOptions.subject,
      url: "",
      userId: savedUser._id,
    };

    await rabbitMQ.sendMessageToQueue(mailOptions, "message_queue", "msgRoute");
    addMyNotification(userArr);

    // Clear cached data for users
    cacheManager.clearCachedData("usersData");

    // Audit log for created user fields
    const fieldsToAudit = [
      "name",
      "role",
      "email",
      "companyId",
      "reportingManagerId",
      "contactNumber",
      "alternateNumber",
      "gender",
      "dob",
      "isActive",
      "isLocked",
      "dateOfJoining",
      "designation",
      "bloodGroup",
      "currentAddress",
      "permanentAddress",
      "panNo",
      "addharNo",
      "passportNo",
      "passportName",
      "passportissueDate",
      "passportexpiryDate",
      "placeOfIssue",
    ];

    fieldsToAudit.forEach((field) => {
      if (savedUser[field]) {
        audit.insertAuditLog(
          "",
          savedUser.name,
          "User",
          field,
          savedUser[field],
          req.userName,
          ""
        );
      }
    });

    // Assign default project
    const defaultProject = await Project.findOne({
      title: config.defaultProject,
    });
    if (defaultProject) {
      defaultProject.projectUsers.push({
        name: req.body.name,
        userId: savedUser._id,
      });
      await defaultProject.save();
    }

    // Update the company's user count
    company.numberOfUsers -= 1;
    await company.save();

    // Respond with the created user details
    res.json({
      success: true,
      message: "Successfully added!",
      result: {
        _id: savedUser._id,
        name: savedUser.name,
        role: savedUser.role,
        email: savedUser.email,
        isDeleted: savedUser.isDeleted,
        companyId: savedUser.companyId,
        reportingManagerId: savedUser.reportingManagerId,
        contactNumber: savedUser.contactNumber,
        alternateNumber: savedUser.alternateNumber,
        gender: savedUser.gender,
        dob: savedUser.dob,
        isActive: savedUser.isActive,
        isLocked: savedUser.isLocked,
        dateOfJoining: savedUser.dateOfJoining,
        designation: savedUser.designation,
        bloodGroup: savedUser.bloodGroup,
        currentAddress: savedUser.currentAddress,
        permanentAddress: savedUser.permanentAddress,
        panNo: savedUser.panNo,
        addharNo: savedUser.addharNo,
        passportNo: savedUser.passportNo,
        passportName: savedUser.passportName,
        passportissueDate: savedUser.passportissueDate,
        passportexpiryDate: savedUser.passportexpiryDate,
        placeOfIssue: savedUser.placeOfIssue,
        createdBy: savedUser.createdBy,
        createdOn: savedUser.createdOn,
        modifiedBy: savedUser.modifiedBy,
        modifiedOn: savedUser.modifiedOn,
      },
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res
      .status(500)
      .json({
        success: false,
        message: errors.REGISTER_GENERAL_ERROR,
        err: errors.REGISTER_GENERAL_ERROR,
      });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updatedUser = req.body;
    console.log(updatedUser, "updatedUser.................");

    if(req.body.name == "" || req.body.email == "" || req.body.password == "" || req.body.dob == ""){
      return res
        .status(400)
        .send("All fields marked with an asterisk (*) are mandatory.");
    }

    const oldResult = await User.findOneAndUpdate(
      { _id: updatedUser.id },
      updatedUser,
      { new: true, runValidators: true }
    );

    const role = await Role.findOne({ name: updatedUser.role });
    await UserRole.deleteMany({ userId: updatedUser.id });
    await UserRole.create({ roleId: role._id, userId: updatedUser.id });

    if (!oldResult) {
      console.error("User not found for ID:", updatedUser.id);
      return res.json({
        success: false,
        err: errors.USER_NOT_FOUND,
        message: "User not found.",
      });
    }
    const newResult = oldResult;

    const userIdToken = req.userInfo ? req.userInfo.userName : "Unknown User";

    const fieldsToAudit = [
      "name",
      "role",
      "email",
      "companyId",
      "reportingManagerId",
      "contactNumber",
      "alternateNumber",
      "gender",
      "dob",
      "isActive",
      "dateOfJoining",
      "designation",
      "bloodGroup",
      "currentAddress",
      "permanentAddress",
      "panNo",
      "addharNo",
      "passportNo",
      "passportName",
      // "passportissueDate",
      "passportIssueDate",
      "passportexpiryDate",
      "placeOfIssue",
    ];
    fieldsToAudit.forEach((field) => {
      if (oldResult[field] !== newResult[field]) {
        audit.insertAuditLog(
          oldResult[field],
          newResult.name,
          "User",
          field,
          newResult[field],
          userIdToken,
          ""
        );
      }
    });

    // Handle role changes

    res.json({
      success: true,
      message: "Successfully updated record!",
    });
  } catch (err) {
    console.error("Update User Error:", err);
    res.json({
      success: false,
      message: errors.LOGIN_GENERAL_ERROR,
      err: errors.LOGIN_GENERAL_ERROR,
    });
  }
};
exports.deleteUser = async (req, res) => {
  // Commented out authorization checks
  // let userRole = req.userInfo.userRole.toLowerCase();
  // let accessCheck = access.checkEntitlements(userRole);
  // if (accessCheck === false) {
  //   res.json({
  //     err: errors.NOT_AUTHORIZED,
  //   });
  //   return;
  // }

  const userId = req.body.id;

  try {
    // Find the user to be deleted and mark as deleted
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { isDeleted: true } },
      { new: true } // Returns the updated document
    );
    console.log(user, "user....");
    // If the user is not found
    if (!user) {
      return res.json({
        success: false,
        err: errors.USER_NOT_FOUND,
        message: "User not found.",
      });
    }

    // Update the company's numberOfUsers, decrementing it
    await Company.findByIdAndUpdate(user.companyId, {
      $inc: { numberOfUsers: -1 }, // Decrement since the user is being deleted
    });

    // Clear cached user data
    cacheManager.clearCachedData("usersData");

    // Remove all user tokens
    await tokenController.removeUserTokens(userId); // Ensure this is awaited if it returns a promise

    const userIdToken = req.userInfo ? req.userInfo.userName : "Unknown User"; // Safeguard against undefined userInfo
    const field = "name"; // Specify the field you want to log

    // Insert audit log for deletion
    audit.insertAuditLog(
      false,
      user.name,
      "User",
      field,
      user[field],
      userIdToken,
      ""
    );

    // Respond with success message
    res.json({
      success: true,
      message: "User has been deleted.",
      result: {
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Delete User Error:", err); // Log the error for debugging
    res.json({
      success: false,
      err: errors.LOGIN_GENERAL_ERROR_DELETE,
      message: "An error occurred while deleting the user.",
    });
  }
};

exports.getProfilePicture = (req, res) => {
  User.findOne(
    {
      _id: req.body.userId,
    },
    {
      profilePicture: 1,
    }
  )
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.json({
        err: errors.LOGIN_GENERAL_ERROR,
      });
    });
};

exports.checkUser = async (req, res) => {
  try {
    console.log("BODY", req.body);
    const user = await User.findOne({ email: req.body.email })
    .select('_id email companyId isActive')
    .lean();
    if (user) {
      return res.json({ success: true, user: user });
    } else {
      return res.json({ success: false, err: "User Not Found" });
    }
  } catch (e) {
    return res.json({ success: false });
  }
};

// const mongoose = require("mongoose");
// const User = require("../../models/user/user-model");
// var bodyParser = require("body-parser");
// const uuidv4 = require("uuid/v4");
// const secret = require("../../config/secret");
// const crypto = require("crypto");
// const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");
// const async = require("async");
// const ProjectUsers = require("../../models/project/project-user-model");
// const config = require("../../config/config");
// const audit = require("../audit-log/audit-log-controller");
// const Project = require("../../models/project/project-model");
// const AccessRight = require("../../models/access-right/access-right-model");
// const { sendEmail } = require("../../common/mailer");
// const { addMyNotification } = require("../../common/add-my-notifications");
// const {
//   generateAccessToken,
//   generateRefreshToken,
//   decodeToken,
// } = require("../../verify-token/token-management");
// const { ACCESS_TOKEN, REFRESH_TOKEN } = require("../../common/const");
// const Token = require("../../models/Token/token");
// const tokenController = require("../token/token-controller");
// const access = require("../../check-entitlements");
// const sortData = require("../../common/common");
// const DefaultAppLevelAccessRight = require("../../models/access-right/defaultapplevelaccessright-model");
// // const DefaultProjectAssign = require('../../models/project/project-model');
// // const ProjectUserSchema = require('../../models/project/project-user-model');
// const AppLevelAccessRight = require("../../models/access-right/applevelaccessright-model");
// const { logError, logInfo } = require("../../common/logger");
// const cacheManager = require("../../redis");
// const rabbitMQ = require("../../rabbitmq");
// // const objectId = require('../../common/common');
// const Company = require("../../models/company/company-model");

// const errors = {
//   REGISTER_EMAIL_TAKEN: "Email is unavailable",
//   RESET_PASSWORD: "An error has occured while reseting password",
//   REGISTER_GENERAL_ERROR: "An error has occured while adding/updating user",
//   LOGIN_INVALID: "Invalid Email/Password combination",
//   LOGIN_GENERAL_ERROR: "Invalid user credentials",
//   RESET_EXPIRE: "Your link has expired, kindly reset again",
//   PASSWORDS_DONT_MATCH: "Passwords do not match",
//   LOGIN_GENERAL_ERROR_DELETE: "An error has occured while deleting user",
//   NOT_AUTHORIZED: "Your are not authorized",
// };

// exports.getUser = (req, res) => {
//   //res.setHeader(ACCESS_TOKEN, req.token);
//   let userRole = req.userInfo.userRole.toLowerCase();
//   let accessCheck = access.checkEntitlements(userRole);
//   if (accessCheck === false) {
//     res.json({
//       err: errors.NOT_AUTHORIZED,
//     });
//     return;
//   }
//   User.findOne(
//     {
//       _id: req.params.id,
//     },
//     {
//       _id: 1,
//       name: 1,
//       email: 1,
//       role: 1,
//       isDeleted: 1,
//       companyId: 1,
//       reportingManagerId: 1,
//       contactNumber: 1,
//       alternateNumber: 1,
//       gender: 1,
//       dob: 1,
//       isActive: 1,
//       isLocked: 1,
//       dateOfJoining: 1,
//       designation: 1,
//       bloodGroup: 1,
//       currentAddress: 1,
//       permanentAddress: 1,
//       panNo: 1,
//       addharNo: 1,
//       passportNo: 1,
//       passportName: 1,
//       passportissueDate: 1,
//       passportexpiryDate: 1,
//       placeOfIssue: 1,
//       createdBy: 1,
//       createdOn: 1,
//       modifiedBy: 1,
//       modifiedOn: 1,
//     }
//   )
//     .then((result) => {
//       res.json(result);
//     })
//     .catch((err) => {
//       res.json({
//         err: errors.LOGIN_GENERAL_ERROR,
//       });
//     });
// };

// // exports.getUsers = async (req, res) => {
// //   var cachedData = await cacheManager.getCachedData("usersData");
// //   console.log("cachedData", cachedData);
// //   if (!!cachedData) {
// //     if (cachedData.length > 0) {
// //       res.json(cachedData);
// //       return;
// //     }
// //   }

// //   User.find(
// //     {
// //       isDeleted: false,
// //     },
// //     {
// //       _id: 1,
// //       name: 1,
// //       email: 1,
// //       role: 1,
// //       //isDeleted: 1,
// //       companyId: 1,
// //       reportingManagerId: 1,
// //       contactNumber: 1,
// //       alternateNumber: 1,
// //       gender: 1,
// //       dob: 1,
// //       // isActive: 1,
// //       // isLocked: 1,
// //       dateOfJoining: 1,
// //       designation: 1,
// //       bloodGroup: 1,
// //       currentAddress: 1,
// //       permanentAddress: 1,
// //       panNo: 1,
// //       addharNo: 1,
// //       passportNo: 1,
// //       passportName: 1,
// //       passportissueDate: 1,
// //       passportexpiryDate: 1,
// //       placeOfIssue: 1,
// //       createdBy: 1,
// //       createdOn: 1,
// //       modifiedBy: 1,
// //       modifiedOn: 1,
// //     }
// //   ) //.sort({name: 1})
// //     .then((result) => {
// //       // console.log("result", result);
// //       cacheManager.setCachedData("usersData", result);
// //       res.json(result);
// //     })
// //     .catch((err) => {
// //       res.json({
// //         err: errors.LOGIN_GENERAL_ERROR,
// //       });
// //     });
// // };

// //  Create a new user - post request

// exports.getUsers = async (req, res) => {
//   const userRole = req.userInfo.userRole.toLowerCase();
//   const userCompanyId = req.userInfo.companyId;

//   console.log("User Role:", userRole); // Log the user's role
//   console.log("User Company ID:", userCompanyId); // Log the user's company ID

//   try {
//     let query;

//     // Determine query based on user role
//     if (userRole === "admin" || userRole === "support") {
//       // Admin and support can see all users
//       query = { isDeleted: false };
//       //console.log("Query for Admin/Support:", query);
//     } else if (userRole === "owner" || userRole === "user") {
//       // Owner or user can see only users from their own company
//       query = {
//         isDeleted: false,
//         companyId: userCompanyId,
//       };
//       //console.log("Query for Owner/User:", query);
//     } else {
//       console.log("Access denied for role:", userRole);
//       return res.status(403).json({ success: false, msg: "Access denied." });
//     }

//     // Create a cache key unique to the user's role and company
//     const cacheKey = `usersData_${userRole}_${userCompanyId}`;

//     // Check for cached data based on the cache key
//     // var cachedData = await cacheManager.getCachedData(cacheKey);
//     // console.log("Cached Data:", cachedData); // Log cached data
//     // if (!!cachedData && cachedData.length > 0) {
//     //   console.log("Returning cached data.");
//     //   return res.json(cachedData);
//     // }

//     // Fetch users based on query
//     const result = await User.find(query, {
//       _id: 1,
//       name: 1,
//       email: 1,
//       role: 1,
//       companyId: 1,
//       reportingManagerId: 1,
//       contactNumber: 1,
//       alternateNumber: 1,
//       gender: 1,
//       dob: 1,
//       dateOfJoining: 1,
//       designation: 1,
//       bloodGroup: 1,
//       currentAddress: 1,
//       permanentAddress: 1,
//       panNo: 1,
//       addharNo: 1,
//       passportNo: 1,
//       passportName: 1,
//       passportissueDate: 1,
//       passportexpiryDate: 1,
//       placeOfIssue: 1,
//       createdBy: 1,
//       createdOn: 1,
//       modifiedBy: 1,
//       modifiedOn: 1,
//     });

//     // console.log("Query Result:", result); // Log the result from the database

//     // Cache and return results, using the specific cache key
//     cacheManager.setCachedData(cacheKey, result);
//     console.log("Cached data set successfully.");

//     return res.json(result);
//   } catch (err) {
//     console.error("Error fetching users:", err); // Log the error for debugging
//     return res.status(500).json({
//       success: false,
//       msg: `Something went wrong. ${err.message}`,
//     });
//   }
// };

// exports.postAddUser = async (req, res) => {
//   try {
//     //res.setHeader(ACCESS_TOKEN, req.token);
//     let userRole = req.userInfo.userRole.toLowerCase();
//     // console.log('req.body',req.body);
//     let accessCheck = access.checkEntitlements(userRole);
//     if (accessCheck === false) {
//       res.json({
//         err: errors.NOT_AUTHORIZED,
//       });
//       return;
//     }

//     // Retrieve the company document based on companyId
//     const companyId = req.body.companyId; // Ensure companyId is passed in the request
//     const company = await Company.findById(companyId); // Assuming Company is your model for the company collection

//     if (!company || company.numberOfUsers == 0) {
//       return res.json({ err: "User limit reached or company not found." });
//     }

//     // let userId = objectId.mongoObjectId();
//     let newUser = new User({
//       // _id: userId,
//       name: req.body.name,
//       role: req.body.role,
//       email: req.body.email.toLowerCase(),
//       password: req.body.password,
//       isDeleted: req.body.isDeleted,
//       companyId: req.body.companyId,
//       reportingManagerId: req.body.reportingManagerId,
//       contactNumber: req.body.contactNumber,
//       alternateNumber: req.body.alternateNumber,
//       gender: req.body.gender,
//       dob: req.body.dob,
//       isActive: req.body.isActive,
//       isLocked: req.body.isLocked,
//       dateOfJoining: req.body.dateOfJoining,
//       designation: req.body.designation,
//       bloodGroup: req.body.bloodGroup,
//       currentAddress: req.body.currentAddress,
//       permanentAddress: req.body.permanentAddress,
//       panNo: req.body.panNo,
//       addharNo: req.body.addharNo,
//       passportNo: req.body.passportNo,
//       passportName: req.body.passportName,
//       passportissueDate: req.body.passportissueDate,
//       passportexpiryDate: req.body.passportexpiryDate,
//       placeOfIssue: req.body.placeOfIssue,
//       createdBy: req.body.createdBy,
//       createdOn: req.body.createdOn,
//       modifiedBy: req.body.modifiedBy,
//       modifiedOn: req.body.modifiedOn,
//     });
//     console.log("newUser", newUser);
//     newUser
//       .save()
//       .then((result) => {
//         var mailOptions = {
//           from: config.from,
//           to: newUser.email,
//           subject: "Project Management System -new Account created",
//           html:
//             "Hi, <br> You are receiving this because your account has been created in the proPeak Management System.<br>" +
//             "Please reset your account password by clicking on the following link, " +
//             config.link +
//             "<br><br> Thanks, <br> proPeak Team",
//         };

//         let userArr = {
//           subject: mailOptions.subject,
//           url: "",
//           userId: result._id,
//         };

//         rabbitMQ
//           .sendMessageToQueue(mailOptions, "message_queue", "msgRoute")
//           .then((resp) => {
//             console.log(resp);
//             logInfo("user add mail message sent to the message_queue:" + resp);
//             addMyNotification(userArr);
//           });
//         // console.log('result', result)
//         cacheManager.clearCachedData("usersData");
//         let userIdToken = req.userInfo.userName;
//         let fields = [];
//         var res1 = Object.assign({}, result);
//         for (let keys in res1._doc) {
//           if (
//             keys === "name" ||
//             keys === "role" ||
//             keys === "email" ||
//             keys === "companyId" ||
//             keys === "reportingManagerId" ||
//             keys === "contactNumber" ||
//             keys === "alternateNumber" ||
//             keys === "gender" ||
//             keys === "dob" ||
//             keys === "isActive" ||
//             keys === "isLocked" ||
//             keys === "dateOfJoining" ||
//             keys === "designation" ||
//             keys === "bloodGroup" ||
//             keys === "currentAddress" ||
//             keys === "permanentAddress" ||
//             keys === "panNo" ||
//             keys === "addharNo" ||
//             keys === "passportNo" ||
//             keys === "passportName" ||
//             keys === "passportissueDate" ||
//             keys === "passportexpiryDate" ||
//             keys === "placeOfIssue"
//           ) {
//             fields.push(keys);
//           }
//         }

//         fields.filter((field) => {
//           if (
//             result[field] !== "" &&
//             result[field] !== null &&
//             result[field] !== undefined
//           )
//             audit.insertAuditLog(
//               "",
//               result.name,
//               "User",
//               field,
//               result[field],
//               userIdToken,
//               ""
//             );
//         });

//         //Application level access wire save
//         DefaultAppLevelAccessRight.find({
//           userRole: result.role,
//         })
//           .then((result1) => {
//             //  console.log("result1",result1);
//             var defaultAppLevelAccessRight = [];
//             for (let i = 0; i < result1.length; i++) {
//               let newAccessRight = {
//                 userId: result._id,
//                 entitlementId: result1[i].entitlement,
//                 group: result1[i].group,
//                 access: true,
//                 createdBy: "",
//                 createdOn: new Date(),
//                 isDeleted: false,
//               };
//               defaultAppLevelAccessRight.push(newAccessRight);
//             }
//             if (defaultAppLevelAccessRight.length > 0) {
//               // console.log("defaultAppLevelAccessRight",defaultAppLevelAccessRight);
//               AppLevelAccessRight.insertMany(defaultAppLevelAccessRight)
//                 .then((result2) => {
//                   // console.log("result2",result2);
//                   logInfo(result2.length, "setUserAccessRights result");

//                   res.json({
//                     success: true,
//                     msg: `Successfully added!`,
//                     result: {
//                       _id: result._id,
//                       name: result.name,
//                       role: result.role,
//                       email: result.email,
//                       isDeleted: result.isDeleted,
//                       companyId: result.companyId,
//                       reportingManagerId: result.reportingManagerId,
//                       contactNumber: result.contactNumber,
//                       alternateNumber: result.alternateNumber,
//                       gender: result.gender,
//                       dob: result.dob,
//                       isActive: result.isActive,
//                       isLocked: result.isLocked,
//                       dateOfJoining: result.dateOfJoining,
//                       designation: result.designation,
//                       bloodGroup: result.bloodGroup,
//                       currentAddress: result.currentAddress,
//                       permanentAddress: result.permanentAddress,
//                       panNo: result.panNo,
//                       addharNo: result.addharNo,
//                       passportNo: result.passportNo,
//                       passportName: result.passportName,
//                       passportissueDate: result.passportissueDate,
//                       passportexpiryDate: result.passportexpiryDate,
//                       placeOfIssue: result.placeOfIssue,
//                       createdBy: result.createdBy,
//                       createdOn: result.createdOn,
//                       modifiedBy: result.modifiedBy,
//                       modifiedOn: result.modifiedOn,
//                     },
//                   });
//                 })
//                 .catch((err) => {
//                   logError(err, "setUserAccessRights err");
//                 });
//             }

//             //Default project Assign
//             Project.find({
//               title: config.defaultProject,
//             })
//               .then((result2) => {
//                 let projectuser = {
//                   name: req.body.name,
//                   userId: result._id,
//                 };

//                 console.log(result2[0].projectUsers.length);
//                 if (result2[0].projectUsers.length > 0) {
//                   result2[0].projectUsers.push(projectuser);
//                   try {
//                     result2[0]
//                       .save()
//                       .then(function (result3) {
//                         console.log(result3);
//                       })
//                       .catch((err) => {
//                         console.log(err);
//                       });
//                   } catch (e) {
//                     console.log(e);
//                   }
//                 }
//               })
//               .catch((err) => {
//                 // console.log(err);
//               });
//           })
//           .catch((err) => {
//             // console.log(err);
//           });
//       })
//       .catch((err) => {
//         if (err.errors) {
//           res.json({
//             err: errors.REGISTER_GENERAL_ERROR,
//           });
//         }
//       });

//     company.numberOfUsers -= 1;
//     await company.save();
//   } catch (e) {
//     console.log("user add error", e);
//   }
// };

// exports.updateUser = (req, res) => {
//   let userRole = req.userInfo.userRole.toLowerCase();
//   let accessCheck = access.checkEntitlements(userRole);
//   if (accessCheck === false) {
//     res.json({
//       err: errors.NOT_AUTHORIZED,
//     });
//     return;
//   }
//   let updatedUser = req.body;
//   User.findOneAndUpdate(
//     {
//       _id: updatedUser._id,
//     },
//     updatedUser
//   )
//     .then((oldResult) => {
//       User.findOne({
//         _id: updatedUser._id,
//       })
//         .then((newResult) => {
//           cacheManager.clearCachedData("usersData");
//           let userIdToken = req.userInfo.userName;

//           let fields = [];
//           var res1 = Object.assign({}, oldResult);
//           for (let keys in res1._doc) {
//             if (
//               keys === "name" ||
//               keys === "role" ||
//               keys === "email" ||
//               keys === "companyId" ||
//               keys === "reportingManagerId" ||
//               keys === "contactNumber" ||
//               keys === "alternateNumber" ||
//               keys === "gender" ||
//               keys === "dob" ||
//               keys === "isActive" ||
//               keys === "dateOfJoining" ||
//               keys === "designation" ||
//               keys === "bloodGroup" ||
//               keys === "currentAddress" ||
//               keys === "permanentAddress" ||
//               keys === "panNo" ||
//               keys === "addharNo" ||
//               keys === "passportNo" ||
//               keys === "passportName" ||
//               keys === "passportissueDate" ||
//               keys === "passportexpiryDate" ||
//               keys === "placeOfIssue"
//             ) {
//               fields.push(keys);
//             }
//           }

//           fields.filter((field) => {
//             if (oldResult[field] !== newResult[field]) {
//               audit.insertAuditLog(
//                 oldResult[field],
//                 newResult.name,
//                 "User",
//                 field,
//                 newResult[field],
//                 userIdToken,
//                 ""
//               );
//             }
//           });

//           if (req.body.isActive === false) {
//             tokenController.removeUserTokens(updatedUser._id);
//           }

//           if (oldResult.role !== newResult.role) {
//             AppLevelAccessRight.deleteMany(
//               {
//                 userId: updatedUser._id,
//               },
//               {
//                 lean: true,
//               }
//             ).then((result) => {
//               // console.log("result",result);

//               DefaultAppLevelAccessRight.find({
//                 userRole: updatedUser.role,
//               }).then((result1) => {
//                 //  console.log("result1",result1);
//                 var defaultAppLevelAccessRight = [];
//                 for (let i = 0; i < result1.length; i++) {
//                   let newAccessRight = {
//                     userId: updatedUser._id,
//                     entitlementId: result1[i].entitlement,
//                     group: result1[i].group,
//                     access: true,
//                     createdBy: "",
//                     createdOn: new Date(),
//                     isDeleted: false,
//                   };
//                   defaultAppLevelAccessRight.push(newAccessRight);
//                 }
//                 if (defaultAppLevelAccessRight.length > 0) {
//                   AppLevelAccessRight.insertMany(defaultAppLevelAccessRight)
//                     .then((result2) => {
//                       logInfo(result2.length, "setUserAccessRights result");

//                       res.json({
//                         success: true,
//                         msg: `Successfully updated record!`,
//                       });
//                       // res.json({ msg: "Access Rights updated successfully" })
//                     })
//                     .catch((err) => {
//                       logError(err, "setUserAccessRights err");
//                     });
//                 }
//               });
//             });
//           } else {
//             res.json({
//               success: true,
//               msg: `Successfully updated record!`,
//             });
//           }
//         })
//         .catch((err) => {
//           res.json({
//             err: errors.LOGIN_GENERAL_ERROR,
//           });
//           return;
//         });
//     })
//     .catch((err) => {
//       if (err.errors) {
//         // Show failed if all else fails for some reasons
//         res.json({
//           err: errors.LOGIN_GENERAL_ERROR,
//         });
//       }
//     });
// };

// // exports.deleteUser = (req, res) => {
// //   let userRole = req.userInfo.userRole.toLowerCase();
// //   let accessCheck = access.checkEntitlements(userRole);
// //   if (accessCheck === false) {
// //     res.json({
// //       err: errors.NOT_AUTHORIZED,
// //     });
// //     return;
// //   }
// //   // console.log("req.body",req.body.id);
// //   let userId = req.body.id;

// //   User.findOneAndUpdate(
// //     {
// //       _id: userId,
// //     },
// //     {
// //       $set: {
// //         isDeleted: true,
// //       },
// //     },
// //     {
// //       new: true,
// //     }
// //   )
// //     .then((result) => {
// //       cacheManager.clearCachedData("usersData");
// //       let token = req.headers.token;

// //       //Remove all user tokens
// //       tokenController.removeUserTokens(userId);
// //       //End Remove all user tokens

// //       let userIdToken = req.userInfo.userName;
// //       let field = "";
// //       var res1 = Object.assign({}, result);
// //       for (let keys in res1._doc) {
// //         if (keys === "name") {
// //           field = keys;
// //         }
// //       }
// //       audit.insertAuditLog(
// //         false,
// //         result.name,
// //         "User",
// //         field,
// //         result[field],
// //         userIdToken,
// //         ""
// //       );

// //       res.json({
// //         success: true,
// //         msg: `It has been deleted.`,
// //         result: {
// //           name: result.name,
// //         },
// //       });
// //     })
// //     .catch((err) => {
// //       res.json({
// //         err: errors.LOGIN_GENERAL_ERROR_DELETE,
// //       });
// //     });
// // };

// exports.deleteUser = async (req, res) => {
//   let userRole = req.userInfo.userRole.toLowerCase();
//   let accessCheck = access.checkEntitlements(userRole);
//   if (accessCheck === false) {
//     res.json({
//       err: errors.NOT_AUTHORIZED,
//     });
//     return;
//   }

//   let userId = req.body.id;

//   try {
//     // Find the user to be deleted
//     const user = await User.findOneAndUpdate(
//       { _id: userId },
//       { $set: { isDeleted: true } },
//       { new: true }
//     );

//     // If user is not found
//     if (!user) {
//       return res.json({
//         err: errors.USER_NOT_FOUND,
//       });
//     }

//     // Update company's numberOfUsers
//     await Company.findByIdAndUpdate(user.companyId, {
//       $inc: { numberOfUsers: 1 },
//     });

//     // Clear cached user data
//     cacheManager.clearCachedData("usersData");

//     // Remove all user tokens
//     tokenController.removeUserTokens(userId);

//     let userIdToken = req.userInfo.userName;
//     let field = "";
//     var res1 = Object.assign({}, user);
//     for (let keys in res1._doc) {
//       if (keys === "name") {
//         field = keys;
//       }
//     }
//     audit.insertAuditLog(
//       false,
//       user.name,
//       "User",
//       field,
//       user[field],
//       userIdToken,
//       ""
//     );

//     res.json({
//       success: true,
//       msg: `User has been deleted.`,
//       result: {
//         name: user.name,
//       },
//     });
//   } catch (err) {
//     res.json({
//       err: errors.LOGIN_GENERAL_ERROR_DELETE,
//     });
//   }
// };

// exports.getProfilePicture = (req, res) => {
//   User.findOne(
//     {
//       _id: req.body.userId,
//     },
//     {
//       profilePicture: 1,
//     }
//   )
//     .then((result) => {
//       res.json(result);
//     })
//     .catch((err) => {
//       res.json({
//         err: errors.LOGIN_GENERAL_ERROR,
//       });
//     });
// };
