const amqp = require("amqplib");
const path = require("path");
const config = require("../config/config");
const { createObjectCsvWriter } = require("csv-writer");
const {
  generateHtmlPdf,
  sendExportNotificationAndEmail,
  getMonthlyGlobalTaskReport,
  getMonthlyGlobalUserReport,
  getMonthlyProjectTaskReport,
  getMonthlyProjectUserReport,
} = require("../controllers/reports/reports-controller");
const {
  rabbitMQ_exchangeName,
  rabbitMQ_connectionKey,
  companyCode,
} = require("../config/config");
const DateUtil = require("../utils/date-util");
const mongoose = require("mongoose");
require("../models/role/role-model");
require("../models/product/product-model");

const exchange = rabbitMQ_exchangeName;
const queue = companyCode + "export_queue";
const routingKey = companyCode + "exportRoute";
let uploadFolder = config.UPLOAD_PATH;

// ✅ Centralized RabbitMQ connect with retry
async function connect() {
  const retries = 5;
  for (let i = 0; i < retries; i++) {
    try {
      // const connection = await amqp.connect(rabbitMQ_connectionKey, {
      //   heartbeat: 120,
      //   frameMax: 131072,
      // });
      const connection = await amqp.connect(rabbitMQ_connectionKey);
      console.log("✅ Connected to RabbitMQ");
      return connection;
    } catch (err) {
      console.error(
        `Retrying RabbitMQ connection (${i + 1}/${retries})...`,
        err.message
      );
      console.error("RabbitMQ connect failed:", {
        message: err.message,
        stack: err.stack,
        code: err.code,
        address: err.address,
        port: err.port,
      });
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  throw new Error("❌ Unable to connect to RabbitMQ after multiple attempts");
}

// ✅ Worker bootstrap
(async function connectRabbitMQ() {
  try {
    const connection = await connect();

    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err.message);
    });

    connection.on("close", () => {
      console.warn("RabbitMQ connection closed. Reconnecting in 5s...");
      setTimeout(connectRabbitMQ, 5000);
    });

    const channel = await connection.createChannel();
    await channel.assertExchange(exchange, "direct", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, routingKey);

    console.log("📥 Export Worker listening for messages...");

    // ✅ MongoDB connection (only once)
    if (mongoose.connection.readyState === 0) {
      mongoose.connect(process.env.DB);
      mongoose.connection.once("open", () => {
        console.log("✅ MongoDB connected in Worker");
      });
      mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB connection error in Worker:", err);
      });
    }

    // ✅ Consume queue
    channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        const {
          type,
          defaultHeaders,
          filename,
          userId,
          companyId,
          projectId,
          email,
          reportParams,
          role,
          loginUserId,
          configHeaders,
        } = payload;

        console.log("Received job:", { companyId, role, userId, reportParams });

        // --- Fetch report data
        let resultTaskReport;
        switch (reportParams?.reportType) {
          case "global-task":
            resultTaskReport = await getMonthlyGlobalTaskReport({
              companyId,
              role,
              userId,
              reportParams,
            });
            break;
          case "global-user":
            resultTaskReport = await getMonthlyGlobalUserReport({
              companyId,
              role,
              userId,
              reportParams,
            });
            break;
          case "project-task":
            resultTaskReport = await getMonthlyProjectTaskReport({
              projectId,
              reportParams,
              userId,
              role,
            });
            break;
          case "project-user":
            resultTaskReport = await getMonthlyProjectUserReport({
              projectId,
              reportParams,
              userId,
              role,
            });
            break;
          default:
            throw new Error("Invalid report type");
        }

        if (!resultTaskReport.success)
          throw new Error(resultTaskReport.err || "Data fetch failed");

        const responseWithoutPagination = resultTaskReport.data || [];
        const customFields = resultTaskReport.customFields || [];

        const extractHeaders = (data) =>
          data.map((field) => ({
            title: field.key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
            accessor: field.key,
          }));

        const dynamicHeaders =
          customFields.length > 0 ? extractHeaders(customFields) : [];
        const mergeHeaders = (defaultHeaders, dynamicHeaders) => {
          const seen = new Set(defaultHeaders.map((h) => h.accessor));
          return [
            ...defaultHeaders,
            ...dynamicHeaders.filter((h) => !seen.has(h.accessor)),
          ];
        };

        const mergedHeaders = mergeHeaders(defaultHeaders, dynamicHeaders);

        const data = responseWithoutPagination.map((task) => ({
          ...task,
          projectTitle: task.projectId?.title || "Unknown Project",
          userName: task.userId?.name || "Unknown User",
          startDate: DateUtil.DateToString(task.startDate),
          endDate: DateUtil.DateToString(task.endDate),
          ...task.customFields,
        }));

        let headers;
        if (
          ["project-task", "project-user"].includes(reportParams?.reportType)
        ) {
          headers = configHeaders?.length > 0 ? configHeaders : mergedHeaders;
        } else {
          headers = mergedHeaders || defaultHeaders;
        }

        const filePath = path.resolve(uploadFolder, `${filename}.${type}`);
        const flatData = generateFlatData(data);

        if (type === "csv") {
          await generateCsv(filePath, headers, flatData);
        } else if (type === "pdf") {
          await generateHtmlPdf({ filePath, headers, flatData, filename });
        }

        const downloadUrl = `${process.env.DOWNLOAD_REPORT_URL}/${filename}.${type}`;
        await sendExportNotificationAndEmail({
          downloadUrl,
          type,
          filename,
          userId: loginUserId || userId,
          email,
          companyId,
        });

        channel.ack(msg);
      } catch (err) {
        console.error("❌ Error processing export job:", err.message);
        channel.nack(msg, false, false);
      }
    });
  } catch (err) {
    console.error("❌ Failed to connect to RabbitMQ:", err.message);
    setTimeout(connectRabbitMQ, 5000);
  }
})();

