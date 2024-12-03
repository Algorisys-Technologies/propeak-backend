const mongoose = require('mongoose');

// Define the database model
const BurndownSchema = new mongoose.Schema({
    projectId: {
        type: String
    },
    date: {
        type: Date
    },
    todo: {
        type: Number
    },
    inprogress: {
        type: Number
    },
    completed: {
        type: Number
    },
    todoStoryPoint: {
        type: Number
    },
    inprogressStoryPoint: {
        type: Number
    },
    completedStoryPoint: {
        type: Number
    },
    isDeleted: {
        type: Boolean
    },
}, { collection: 'burndown' }, {
        versionKey: false
    });

const Burndown = module.exports = mongoose.model('burndown', BurndownSchema);