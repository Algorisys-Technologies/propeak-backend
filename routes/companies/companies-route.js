//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var companyController = require("../../controllers/company/company-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
const checkRole = require("../../verify-token/check-role");

//Read One
router.get(
  "/:id",
  // verifyToken,
  companyController.getCompanyById
);

// READ (ALL)
router.get(
  "/",
  //  verifyToken, checkRole,
  companyController.getAllCompanies
);

// CREATE
router.post(
  "/addCompany",
  // verifyToken,
  // verifyAppLevelAccess,
  companyController.createCompany
);

// UPDATE
router.post(
  "/editCompany",
  // verifyToken,
  // verifyAppLevelAccess,
  companyController.updateCompany
);

// DELETE
router.post(
  "/deleteCompany",
  // verifyToken,
  // verifyAppLevelAccess,
  companyController.deleteCompany
);

router.post("/getCompaniesByEmail", companyController.getCompaniesByEmail);
module.exports = router;

// // const express = require("express");
// // const router = express.Router();
// // const verifyToken = require("../../verify-token/verify-token");
// // var companyController = require("../../controllers/company/company-controller");
// // const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
// // const checkRole = require("../../verify-token/check-role");

// // //Read One
// // router.get("/:id", verifyToken, companyController.getCompanyById);

// // // READ (ALL)
// // router.get("/", verifyToken, checkRole, companyController.getAllCompanies);

// // // CREATE
// // router.post(
// //   "/addCompany",
// //   verifyToken,
// //   verifyAppLevelAccess,
// //   companyController.createCompany
// // );

// // // UPDATE
// // router.post(
// //   "/editCompany",
// //   verifyToken,
// //   verifyAppLevelAccess,
// //   companyController.updateCompany
// // );

// // // DELETE
// // router.post(
// //   "/deleteCompany",
// //   verifyToken,
// //   verifyAppLevelAccess,
// //   companyController.deleteCompany
// // );

// // router.post("/getCompaniesByEmail", companyController.getCompaniesByEmail);
// // module.exports = router;

// const express = require('express');
// const router = express.Router();
// const companyController = require('../../controllers/company/company-controller');

// // Define the routes using the correct controller
// router.post('/add', companyController.createCompany);
// router.get('/', companyController.getAllCompanies);
// router.get('/:id', companyController.getCompanyById);
// router.put('/:id', companyController.updateCompany);
// router.delete('/:id', companyController.deleteCompany);
// router.post('/by-email', companyController.getCompaniesByEmail);

// module.exports = router;
