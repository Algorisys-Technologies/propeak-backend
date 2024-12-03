const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const featureSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  route: { type: String, required: true },
  isSystem: {type: Boolean, required: true}
});

module.exports = mongoose.model("feature", featureSchema);
