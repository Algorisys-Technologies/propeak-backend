const Account = require("../../models/account/account-model");
const { logError, logInfo } = require("../../common/logger");
const cacheManager = require("../../redis");
const errors = {
  ACCOUNT_DOESNT_EXIST: "Account does not exist",
  ADDACCOUNTERROR: "Error occurred while adding the account",
  EDITACCOUNTERROR: "Error occurred while updating the account",
  DELETEACCOUNTERROR: "Error occurred while deleting the account",
  NOT_AUTHORIZED: "You are not authorized",
};
//paginantion logic
// exports.getAllAccounts = async (req, res) => {
//   const userId = req.userInfo.userId;
//   const userRole = req.userInfo.userRole.toLowerCase();

//   if (!userId || !userRole) {
//     return res.status(403).json({ success: false, msg: 'Not authorized' });
//   }

//   try {
//     const companyId = req.userInfo.companyId;
//     if (!companyId) {
//       return res.status(403).json({ success: false, msg: 'Company validation failed' });
//     }

//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     // Log pagination details
//     console.log(`Page: ${page}, Limit: ${limit}, Skip: ${skip}`);

//     // Fetch cached data
//     let cachedData = await cacheManager.getCachedData("categoryData");

//     if (cachedData) {
//       console.log("Cached data found:", cachedData);
//       return res.json(cachedData);  // Return cached data if available
//     }

//     // Fetch accounts from the database
//     const [accounts, totalCount] = await Promise.all([
//       Account.find({ companyId }).skip(skip).limit(limit).exec(),
//       Account.countDocuments({ companyId }).exec(),
//     ]);

//     console.log(`Accounts fetched: ${accounts.length}`);

//     // Set the fetched accounts into cache
//     await cacheManager.setCachedData("categoryData", { accounts, totalCount });
//     console.log("Data has been cached");

//     // Send response
//     res.json({
//       accounts,
//       totalCount,
//       totalPages: Math.ceil(totalCount / limit),
//       currentPage: page,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
//   }
// };

// Fetch all accounts associated with the user's company
// exports.getAllAccounts = async (req, res) => {
//   console.log("is this coming here ????")
//   try {
//     const { companyId } = req.body;
//     console.log(companyId);
//     console.log("company id ", companyId);
//     const accounts = await Account.find({
//       companyId: companyId,
//       isDeleted: false,
//     });
//     console.log(accounts, "accounts")
//     if (!accounts || accounts.length === 0) {
//       return res
//         .status(404)
//         .json({ success: false, msg: "No accounts found for this company." });
//     }

//     res.json(accounts);
//   } catch (err) {
//     console.error("Error fetching accounts:", err);
//     res
//       .status(500)
//       .json({ success: false, msg: `Something went wrong. ${err.message}` });
//   }
// };
exports.getAllAccounts = async (req, res) => {
  const { companyId, page, query } = req.body;


  const regex = new RegExp(query, "i");
  let limit;

  if(page >=0 ){
    limit = 10
  }
  else{
    limit = 0
  }
 
  if (!companyId) {
    return res
      .status(400)
      .json({ success: false, msg: "Company ID is required." });
  }

  const accounts = await Account.find({
    $or: [{account_name:{ $regex: regex } }, {account_number:{ $regex: regex } }, {phone:{ $regex: regex } }, {email:{ $regex: regex }}, {website: {$regex: regex}}, {account_type: {$regex: regex}} ],
  
    companyId: companyId,
    isDeleted: false,
  }).skip(limit*page).limit(limit);

  const totalPages = Math.ceil(await Account.countDocuments({
    $or: [{account_name:{ $regex: regex } }, {account_number:{ $regex: regex } }, {phone:{ $regex: regex } }, {email:{ $regex: regex }}, {website: {$regex: regex}}, {account_type: {$regex: regex}} ],
    companyId: companyId,
    isDeleted: false,
  })/ limit)
  if (!accounts || accounts.length === 0) {
    return res
      .status(404)
      .json({ success: false,data: [], totalPages:0, msg: "No accounts found for this company." });
  }

  res.json({data: accounts, totalPages});
};

// Get Account By ID (includes company ID validation)
exports.getAccountById = async (req, res) => {
  try {
    const userCompanyId = req.userInfo.companyId;
    const account = await Account.findOne({
      _id: req.params.id,
      companyId: userCompanyId,
    });

    if (!account || account.isDeleted) {
      return res
        .status(404)
        .json({ success: false, msg: errors.ACCOUNT_DOESNT_EXIST });
    }

    res.json({ data: account });
  } catch (err) {
    console.error("Error occurred:", err);
    res
      .status(500)
      .json({ success: false, msg: `Something went wrong. ${err.message}` });
  }
};

// // Create Account with the associated company ID
// exports.createAccount = async (req, res) => {
//   console.log("create accounts.......................")
//   try {
//     console.log("Request body:", req.body);

//     const newAccount = new Account({
//       ...req.body,
//       companyId: req.body,
//     });

//     const result = await newAccount.save();
//     console.log("Account created successfully:", result);

//     res.json({
//       success: true,
//       msg: "Successfully added!",
//       result: result,
//     });
//   } catch (err) {
//     console.error("Error occurred while creating account:", err);
//     res.status(500).json({ success: false, msg: errors.ADDACCOUNTERROR });
//   }
// };
// Create Account with the associated company ID
exports.createAccount = async (req, res) => {
  console.log("Creating account...");

  try {
    const { companyId, ...accountData } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to create an account.",
      });
    }

    const newAccount = new Account({
      ...accountData,
      companyId: companyId,
    });

    const result = await newAccount.save();
    console.log("Account created successfully:", result);

    return res.json({
      success: true,
      message: "Successfully added!",
      result: result,
    });
  } catch (err) {
    console.error("1Error occurred while creating account:", err);
    // console.error("1Error:", errorResponse.errmsg);
    return res.json({
        success: false,
        message: "Error adding account. Please try again later.",
        // message: err
      });
  }
};

exports.updateAccount = async (req, res) => {
  console.log("is accounts UPDATE coming");
  const { id } = req.body;
  console.log("Attempting to delete company with ID:", id);
  try {
    // const { id } = req.params;
    const updatedAccount = await Account.findOneAndUpdate(
      { _id: id, isDeleted: false }, 
      req.body,
      { new: true }
    );

    if (!updatedAccount) {
      return res
        .status(404)
        .json({ success: false, error: "Account not found." });
    }

    return res.json({ success: true, account: updatedAccount, message: "Updated successful!" });
  } catch (error) {
    console.error("Error updating accounts:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
// Delete Account (soft delete)
exports.deleteAccount = async (req, res) => {
  try {
    const accountId = req.params.id;
    const result = await Account.findByIdAndDelete(accountId);
    if (!result) {
      return res.status(404).json({ message: "Account not found" });
    }
    return res.json({ data: accountId, success: true, message: "deleted successful!"});
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};
