const ContactModel = require("../../models/contact/contact-model");
const VFolder = require("../../models/vfolder/vfolder-model");

exports.getVFolders = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { q } = req.query;

    const searchFilter = q
      ? { name: { $regex: new RegExp(q, "i") } }
      : {};

    const vFolders = await VFolder.find({ 
      companyId, 
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      ...searchFilter,
    });

    const totalVFolder = Math.ceil(
        (await VFolder.countDocuments({
          companyId,
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
          ...searchFilter
        }))
      );
    return res.json({ success: true, result: vFolders, totalVFolder: totalVFolder });
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
    await ContactModel.updateMany({vfolderId: id}, {isDeleted: true});
    
    return res.json({
      success: true,
      message: "Folder deleted successfully!",
    });
  } catch (e) {
    console.log(e);
    return res.json({ success: false, message: "Failed deleting Folder!" });
  }
};
