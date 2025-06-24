const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const permissionSchema = new Schema({
  name: { type: String, required: true, index: true },
  featureId: { type: Schema.Types.ObjectId, ref: "feature", required: true, index: true },
});

module.exports = mongoose.model("permission", permissionSchema);
