//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var reportsController = require("../../controllers/reports/reports-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");
const checkRole = require("../../verify-token/check-role");

router.post(
  "/getMonthlyTaskReport",
  // verifyToken,
  // checkRole,
  // verifyAppLevelAccess,
  reportsController.getMonthlyTaskReport
);
router.post(
  "/getMonthlyTaskReportExcel",
  reportsController.getMonthlyTaskReportExcel
);
router.post(
  "/getMonthlyTaskReportForCompany",
  reportsController.getMonthlyTaskReportForCompany
);

router.post(
  "/getMonthlyUserReportForCompany",
  reportsController.getMonthlyUserReportForCompany
);

router.post(
  "/getMonthlyUserReportForProject",
  reportsController.getMonthlyUserReportForProject
);

router.post(
  "/getActiveUsersReportForCompany",
  reportsController.getActiveUsersReportForCompany
);

router.post(
  "/getIncompleteTaskCountReportForCompany",
  reportsController.getIncompleteTaskCountReportForCompany
);

router.post(
  "/getMonthlyUserReport",
  // verifyToken,
  // checkRole,
  // verifyAppLevelAccess,
  reportsController.getMonthlyUserReport
);

router.post(
  "/getUserTaskCountReport",
  verifyToken,
  checkRole,
  verifyAppLevelAccess,
  reportsController.getUserTaskCountReport
);

// router.post('/getActiveUsersReport', verifyToken, checkRole,reportsController.getActiveUsersReport);

router.post(
  "/getActiveUsersReport",
  //   verifyToken,
  //   checkRole,
  reportsController.getActiveUsersReport
);

router.post(
  "/getIncompleteTaskCountReport",
  verifyToken,
  checkRole,
  reportsController.getIncompleteTaskCountReport
);

router.post(
  "/getProjectProgressReport",
  // verifyToken,
  // checkRole,
  // verifyAppLevelAccess,
  reportsController.getProjectProgressReport
);

router.post(
  "/getUserPerformanceReport",
  // verifyToken,
  // checkRole,
  // verifyAppLevelAccess,
  reportsController.getUserPerformanceReport
);

router.post("/generate", reportsController.generateExport);

module.exports = router;