// --- Helpers ---
function generateFlatData(data) {
  return data.map((item) => {
    const customFields = item.customFieldValues || {};
    const interestedProducts = Array.isArray(item.interested_products)
      ? item.interested_products.map((p) => p?.product_id?.name).join(", ")
      : "";
    return {
      ...item,
      ...customFields,
      interested_products: interestedProducts,
      userId: item.userId?.name || "",
      projectId: item.projectId?.title || "",
    };
  });
}

async function generateCsv(filePath, headers, flatData) {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers.map((h) => ({ id: h.accessor, title: h.title })),
  });
  await csvWriter.writeRecords(flatData);
}

// const amqp = require("amqplib");
// const path = require("path");
// const config = require("../config/config");
// const { createObjectCsvWriter } = require("csv-writer");
// const {
//   generateHtmlPdf,
//   sendExportNotificationAndEmail,
//   getMonthlyGlobalTaskReport,
//   getMonthlyGlobalUserReport,
//   getMonthlyProjectTaskReport,
//   getMonthlyProjectUserReport,
// } = require("../controllers/reports/reports-controller");
// const {
//   rabbitMQ_exchangeName,
//   rabbitMQ_connectionKey,
//   companyCode,
// } = require("../config/config");
// const DateUtil = require("../utils/date-util");

// const exchange = rabbitMQ_exchangeName;
// const queue = companyCode + "export_queue";
// const routingKey = companyCode + "exportRoute";
// let uploadFolder = config.UPLOAD_PATH;
// const mongoose = require("mongoose");
// require("../models/role/role-model");
// require("../models/product/product-model");

// // (async () => {
// (async function connectRabbitMQ() {
//   try {
//     const connection = await amqp.connect(rabbitMQ_connectionKey, {
//       heartbeat: 60,
//       frameMax: 131072,
//     });
//     console.log("Connected to RabbitMQ");

