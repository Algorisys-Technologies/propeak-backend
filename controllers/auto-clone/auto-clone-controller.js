const mongoose = require('mongoose');
const AutoClone = require('../../models/autoclone/auto-clone-model');
const { logError, logInfo } = require('../../common/logger');
const access = require('../../check-entitlements');

const errors = {
    "NOT_AUTHORIZED": "Your are not authorized"
};

// CREATE
exports.createAutoClone = ((req, res) => {
    try { 
        let userRole = req.userInfo.userRole.toLowerCase();
        let accessCheck = access.checkEntitlements(userRole);
        if(accessCheck === false) {
            res.json({ err: errors.NOT_AUTHORIZED });
            return;
        } 
        logInfo(req.body, "createAutoClone");
        let newAutoClone = new AutoClone({
            projectId:req.body.projectId,
            periodType:req.body.periodType,
            repeat: req.body.repeat,
            endNever:req.body.endNever,
            endOnDate:req.body.endOnDate,
            endAfterOccurances:req.body.endAfterOccurances,
            monthlyType:req.body.monthlyType,
            day:req.body.day,
            repeatOnDateValue:req.body.repeatOnDateValue,
            monthRepeatOnDayValue:req.body.monthRepeatOnDayValue,
            monthRepeatOnDayValueOccurances:req.body.monthRepeatOnDayValueOccurances,
            startDate:req.body.startDate
        });
        newAutoClone.save()
        .then((result) => {
            // console.log("result",result);
        res.json({
            success: true,
            msg: `Successfully added!` 
            });
        })
        .catch((err) => {
            res.json({ err  });
        });
    }
    catch(e){
        logError(e,"createAutoClone");
    }
});

    //Get By Id
exports.getAutoClonByProjectId = ((req, res) => {
    let userRole = req.userInfo.userRole.toLowerCase();
    let accessCheck = access.checkEntitlements(userRole);
    if(accessCheck === false) {
        res.json({ err: errors.NOT_AUTHORIZED });
        return;
    }
    AutoClone.find({projectId:req.body.projectId })
    .then((result) => {
        res.json(result)
    })
})

exports.updateAutoClone = ((req, res) => {
    logInfo(req.body, "updateAutoClone");
    let userRole = req.userInfo.userRole.toLowerCase();
    let accessCheck = access.checkEntitlements(userRole);
    if(accessCheck === false) {
        res.json({ err: errors.NOT_AUTHORIZED });
        return;
    }
    let updatedAutoClone = {
        _id:req.body._id,
        projectId:req.body.projectId,
        periodType:req.body.periodType,
        repeat: req.body.repeat,
        endNever:req.body.endNever,
        endOnDate:req.body.endOnDate,
        endAfterOccurances:req.body.endAfterOccurances,
        monthlyType:req.body.monthlyType,
        day:req.body.day,
        repeatOnDateValue:req.body.repeatOnDateValue,
        monthRepeatOnDayValue:req.body.monthRepeatOnDayValue,
        monthRepeatOnDayValueOccurances:req.body.monthRepeatOnDayValueOccurances,
        startDate:req.body.startDate
    };
    AutoClone.findOneAndUpdate(
        { _id: updatedAutoClone._id }, updatedAutoClone, { context: 'query' })
        
        .then((result) => {
            // console.log("result",result);
            res.json({
                success: true,
                msg: `Successfully updated!`
            });
        }) .catch((err) => {
            res.json({ err  }); 
        });
})

   
