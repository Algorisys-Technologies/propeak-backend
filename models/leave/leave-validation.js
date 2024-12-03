const config = require("../../config/config");
var $app = "";
var leavesPerMonth = "";
var leaves = {
    isEligible: false,
    balance: 0,
    leavesTaken: 0,
    workingDays: 0
}

var leaveValidation = {
    init: function () {
        $app = this;
    },
    checkForBalance: function (leavesTaken, workingDays, leaveType, totalLeavesDefault, monthlyLeaves, monthStart) {
        let totalDaysLeaves = 0;
        let currentMonth = new Date().getMonth();
        // console.log("leaveType",leaveType)
        let totalpendingLeaves = 0;
        let monthLeaves = [];
        if (parseInt(workingDays) > 1) {
            totalDaysLeaves = parseInt(workingDays);
        }
        if (monthlyLeaves !== "") {
            let length = 0;
            monthLeaves = monthlyLeaves.split(",");
            // console.log("monthLeaves",monthLeaves)
            // console.log("monthStart",monthStart)
            if (monthStart === 3) {

                // let difference = monthLeaves.length - currentMonth;
                // length = difference - 1 // if the year starts from apr
                length = config.months.indexOf(currentMonth);
                // console.log(" in iflength",length)
            }

            else {
                length = currentMonth; // if the year start from january
                // console.log(" in elselength",length)
            }
           
            for (var i = 0; i < length; i++) {
                console.log(monthLeaves[i]);
                totalpendingLeaves = totalpendingLeaves + parseInt(monthLeaves[i]);
            }
            // console.log(" totalpendingLeaves ", totalpendingLeaves )
            // console.log(" leavesTaken ",leavesTaken )
            // console.log("totalDaysLeaves", totalDaysLeaves )
            leaves.balance = totalpendingLeaves - leavesTaken - totalDaysLeaves;
            // console.log(" In if leaves.balance ", leaves.balance )
        } else {
            leaves.balance = totalLeavesDefault - leavesTaken - totalDaysLeaves;
            // console.log(" In else leaves.balance ", leaves.balance )
        }

        if (leaves.balance > 0) {
            leaves.isEligible = true;
        }
        else{
            leaves.isEligible = false;
        }
        return leaves;
    }
}
module.exports = leaveValidation;