const mongoose = require("mongoose");
const Group = require("../../models/group/group-model");
const cacheManager = require("../../redis");
const { logError, logInfo } = require("../../common/logger");
const errors = {
  GROUP_DOESNT_EXIST: "Group does not exist",
  ADDGROUPERROR: "Error occurred while adding the group",
  EDITGROUPERROR: "Error occurred while updating the group",
  DELETEGROUPERROR: "Error occurred while deleting the group",
};

exports.getAllGroups = async (req, res) => {
  try {
    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }
    const groups = await Group.find({
      companyId,
      $or: [{ isDeleted: null }, { isDeleted: false }],
    });

    return res.status(200).json(groups);
  } catch (error) {
    logError("Error fetching groups:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load groups." });
  }
};

exports.getAllMemberGroups = async (req, res) => {
  try {
    const { companyId, page } = req.body;
    const { q } = req.query;
    const limit = 5;

    const searchFilter = q
    ? { groupName: { $regex: new RegExp(q, "i") } }
    : {};

    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required." });
    }
    const groups = await Group.find({
      companyId,
      $or: [{ isDeleted: null }, { isDeleted: false }],
      ...searchFilter
    }).skip(limit * page).limit(limit);
    const totalCount = await Group.countDocuments(
      {
        companyId,
        $or: [{ isDeleted: null }, { isDeleted: false }],
        ...searchFilter
      }
    );
    const totalPages = Math.ceil(totalCount / limit);

    // console.log(groups, "groups");


    return res.json({
      success: true,
      data: groups,
      totalCount,
      totalPages,
    })
  } catch (error) {
    logError("Error fetching groups:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load groups." });
  }
};

// CREATE Group
exports.addGroup = async (req, res) => {
  try {
    const { groupName, groupMembers, companyId } = req.body;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: "Company ID is required." });
    }
    if (!groupName || !groupMembers || groupMembers.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Group name and at least one group member are required.",
      });
    }

    const newGroup = new Group({
      groupName,
      groupMembers,
      companyId,
    });
    console.log(newGroup, "newGroup")
    await newGroup.save();
    cacheManager.clearCachedData("groupsData");

    return res.status(201).json({ success: true, group: newGroup });
  } catch (error) {
    logError("Error adding group:", error);
    return res
      .status(500)
      .json({ success: false, error: "Error occurred while adding the group" });
  }
};

// DELETE Group
// exports.deleteGroup = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deletedGroup = await Group.findByIdAndDelete(id);

//     if (!deletedGroup) {
//       return res.status(404).json({ error: "Group not found" });
//     }

