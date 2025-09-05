const ContactModel = require("../../models/contact/contact-model");
const VFolder = require("../../models/vfolder/vfolder-model");
const UploadContactConfig = require("../../models/vfolder/upload-contact-config-model");

exports.getVFolders = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { q } = req.query;

    const searchFilter = q ? { name: { $regex: new RegExp(q, "i") } } : {};

    const vFolders = await VFolder.find({
      companyId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      ...searchFilter,
    });

    const totalVFolder = Math.ceil(
      await VFolder.countDocuments({
        companyId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        ...searchFilter,
      })
    );
    return res.json({
      success: true,
      result: vFolders,
      totalVFolder: totalVFolder,
    });
  } catch (e) {
    console.log(e);
    return res.json({ success: false, result: "" });
  }
};

exports.renameVFolder = async (req, res) => {
  try {
    const { id, folderName } = req.body;

    const isFolderExists = await VFolder.findOne({ name: folderName });
    if (isFolderExists) {
      return res.json({
        success: false,
        message: "Folder name already exists!",
      });
    }
    const vFolder = await VFolder.findOneAndUpdate(
      { _id: id },
      { name: folderName }
    );

    return res.json({
      success: true,
      result: vFolder,
      message: "Folder renamed successfully!",
    });
  } catch (e) {
    console.log(e);
    return res.json({ success: false, message: "Failed renaming Folder!" });
  }
};

exports.deleteVFolder = async (req, res) => {
  try {
    const { id } = req.body;
    const isFolderExists = await VFolder.findOne({ _id: id });

    if (!isFolderExists) {
      return res.json({ success: false, message: "Folder doesn't exists!" });
    }

    await VFolder.findByIdAndUpdate({ _id: id }, { isDeleted: true });
    await ContactModel.updateMany({ vfolderId: id }, { isDeleted: true });

    return res.json({
      success: true,
      message: "Folder deleted successfully!",
    });
  } catch (e) {
    console.log(e);
    return res.json({ success: false, message: "Failed deleting Folder!" });
  }
};

// Create Config
exports.createUploadContactConfig = async (req, res) => {
  try {
    const { companyId, groupId, level, config } = req.body;

    const newConfig = new UploadContactConfig({
      companyId,
      groupId,
      level,
      config,
    });

    await newConfig.save();
    return res
      .status(201)
      .json({ success: true, uploadContactConfig: newConfig });
  } catch (err) {
    console.error("Error creating upload contact config:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update Config
exports.updateUploadContactConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedConfig = await UploadContactConfig.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
      }
    );

    if (!updatedConfig) {
      return res
        .status(404)
        .json({ success: false, message: "Configuration not found" });
    }

    return res
      .status(200)
      .json({ success: true, uploadContactConfig: updatedConfig });
  } catch (err) {
    console.error("Error updating upload contact config:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Config by company + group
// exports.getUploadContactConfig = async (req, res) => {
//   const { companyId, groupId } = req.params;

//   try {
//     let uploadContactConfig = await UploadContactConfig.findOne({
//       companyId,
//       groupId,
//     });

//     // fallback to global if group-level not found
//     if (!uploadContactConfig) {
//       uploadContactConfig = await UploadContactConfig.findOne({
//         companyId,
//         level: "global",
//       });
//       if (!uploadContactConfig) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Configuration not found" });
//       }
//     }

//     return res.status(200).json({ success: true, uploadContactConfig });
//   } catch (err) {
//     console.error("Error fetching upload contact config:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

exports.getUploadContactConfig = async (req, res) => {
  const { companyId, groupId } = req.params;

  try {
    let uploadContactConfig = null;

    if (groupId && groupId !== "null" && groupId !== "undefined") {
      // Look for group-level config
      uploadContactConfig = await UploadContactConfig.findOne({
        companyId,
        groupId,
      });
    }

    // fallback to global if group-level not found
    if (!uploadContactConfig) {
      uploadContactConfig = await UploadContactConfig.findOne({
        companyId,
        level: "global",
      });
    }

    if (!uploadContactConfig) {
      return res
        .status(404)
        .json({ success: false, message: "Configuration not found" });
    }

    return res.status(200).json({ success: true, uploadContactConfig });
  } catch (err) {
    console.error("Error fetching upload contact config:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
