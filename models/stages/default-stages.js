const mongoose = require('mongoose');

// Define the database model for task stages
const DefaultStageSchema = new mongoose.Schema(
  {
    sequence: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    show: {
      type: Boolean,
      default: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { versionKey: false, timestamps: true } // Added timestamps
);

// Index for efficient querying
DefaultStageSchema.index({ companyId: 1, isDeleted: 1 });

const DefaultStage = mongoose.model('DefaultStage', DefaultStageSchema); 
module.exports = DefaultStage;
