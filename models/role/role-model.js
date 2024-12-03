const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roleSchema = new Schema({
  name: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId ,  ref: "company"}
});

module.exports = mongoose.model("role", roleSchema);
