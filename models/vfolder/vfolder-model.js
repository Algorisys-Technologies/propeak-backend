const mongoose = require("mongoose");

// Define the database model
const VFolderSchema = new mongoose.Schema({
  companyId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
  },
  name: {
    type: String,
    unique: true,
    required: true,
 
  },
  isDeleted: {
    type: Boolean,
    required: true,
  },
  created_on: {
    type: Date,
  },
  modified_on: {
    type: Date,
  },
}
);

const VFolder = (module.exports = mongoose.model("vfolder", VFolderSchema));