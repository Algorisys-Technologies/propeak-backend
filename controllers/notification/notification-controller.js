const mongoose = require("mongoose");
const Notification = require("../../models/notification/notification-model");
const Project = require("../../models/project/project-model");
const User = require("../../models/user/user-model");
const HideNotification = require("../../models/notification/hide-notification-model");
const jwt = require("jsonwebtoken");
const { logError, logInfo } = require("../../common/logger");
const accessConfig = require("../../common/validate-entitlements");
const access = require("../../check-entitlements");
const sortData = require("../../common/common");
const errors = {
  ADDNOTIFICATIONERROR: "Error occurred while adding the notification",
  EDITNOTIFICATIONERROR: "Error occurred while updating the notification",
  DELETENOTIFICATIONERROR: "Error occurred while deleting the notification",
  ADDHIDENOTIFICATIONERROR: "Error occurred while adding the hide notification",
  NOT_AUTHORIZED: "You're are not authorized",
};
const eventEmailTemplates = require("../../utils/eventEmailTemplates");
const { addMyNotification } = require("../../common/add-my-notifications");
const dateUtil = require("../../utils/date-util");
const { result } = require("lodash");
const rabbitMQ = require("../../rabbitmq");
const nodemailer = require("nodemailer");
const config = require("../../config/config");
const {
  generateNotificationEmail,
  generateProjectNotificationEmail,
  generateProjectArchiveNotificationEmail
} = require("../../utils/eventEmailTemplates");
// exports.createNotification = async (req, res) => {
//   try {
//     console.log("Creating notification...");

//     logInfo(req.body, "createNotification");

//     const {
//       companyId,
//       notification,
//       fromDate,
//       toDate,
//       isDeleted,
//       projectId,
//       channel,
//     } = req.body;

//     if (!notification) {
//       return res
//         .status(400)
//         .json({ error: "Notification content is missing or invalid." });
//     }

//     if (!mongoose.Types.ObjectId.isValid(companyId)) {
//       return res.status(400).json({ error: "Invalid company ID." });
//     }

//     if (!channel) {
//       return res
//         .status(400)
//         .json({ error: "Channel information is missing or invalid." });
//     }

//     const channelArray = Object.keys(channel).filter((key) => channel[key]);
//     const users = await User.find({
//       companyId: companyId,
//       $or: [{ isDeleted: null }, { isDeleted: false }],
//     });

//     const userIds = users.map((user) => user._id.toString());

//     const newNotification = new Notification({
//       notification: notification,
//       toDate: toDate,
//       fromDate: fromDate,
//       isDeleted: isDeleted,
//       hidenotifications: [],
//       shownotifications: userIds,
//       projectId: projectId,
//       companyId: companyId,
//       channel: channelArray,
//     });

//     const savedNotification = await newNotification.save();
//     logInfo(savedNotification, "createNotification result");
//     if (channelArray.includes("email")) {
//       for (let user of users) {
//         if (user.email) {
//           const mailOptions = {
//             from: config.from,
//             to: user.email,
//             subject: "ProPeak Notification",
//             html: `
//               <p>Dear ${user.name || "Valued User"},</p>
//               <p>We hope this email finds you well. You have a new notification from the ProPeak system. Below are the details:</p>
//               <p><strong>Notification:</strong> ${notification}</p>
//               <p><strong>Effective From:</strong> ${fromDate}</p>
//               <p><strong>Effective To:</strong> ${toDate}</p>
//               <p>If you have any questions or require assistance, please feel free to reach out.</p>
//               <p>Best regards,</p>
//               <p><strong>The ProPeak Team</strong></p>
//               <p><em>This is an automated email, please do not reply.</em></p>
//             `,
//           };

//           try {
//             await rabbitMQ.sendMessageToQueue(
//               mailOptions,
//               "message_queue",
//               "msgRoute"
//             );
//             console.log(`Email queued for ${user.email}`);
//           } catch (err) {
//             console.error(`Error while sending email to ${user.email}: `, err);
//           }
//         }
//       }
//     }
//     res.json({
//       success: true,
//       msg: "Notification successfully added and emails queued!",
//     });
//   } catch (e) {
//     logError(e, "createNotification error");
//     res.status(500).json({ error: "Internal server error." });
//   }
// };