//     // handle reconnect
//     connection.on("error", (err) => {
//       console.error(" RabbitMQ connection error:", err.message);
//     });

//     connection.on("close", () => {
//       console.warn(" RabbitMQ connection closed. Reconnecting in 5s...");
//       setTimeout(connectRabbitMQ, 5000);
//     });

//     const channel = await connection.createChannel();

//     await channel.assertExchange(exchange, "direct", { durable: true });
//     await channel.assertQueue(queue, { durable: true });
//     await channel.bindQueue(queue, exchange, routingKey);

//     console.log("Export Worker listening for messages...");

//     mongoose.connect(process.env.DB);

//     mongoose.connection.once("open", () => {
//       console.log("✅ MongoDB connected in Worker");
//     });

//     mongoose.connection.on("error", (err) => {
//       console.error("❌ MongoDB connection error in Worker:", err);
//     });

//     channel.consume(queue, async (msg) => {
//       if (!msg) return;

//       try {
//         const payload = JSON.parse(msg.content.toString());
//         const {
//           type,
//           defaultHeaders,
//           filename,
//           userId,
//           companyId,
//           projectId,
//           email,
//           reportParams,
//           role,
//           loginUserId,
//           configHeaders,
//         } = payload;

//         console.log(
//           "ALL...",
//           "companyId",
//           companyId,
//           "role",
//           role,
//           "userId",
//           userId,
//           "reportParams",
//           reportParams
//         );

//         // let resultTaskReport;
//         // if (reportParams?.reportType === "global-task") {
//         //   resultTaskReport = await getMonthlyGlobalTaskReport({
//         //     companyId,
//         //     role,
//         //     userId,
//         //     reportParams,
//         //   });
//         // } else if (reportParams?.reportType === "global-user") {
//         //   console.log("global user", reportParams?.reportType);
//         //   resultTaskReport = await getMonthlyGlobalUserReport({
//         //     companyId,
//         //     role,
//         //     userId,
//         //     reportParams,
//         //   });
//         // } else if (reportParams?.reportType === "project-task") {
//         //   resultTaskReport = await getMonthlyProjectTaskReport({
//         //     projectId,
//         //     reportParams,
//         //     role,
//         //   });
//         // } else {
//         //   resultTaskReport = await getMonthlyProjectUserReport({
//         //     projectId,
//         //     reportParams,
//         //     userId,
//         //     role,
//         //   });
//         // }

//         let resultTaskReport;

//         switch (reportParams?.reportType) {
//           case "global-task":
//             resultTaskReport = await getMonthlyGlobalTaskReport({
//               companyId,
//               role,
//               userId,
//               reportParams,
//             });
//             break;
//           case "global-user":
//             resultTaskReport = await getMonthlyGlobalUserReport({
//               companyId,
//               role,
//               userId,
//               reportParams,
//             });
//             break;
//           case "project-task":
//             resultTaskReport = await getMonthlyProjectTaskReport({
//               projectId,
//               reportParams,
//               userId,
//               role,
//             });
//             break;
//           case "project-user":
//             resultTaskReport = await getMonthlyProjectUserReport({
//               projectId,
//               reportParams,
//               userId,
//               role,
//             });
//             break;
//           default:
//             throw new Error("Invalid report type");
//         }

//         if (!resultTaskReport.success)
//           throw new Error(resultTaskReport.err || "Data fetch failed");

//         //console.log("resultTaskReport...", resultTaskReport.totalCount);

//         //const data = resultTaskReport.data;
//         const responseWithoutPagination = resultTaskReport.data || [];

//         const customFields = resultTaskReport.customFields || [];

//         function extractHeaders(data) {
//           return data.map((field) => ({
//             title: field.key
//               .replace(/_/g, " ")
//               .replace(/\b\w/g, (c) => c.toUpperCase()),
//             accessor: field.key,
//           }));
//         }

//         const dynamicHeaders =
//           customFields.length > 0 ? extractHeaders(customFields) : [];

