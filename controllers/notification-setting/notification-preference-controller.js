const NotificationPreference = require("../../models/notification-setting/notification-preference-model");
const NotificationSetting = require("../../models/notification-setting/notification-setting-model");
const mongoose = require("mongoose");

const errors = {
  ADDNOTIFICATIONERROR: "Error occurred while adding the notification",
  EDITNOTIFICATIONERROR: "Error occurred while updating the notification",
  DELETENOTIFICATIONERROR: "Error occurred while deleting the notification",
  ADDHIDENOTIFICATIONERROR: "Error occurred while adding the hide notification",
  NOT_AUTHORIZED: "You're not authorized",
};

exports.addPreferences = async (req, res) => {
  // console.log("is this coming here ???")
  try {
    const { userId, email, inApp, muteEvents } = req.body;

    if (!userId || !email || !inApp || !muteEvents) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    await NotificationPreference.create({
      userId,
      email,
      inApp,
      muteEvents,
      createdBy: userId,
      modifiedBy: userId,
    });

    return res
      .status(200)
      .json({ success: true, message: "Preferences Saved successfully" });
  } catch (error) {
    console.error("Error adding preferences:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const { userId } = req.body;

    const preferences = await NotificationPreference.find({ userId });

    if (!preferences || preferences.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No preferences found for this user.",
      });
    }
    console.log(preferences, "from preferences")

    const data = await NotificationSetting.find({ notifyUserIds: { $in: [userId] } });
    // console.log(data, "from data")
    if(data){
      // if(!preferences[0].email){
      //   await NotificationSetting.updateMany(
      //     { notifyUserIds: { $in: [userId] } },
      //     { $pull: { notifyUserIds: userId } } 
      //   );
      // }else {
      //   await NotificationSetting.updateMany(
      //     { $addToSet: { notifyUserIds: userId } } 
      //   );
      // }
    //   if(!preferences[0].inApp){
    //     await NotificationSetting.updateMany(
    //       { notifyUserIds: { $in: [userId] } },
    //       { $pull: { notifyUserIds: userId } } 
    //     );
    //   }else {
    //     await NotificationSetting.updateMany(
    //       { $addToSet: { notifyUserIds: userId } } 
    //     );
    //   }
    // if (preferences[0]?.muteEvents && preferences[0].muteEvents.length > 0) {
    //   await NotificationSetting.updateMany(
    //     { eventType: { $in: preferences[0].muteEvents } },
    //     { $pull: { notifyUserIds: userId } }
    //   );
    // }else{
    //   await NotificationSetting.updateMany(
    //     { $addToSet: { notifyUserIds: userId } } 
    //   );
    // }
    
    }

    res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updatePreferences = async (req, res) => {
  const { preferencesId } = req.params;
  const { userId, email, inApp, muteEvents } = req.body;

  try {
    // Optional: verify document exists
    const existing = await NotificationPreference.findOne({
      _id: preferencesId,
      userId,
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Preferences not found" });
    }

    // Update the document
    await NotificationPreference.updateOne(
      { _id: preferencesId, userId },
      {
        $set: {
          email,
          inApp,
          muteEvents,
        },
      }
    );

    return res
      .status(200)
      .json({ success: true, message: "Preferences Saved successfully" });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
