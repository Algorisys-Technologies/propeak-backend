try {
    const { logError, logInfo } = require('../../../common/logger');

    const MyNotification = require('../../../models/my-notification/my-notification');

    exports.getMyNotifications = ((req, res) => {
        try {
            let userId = req.userInfo.userId;
            // console.log("userId",userId);

            MyNotification.find({ userId: userId, read: false })
                .then((result) => {
                    logInfo(result.length, "getMyNotifications result ")
                    // console.log("result",result);
                    res.json(result);

                })
                .catch((err) => {
                    logError("getMyNotifications err", err);
                })
        }
        catch (e) {
            logError("getMyNotifications e", e);
        }
    })

    exports.markNotificationRead = ((req, res) => {
        try {
            // console.log("req.params.myNotificationId",req.params.myNotificationId);
            MyNotification.findOneAndUpdate({ _id: req.body.myNotificationId }, { $set: { 'read': true } }, { 'new': true })
                .then((result) => {
                    logInfo(result.length, "markNotificationRead result");
                    res.json({
                        data: result,
                        msg: "Updated successfully"
                    });

                })
                .catch((err) => {
                    logError("markNotificationRead err", err);
                })
        }
        catch (e) {
            logError("markNotificationRead e", e);
        }
    })
}
catch (e) {
    console.log("my-notifications-controller error", e);
}