exports.createNotification = async (req, res) => {
  try {
    console.log("Creating notification...");

    logInfo(req.body, "createNotification");

    const {
      companyId,
      notification,
      fromDate,
      toDate,
      isDeleted = false, // default if not provided
      projectId,
      channel,
    } = req.body;

    if (!notification) {
      return res
        .status(400)
        .json({ error: "Notification content is missing or invalid." });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "Invalid project ID." });
    }

    if (!channel) {
      return res
        .status(400)
        .json({ error: "Channel information is missing or invalid." });
    }

    const channelArray = Object.keys(channel).filter((key) => channel[key]);

    const users = await User.find({
      companyId: companyId,
      $or: [{ isDeleted: null }, { isDeleted: false }],
    }).sort({ name: 1 });

    const userIds = users.map((user) => user._id.toString());

    const newNotification = new Notification({
      notification: notification,
      toDate: toDate,
      fromDate: fromDate,
      isDeleted: isDeleted,
      hidenotifications: [],
      shownotifications: userIds,
      projectId: projectId,
      companyId: companyId,
      channel: channelArray,
    });

    const savedNotification = await newNotification.save();
    logInfo(savedNotification, "createNotification result");

    if (channelArray.includes("email")) {
      for (let user of users) {
        if (user.email) {
          const emailContent = generateNotificationEmail({
            userName: user.name || "Valued User",
            notification,
            fromDate,
            toDate,
          });

          const mailOptions = {
            from: config.from,
            to: user.email,
            subject: "ProPeak Notification",
            html: emailContent,
          };
          try {
            await rabbitMQ.sendMessageToQueue(
              mailOptions,
              "message_queue",
              "msgRoute"
            );
            console.log(`Email queued for ${user.email}`);
          } catch (err) {
            console.error(`Error while sending email to ${user.email}: `, err);
          }
        }
      }
    }

    res.json({
      success: true,
      msg: "Notification successfully added and emails queued!",
    });
  } catch (e) {
    logError(e, "createNotification error");
    res.status(500).json({ error: "Internal server error." });
  }
};
// exports.createProjectNotification = (req, res) => {
//   try {
//     console.log("is it coming in the project Notification ");
//     logInfo(req.body, "createProjectNotification");

//     const { notification, fromDate, toDate, isDeleted, projectId, companyId,   channel, } =
//       req.body;
//     console.log("Project ID:", projectId);

//     if (!notification) {
//       return res
//         .status(400)
//         .json({ error: "Notification message is missing or invalid." });
//     }
//     if (!mongoose.Types.ObjectId.isValid(projectId)) {
//       return res.status(400).json({ error: "Invalid project ID." });
//     }
//     if (!channel) {
//       return res
//         .status(400)
//         .json({ error: "Channel information is missing or invalid." });
//     }

//     const channelArray = Object.keys(channel).filter((key) => channel[key]);
//     Project.findById(projectId)
//       .then((project) => {
//         if (!project) {
//           return res.status(404).json({ error: "Project not found." });
//         }

//         const userIds = Array.from(
//           new Set([
//             ...project.projectUsers,
//             ...project.notifyUsers,
//             project.createdBy,
//           ])
//         );

//         const newNotification = new Notification({
//           notification: notification,
//           toDate: toDate,
//           fromDate: fromDate,
//           isDeleted: isDeleted || false,
//           hidenotifications: [],
//           shownotifications: userIds,
//           projectId: projectId,
//           companyId: companyId,
//         });
//         newNotification
//           .save()
//           .then((savedNotification) => {
//             logInfo(savedNotification, "createProjectNotification result");
//             res.json({
//               success: true,
//               msg: `Successfully added notification!`,
//             });
//           })
//           .catch((err) => {
//             console.error("Error saving notification:", err);
//             res.status(500).json({ error: "Error saving notification." });
//           });
//       })
//       .catch((err) => {
//         console.error("Error finding project:", err);
//         res.status(500).json({ error: "Failed to find project." });
//       });
//     return res.json({
//       success: true,
//       message: "Notification added successful.",
//     });
//   } catch (e) {
//     return res.json({
//       error: error.message,
//       success: false,
//       message: "error in added notification.",
//     });
//     logError(e, "createProjectNotification e");
//     res.status(500).json({ error: "Internal server error." });
//   }
// };

