const mongoose = require("mongoose");
const Company = require("../../models/company/company-model.js");
const userModel = require("../../models/user/user-model.js");
const { companyCode } = require("../../config/config.js");

// Create a Company
exports.createCompany = async (req, res) => {
  // console.log("company.........................")
  try {
    const {
      companyName,
      companyCode,
      country,
      address,
      contact,
      numberOfUsers,
      trackingInterval,
      logo
    } = req.body;
    // console.log(req.body, "request body response ");
    // Validate required fields
    if (!companyName || !companyCode) {
      return res.status(400).json({
        success: false,
        error: "Company name and company code are required.",
      });
    }

    const newCompany = new Company({
      companyName,
      companyCode,
      country,
      address,
      contact,
      numberOfUsers,
      trackingInterval,
      isDeleted: false, // Set default value for isDeleted
      logo
    });

    await newCompany.save();
    return res.status(201).json({ success: true, company: newCompany });
  } catch (error) {
    console.error("Error creating company:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get all Companies
exports.getAllCompanies = async (req, res) => {
  const query = req.query.q;
  try {
    const result = await Company.aggregate([
      {
        $match: {
          isDeleted: false,
          ...(query && {
            companyName: { $regex: query, $options: "i" }
          })
        }
      },
      {
        $lookup: {
          from: "users",
          let: { companyId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $toObjectId: "$companyId" }, "$$companyId"] },
                    { $ne: ["$isDeleted", true] }
                  ]
                }
              }
            }
          ],
          as: "users"
        }
      },
      {
        $addFields: {
          userCount: { $size: "$users" }
        }
      },
      {
        $project: {
          _id: 1,
          companyName: 1,
          companyCode: 1,
          userCount: 1,
          createdAt: 1 
        }
      }
    ]);

    if (result.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "No companies found." });
    }

    return res.status(200).json({ success: true, companies: result });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load companies." });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const { id: companyId } = req.params;
    console.log(req.params, "Request Params"); // Log incoming params
    console.log(companyId, "companyId");

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid Company ID." });
    }

    const company = await Company.findOne({ _id: companyId, isDeleted: false });
    console.log(company, "company....");

    if (!company) {
      return res
        .status(404)
        .json({ success: false, error: "Company not found." });
    }

    return res.status(200).json({ success: true, companies: [company] });
  } catch (error) {
    console.error("Error fetching company:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load company." });
  }
};

// Update a Company
exports.updateCompany = async (req, res) => {
  console.log("is companies UPDATE coming");
  const { id } = req.body;
  console.log("Attempting to delete company with ID:", id);
  try {
    // const { id } = req.params;
    const updatedCompany = await Company.findOneAndUpdate(
      { _id: id, isDeleted: false }, // Exclude deleted company
      req.body,
      { new: true }
    );

    if (!updatedCompany) {
      return res
        .status(404)
        .json({ success: false, error: "Company not found." });
    }

    return res.status(200).json({ success: true, company: updatedCompany });
  } catch (error) {
    console.error("Error updating company:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteCompany = async (req, res) => {
  console.log("is companies delete coming");
  const { id } = req.body;
  console.log("Attempting to delete company with ID:", id);

  try {
      const deletedCompany = await Company.findOneAndUpdate(
        { _id: id },
        { isDeleted: true },
        { new: true }
      );

        console.log(deletedCompany, "deletedCompany............");

        if (!deletedCompany) {
          return res
            .status(404)
            .json({ success: false, error: "Company not found." });
      }
    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting company:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get Companies by Email (modify as per your requirements)
exports.getCompaniesByEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "Email is required." });
    }
    const users = await userModel.find({email: email})
    

    // Extract all unique org_ids from the user's documents
    const companyIds = [...new Set(users.map((user) => user.companyId))];

    // Find all organization documents that match the org_ids
    const companies = await Company.find({ _id: { $in: companyIds } })
    
    console.log(companies)
    // Assuming contact field holds email

    if (companies.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "No companies found with this email." });
    }

    return res.status(200).json({ success: true, companies });
  } catch (error) {
    console.error("Error fetching companies by email:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load companies." });
  }
};

// const mongoose = require("mongoose");
// const Company = require("../../models/company/company-model");
// const User = require("../../models/user/user-model");
// const jwt = require("jsonwebtoken");
// const { logError, logInfo } = require("../../common/logger");
// const access = require("../../check-entitlements");
// const sortData = require("../../common/common");
// const cacheManager = require("../../redis");
// const { Observable } = require("rxjs/Observable");
// const { bindNodeCallback } = require("rxjs/observable/bindNodeCallback");
// const { fromPromise } = require("rxjs/observable/fromPromise");
// const errors = {
//   COMPANY_DOESNT_EXIST: "Company does not exist",
//   ADDCOMPANYERROR: "Error occurred while adding the company",
//   EDITCOMPANYERROR: "Error occurred while updating the company",
//   DELETECOMPANYERROR: "Error occurred while deleting the company",
//   NOT_AUTHORIZED: "Your are not authorized",
// };

// exports.getAllCompanies = async (req, res) => {
//   const userRole = req.userInfo.userRole.toLowerCase();
//   const userCompanyId = req.userInfo.companyId;

//   const cachedData = await cacheManager.getCachedData("companyData");

//   try {
//     let query;

//     // Determine query based on user role
//     if (userRole === "admin" || userRole === "support") {
//       // Admin and support can see all companies
//       query = { isDeleted: false };
//     } else if (userRole === "owner" || userRole === "user") {
//       // If the user is an owner or user, they see only their own company
//       query = {
//         isDeleted: false,
//         _id: userCompanyId, // This will return the specific company for the owner or user
//       };
//     } else {
//       return res.status(403).json({ success: false, msg: "Access denied." });
//     }

