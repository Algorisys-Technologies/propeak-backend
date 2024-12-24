const rabbitMQ = require("./rabbitmq/index.js");
// const fetch = require("node-fetch");
const express = require("express");
const fs = require("fs").promises; // Use the promises API of fs
const schedule = require("node-schedule");
const config = require("./config.js");
const { logError, logInfo } = require("./common/logger.js");
const contactModel = require("./models/contact/contact-model.js");
require("dotenv").config();

console.log(process.env.DB);

// try {
//   const j = schedule.scheduleJob(config.contactsSchedule, function () {
//     rabbitMQ.receiveMessageFromQueue("contact_extraction_queue").then(async (msg) => {
//       if (msg !== "No messages in queue") {
//         const { filePath, fileName, companyId, type, accountId } = msg;

//         try {
//           // Check if file exists
//           await fs.access(filePath); // Throws error if file doesn't exist

//           // Use promises API to read the file
//           const fileBuffer = await fs.readFile(filePath);
//           const file = new File([fileBuffer], fileName, { type });
//           const formDataToSend = new FormData();
//           formDataToSend.append("query_image", file);

//           const extractResponse = await fetch(
//             `http://142.93.222.95:5001/card-extraction`,
//             {
//               method: "POST",
//               body: formDataToSend,
//               headers: {
//                 Authorization: "f03b339f-8af2-4492-ac79-9caad9b837d9",
//               },
//             }
//           );

//           if(!extractResponse.ok){
//             return
//           }

//           const extractDetails = await extractResponse.json();

//           if (extractDetails.error) {
//             await fetch(`http://142.93.222.95:5001/reset_usage`, {
//               method: "POST",
//               body: {},
//               headers: {
//                 Authorization: "f03b339f-8af2-4492-ac79-9caad9b837d9",
//               },
//             });

//             throw new Error(extractDetails.error);
//           }

//           console.log(extractDetails);

//           const contact = {
//             companyId,
//             first_name: extractDetails.first_name,
//             last_name: extractDetails.last_name,
//             email: extractDetails.email_address.join(","),
//             phone:
//               typeof extractDetails.phone_numbers === "object"
//                 ? Object.keys(extractDetails.phone_numbers)
//                     .map((p) => `${p}:${extractDetails.phone_numbers[p]}`)
//                     .join(" ")
//                 : extractDetails.phone_numbers,
//             address: {
//               street: extractDetails.street_address,
//               city: extractDetails.city,
//               state: extractDetails.state,
//               postal_code: extractDetails.pincode,
//               country: extractDetails.country,
//             },
//             secondary_address: extractDetails.secondary_address,
//             website: extractDetails.website_url,
//             title: extractDetails.company_name,
//             department: extractDetails.designation,
//             mobile:
//               typeof extractDetails.phone_numbers === "object"
//                 ? Object.keys(extractDetails.phone_numbers)
//                     .map((p) => `${p}:${extractDetails.phone_numbers[p]}`)
//                     .join(" ")
//                 : extractDetails.phone_numbers,
//             account_id: accountId || null,
//             account_name: "",
//             contact_owner: {
//               name: "",
//               user_id: null,
//             },
//             lead_source: "",
//             description: "",
//             created_on: new Date().toISOString(),
//             modified_on: new Date().toISOString(),
//             isDeleted: false,
//             creationMode: "AUTO",
//           };

//           const contactResponse = await fetch(
//             `http://localhost:3001/api/contacts/addContact`,
//             {
//               method: "POST",
//               body: JSON.stringify(contact),
//               headers: {
//                 "Content-Type": "application/json",
//               },
//             }
//           );

//           console.log(await contactResponse.json())

//           if (!contactResponse.ok) {
//             throw new Error("Failed to create contact");
//           }

