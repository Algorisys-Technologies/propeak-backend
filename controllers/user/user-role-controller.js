const mongoose = require('mongoose');
const UserRoles= require('../../models/user/user-roles-model');
const sortData = require('../../common/common');

exports.userRole_get_all = ((req, res) => {
  UserRoles.find({})//.sort({displayName:1})
    .then((result) => {
      sortData.sort(result,'displayName');
      res.json(result);
    
    })
    .catch((err) => {
      res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
    });
})