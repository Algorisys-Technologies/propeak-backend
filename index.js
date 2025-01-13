const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require("mongoose");
const config = require("./config/config");
const cors = require("cors");
const fileUpload = require("express-fileupload");
require("dotenv").config();

const { logError, logInfo } = require("./common/logger");

// const fileUpload = require('express-fileupload');

// Use Node's default promise instead of Mongoose's promise library
mongoose.Promise = global.Promise;

console.log(process.env.NODE_ENV);
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
      ws.userId = null;
    },
    message: async (ws, message) => {
      console.log(activeClients);
      const msg = new TextDecoder().decode(message);
      const data = JSON.parse(msg);

      console.log(data);
      if (data.event === "register") {
        const { companyId, userId } = data;

        if (companyId && userId) {
          console.log("Client registered");
          if (!activeClients.has(companyId)) {
            activeClients.set(companyId, new Set());
          }

          ws.companyId = companyId;
          ws.userId = userId; // Assign companyId to WebSocket
          activeClients.get(companyId).add(ws);
        }
      
        ws.companyId = companyId;
        ws.userId = userId // Assign companyId to WebSocket
        activeClients.get(companyId).add(ws);
       

       console.log(activeClients)
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
      console.log(this.activeClients);
    } else {
      console.log("uWebSockets server failed to start");
    }
  });
module.exports = { activeClients, uwsApp };

// Initialize routes middleware
try {
  app.use("/api/login", require("./features/login/routes/login-route"));
  app.use(
    "/api/location-history",
    require("./routes/location-history/location-history-route")
  );
  app.use("/api/projects", require("./routes/projects/projects-route"));
  app.use("/api/tasks", require("./routes/tasks/tasks-route"));
  app.use("/api/subTasks", require("./routes/sub-tasks/subtasks-route"));
  app.use("/api/users", require("./routes/users/users-route"));
  app.use("/api/groups", require("./routes/groups/groups-route"));
  app.use("/api/categories", require("./routes/categories/categories-route"));
  app.use(
    "/api/project-stages",
    require("./routes/project-stages/project-stages-route")
  );
  app.use(
    "/api/project-types",
    require("./routes/project-types/project-types-route")
  );
  app.use(
    "/api/task-stages",
    require("./routes/task-stages/task-stages-route")
  );
  app.use("/api/task-types", require("./routes/task-types/task-types-route"));
  app.use("/api/subjects", require("./routes/subjects/subjects-route"));
  app.use("/api/companies", require("./routes/companies/companies-route"));
  app.use("/api/messages", require("./routes/messages/messages-route"));
  app.use(
    "/api/uploadFiles",
    require("./routes/upload-files/upload-files-route")
  );
  app.use(
    "/api/cloneprojects",
    require("./routes/projects/project-clone-route")
  );
  app.use("/api/clonetasks", require("./routes/tasks/task-clone-route"));
  app.use("/api/taskTypes", require("./routes/tasks/task-types-route"));
  app.use("/api/userRoles", require("./routes/users/user-roles-route"));
  app.use("/api/reports", require("./routes/reports/reports-route"));
  app.use("/api/scheduler", require("./routes/scheduler/scheduler-route"));
  app.use(
    "/api/dsrScheduler",
    require("./routes/dsr-scheduler/dsr-scheduler-route")
  );
  app.use("/api/holiday", require("./routes/holiday/holiday-scheduler-route"));
  app.use(
    "/api/projectAutoCloneScheduler",
    require("./routes/project-auto-clone-scheduler/project-auto-clone-scheduler-route")
  );
  app.use(
    "/api/favoriteprojects",
    require("./routes/projects/favorite-project-route")
  );
  app.use(
    "/api/notifications",
    require("./routes/notification/notification-route")
  );
  app.use("/api/reminders", require("./routes/reminder/reminder-route"));
  app.use(
    "/api/accessRights",
    require("./routes/access-rights/access-rights-route")
  );
  app.use("/api/autoClones", require("./routes/auto-clones/auto-clones-route"));
  app.use(
    "/api/clearTokenScheduler",
    require("./routes/clear-token-scheduler/clear-token-scheduler-route")
  );
  app.use(
    "/api/appLevelAccessRight",
    require("./routes/access-rights/app-level-access-right-route")
  );
  app.use(
    "/api/mynotifications",
    require("./features/my-notifications/routes/my-notifications-route")
  );
  app.use("/api/leaves", require("./routes/leaves/leaves-route"));
  app.use("/api/burndown", require("./routes/burndown/burndown-route"));
  app.use(
    "/api/uploadProfile",
    require("./routes/upload-files/upload-profile-picture-route")
  );
  app.use("/api/ProfilePic", express.static(path.join(__dirname, "/uploads")));
  app.use(
    "/api/userAccountUnlockScheduler",
    require("./routes/user-account-unlock-scheduler/user-account-unlock-scheduler-route")
  );
  app.use(
    "/api/dailySummaryReportScheduler",
    require("./routes/daily-summary-report-scheduler/daily-summary-report-scheduler-route")
  );
  app.use(
    "/api/globalLevelRepository",
    require("./features/global-level-repository/routes/golbal-repository-route")
  );
  app.use(
    "/api/pendingleaveapprovescheduler",
    require("./routes/pendingleave-approve-scheduler/pendingleave-approve-scheduler-route")
  );
  app.use("/api/accounts", require("./routes/account/account-route"));
  app.use(
    "/api/emailConfig",
    require("./routes/email-config/email-config-route")
  );

  app.use("/api/contacts", require("./routes/contact/contact-route"));
  app.use("/api/roles", require("./routes/role/role-route"));
  app.use("/api/features", require("./routes/feature/feature-route"));
  app.use("/api/permissions", require("./routes/permission/permission-route"));
  app.use(
    "/api/rolepermissions",
    require("./routes/role-permission/role-permission-route")
  );
  app.use(
    "/api/taskemailconfig",
    require("./routes/task-email-config/task-email-config-route")
  );
  app.use(
    "/api/globalSearch",
    require("./routes/global-search/global-search-route")
  );
  app.use(
    "/api/indiamart-integration",
    require("./routes/indiamart-integration/indiamart-integration-route")
  );
  app.use(
    "/api/indiamartLeads",
    require("./routes/indiamart-config/indiamart-config-route")
  );
  app.use(
    "/api/product",
    require("./routes/product/product-route")
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
