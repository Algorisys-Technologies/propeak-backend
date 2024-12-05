const rabbitMQ = require("./rabbitmq/index.js");
// const fetch = require("node-fetch");
const express = require("express");
const fs = require("fs").promises; // Use the promises API of fs
const schedule = require("node-schedule");
const config = require("./config.js");
const { logError, logInfo } = require("./common/logger.js");
const contactModel = require("./models/contact/contact-model.js");
require("dotenv").config();

console.log(process.env.DB)


try {
  const j = schedule.scheduleJob(config.contactsSchedule, function () {
    rabbitMQ.receiveMessageFromQueue("contact_extraction_queue").then(async (msg) => {
      if (msg !== "No messages in queue") {
        const { filePath, fileName, companyId, type } = msg;

        try {
          // Check if file exists
          await fs.access(filePath); // Throws error if file doesn't exist

          // Use promises API to read the file
          const fileBuffer = await fs.readFile(filePath);
          const file = new File([fileBuffer], fileName, { type });
          const formDataToSend = new FormData();
          formDataToSend.append("query_image", file);

          const extractResponse = await fetch(
            `http://142.93.222.95:5001/card-extraction`,
            {
              method: "POST",
              body: formDataToSend,
              headers: {
                Authorization: "f03b339f-8af2-4492-ac79-9caad9b837d9",
              },
            }
          );

          if(!extractResponse.ok){
            return
          }

          const extractDetails = await extractResponse.json();

          if (extractDetails.error) {
            await fetch(`http://142.93.222.95:5001/reset_usage`, {
              method: "POST",
              body: {},
              headers: {
                Authorization: "f03b339f-8af2-4492-ac79-9caad9b837d9",
              },
            });

            throw new Error(extractDetails.error);
          }

          console.log(extractDetails);

          const contact = {
            companyId,
            first_name: extractDetails.first_name,
            last_name: extractDetails.last_name,
            email: extractDetails.email_address,
            phone:
              typeof extractDetails.phone_numbers === "object"
                ? Object.keys(extractDetails.phone_numbers)
                    .map((p) => `${p}:${extractDetails.phone_numbers[p]}`)
                    .join(" ")
                : extractDetails.phone_numbers,
            address: {
              street: extractDetails.street_address,
              city: extractDetails.city,
              state: extractDetails.state,
              postal_code: extractDetails.pincode,
              country: extractDetails.country,
            },
            website: extractDetails.website_url,
            title: extractDetails.company_name,
            department: extractDetails.designation,
            mobile:
              typeof extractDetails.phone_numbers === "object"
                ? Object.keys(extractDetails.phone_numbers)
                    .map((p) => `${p}:${extractDetails.phone_numbers[p]}`)
                    .join(" ")
                : extractDetails.phone_numbers,
            account_id: null,
            account_name: "",
            contact_owner: {
              name: "",
              user_id: null,
            },
            lead_source: "",
            description: "",
            created_on: new Date().toISOString(),
            modified_on: new Date().toISOString(),
            isDeleted: false,
            creationMode: "AUTO",
          };

          const contactResponse = await fetch(
            `http://localhost:3001/api/contacts/addContact`,
            {
              method: "POST",
              body: JSON.stringify(contact),
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (!contactResponse.ok) {
            throw new Error("Failed to create contact");
          }

          console.log("Contact details extracted:", extractDetails);
        } catch (error) {
          // Requeue only on extraction or contact creation failures
          if (error.message !== "ENOENT: no such file or directory, access") {
            rabbitMQ.sendMessageToQueue(
              msg,
              "contact_extraction_queue",
              "contact_extraction_routing"
            );
          }
          console.error("Error processing extraction job:", error);
        }
      }
    });
  });
} catch (e) {
  console.log(e);
  logInfo(e, "email-scheduler exception");
}