//         // function mergeHeaders(defaultHeaders, dynamicHeaders) {
//         //   return [
//         //     ...defaultHeaders,
//         //     ...dynamicHeaders.filter(
//         //       (dyn) =>
//         //         !defaultHeaders.some((def) => def.accessor === dyn.accessor)
//         //     ),
//         //   ];
//         // }

//         function mergeHeaders(defaultHeaders, dynamicHeaders) {
//           const seen = new Set(defaultHeaders.map((h) => h.accessor));
//           const filtered = dynamicHeaders.filter((h) => !seen.has(h.accessor));
//           return [...defaultHeaders, ...filtered];
//         }

//         const mergedHeaders = mergeHeaders(defaultHeaders, dynamicHeaders);

//         const data = responseWithoutPagination.map((task) => {
//           const projectsTitle = task.projectId?.title || "Unknown Project";
//           const usersName = task.userId?.name || "Unknown User";
//           const startDateFormatted = DateUtil.DateToString(task.startDate);
//           const endDateFormatted = DateUtil.DateToString(task.endDate);
//           return {
//             ...task,
//             projectTitle: projectsTitle,
//             userName: usersName,
//             startDate: startDateFormatted,
//             endDate: endDateFormatted,
//             ...task.customFields,
//           };
//         });
//         //const headers = mergedHeaders || defaultHeaders;

//         let headers;

//         if (
//           reportParams?.reportType === "project-task" ||
//           reportParams?.reportType === "project-user"
//         ) {
//           headers = configHeaders?.length > 0 ? configHeaders : mergedHeaders;
//         } else {
//           headers = mergedHeaders || defaultHeaders;
//         }

//         const filePath = path.resolve(uploadFolder, `${filename}.${type}`);

//         // Generate flat data for the report
//         const flatData = generateFlatData(data);

//         // Generate the report file
//         if (type === "csv") {
//           await generateCsv(filePath, headers, flatData);
//         } else if (type === "pdf") {
//           await generateHtmlPdf({ filePath, headers, flatData, filename });
//         }

//         // Generate the download URL
//         const downloadUrl = `${process.env.DOWNLOAD_REPORT_URL}/${filename}.${type}`;

//         // console.log(
//         //   "All...",
//         //   downloadUrl,
//         //   type,
//         //   filename,
//         //   userId,
//         //   email,
//         //   companyId
//         // );

//         console.log(loginUserId, "from login user");

//         // Send notification and email
//         await sendExportNotificationAndEmail({
//           downloadUrl,
//           type,
//           filename,
//           userId: loginUserId || userId,
//           email,
//           companyId,
//         });

//         channel.ack(msg); // Acknowledge message after successful processing
//       } catch (err) {
//         console.error("Error processing export job:", err);
//         channel.nack(msg, false, false); // Negative acknowledge if there's an error
//       }
//     });
//   } catch (err) {
//     console.error("❌ Failed to connect to RabbitMQ:", err.message);
//     setTimeout(connectRabbitMQ, 5000); // retry after 5s
//   }
// })();
// // })();

// // Helper function to flatten data
// function generateFlatData(data) {
//   return data.map((item) => {
//     const customFields = item.customFieldValues || {};
//     const interestedProducts = Array.isArray(item.interested_products)
//       ? item.interested_products.map((p) => p?.product_id?.name).join(", ")
//       : "";
//     return {
//       ...item,
//       ...customFields,
//       interested_products: interestedProducts,
//       userId: item.userId?.name || "",
//       projectId: item.projectId?.title || "",
//     };
//   });
// }

// // Helper function to generate CSV
// async function generateCsv(filePath, headers, flatData) {
//   const csvWriter = createObjectCsvWriter({
//     path: filePath,
//     header: headers.map((h) => ({ id: h.accessor, title: h.title })),
//   });
//   await csvWriter.writeRecords(flatData);
// }