exports.createProjectNotification = (req, res) => {
  try {
    console.log("Entering project-level notification creation...");
    logInfo(req.body, "createProjectNotificationForProjectLevel");

    const {
      notification,
      fromDate,
      toDate,
      isDeleted,
      projectId,
      companyId,
      channel,
    } = req.body;
    console.log("Project ID:", projectId);

    if (!notification) {
      return res
        .status(400)
        .json({ error: "Notification message is missing or invalid." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "Invalid project ID." });
    }
    if (!channel) {
      return res
        .status(400)
        .json({ error: "Channel information is missing or invalid." });
    }

    const channelArray = Object.keys(channel).filter((key) => channel[key]);

    // Find the project and get project users
    Project.findById(projectId)
      .then((project) => {
        if (!project) {
          return res.status(404).json({ error: "Project not found." });
        }

        // Get all users related to the project (projectUsers and project creator)
        const userIds = Array.from(
          new Set([...project.projectUsers, project.createdBy])
        );

        // Create a new project-level notification object to store in the database
        const newNotification = new Notification({
          notification: notification,
          toDate: toDate,
          fromDate: fromDate,
          isDeleted: isDeleted || false,
          hidenotifications: [],
          shownotifications: userIds,
          projectId: projectId,
          companyId: companyId,
          channel: channelArray, // Ensure channel information is stored
        });

        newNotification
          .save()
          .then((savedNotification) => {
            logInfo(
              savedNotification,
              "createProjectNotificationForProjectLevel result"
            );

            // Now, send emails to the project users if the 'email' channel is selected
            if (channelArray.includes("email")) {
              User.find({ _id: { $in: userIds } }) // Fetch users based on the IDs
                .then((users) => {
                  users.forEach((user) => {
                    if (user.email) {
                      const mailOptions = {
                        from: config.from,
                        to: user.email,
                        subject: `ProPeak Project Notification for ${project.title}`, // Added project title to subject
                        html: generateProjectNotificationEmail({
                          userName: user.name || "Valued User",
                          notification,
                          fromDate,
                          toDate,
                          projectTitle: project.title, // Pass project title
                        }),
                      };

                      try {
                        // Assuming you're using a message queue to send emails
                        rabbitMQ.sendMessageToQueue(
                          mailOptions,
                          "message_queue",
                          "msgRoute"
                        );
                        console.log(`Email queued for ${user.email}`);
                      } catch (err) {
                        console.error(
                          `Error while sending email to ${user.email}: `,
                          err
                        );
                      }
                    }
                  });
                })
                .catch((err) => {
                  console.error(
                    "Error fetching users for email notification:",
                    err
                  );
                });
            }

            res.json({
              success: true,
              msg: `Successfully added project-level notification and emails queued!`,
            });
          })
          .catch((err) => {
            console.error("Error saving notification:", err);
            res.status(500).json({ error: "Error saving notification." });
          });
      })
      .catch((err) => {
        console.error("Error finding project:", err);
        res.status(500).json({ error: "Failed to find project." });
      });
  } catch (e) {
    logError(e, "createProjectNotificationForProjectLevel error");
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.updateNotification = (req, res) => {
  try {
    console.log("updatingggg it ......");
    logInfo(req.body, "updateNotification");
    const notificationId = req.params.id;
    console.log(notificationId, "notificationId");
    const {
      // notificationId,
      notification,
      fromDate,
      toDate,
      isDeleted,
      projectId,
      companyId,
    } = req.body;

    console.log(notificationId, "notificationId.........");

    if (!notificationId) {
      return res.status(400).json({ error: "Notification ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: "Invalid notification ID." });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    if (!notification) {
      return res
        .status(400)
        .json({ error: "Notification content is missing or invalid." });
    }

    Notification.findById(notificationId)
      .then((existingNotification) => {
        if (!existingNotification) {
          return res.status(404).json({ error: "Notification not found." });
        }

        // Check if the companyId matches
        if (existingNotification.companyId.toString() !== companyId) {
          return res.status(403).json({
            error: "You do not have permission to update this notification.",
          });
        }

        // Update the fields of the notification
        existingNotification.notification = notification;
        existingNotification.fromDate =
          fromDate || existingNotification.fromDate;
        existingNotification.toDate = toDate || existingNotification.toDate;
        existingNotification.isDeleted =
          isDeleted !== undefined ? isDeleted : existingNotification.isDeleted;
        existingNotification.projectId =
          projectId || existingNotification.projectId;

        // Save the updated notification
        existingNotification
          .save()
          .then((updatedNotification) => {
            logInfo(updatedNotification, "updateNotification result");
            res.json({
              success: true,
              msg: "Notification successfully updated!",
            });
            console.log(updatedNotification, "updatedNotification");
          })
          .catch((err) => {
            console.error("Error saving updated notification:", err);
            res.status(500).json({
              error: "Failed to update notification.",
            });
          });
      })
      .catch((err) => {
        console.error("Error fetching notification:", err);
        res.status(500).json({ error: "Failed to fetch notification." });
      });
    return res.json({
      success: true,
      message: "Notification updated successful.",
    });
  } catch (e) {
    return res.json({
      error: error.message,
      success: false,
      message: "error in updated notification.",
    });
    logError(e, "updateNotification error");
    res.status(500).json({ error: "Internal server error." });
  }
};

// Delete Notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("coming coming ??");
    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!updatedNotification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ success: true, message: "Notification deleted." });
  } catch (error) {
    return res.json({
      error: error.message,
      success: false,
      message: "error in deleted notification.",
    });
  }
};
exports.getAllNotifications = (req, res) => {
  const { companyId, projectId } = req.body;
  // console.log(companyId, "company id .....");
  const { q } = req.query;
  const condition = {
    $and: [
      {
        $or: [{ isDeleted: null }, { isDeleted: false }],
      },
      {
        companyId: companyId,
      },
    ],
  };

  if (q) {
    condition.$and.push({
      notification: { $regex: q, $options: "i" },
    });
  }

  if (!projectId) {
    condition.$and.push({
      projectId: null,
    });
  }

  Notification.find(condition)
    .then((result) => {
      // console.log(result, "result "); // Log the result here
      res.json({
        success: true,
        notifications: result, // Return success and notifications
      });
    })
    .catch((err) => {
      console.error("Error fetching notifications:", err); // Log the error for debugging
      res.status(500).json({
        success: false,
        msg: `Something went wrong. ${err}`,
      });
    });
};