//     // Fetch companies from the database
//     const result = await Company.find(query);

//     // If no results are found for non-admin and owner users
//     if (result.length === 0) {
//       if (
//         (userRole === "owner" || userRole === "user") &&
//         cachedData &&
//         cachedData.length > 0
//       ) {
//         // Return cached data if user is owner or user and no results found
//         return res.json(cachedData);
//       }
//       return res.status(404).json({ success: false, msg: "No company found." });
//     }

//     // If the user is an admin or support and there's cached data, update it
//     if (
//       (userRole === "admin" || userRole === "support") &&
//       cachedData &&
//       cachedData.length > 0
//     ) {
//       cacheManager.setCachedData("companyData", result);
//     } else if (cachedData && cachedData.length > 0) {
//       // Avoid returning cached data if new results are found for owner or user
//       return res.json(result);
//     }

//     // Sort result and cache it for future requests
//     sortData.sort(result, "companyName");
//     cacheManager.setCachedData("companyData", result);

//     return res.json(result);
//   } catch (err) {
//     console.error("Error occurred:", err); // Log the error for debugging
//     return res
//       .status(500)
//       .json({ success: false, msg: `Something went wrong. ${err.message}` });
//   }
// };

// //Get CompanyById
// exports.getCompanyById = (req, res) => {
//   let userRole = req.userInfo.userRole.toLowerCase();
//   let accessCheck = access.checkEntitlements(userRole);
//   if (accessCheck === false) {
//     res.json({ err: errors.NOT_AUTHORIZED });
//     return;
//   }
//   Company.find({ _id: req.params.id }).then((result) => {
//     res.json({
//       data: result,
//     });
//   });
// };

// // CREATE
// exports.createCompany = (req, res) => {
//   try {
//     let userRole = req.userInfo.userRole.toLowerCase();
//     let accessCheck = access.checkEntitlements(userRole);
//     if (accessCheck === false) {
//       res.json({ err: errors.NOT_AUTHORIZED });
//       return;
//     }
//     logInfo(req.body, "createCompany");

//     req.body.numberOfUsers =
//       req.body.numberOfUsers && req.body.numberOfUsers >= 0
//         ? req.body.numberOfUsers
//         : null;

//     let newCompany = new Company(req.body);
//     newCompany
//       .save()
//       .then((result) => {
//         cacheManager.clearCachedData("companyData");
//         logInfo(result, "createCompany result");
//         res.json({
//           success: true,
//           msg: `Successfully added!`,
//           result: result,
//         });
//       })
//       .catch((err) => {
//         if (err.errors) {
//           res.json({ err: errors.ADDCOMPANYERROR });
//         }
//       });
//   } catch (e) {
//     logError(e, "createCompany e");
//   }
// };

// exports.deleteCompany = (req, res) => {
//   try {
//     let userRole = req.userInfo.userRole.toLowerCase();
//     let accessCheck = access.checkEntitlements(userRole);
//     if (accessCheck === false) {
//       res.json({ err: errors.NOT_AUTHORIZED });
//       return;
//     }
//     logInfo(req.body, "deleteCompany");
//     let updatedCompany = req.body;
//     Company.findOneAndUpdate(
//       { _id: updatedCompany[0]._id },
//       { $set: { isDeleted: updatedCompany[0].isDeleted } }
//     )
//       .then((result) => {
//         cacheManager.clearCachedData("companyData");
//         logInfo(result, "deleteCompany result");
//         res.json({
//           success: true,
//           msg: `Successfully Updated!`,
//           result: result,
//         });
//       })
//       .catch((err) => {
//         if (err.errors) {
//           res.json({ err: errors.DELETECOMPANYERROR });
//         }
//       });
//   } catch (e) {
//     logError(e, "deleteCompany e");
//   }
// };

// exports.updateCompany = (req, res) => {
//   try {
//     let userRole = req.userInfo.userRole.toLowerCase();
//     let accessCheck = access.checkEntitlements(userRole);
//     if (accessCheck === false) {
//       res.json({ err: errors.NOT_AUTHORIZED });
//       return;
//     }
//     let updatedcompany = req.body;
//     logInfo(req.body, "updateCompany");

//     if (updatedcompany.numberOfUsers && updatedcompany.numberOfUsers < 0) {
//       updatedcompany.numberOfUsers = null;
//     }

//     Company.findOneAndUpdate({ _id: req.body._id }, updatedcompany)
//       .then((result) => {
//         cacheManager.clearCachedData("companyData");
//         logInfo(result, "updateCompany result");
//         res.json({
//           success: true,
//           msg: `Successfully Updated!`,
//           result: result,
//         });
//       })
//       .catch((err) => {
//         if (err.errors) {
//           res.json({ err: errors.EDITCOMPANYERROR });
//         }
//       });
//   } catch (e) {
//     logError(e, "updateCompany e");
//   }
// };

// exports.getCompaniesByEmail = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Find all users with the specified userName
//     const users = await User.find({ email: email });

//     // Extract all unique org_ids from the user's documents
//     const companyIds = [
//       ...new Set(
//         users.map((user) => new mongoose.Types.ObjectId(user.companyId))
//       ),
//     ];

//     // Find all organization documents that match the org_ids
//     const companies = await Company.find({ _id: { $in: companyIds } });

//     return res.json(companies);
//   } catch (error) {
//     console.error("Error fetching organizations:", error);
//     return res
//       .status(500)
//       .json({ error: "An error occurred while fetching organizations." });
//   }
// };
