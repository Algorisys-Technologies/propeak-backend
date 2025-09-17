const mongoose = require("mongoose");
const { logError, logInfo } = require("../../common/logger");
const UserNotification = require("../../models/notification-setting/user-notification-model");

const errors = {
  ADDNOTIFICATIONERROR: "Error occurred while adding the notification",
  EDITNOTIFICATIONERROR: "Error occurred while updating the notification",
  DELETENOTIFICATIONERROR: "Error occurred while deleting the notification",
  ADDHIDENOTIFICATIONERROR: "Error occurred while adding the hide notification",
  NOT_AUTHORIZED: "You're not authorized",
};

exports.bellNotification = async (req, res) => {
  try {
    const { companyId, userId } = req.body;
    const npage = req.query.npage ? req.query.npage : 0;
    const limit = 5;
    const now = new Date();

    if (!companyId || !userId) {
      return res.status(200).json({
        success: false,
        message: "Company ID and User ID are required",
      });
    }

    const notifications = await UserNotification.find({
      isDeleted: false,
      companyId,
      userId,
      $or: [
        { read: false },
        { permanentlySkipped: true, read: false } // only skipped if still unread
      ],
    })
      .select("_id userId subject message url read category createdOn permanentlySkipped skipUntil")
      .sort({ createdOn: -1 })
      .limit(limit)
      .skip(limit * npage);
    
    // total count with skipped also
    const totalPages = Math.ceil(
      (await UserNotification.countDocuments({
        isDeleted: false,
        companyId,
        userId,
        $or: [
          { read: false },
          { permanentlySkipped: true, read: false }
        ],
      })) / limit
    );
    
    const unReadNotification = await UserNotification.countDocuments({
      companyId,
      userId,
      $or: [
        { read: false },
        { permanentlySkipped: true, read: false }
      ],
    }).select('read');
    
    const TaskReminderData = await UserNotification.find({
      isDeleted: false,
      active: true,
      companyId,
      userId,
      eventType: "TASK_REMINDER_DUE",
      permanentlySkipped: { $ne: true },
      $or: [
        { skipUntil: { $exists: false } },
        { skipUntil: null },
        { skipUntil: { $lt: now } }
      ]
    })
    .select("_id userId subject message url taskId eventType createdOn skipUntil permanentlySkipped")
    .sort({ createdOn: -1 });


    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      settings: notifications,
      totalPages,
      unReadNotification,
      TaskReminderData,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

exports.getNotifications = async (req, res) => {
  try {
    const { companyId, userId } = req.body;
    const page = req.query.page ? req.query.page : 0;
    const filter = req.query.filter;
    const limit = 5;

    if (!companyId || !userId) {
      return res.status(200).json({
        success: false,
        message: "Company ID and User ID are required",
      });
    }

    // Build base query
    const filterQuery = {
      isDeleted: false,
      companyId,
      userId, // ← show only for this user
    };

    // Optional filters
    if (filter === "unread") filterQuery.read = false;
    if (filter === "project") filterQuery.category = "project";
    if (filter === "assign") filterQuery.category = "assign";
    if (filter === "field") filterQuery.category = "field";
    if (filter === "task") filterQuery.category = "task";

    // Paged notifications
    const notificationCenter = await UserNotification.find(filterQuery)
      .select("_id userId subject message url read category eventType projectId createdOn permanentlySkipped skipUntil")
      .sort({ createdOn: -1 })
      .limit(limit)
      .skip(limit * page)
      .lean();

    const totalDocuments = await UserNotification.countDocuments(filterQuery);
    const centerTotalPages = Math.ceil(totalDocuments / limit);

    const unReadNotification = await UserNotification.countDocuments({
      companyId,
      userId,
      $or: [
        { read: false },
        { permanentlySkipped: true, read: false }
      ],
    }).select("read");

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      center: notificationCenter,
      totalCenterPages: centerTotalPages,
      unReadNotification,
    });
  } catch (error) {
    // console.error("Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// exports.getNotifications = async (req, res) => {
//   try {
//     const { companyId, userId, role } = req.body;
//     const page = req.query.page ? req.query.page : 0;
//     const npage = req.query.npage ? req.query.npage : 0;
//     const filter = req.query.filter;
//     const limit = 5;

//     if (!companyId || !userId || !role) {
//       return res.status(400).json({
//         success: false,
//         message: "Company ID, User ID, and Role are required",
//       });
//     }

//     const filterQuery = {
//       isDeleted: false,
//       companyId,
//       $or: [{ userId }, { notifyRoleNames: role }],
//     };
    
//     if (filter === "unread") {
//       filterQuery.read = false;
//     }
//     if (filter === "project") {
//       filterQuery.category = "project";
//     }
//     if (filter === "comment") {
//       filterQuery.category = "comment";
//     }
//     if (filter === "email") {
//       filterQuery.category = "email";
//     }
//     if (filter === "task") {
//       filterQuery.category = "task";
//     }

//     const notificationCenter = await UserNotification.find(filterQuery)
//     .sort({ createdOn: -1 })
//     .limit(limit)
//     .skip(limit * page)
//     .lean();

//     // Fetch notifications matching either direct user or role
//     const notifications = await UserNotification.find({
//       isDeleted: false,
//       companyId,
//       $or: [{ userId }, { notifyRoleNames: role }],
//     }).sort({ createdOn: -1 })
//       .limit(limit)
//       .skip(limit * npage);

//     const totalDocuments = await UserNotification.countDocuments(filterQuery);
//     const centerTotalPages = Math.ceil(totalDocuments / limit);
    

//     const totalPages = Math.ceil(
//       (await UserNotification.find({
//             // name: { $regex: regex },
//             // companyId: req.params.companyId,
//             isDeleted: false
//       }).countDocuments()) / limit
//     );

//      const unReadNotification = Math.ceil(
//           (await UserNotification.find({
//            read: false
//           }).countDocuments())
//         )

//     // Deduplicate by _id
//     const uniqueMap = new Map();
//     notifications.forEach((notif) => {
//       uniqueMap.set(notif._id.toString(), notif);
//     });

//     const uniqueNotifications = Array.from(uniqueMap.values());

//     return res.status(200).json({
//       success: true,
//       message: "Notifications fetched successfully",
//       settings: uniqueNotifications,
//       center: notificationCenter,
//       totalCenterPages: centerTotalPages,
//       totalPages,
//       unReadNotification,
//     });
//   } catch (error) {
//     console.error("Error fetching notifications:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required",
      });
    }

    const updated = await UserNotification.findByIdAndUpdate(
      id,
      { isDeleted: true, read: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      notification: updated,
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required",
      });
    }

    const updated = await UserNotification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read successfully",
      notification: updated,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.markNotificationAsAllRead = async (req, res) => {
  try {

    const notReadPresent = await UserNotification.find({ read: false });

    if (notReadPresent.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No unread notifications found.",
      });
    }

    const updated = await UserNotification.updateMany(
      { read: false }, 
      { $set: { read: true } }
    );
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked all as read successfully",
      notification: updated,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.reminderAction = async (req, res) => {
  const { action, _id, eventType, taskId } = req.body;

  try {
    // Find notification by ID + eventType + taskId
    const notification = await UserNotification.findOne({ 
      _id, 
      eventType,
      ...(taskId && { taskId }) // Include taskId if provided
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (eventType !== "TASK_REMINDER_DUE") {
      return res.status(400).json({ message: "Action only allowed for TASK_REMINDER_DUE" });
    }

    if (action === "skipToday") {
      const skipUntil = new Date(notification.createdOn || new Date());
      skipUntil.setDate(skipUntil.getDate() + 1);

      notification.skipUntil = skipUntil;
      await notification.save();

      return res.status(200).json({
        message: "Reminder skipped for today",
        data: notification,
      });
    }

    if (action === "skipPermanently") {
      notification.permanentlySkipped = true;
      notification.active = false; // hide permanently
      await notification.save();

      return res.status(200).json({
        message: "Reminder skipped permanently",
        data: notification,
      });
    }

    return res.status(400).json({ message: "Invalid action" });
  } catch (error) {
    console.error("Error in ReminderAction:", error);
    res.status(500).json({ message: "Server error" });
  }
};
