const mongoose = require('mongoose');

// Define the database model
const AutoCloneSchema = new mongoose.Schema({
  projectId:{
      type: String  
  },
  periodType:{
    type: String
  },
  repeat: {
    type: String
  },
  endOnDate: {
    type: String
  },
  endAfterOccurances:{
    type: String
  },
  endNever:{
    type: String
  },
  monthlyType:{
    type:String
  },
  day:{
    type:String
  },
  repeatOnDateValue:{
    type:String
  },
  monthRepeatOnDayValue:{
    type:String
  },
  monthRepeatOnDayValueOccurances:{
    type:String
  },
  startDate:{
    type:String
  }
}, { versionKey: false });

// Use the unique validator plugin
// UserSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

const AutoClone = module.exports = mongoose.model('autoclone', AutoCloneSchema);