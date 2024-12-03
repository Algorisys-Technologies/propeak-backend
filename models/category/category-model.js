const mongoose = require('mongoose');

// Define the database model
const CategorySchema = new mongoose.Schema({

  sequence:{
    type: Number
  },
  title: {
    type: String
  },
  displayName: {
    type: String
  },
 // custom:{
   // type: Boolean
  //},
  show:{
    type:Boolean
  }
}, { versionKey: false });

// Use the unique validator plugin
// UserSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

const Category = module.exports = mongoose.model('category', CategorySchema);
