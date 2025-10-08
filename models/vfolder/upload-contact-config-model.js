const mongoose = require("mongoose");

const UploadContactFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  key: { type: String, required: true },
  dataType: { type: String, required: true },
  isSystem: { type: Boolean, required: true },
  isRequired: { type: Boolean, required: true },
  defaultValue: { type: mongoose.Schema.Types.Mixed, default: null },
  uiOrder: { type: Number, required: true },
});

const UploadContactConfigSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "company",
      required: true,
    },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "groupMaster" },
    level: { type: String, enum: ["global", "group"], default: "group" },
    config: [UploadContactFieldSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "UploadContactConfig",
  UploadContactConfigSchema
);
