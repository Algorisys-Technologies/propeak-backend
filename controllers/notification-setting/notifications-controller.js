const mongoose = require("mongoose");
const { logError, logInfo } = require("../../common/logger");
const UserNotification = require("../../models/notification-setting/user-notification-model");
const JSONStream = require("JSONStream");

const errors = {
  ADDNOTIFICATIONERROR: "Error occurred while adding the notification",
  EDITNOTIFICATIONERROR: "Error occurred while updating the notification",
  DELETENOTIFICATIONERROR: "Error occurred while deleting the notification",
  ADDHIDENOTIFICATIONERROR: "Error occurred while adding the hide notification",
  NOT_AUTHORIZED: "You're not authorized",
};

exports.getNotifications = async (req, res) => {
  try {
    const { companyId, userId } = req.body;
    const page = parseInt(req.query.page || 0);
    const npage = parseInt(req.query.npage || 0);
    const filter = req.query.filter;
    const limit = 5;

    if (!companyId || !userId) {
      return res.status(200).json({
        success: false,
        message: "Company ID and User ID are required",
      });
    }

    // Build filter query for center
    const filterQuery = {
      isDeleted: false,
      companyId,
      userId,
    };

    if (filter === "unread") filterQuery.read = false;
    if (filter === "project") filterQuery.category = "project";
    if (filter === "assign") filterQuery.category = "assign";
    if (filter === "field") filterQuery.category = "field";
    if (filter === "task") filterQuery.category = "task";

    // Perform other queries first
    const settings = await UserNotification.find({
      isDeleted: false,
      companyId,
      userId,
      read: false,
    })
      .sort({ createdOn: -1 })
      .limit(limit)
      .skip(limit * npage)
      .lean();

    const centerTotalDocs = await UserNotification.countDocuments(filterQuery);
    const centerTotalPages = Math.ceil(centerTotalDocs / limit);

    const totalUnread = await UserNotification.countDocuments({
      read: false,
      companyId,
      userId,
    });

    const totalPages = Math.ceil(
      (await UserNotification.countDocuments({
        isDeleted: false,
        companyId,
        userId,
        read: false,
      })) / limit
    );

    // Start response
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write('{"success":true,');
    res.write('"message":"Notifications fetched successfully",');

    // Stream settings array
    res.write(`"settings":${JSON.stringify(settings)},`);
    res.write(`"totalCenterPages":${centerTotalPages},`);
    res.write(`"totalPages":${totalPages},`);
    res.write(`"unReadNotification":${totalUnread},`);
    res.write(`"center":`);

    // Create stream for `center` data
    const centerStream = UserNotification.find(filterQuery)
      .sort({ createdOn: -1 })
      .limit(limit)
      .skip(limit * page)
      .cursor();

    const jsonStream = JSONStream.stringify("[", ",", "]");

    jsonStream.pipe(res, { end: false });

    centerStream.on("data", (doc) => jsonStream.write(doc));

    centerStream.on("end", () => {
      jsonStream.end();
    });

    jsonStream.on("end", () => {
      res.write("}"); // Close JSON object
      res.end();
    });

    centerStream.on("error", (err) => {
      console.error("Stream error:", err);
      res.status(500).json({ success: false, message: "Stream failed" });
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
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

