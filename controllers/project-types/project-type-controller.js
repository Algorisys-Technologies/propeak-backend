const mongoose = require('mongoose');
const ProjectType = require('../../models/project-types/project-types-model');

// Create a new project type
exports.create_project_type = async (req, res) => {
    console.log("object")
  try {
    const { projectType, companyId, createdBy, createdOn } = req.body;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required.' });
    }

    if (!projectType) {
      return res.status(400).json({
        success: false,
        error: 'Project type is required.',
      });
    }

    const newProjectType = new ProjectType({
      projectType,
      companyId,
      createdBy,
      createdOn,
    });
    console.log(newProjectType)
    await newProjectType.save();
    return res.status(201).json({ success: true, projectType: newProjectType });
  } catch (error) {
    console.error('Error creating project type:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get project types by company
exports.get_project_types_by_company = async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required.' });
    }

    const projectTypes = await ProjectType.find({ companyId });


    return res.status(200).json({ success: true, projectTypes });
  } catch (error) {
    console.error('Error fetching project types for companyId:', companyId, error);
    return res.status(500).json({ success: false, error: 'Failed to load project types.' });
  }
};

// Update a project type by ID
exports.update_project_type = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedProjectType = await ProjectType.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedProjectType) {
      return res.status(404).json({ message: 'Project type not found' });
    }

    return res.status(200).json({success: true, updatedProjectType});
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Delete a project type by ID
exports.delete_project_type = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProjectType = await ProjectType.findByIdAndDelete(id);

    if (!deletedProjectType) {
      return res.status(404).json({ message: 'Project type not found' });
    }

    return res.json({ success: true, message: "Project type deleted"});
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
