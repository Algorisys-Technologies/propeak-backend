const mongoose = require('mongoose');
const AutoClone = require('../../models/autoclone/auto-clone-model');
const {
  logError,
  logInfo
} = require('../../common/logger');

exports.getDataSchedulerAutoClone = ((req, res) => {
  AutoClone.find({})
    .then((result1) => {
      res.json({
        result: result1
      });
    })
    .catch((err) => {
      res.json({
        err
      });

    });
})