// Gt Notification By Id
exports.getNotificationById = (req, res) => {
  const companyId = req.userInfo.companyId;

  Notification.findOne({
    _id: req.params.id,
    companyId: companyId,
  })
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

exports.getProjectNotifications = (req, res) => {
  try {
    const { projectId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "Invalid project ID." });
    }

    Project.findById(projectId)
      .then((project) => {
        if (!project) {
          return res.status(404).json({ error: "Project not found." });
        }

        Notification.find({
          projectId: projectId,
          isDeleted: false,
        })
          .then((notifications) => {
            if (notifications.length === 0) {
              return res.status(404).json({ error: "No notifications found." });
            }
            res.json({
              success: true,
              notifications,
            });
          })
          .catch((err) => {
            console.error("Error fetching notifications:", err);
            res.status(500).json({ error: "Failed to fetch notifications." });
          });
      })
      .catch((err) => {
        console.error("Error finding project:", err);
        res.status(500).json({ error: "Failed to find project." });
      });
  } catch (e) {
    logError(e, "getProjectNotifications e");
    res.status(500).json({ error: "Internal server error." });
  }
};
exports.updateProjectNotification = (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    if (!id) {
      return res.status(400).json({ error: "Notification ID is missing." });
    }

    logInfo(req.body, "updateProjectNotification");

    const { notification, fromDate, toDate, isDeleted, projectId, companyId } =
      req.body;
    console.log("Project ID:", projectId);

    if (!notification) {
      return res
        .status(400)
        .json({ error: "Notification message is missing or invalid." });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid notification ID." });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "Invalid project ID." });
    }
    Notification.findById(id)
      .then((existingNotification) => {
        if (!existingNotification) {
          return res.status(404).json({ error: "Notification not found." });
        }
        Project.findById(projectId)
          .then((project) => {
            if (!project) {
              return res.status(404).json({ error: "Project not found." });
            }
            existingNotification.notification = notification;
            existingNotification.fromDate = fromDate;
            existingNotification.toDate = toDate;
            existingNotification.isDeleted =
              isDeleted || existingNotification.isDeleted;
            existingNotification.projectId = projectId;
            existingNotification.companyId = companyId;

            User.find({
              $or: [{ isDeleted: null }, { isDeleted: false }],
              projectId: projectId,
            })
              .then((users) => {
                const userIds = users.map((user) => user._id.toString());
                existingNotification.shownotifications = userIds;
                existingNotification
                  .save()
                  .then((updatedNotification) => {
                    logInfo(
                      updatedNotification,
                      "updateProjectNotification result"
                    );
                    res.json({
                      success: true,
                      msg: `Successfully updated notification!`,
                    });
                  })
                  .catch((err) => {
                    console.error("Error saving updated notification:", err);
                    res
                      .status(500)
                      .json({ error: "Error saving updated notification." });
                  });
              })
              .catch((err) => {
                console.error("Error fetching users:", err);
                res.status(500).json({ error: "Failed to fetch users." });
              });
          })
          .catch((err) => {
            console.error("Error finding project:", err);
            res.status(500).json({ error: "Failed to find project." });
          });
      })
      .catch((err) => {
        console.error("Error finding notification:", err);
        res.status(500).json({ error: "Failed to find notification." });
      });
  } catch (e) {
    logError(e, "updateProjectNotification e");
    res.status(500).json({ error: "Internal server error." });
  }
};
