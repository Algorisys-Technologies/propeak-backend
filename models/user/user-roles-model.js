const mongoose = require('mongoose');

// Define the database model
const UserRoleSchema = new mongoose.Schema({
  roleId: {
    type: mongoose.Types.ObjectId,
    ref: "role",
    index: true
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "user",
    index: true,
  }
}, {
  versionKey: false
});

UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });

// Use the unique validator plugin
// UserSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

const UserRoles = module.exports = mongoose.model('userrole', UserRoleSchema);