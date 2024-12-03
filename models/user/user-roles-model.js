const mongoose = require('mongoose');

// Define the database model
const UserRoleSchema = new mongoose.Schema({
  roleId: {
    type: mongoose.Types.ObjectId,
    ref: "role"
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "user"
  }
}, {
  versionKey: false
});

// Use the unique validator plugin
// UserSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

const UserRoles = module.exports = mongoose.model('userrole', UserRoleSchema);