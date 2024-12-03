try {
  const { logError, logInfo } = require("./logger");

  const MyNotification = require("../models/my-notification/my-notification");
  const rabbitMQ = require("../rabbitmq");

  const addMyNotification = async (dataObject) => {
    let myNotificationObject = new MyNotification({
      subject: dataObject.subject,
      url: dataObject.url,
      userId: dataObject.userId,
      read: false,
      createdBy: "By Script",
      createdOn: new Date(),
      modifiedBy: "By Script",
      modifiedOn: new Date(),
    });

    rabbitMQ
      .sendMessageToQueue(
        myNotificationObject,
        "notification_queue",
        "notifRoute"
      )
      .then((resp) => {
        logInfo("message sent to the notification_queue:" + resp);
      })
      .catch((err) => {
        logInfo("err", err);
      });

    myNotificationObject
      .save()
      .then((result) => {
        logInfo("result", result);
      })
      .catch((err) => {
        logError("err", err);
      });
  };

  module.exports = {
    addMyNotification,
  };
} catch (e) {
  logError("err add-my-notification", e);
}
