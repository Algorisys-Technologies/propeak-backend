const mongoose = require('mongoose');

// Define the database model
const TokenSchema = new mongoose.Schema({
  refreshToken: {
    type: String
  },
  token: {
    type: String
  },
  userId:{
      type:String
  },
  createdOn: {
    type: Number
  },
  updatedOn: {
    type: Number
  },
  maxAge:{
      type:Number //seconds
  }
}, { versionKey: false });


const Token = module.exports = mongoose.model('token', TokenSchema);
