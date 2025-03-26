const GroupMaster = require("../../models/project/group-master-model");

// Create Group
const createGroup = async (req, res) => {
  const {
    name,
    description,
    companyId,
    createdBy,
    showInMenu = true,
  } = req.body;

  try {
    const newGroup = new GroupMaster({
      name,
      description,
      companyId,
      createdBy,
      showInMenu,
      createdOn: Date.now(),
    });

    await newGroup.save();
    return res.status(201).json({ success: true, group: newGroup });
  } catch (error) {
    console.error("Error creating group:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Groups by Company ID
const getGroups = async (req, res) => {
  const { companyId } = req.params;

  try {
    const groups = await GroupMaster.find({ companyId, isDeleted: false });

    if (!groups.length) {
      return res
        .status(404)
        .json({ success: false, message: "No groups found" });
    }

    return res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Group
const updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name, description, updatedBy, showInMenu } = req.body;

  try {
    const updatedGroup = await GroupMaster.findByIdAndUpdate(
      id,
      { name, description, updatedBy, showInMenu, updatedOn: Date.now() },
      { new: true, runValidators: true }
    );

    if (!updatedGroup) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    return res.status(200).json({ success: true, group: updatedGroup });
  } catch (error) {
    console.error("Error updating group:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Soft Delete Group
const deleteGroup = async (req, res) => {
  const { id } = req.params;
  const { updatedBy } = req.body;

  try {
    const deletedGroup = await GroupMaster.findByIdAndUpdate(
      id,
      { isDeleted: true, updatedBy, updatedOn: Date.now() },
      { new: true }
    );

    if (!deletedGroup) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
};
