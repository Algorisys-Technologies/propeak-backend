const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const rolePermissionSchema = new Schema({
  roleId: { type: Schema.Types.ObjectId, ref: "role", required: true },
  permissionId: {
    type: Schema.Types.ObjectId,
    ref: "permission",
    required: true,
  },
});

module.exports = mongoose.model("rolepermission", rolePermissionSchema);
