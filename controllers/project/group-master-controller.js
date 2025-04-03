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
    return res.status(201).json({ success: true, group: newGroup, message: `${newGroup.name} Group added successfully` });
  } catch (error) {
    console.error("Error creating group:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Groups by Company ID
const getGroups = async (req, res) => {
  const { companyId } = req.params;
  const { q } = req.query; 

  try {
    const filter = { 
      isDeleted: false, 
      companyId 
    };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } } 
      ];
    }

    const [groups, totalCount] = await Promise.all([
      GroupMaster.find(filter),
      GroupMaster.countDocuments(filter),
    ]);

    if (!groups.length) {
      return res.status(404).json({ success: false, message: "No groups found" });
    }

    return res.status(200).json({ success: true, groups, totalCount });
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

    return res.status(200).json({ success: true, group: updatedGroup, message: `${updatedGroup.name} Group updated successfully` });
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
