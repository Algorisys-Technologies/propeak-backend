const mongoose = require('mongoose');
const TaskType = require('../../models/task/task-type-model');
const sortData = require('../../common/common');

exports.taskTypes_get_all = ((req, res) => {
  TaskType.find({})//.sort({displayName:1})
  .then((result) => {
   sortData.sort(result,'displayName');
    res.json(result);
  })
  .catch((err) => {
    res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
  });
})