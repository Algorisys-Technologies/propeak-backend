const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const rolePermissionSchema = new Schema({
  roleId: { type: Schema.Types.ObjectId, ref: "role", required: true, index: true },
  permissionId: {
    type: Schema.Types.ObjectId,
    ref: "permission",
    required: true,
    index: true,
  },
});

rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true })

module.exports = mongoose.model("rolepermission", rolePermissionSchema);
