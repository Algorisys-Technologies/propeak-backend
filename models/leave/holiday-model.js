const mongoose = require('mongoose');
const HolidaySchema = new mongoose.Schema({
    year: { type: Number },
    month: { type: Number },
    monthName: { type: String },
    date: { type: Number },
    description: { type: String },
    description: { type: String },
    type: { type: String },
    frequency: { type: String },
    all: { type: String },
    day: { type: String },
    dayName: { type: String },
    isActive: { type: String },
})
const Holiday = module.exports = mongoose.model("holidays", HolidaySchema);