const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require("mongoose");
const config = require("../server/config/config");
const cors = require("cors");
const fileUpload = require("express-fileupload");
require("dotenv").config();


const { logError, logInfo } = require("./common/logger");

// const fileUpload = require('express-fileupload');



// Use Node's default promise instead of Mongoose's promise library
mongoose.Promise = global.Promise;

console.log(process.env.NODE_ENV)
// Connect to the database
mongoose
  .connect(process.env.DB, {
    socketTimeoutMS: 0,
  })
  .then(() => logInfo("Connected to the database.", "DB"))
  .catch((err) => console.log(err));

const app = express();

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "../build")));
app.use("/uploads", express.static(process.env.UPLOAD_PATH));
const port = config.serverPort;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(fileUpload());



const uWS = require("uWebSockets.js");

const uwsApp = uWS.App();
const activeClients = new Map();


uwsApp
  .ws("/*", {
    open: (ws) => {
      console.log(`Client connected:`); 
      ws.companyId = null; 
      ws.userId = null
    },
    message: async (ws, message) => {
      console.log(activeClients)
      const msg = new TextDecoder().decode(message);
      const data = JSON.parse(msg);

      console.log(data);
      if (data.event === "register") {
      
        const { companyId, userId } = data;
  
       if(companyId && userId){
        console.log("Client registered")
        if (!activeClients.has(companyId)) {
          activeClients.set(companyId, new Set());
        }
      
        ws.companyId = companyId;
        ws.userId = userId // Assign companyId to WebSocket
        activeClients.get(companyId).add(ws);
       }
      }
      if (data.event === "update-location") {
        // PERFORM YOUR OPERATION HERE
        console.log(data.event);
        // ws.send(JSON.stringify(data));
        ws.send(JSON.stringify(data));
      }
    },
    drain: (ws) => {
      logger.debug("WebSocket backpressure: " + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
      if (ws.companyId) {
        const companyClients = activeClients.get(ws.companyId);
        if (companyClients) {
          companyClients.delete(ws);
          if (companyClients.size === 0) {
            activeClients.delete(ws.userId); // Cleanup if no clients remain
          }
        }
      }
    },
    maxPayloadLength: 16 * 1024 * 1024, // Adjust this if necessary
    compression: uWS.SHARED_COMPRESSOR, // Use compression if needed
    idleTimeout: 10,
    // Allow connections from specific origins (e.g., Remix frontend)
    origin: "*", // This allows connections from any origin, adjust as needed
  })
  .listen(9001, (token) => {
    if (token) {
      console.log("uWebSockets server started on port 9001");
      console.log(this.activeClients)
    } else {
      console.log("uWebSockets server failed to start");
    }
  });
 module.exports = { activeClients, uwsApp };

// Initialize routes middleware
try {
  app.use("/api/login", require("../server/features/login/routes/login-route"));
  app.use(
    "/api/location-history",
    require("../server/routes/location-history/location-history-route")
  );
  app.use("/api/projects", require("../server/routes/projects/projects-route"));
  app.use("/api/tasks", require("../server/routes/tasks/tasks-route"));
  app.use(
    "/api/subTasks",
    require("../server/routes/sub-tasks/subtasks-route")
  );
  app.use("/api/users", require("../server/routes/users/users-route"));
  app.use("/api/groups", require("../server/routes/groups/groups-route"));
  app.use(
    "/api/categories",
    require("../server/routes/categories/categories-route")
  );
  app.use(
    "/api/project-stages",
    require("../server/routes/project-stages/project-stages-route")
  );
  app.use(
    "/api/project-types",
    require("../server/routes/project-types/project-types-route")
  );
  app.use(
    "/api/task-stages",
    require("../server/routes/task-stages/task-stages-route")
  );
  app.use(
    "/api/task-types",
    require("../server/routes/task-types/task-types-route")
  );
  app.use("/api/subjects", require("../server/routes/subjects/subjects-route"));
  app.use(
    "/api/companies",
    require("../server/routes/companies/companies-route")
  );
  app.use("/api/messages", require("../server/routes/messages/messages-route"));
  app.use(
    "/api/uploadFiles",
    require("../server/routes/upload-files/upload-files-route")
  );
  app.use(
    "/api/cloneprojects",
    require("../server/routes/projects/project-clone-route")
  );
  app.use(
    "/api/clonetasks",
    require("../server/routes/tasks/task-clone-route")
  );
  app.use("/api/taskTypes", require("../server/routes/tasks/task-types-route"));
  app.use("/api/userRoles", require("../server/routes/users/user-roles-route"));
  app.use("/api/reports", require("../server/routes/reports/reports-route"));
  app.use(
    "/api/scheduler",
    require("../server/routes/scheduler/scheduler-route")
  );
  app.use(
    "/api/dsrScheduler",
    require("../server/routes/dsr-scheduler/dsr-scheduler-route")
  );
  app.use(
    "/api/holiday",
    require("../server/routes/holiday/holiday-scheduler-route")
  );
  app.use(
    "/api/projectAutoCloneScheduler",
    require("../server/routes/project-auto-clone-scheduler/project-auto-clone-scheduler-route")
  );
  app.use(
    "/api/favoriteprojects",
    require("../server/routes/projects/favorite-project-route")
  );
  app.use(
    "/api/notifications",
    require("../server/routes/notification/notification-route")
  );
  app.use(
    "/api/reminders",
    require("../server/routes/reminder/reminder-route")
  );
  app.use(
    "/api/accessRights",
    require("../server/routes/access-rights/access-rights-route")
  );
  app.use(
    "/api/autoClones",
    require("../server/routes/auto-clones/auto-clones-route")
  );
  app.use(
    "/api/clearTokenScheduler",
    require("../server/routes/clear-token-scheduler/clear-token-scheduler-route")
  );
  app.use(
    "/api/appLevelAccessRight",
    require("../server/routes/access-rights/app-level-access-right-route")
  );
  app.use(
    "/api/mynotifications",
    require("../server/features/my-notifications/routes/my-notifications-route")
  );
  app.use("/api/leaves", require("../server/routes/leaves/leaves-route"));
  app.use("/api/burndown", require("../server/routes/burndown/burndown-route"));
  app.use(
    "/api/uploadProfile",
    require("../server/routes/upload-files/upload-profile-picture-route")
  );
  app.use("/api/ProfilePic", express.static(path.join(__dirname, "/uploads")));
  app.use(
    "/api/userAccountUnlockScheduler",
    require("../server/routes/user-account-unlock-scheduler/user-account-unlock-scheduler-route")
  );
  app.use(
    "/api/dailySummaryReportScheduler",
    require("../server/routes/daily-summary-report-scheduler/daily-summary-report-scheduler-route")
  );
  app.use(
    "/api/globalLevelRepository",
    require("../server/features/global-level-repository/routes/golbal-repository-route")
  );
  app.use(
    "/api/pendingleaveapprovescheduler",
    require("../server/routes/pendingleave-approve-scheduler/pendingleave-approve-scheduler-route")
  );
  app.use("/api/accounts", require("../server/routes/account/account-route"));
  app.use("/api/emailConfig", require("../server/routes/email-config/email-config-route"));

  app.use("/api/contacts", require("../server/routes/contact/contact-route"));
  app.use("/api/roles", require("../server/routes/role/role-route"));
  app.use("/api/features", require("../server/routes/feature/feature-route"));
  app.use(
    "/api/permissions",
    require("../server/routes/permission/permission-route")
  );
  app.use(
    "/api/rolepermissions",
    require("../server/routes/role-permission/role-permission-route")
  );
  app.use(
    "/api/taskemailconfig",
    require("../server/routes/task-email-config/task-email-config-route")
  );
  app.use(
    "/api/globalSearch",
    require("../server/routes/global-search/global-search-route")
  );
} catch (e) {
  console.log(e);
}

// Use express's default error handling middleware
app.use((err, req, res, next) => {
  // console.log(err);
  if (res.headersSent) return next(err);
  res.status(400).json({ err });
});

app.listen(port, () => {
  console.log(`Server running at port ${port}`);
  logInfo(`Listening on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.message);
});

