const amqp = require("amqplib");
const path = require("path");
const config = require("../config/config");
const { createObjectCsvWriter } = require("csv-writer");
const {
  generateHtmlPdf,
  sendExportNotificationAndEmail,
} = require("../controllers/reports/reports-controller");
const {
  rabbitMQ_exchangeName,
  rabbitMQ_connectionKey,
  companyCode,
} = require("../config/config");

const exchange = rabbitMQ_exchangeName;
const queue = companyCode + "export_queue";
const routingKey = companyCode + "exportRoute";
let uploadFolder = config.UPLOAD_PATH;
const mongoose = require("mongoose");
require("../models/role/role-model");

(async () => {
  const connection = await amqp.connect(rabbitMQ_connectionKey, {
    heartbeat: 120,
  });
  console.log("Connected to RabbitMQ");

  const channel = await connection.createChannel();

  await channel.assertExchange(exchange, "direct", { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, routingKey);

  console.log("Export Worker listening for messages...");

  mongoose.connect(process.env.DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  mongoose.connection.once("open", () => {
    console.log("✅ MongoDB connected in Worker");
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error in Worker:", err);
  });

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      const { type, data, headers, filename, userId, companyId, email } =
        payload;
      const filePath = path.resolve(uploadFolder, `${filename}.${type}`);

      // Generate flat data for the report
      const flatData = generateFlatData(data);

      // Generate the report file
      if (type === "csv") {
        await generateCsv(filePath, headers, flatData);
      } else if (type === "pdf") {
        await generateHtmlPdf({ filePath, headers, flatData, filename });
      }

      // Generate the download URL
      const downloadUrl = `http://localhost:3001/uploads/${filename}.${type}`;

      console.log(
        "All...",
        downloadUrl,
        type,
        filename,
        userId,
        email,
        companyId
      );

      // Send notification and email
      await sendExportNotificationAndEmail({
        downloadUrl,
        type,
        filename,
        userId,
        email,
        companyId,
      });

      channel.ack(msg); // Acknowledge message after successful processing
    } catch (err) {
      console.error("Error processing export job:", err);
      channel.nack(msg, false, false); // Negative acknowledge if there's an error
    }
  });
})();

// Helper function to flatten data
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
      status: item.status || "",
      company_name: item.companyId?.name || "",
      address: item.address || "",
    };
  });
}

// Helper function to generate CSV
async function generateCsv(filePath, headers, flatData) {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers.map((h) => ({ id: h.accessor, title: h.title })),
  });
  await csvWriter.writeRecords(flatData);
}