//           console.log("Contact details extracted:", extractDetails);
//         } catch (error) {
//           // Requeue only on extraction or contact creation failures
//           if (error.message !== "ENOENT: no such file or directory, access") {
//             rabbitMQ.sendMessageToQueue(
//               msg,
//               "contact_extraction_queue",
//               "contact_extraction_routing"
//             );
//           }
//           console.error("Error processing extraction job:", error);
//         }
//       }
//     });
//   });
// } catch (e) {
//   console.log(e);
//   logInfo(e, "email-scheduler exception");
// }

try {
  const j = schedule.scheduleJob(config.contactsSchedule, function () {
    rabbitMQ
      .receiveMessageFromQueue("mul_contact_extraction_queue")
      .then(async (msg) => {
        if (msg !== "No messages in queue") {
          const { files, companyId, accountId, filePath } = msg;

          try {
            // Check if file exists

            console.log("files", files);

            const formDataToSend = new FormData();
            const contacts = [];

            const promises = files.map(async (file) => {
              const filePathWithName = filePath + file.name;

              try {
                // Check if the file exists
                await fs.access(filePathWithName);

                // Check if the MIME type starts with "image/"
                if (!file.mimetype.startsWith("image/")) {
                  console.warn(
                    `Skipping file: ${file.name}. MIME type is not an image.`
                  );
                  return;
                }

                // Read the file
                const fileBuffer = await fs.readFile(filePathWithName);

                // Create a File object and append it to the form data
                const mfile = new File([fileBuffer], file.name, {
                  type: file.mimetype,
                });
                formDataToSend.append("query_images", mfile);
              } catch (err) {
                console.warn(
                  `Skipping file: ${file.name}. Reason: ${err.message}`
                );
              }
            });

            // Wait for all promises to complete
            await Promise.all(promises);

            console.log(formDataToSend);

            const extractResponse = await fetch(
              `http://142.93.222.95:5001/card-extractions`,
              {
                method: "POST",
                body: formDataToSend,
                headers: {
                  Authorization: "f03b339f-8af2-4492-ac79-9caad9b837d9",
                },
              }
            );

            if (!extractResponse.ok) {
              console.log(extractResponse)
              rabbitMQ.sendMessageToQueue(
                msg,
                "mul_contact_extraction_queue",
                "mul_contact_extraction_routing"
              );
              return;
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

              rabbitMQ.sendMessageToQueue(
                msg,
                "mul_contact_extraction_queue",
                "mul_contact_extraction_routing"
              );
            }

            console.log("extractDetails", extractDetails);

            extractDetails.cards.forEach((extractDetail) => {
              const contact = {
                companyId,
                first_name: extractDetail.first_name,
                last_name: extractDetail.last_name,
                email: extractDetail.email_address.join(","),
                phone:
                  typeof extractDetail.phone_numbers === "object"
                    ? Object.keys(extractDetail.phone_numbers)
                        .map((p) => `${p}:${extractDetail.phone_numbers[p]}`)
                        .join(" ")
                    : extractDetail.phone_numbers,
                address: {
                  street: extractDetail.street_address,
                  city: extractDetail.city,
                  state: extractDetail.state,
                  postal_code: extractDetail.pincode,
                  country: extractDetail.country,
                },
                secondary_address: extractDetail.secondary_address,
                website: extractDetail.website_url,
                title: extractDetail.company_name,
                department: extractDetail.designation,
                mobile:
                  typeof extractDetail.phone_numbers === "object"
                    ? Object.keys(extractDetail.phone_numbers)
                        .map((p) => `${p}:${extractDetail.phone_numbers[p]}`)
                        .join(" ")
                    : extractDetail.phone_numbers,
                account_id: accountId || null,
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

              contacts.push(contact);
            });

            console.log("contacts created", contacts);

            const contactResponse = await fetch(
              `http://localhost:3001/api/contacts/addMultipleContacts`,
              {
                method: "POST",
                body: JSON.stringify({ contacts: contacts, companyId }),
                headers: {
                  "Content-Type": "application/json",
                },

              }
            );

            console.log(await contactResponse.json());
          } catch (error) {
            console.error("Error processing extraction job:", error);
          }
        }
      });
  });
} catch (e) {
  console.log(e);
  logInfo(e, "email-scheduler exception");
}
