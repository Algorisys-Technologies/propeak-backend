const User = require('../models/user/user-model');
const AppLevelAccessRight = require('../models/access-right/applevelaccessright-model');
const DefaultAppLevelAccessRight = require('../models/access-right/defaultapplevelaccessright-model');
const {
    logError,
    logInfo
  } = require('./logger');
try{
const assignDefaultRights = (req, res) => {

DefaultAppLevelAccessRight.find({})
.then((result1) => {
    // console.log("in", result1);
    var userRights = [];
    var adminRights = [];
    var ownerRights = [];
    for(var m = 0; m < result1.length; m++){
        
        let obj = {
            entitlementId: result1[m].entitlement,
            group: result1[m].group,
            access: true,
            createdBy: "By Script",
            createdOn: new Date(),
            isDeleted: false
        };
        
        if(result1[m].userRole === 'user') {
            userRights.push(obj);
        } else if(result1[m].userRole === 'admin'){
            adminRights.push(obj);
        } else if(result1[m].userRole === 'owner') {
            ownerRights.push(obj);
        }
    }
    
    User.find({})
    .then((result) => {
        // console.log("user find",result);
        let userRightsArray = [];
            for(var i = 0; i < result.length; i++){
                let arrRights = [];
                if(result[i].role === 'user') {
                    arrRights = userRights;
                } else if(result[i].role === 'admin') {
                    arrRights = adminRights;
                } else if(result[i].role === 'owner') {
                    arrRights = ownerRights;
                }
                for(let x = 0;x<arrRights.length;x++ ){
                    let userRightCopy = Object.assign({},arrRights[x]);
                    userRightCopy.userId = result[i]._id;
                    userRightsArray.push(userRightCopy);
                }
            }

            AppLevelAccessRight.insertMany(userRightsArray)
            .then((result2) => {
                // console.log("result2 insert", result2);
                logInfo(result2.length, "setUserAccessRights result");
                res.json({ msg: "Access Rights updated successfully" })
            })
            .catch((err) => {
                logError(err, "setUserAccessRights err");
            })

        })
        .catch((err) => {
            logError(err, "setUserAccessRights err");
        })
         
    })
    .catch((err) => {
      res.json({ err: errors.LOGIN_GENERAL_ERROR });
    });
} 

module.exports=assignRights={assignDefaultRights}
}
catch(e)
{
    // console.log("access error=",e);
}