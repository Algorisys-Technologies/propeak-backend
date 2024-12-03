const Reminder = require("../../models/reminder/reminder-model");
const Task = require("../../models/task/task-model");
const User = require("../../models/user/user-model");
const Project = require("../../models/project/project-model");
const jwt = require("jsonwebtoken");
const { logError, logInfo } = require("../../common/logger");
const accessConfig = require("../../common/validate-entitlements");
const access = require("../../check-entitlements");
const sortData = require("../../common/common");
const errors = {
  ADDREMINDERERROR: "Error occurred while adding the reminder",
  EDITREMINDERERROR: "Error occurred while updating the reminder",
  DELETEREMINDERERROR: "Error occurred while deleting the reminder",
  NOT_AUTHORIZED: "You're not authorized",
};
const dateUtil = require("../../utils/date-util");
// CREATE
exports.createReminder = (req, res) => {
  try {
    logInfo(req.body, "createReminder received body");

    // let createReminder = false;
    // let userRole = req.userInfo.userRole;

    // if (req.body.projectId !== "000") {
    //   let userAccess = req.userInfo.userAccess;
    //   createReminder = accessConfig.validateEntitlements(
    //     userAccess,
    //     req.body.projectId,
    //     "Reminder",
    //     "create",
    //     userRole
    //   );
    // }

    // if (createReminder === false && userRole === "user") {
    //   return res.status(403).json({
    //     err: errors.NOT_AUTHORIZED,
    //   });
    // }

    // Log each field before saving
    logInfo(req.body.reminderTime, "Reminder Time");
    logInfo(req.body.frequency, "Frequency");

    // Create new reminder
    let newReminder = new Reminder({
      reminderEnabled: req.body.reminderEnabled,
      reminderTime: req.body.reminderTime,
      frequency: req.body.frequency,
      notificationMethods: req.body.notificationMethods,
      projectId: req.body.projectId,
      isDeleted: req.body.isDeleted,
    });

    newReminder
      .save()
      .then((result) => {
        logInfo(result, "createReminder result");
        res.status(201).json({
          success: true,
          msg: `Successfully added!`,
          result: result,
        });
      })
      .catch((err) => {
        logError(err, "createReminder save error");
        res.status(500).json({
          err: errors.ADDREMINDERERROR,
          details: err.message,
        });
      });
  } catch (e) {
    logError(e, "createReminder exception");
    res.status(500).json({
      err: "An unexpected error occurred.",
      details: e.message,
    });
  }
};
// GET ALL REMINDERS
exports.getAllReminders = (req, res) => {
  try {
    Reminder.find({
      $or: [{ isDeleted: null }, { isDeleted: false }],
    })
      .then((result) => {
        if (req.params.projectId === "000") {
          sortData.sort(result, "reminderTime");
          res.json(result);
        } else {
          let projectResult = result.filter(
            (r) => r.projectId === req.params.projectId
          );
          sortData.sort(projectResult, "reminderTime");
          res.json(projectResult);
        }
      })
      .catch((err) => {
        console.error("Error fetching reminders:", err);
        res.status(500).json({
          success: false,
          msg: `Something went wrong. ${err}`,
        });
      });
  } catch (e) {
    console.error("Exception in getAllReminders:", e);
    logError(e, "getAllReminders e");
    res.status(500).json({
      success: false,
      msg: "Internal server error.",
    });
  }
};
// GET REMINDER BY ID
exports.getReminderById = (req, res) => {
  let userRole = req.userInfo.userRole.toLowerCase();
  let accessCheck = access.checkEntitlementsForUserRole(userRole);

  if (accessCheck === false) {
    res.json({ err: errors.NOT_AUTHORIZED });
    return;
  }

  Reminder.findById(req.params.id)
    .then((result) => {
      res.json({
        data: result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        success: false,
        msg: `Something went wrong. ${err}`,
      });
    });
};
//Delete reminder
exports.deleteReminder = async (req, res) => {
  const { reminderId } = req.body;
  if (!reminderId) {
    return res.status(400).json({
      success: false,
      error: "Reminder ID is required for deletion.",
    });
  }

  try {
    const deletedReminder = await Reminder.findOneAndUpdate(
      { _id: reminderId },
      { isDeleted: true },
      { new: true }
    );

    if (!deletedReminder) {
      return res.status(404).json({
        success: false,
        error: "Reminder not found.",
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
//update reminder
exports.updateReminder = async (req, res) => {
  logInfo(req.body, "updateReminder");

  const { id } = req.body;

  try {
    if (!id) {
      return res.status(400).json({ success: false, error: "ID is required." });
    }

    const updatedReminder = await Reminder.findOneAndUpdate(
      { _id: id, isDeleted: false }, 
      req.body,
      { new: true }
    );
    if (!updatedReminder) {
      console.error("No reminder found with the given ID.");
      return res
        .status(404)
        .json({ success: false, error: "Reminder not found." });
    }

    logInfo(updatedReminder, "updateReminder result");
    return res.status(200).json({
      success: true,
      msg: `Successfully Updated!`,
      result: updatedReminder,
    });
  } catch (error) {
    console.error("Error updating reminder:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE REMINDER
// exports.updateReminder = (req, res) => {
//   try {
//     console.log("update one here ")
//     logInfo(req.body, "updateReminder");
//     const { id } = req.body;

//     let updatedReminder = req.body;
//     console.log(updatedReminder, "updatedReminder")
//     // let userRole = req.userInfo.userRole;
//     let updateReminder = false;

//     // if (req.body.projectId !== "000") {
//     //   let userAccess = req.userInfo.userAccess;
//     //   updateReminder = accessConfig.validateEntitlements(
//     //     userAccess,
//     //     req.body.projectId,
//     //     "Reminder",
//     //     "edit",
//     //     userRole
//     //   );
//     // }

//     // if (updateReminder === false && userRole === "user") {
//     //   res.json({
//     //     err: errors.NOT_AUTHORIZED,
//     //   });
//     // } else {
//       Reminder.findOneAndUpdate(
//         {
//           _id: req.body._id,
//         },
//         updatedReminder
//       )
//         .then((result) => {
//           logInfo(result, "updateReminder result");
//           res.json({
//             success: true,
//             msg: `Successfully Updated!`,
//             result: result,
//           });
//         })
//         .catch((err) => {
//           if (err.errors) {
//             res.json({
//               err: errors.EDITREMINDERERROR,
//             });
//           }
//         });
//     // }
//   } catch (e) {
//     logError(e, "updateReminder e");
//   }
// };
// // DELETE REMINDER
// exports.deleteReminder = (req, res) => {
//   try {
//     console.log(req.body, "deleteReminder");
//     let updatedReminder = req.body[0]; // Assuming it's an array with one object
//     // let userRole = req.userInfo.userRole;
//     let deleteReminder = false;

//     if (updatedReminder.projectId !== "000") {
//       let userAccess = req.userInfo.userAccess;
//       deleteReminder = accessConfig.validateEntitlements(
//         userAccess,
//         updatedReminder.projectId,
//         "Reminder",
//         "delete",
//         userRole
//       );
//     }

//     if (deleteReminder === false && userRole === "user") {
//       res.status(403).json({
//         err: errors.NOT_AUTHORIZED,
//       });
//     } else {
//       Reminder.findOneAndUpdate(
//         {
//           _id: updatedReminder._id,
//         },
//         {
//           $set: {
//             isDeleted: true, // Or whatever field indicates deletion
//           },
//         }
//       )
//         .then((result) => {
//           logInfo(result, "deleteReminder result");
//           res.json({
//             success: true,
//             msg: `Successfully Updated!`,
//             result: result,
//           });
//         })
//         .catch((err) => {
//           console.error("Delete error:", err);
//           res.status(500).json({
//             err: errors.DELETEREMINDERERROR,
//           });
//         });
//     }
//   } catch (e) {
//     console.error("Error in deleteReminder:", e);
//     res.status(500).json({
//       err: errors.INTERNAL_SERVER_ERROR,
//     });
//   }
// };
// // GET ALL REMINDERS
// exports.getAllReminders = (req, res) => {
//   try {
//     let userRole = req.userInfo.userRole.toLowerCase();
//     let accessCheck = access.checkEntitlements(userRole);
//     let userAccess = req.userInfo.userAccess;
//     let viewReminder = accessConfig.validateEntitlements(
//       userAccess,
//       req.params.projectId,
//       "Reminder",
//       "view",
//       userRole
//     );

//     if (accessCheck === false && !viewReminder) {
//       res.json({ err: errors.NOT_AUTHORIZED });
//       return;
//     }

//     Reminder.find({
//       $or: [{ isDeleted: null }, { isDeleted: false }],
//     })
//       .then((result) => {
//         if (req.params.projectId === "000") {
//           sortData.sort(result, "reminderTime");
//           res.json(result);
//         } else {
//           let projectResult = result.filter(
//             (r) => r.projectId === req.params.projectId
//           );
//           sortData.sort(projectResult, "reminderTime");
//           res.json(projectResult);
//         }
//       })
//       .catch((err) => {
//         res.status(500).json({
//           success: false,
//           msg: `Something went wrong. ${err}`,
//         });
//       });
//   } catch (e) {
//     logError(e, "getAllReminders e");
//   }
// };