//     cacheManager.clearCachedData("groupsData");
//     return res.status(204).send();
//   } catch (error) {
//     logError("Error deleting group:", error);
//     return res
//       .status(500)
//       .json({
//         success: false,
//         error: "Error occurred while deleting the group",
//       });
//   }
// };
exports.deleteGroup = async (req, res) => {
  console.log("Delete group request received.");
  const { id } = req.body; // Ensure `id` is being sent in the body
  console.log("Attempting to delete group with ID:", id);

  try {
    const deletedGroup = await Group.findByIdAndUpdate(
      id,
      { isDeleted: true }, // Mark the group as deleted
      { new: true } // Return the updated document
    );

    console.log(deletedGroup, "deletedGroup............");

    if (!deletedGroup) {
      return res
        .status(404)
        .json({ success: false, error: "Group not found." });
    }

    return res.status(200).json({ success: true, data: deletedGroup }); // Optionally return the deleted group data
  } catch (error) {
    console.error("Error deleting group:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// EDIT Group
// exports.editGroup = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const updatedGroup = await Group.findByIdAndUpdate(id, req.body, {
//       new: true,
//     });

//     if (!updatedGroup) {
//       return res.status(404).json({ error: "Group not found" });
//     }

//     cacheManager.clearCachedData("groupsData");
//     return res.status(200).json({ success: true, group: updatedGroup });
//   } catch (error) {
//     logError("Error editing group:", error);
//     return res
//       .status(500)
//       .json({
//         success: false,
//         error: "Error occurred while updating the group",
//       });
//   }
// };
exports.editGroup = async (req, res) => {
  console.log("Edit group request received.");
  const { id } = req.body; 
  console.log("Attempting to update group with ID:", id);

  try {
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: id, isDeleted: false }, 
      req.body,
      { new: true } 
    );

    if (!updatedGroup) {
      return res
        .status(404)
        .json({ success: false, error: "Group not found." });
    }

    return res.status(200).json({ success: true, group: updatedGroup });
  } catch (error) {
    console.error("Error updating group:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// const mongoose = require("mongoose");
// const Group = require("../../models/group/group-model");
// const jwt = require("jsonwebtoken");
// const { logError, logInfo } = require("../../common/logger");
// const access = require("../../check-entitlements");
// const sortData = require("../../common/common");
// const cacheManager = require("../../redis");
// const errors = {
//   GROUP_DOESNT_EXIST: "Group does not exist",
//   ADDGROUPERROR: "Error occurred while adding the group",
//   EDITGROUPERROR: "Error occurred while updating the group",
//   DELETEGROUPERROR: "Error occurred while deleting the group",
//   NOT_AUTHORIZED: "Your are not authorized",
// };

// //Get All Group
// exports.getAllGroups = async (req, res) => {
//   // let userRole = req.userInfo.userRole.toLowerCase();
//   // let accessCheck = access.checkEntitlements(userRole);
//   // if(accessCheck === false) {
//   //     res.json({ err: errors.NOT_AUTHORIZED });
//   //     return;
//   // }

//   var cachedData = await cacheManager.getCachedData("groupsData");

//   if (!!cachedData) {
//     if (cachedData.length > 0) {
//       res.json(cachedData);
//       return;
//     }
//   }

//   Group.find({ $or: [{ isDeleted: null }, { isDeleted: false }] }) //.sort({groupName: 1})
//     .then((result) => {
//       cacheManager.setCachedData("groupsData", result);
//       logInfo("getAllGroups result", result.length);
//       var result1 = sortData.sort(result, "groupName");
//       res.json(result ? result : []);
//     })
//     .catch((err) => {
//       res
//         .status(500)
//         .json({ success: false, msg: `Something went wrong. ${err}` });
//     });
// };

// // // CREATE
// exports.addGroup = (req, res) => {
//   try {
//     let userRole = req.userInfo.userRole.toLowerCase();
//     let accessCheck = access.checkEntitlements(userRole);
//     if (accessCheck === false) {
//       res.json({ err: errors.NOT_AUTHORIZED });
//       return;
//     }
//     logInfo(req.body, "addGroup");
//     let newGroup = new Group(req.body);
//     newGroup
//       .save()
//       .then((result) => {
//         cacheManager.clearCachedData("groupsData");
//         logInfo(result, "addGroup result");
//         res.json({
//           success: true,
//           msg: `Successfully added!`,
//           result: result,
//         });
//       })
//       .catch((err) => {
//         if (err.errors) {
//           res.json({ err: errors.ADDGROUPERROR });
//         }
//       });
//   } catch (e) {
//     logError("addGroup err", e);
//   }
// };

// exports.deleteGroup = (req, res) => {
//   try {
//     let userRole = req.userInfo.userRole.toLowerCase();
//     let accessCheck = access.checkEntitlements(userRole);
//     if (accessCheck === false) {
//       res.json({ err: errors.NOT_AUTHORIZED });
//       return;
//     }
//     logInfo(req.body, "deleteGroup");
//     let updatedGroup = req.body;
//     Group.findOneAndUpdate(
//       { _id: updatedGroup[0]._id },
//       { $set: { isDeleted: updatedGroup[0].isDeleted } }
//     )
//       .then((result) => {
//         cacheManager.clearCachedData("groupsData");
//         logInfo(result, "deleteGroup result");
//         res.json({
//           success: true,
//           msg: `Successfully Deleted!`,
//           result: result,
//         });
//       })
//       .catch((err) => {
//         if (err.errors) {
//           res.json({ err: errors.DELETEGROUPERROR });
//         }
//       });
//   } catch (e) {
//     logError("deleteGroup err", e);
//   }
// };

// exports.editGroup = (req, res) => {
//   try {
//     let userRole = req.userInfo.userRole.toLowerCase();
//     let accessCheck = access.checkEntitlements(userRole);
//     if (accessCheck === false) {
//       res.json({ err: errors.NOT_AUTHORIZED });
//       return;
//     }
//     let updatedGroup = req.body;
//     logInfo(req.body, "updatedGroup");
//     Group.findOneAndUpdate({ _id: req.body._id }, updatedGroup)
//       .then((result) => {
//         cacheManager.clearCachedData("groupsData");
//         logInfo(result, "updatedGroup result");
//         res.json({
//           success: true,
//           msg: `Successfully Updated!`,
//           result: result,
//         });
//       })
//       .catch((err) => {
//         if (err.errors) {
//           res.json({ err: errors.EDITGROUPERROR });
//         }
//       });
//   } catch (e) {
//     logError("editGroup err", e);
//   }
// };
