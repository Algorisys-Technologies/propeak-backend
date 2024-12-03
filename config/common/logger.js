var winston = require("winston");
let path = require("path");
const LogLevel = { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }; // { emerg: 0, alert: 1, crit: 2, error: 3, warning: 4, notice: 5, info: 6, debug: 7 };

const currentPath = path.resolve(process.cwd(), "logs");

var logger = new winston.Logger({
  transports: [
    new winston.transports.File({
      name: "info-file",
      filename: path.resolve(currentPath, "info.log"),
      level: "info",
      json: true,
      maxsize: 5242880, //5MB
    }),
    new winston.transports.File({
      name: "error-file",
      filename: path.resolve(currentPath, "error.log"),
      level: "error",
      json: true,
      maxsize: 5242880, //5MB
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.resolve(currentPath, "exceptions.log"),
      json: true,
      maxsize: 5242880,
    }),
  ],
  exitOnError: false,
});

const logInfo = (msg, moduleName) => {
  try {
    console.log(moduleName, msg);
    if (moduleName) {
      logger.info({ moduleName: moduleName, msg: msg });
    } else {
      logger.info(msg);
    }
  } catch (e) {
    // console.log("LogInfo=",e);
  }
};
const logError = (msg, moduleName) => {
  try {
    if (moduleName) {
      logger.error({ moduleName: moduleName, msg: msg });
    } else {
      logger.error(msg);
    }
  } catch (e) {
    // console.log("LogError=",e);
  }
};

module.exports = {
  logInfo,
  logError,
};
