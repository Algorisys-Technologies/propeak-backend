const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const permissionSchema = new Schema({
  name: { type: String, required: true },
  featureId: { type: Schema.Types.ObjectId, ref: "feature", required: true },
});

module.exports = mongoose.model("permission", permissionSchema);
