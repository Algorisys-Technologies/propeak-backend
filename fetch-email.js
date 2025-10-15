const Imap = require("imap");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { simpleParser } = require("mailparser");
const dotenv = require("dotenv");

dotenv.config();

const config = require("./config/config");
let uploadFolder = config.UPLOAD_PATH;
const { validateAndSaveFiles } = require("./utils/file-upload-helper");

const { FetchEmail } = require("./models/fetch-email/fetch-email-model");
const Task = require("./models/task/task-model");
const TaskStage = require("./models/task-stages/task-stages-model");
const Project = require("./models/project/project-model");
const ProjectStage = require("./models/project-stages/project-stages-model");
const UploadRepositoryFile = require("./models/global-level-repository/global-level-repository-model");

// class MailAttachmentFetcher {
//   constructor({
//     emailConfig,
//     localFolderPath,
//     targetDate,
//     emailPatterns,
//     targetEndDate,
//     companyId,
//     projectId,
//     createdBy,
//     taskId,
//   }) {
//     this.emailConfig = emailConfig;
//     this.localFolderPath = localFolderPath;
//     this.targetDate = targetDate;
//     this.targetEndDate = targetEndDate;
//     this.emailPatterns = emailPatterns;
//     this.companyId = companyId;
//     this.projectId = projectId;
//     this.createdBy = createdBy;
//     this.taskId = taskId;

//     if (!fs.existsSync(localFolderPath)) {
//       fs.mkdirSync(localFolderPath, { recursive: true });
//       console.log(`Created folder: ${localFolderPath}`);
//     } else {
//       console.log(`Folder already exists: ${localFolderPath}`);
//     }

//     this.imap = new Imap(emailConfig);
//     this.imap.once("ready", this.onImapReady.bind(this));
//     this.imap.once("error", this.onImapError.bind(this));
//     this.imap.once("end", this.onImapEnd.bind(this));

//     this.allEmails = [];
//   }

//   async storeAccount() {
//     const existingAccount = await FetchEmail.findOne({
//       to: this.emailConfig.user,
//     });
//   }

//   onImapReady() {
//     console.log("IMAP connection established.");
//     this.storeAccount().then(() => {
//       this.imap.openBox("INBOX", true, this.onOpenBox.bind(this));
//     });
//   }

//   onImapError(err) {
//     console.error("IMAP error:", err);
//     // throw err;
//   }

//   onImapEnd() {
//     console.log("IMAP connection ended.");
//   }

//   onOpenBox(err) {
//     if (err) {
//       console.error("Error opening INBOX:", err);
//       // throw err;
//     }
//     console.log("INBOX opened successfully.");

//     // Search emails
//     // ,["SUBJECT", this.targetSubject]
//     const searchCriteria = [
//       "ALL",
//       ["SINCE", this.targetDate.toISOString()],
//       ["BEFORE", this.targetEndDate.toISOString()],
//     ];

//     console.log(
//       "emailPatterns...",
//       this.emailPatterns,
//       "searchCriteria...",
//       searchCriteria
//     );

//     // Dynamically add "FROM" conditions for all patterns
//     const fromPatterns = this.emailPatterns
//       .map((pattern) => pattern.from)
//       .filter(Boolean);
//     if (fromPatterns.length > 0) {
//       let fromSearch = ["FROM", fromPatterns[0]];

//       for (let i = 1; i < fromPatterns.length; i++) {
//         fromSearch = ["OR", fromSearch, ["FROM", fromPatterns[i]]];
//       }
//       searchCriteria.push(fromSearch);
//     }

//     const subjectPatterns = this.emailPatterns
//       .map((pattern) => pattern.subject)
//       .filter(Boolean);
//     if (subjectPatterns.length > 0) {
//       let subjectSearch = ["SUBJECT", subjectPatterns[0]];
//       for (let i = 1; i < subjectPatterns.length; i++) {
//         subjectSearch = ["OR", subjectSearch, ["SUBJECT", subjectPatterns[i]]];
//       }
//       searchCriteria.push(subjectSearch);
//     }

//     // Dynamically add "TEXT" conditions
//     const bodyPatterns = this.emailPatterns
//       .map((pattern) => pattern.body_contains)
//       .filter(Boolean);
//     if (bodyPatterns.length > 0) {
//       let bodySearch = ["TEXT", bodyPatterns[0]];
//       for (let i = 1; i < bodyPatterns.length; i++) {
//         bodySearch = ["OR", bodySearch, ["TEXT", bodyPatterns[i]]];
//       }
//       searchCriteria.push(bodySearch);
//     }

//     // console.log("Search Criteria:", JSON.stringify(searchCriteria, null, 2));

//     // Perform the search
//     this.imap.search(searchCriteria, this.onSearchResults.bind(this));
//   }

//   async onSearchResults(searchErr, results) {
//     if (searchErr) {
//       console.error("Error searching for emails:", searchErr);
//       throw searchErr;
//     }

//     // console.log(`Fetched ${results.length} emails after ${this.targetDate}.`);

//     for (const seqno of results) {
//       const fetch = this.imap.fetch([seqno], {
//         bodies: "",
//         struct: true,
//         flags: true,
//       });

//       fetch.on("message", (msg, seqno) => {
//         let isSeen = false;

//         msg.on("attributes", (attrs) => {
//           if (attrs.flags.includes("\\Seen")) {
//             isSeen = true;
//           }
//         });

//         msg.on("body", (stream) => {
//           simpleParser(stream, async (err, parsed) => {
//             if (err) {
//               console.error("Error parsing email:", err);
//               return;
//             }

//             const emailDate = new Date(parsed.date);
//             if (emailDate < this.targetDate) {
//               console.log(
//                 `Skipping email from ${parsed.date}: before target date.`
//               );
//               return;
//             }

//             if (emailDate > this.targetEndDate) {
//               console.log(
//                 `Skipping email from ${parsed.date}: after target end date.`
//               );
//               return;
//             }

//             // Process email if it falls within the date range
//             console.log(
//               `Processing email from ${parsed.date}: within target range.`
//             );

//             // console.log(parsed, "dodo...........")

//             try {
//               const emailData = {
//                 from: parsed.from.text || "Unknown",
//                 to: parsed.to.text || "Unknown",
//                 subject: parsed.subject || "No Subject",
//                 date: parsed.date || new Date(),
//                 bodyText: parsed.text || "",
//                 status: isSeen ? "seen" : "unseen",
//                 attachments: parsed.attachments
//                   ? parsed.attachments.map((att) => ({
//                       filename: att.filename || `attachment_${seqno}`,
//                       contentType: att.contentType,
//                       size: att.size,
//                       content: att.content, // Save content in MongoDB
//                     }))
//                   : [],
//               };

//               console.log("emailData", emailData);

//               // Add to allEmails array
//               this.allEmails.push(emailData);

//               // if (parsed.attachments && parsed.attachments.length > 0) {
//               //   console.log(`Saving attachments from Email ${seqno}`);

//               //   for (const attachment of parsed.attachments) {
//               //     const filename =
//               //       attachment.filename ||
//               //       `attachment_${seqno}_${
//               //         parsed.attachments.indexOf(attachment) + 1
//               //       }.${attachment.contentType.split("/")[1]}`;
//               //     const fullPath = `${this.localFolderPath}/${filename}`;

//               //     // Use async writeFile to avoid blocking the event loop
//               //     try {
//               //       await fs.promises.writeFile(fullPath, attachment.content);
//               //       console.log(`Attachment saved: ${fullPath}`);
//               //     } catch (error) {
//               //       // console.error(`Error saving attachment ${filename}:`, error);
//               //     }
//               //   }
//               // }

//               if (parsed.attachments && parsed.attachments.length > 0) {
//                 console.log(`Saving attachments from Email ${seqno}`);

//                 for (const attachment of parsed.attachments) {
//                   try {
//                     // create a fake req.files-like structure for validateAndSaveFiles
//                     // const fakeReq = {
//                     //   files: {
//                     //     uploadFiles: [
//                     //       {
//                     //         originalname:
//                     //           attachment.filename ||
//                     //           `attachment_${seqno}_${
//                     //             parsed.attachments.indexOf(attachment) + 1
//                     //           }.${attachment.contentType.split("/")[1]}`,
//                     //         buffer: attachment.content,
//                     //         mimetype: attachment.contentType,
//                     //         size: attachment.size,
//                     //       },
//                     //     ],
//                     //   },
//                     // };

//                     const fileName =
//                       attachment.filename ||
//                       `attachment_${seqno}_${
//                         parsed.attachments.indexOf(attachment) + 1
//                       }.${
//                         (
//                           attachment.contentType || "application/octet-stream"
//                         ).split("/")[1] || "bin"
//                       }`;

//                     // ❌ Old
//                     // const filePath = path.join(uploadFolder, fileName);

//                     // ✅ New — Let the helper handle the path building
//                     const tempPath = path.join(
//                       __dirname,
//                       "../../temp_uploads",
//                       fileName
//                     );

//                     // Write buffer temporarily
//                     await fs.promises.mkdir(path.dirname(tempPath), {
//                       recursive: true,
//                     });
//                     await fs.promises.writeFile(tempPath, attachment.content);

//                     const fakeReq = {
//                       files: {
//                         uploadFiles: [
//                           {
//                             name: fileName,
//                             mimetype: attachment.contentType,
//                             size: attachment.size,
//                             mv: async (targetPath) => {
//                               await fs.promises.rename(tempPath, targetPath);
//                             },
//                           },
//                         ],
//                       },
//                     };

//                     await validateAndSaveFiles(
//                       fakeReq,
//                       this.companyId,
//                       this.projectId,
//                       this.taskId || null,
//                       uploadFolder,
//                       this.createdBy || this.emailConfig.user,
//                       "todo"
//                     );

//                     console.log(
//                       `Attachment saved via validateAndSaveFiles for ${fakeReq.files.uploadFiles[0].originalname}`
//                     );
//                   } catch (error) {
//                     console.error(
//                       "Error saving attachment through helper:",
//                       error
//                     );
//                   }
//                 }
//               } else {
//                 // console.log(`No attachments found in Email ${seqno}.`);
//               }
//             } catch (error) {
//               // console.error(`Error checking or saving email ${seqno}:`, error);
//             }
//           });
//         });
//       });
//     }

//     this.imap.end();
//   }

//   start() {
//     console.log("Starting IMAP connection...");
//     this.imap.connect();
//   }

//   getEmails() {
//     return this.allEmails;
//   }
// }

// exports.fetchEmail = async ({
//   emailTaskConfig,
//   projectId,
//   taskStageId,
//   companyId,
//   userId,
//   emailAccounts,
// }) => {
//   console.log("Running fetchEmail...");
//   console.log("emailTaskConfig...", emailTaskConfig);

//   // Local folder to save attachments
//   // const localFolderPath = "./attachments";
//   const localFolderPath = uploadFolder || "./uploads";

//   const allEmails = []; // Array to store all fetched emails across accounts
//   const fetchers = emailAccounts.map((account) => {
//     console.log(`Starting fetch for account: ${account.user}`);
//     const emailConfig = {
//       user: account.user,
//       password: account.password,
//       host: account.host,
//       port: account.port,
//       tls: account.tls,
//       tlsOptions: { minVersion: "TLSv1.2", rejectUnauthorized: false },
//       authTimeout: 30000,
//       // debug: console.log,
//     };

//     const mailFetcher = new MailAttachmentFetcher({
//       emailConfig,
//       localFolderPath,
//       targetDate: emailTaskConfig.lastFetched,
//       targetEndDate: emailTaskConfig.lastToFetched,
//       emailPatterns: emailTaskConfig.emailPatterns,
//       companyId,
//       projectId,
//       createdBy: userId,
//     });
//     return new Promise((resolve) => {
//       mailFetcher.start();

//       mailFetcher.imap.once("end", () => {
//         // Collect emails after IMAP connection ends
//         allEmails.push(...mailFetcher.getEmails());
//         resolve();
//       });
//     });
//   });

//   // Wait for all fetchers to complete
//   await Promise.all(fetchers);

//   console.log("All emails fetched:", allEmails);

//   // Now create tasks for each email

//   try {
//     for (const email of allEmails) {
//       const matchedPattern = emailTaskConfig.emailPatterns.find((pattern) => {
//         const subjectMatch =
//           !pattern.subject ||
//           email.subject.toLowerCase().includes(pattern.subject.toLowerCase());
//         const fromMatch =
//           !pattern.from ||
//           email.from.toLowerCase().includes(pattern.from.toLowerCase());
//         const bodyMatch =
//           !pattern.body_contains ||
//           email.bodyText
//             .toLowerCase()
//             .includes(pattern.body_contains.toLowerCase());
//         return subjectMatch && fromMatch && bodyMatch;
//       });

//       if (!matchedPattern) continue;

//       // Check if a task already exists with the same title, description, and start date
//       const existingTask = await Task.findOne({
//         title: email.subject,
//         description: email.bodyText,
//         startDate: new Date(email.date).toISOString(),
//         isDeleted: false,
//       });

//       if (existingTask) {
//         console.log(
//           `Task already exists: ${email.subject} - Skipping task creation.`
//         );
//         continue; // Skip creating a task if it already exists
//       }

//       const assigneeUserId = matchedPattern.userId || userId;

//       let taskStageTitle =
//         (await TaskStage.findOne({ _id: taskStageId }))?.title || "todo";

//       const newTask = new Task({
//         title: email.subject,
//         description: email.bodyText,
//         completed: false,
//         status: taskStageTitle,
//         startDate: new Date(email.date),
//         endDate: new Date(),
//         createdOn: new Date(),
//         modifiedOn: new Date(),
//         createdBy: userId,
//         isDeleted: false,
//         projectId: projectId,
//         companyId: companyId,
//         taskStageId: taskStageId,
//         userId: assigneeUserId,
//         creation_mode: "AUTO",
//         lead_source: "EMAIL",
//       });

//       // Save the new task to the database
//       await newTask.save();
//       console.log(`New task created and saved: ${newTask.title}`);
//     }
//   } catch (error) {
//     console.error("Error creating tasks:", error);
//   }

//   return allEmails;
// };

class MailAttachmentFetcher {
  constructor({
    emailConfig,
    localFolderPath,
    targetDate,
    emailPatterns,
    targetEndDate,
    companyId,
    projectId,
    taskStageId,
    createdBy,
  }) {
    this.emailConfig = emailConfig;
    this.localFolderPath = localFolderPath;
    this.targetDate = targetDate;
    this.targetEndDate = targetEndDate;
    this.emailPatterns = emailPatterns;
    this.companyId = companyId;
    this.projectId = projectId;
    this.taskStageId = taskStageId;
    this.createdBy = createdBy;

    if (!fs.existsSync(localFolderPath)) {
      fs.mkdirSync(localFolderPath, { recursive: true });
    }

    this.imap = new Imap(emailConfig);
    this.imap.once("ready", this.onImapReady.bind(this));
    this.imap.once("error", this.onImapError.bind(this));
    this.imap.once("end", this.onImapEnd.bind(this));

    this.allEmails = [];
  }

  async storeAccount() {
    const existingAccount = await FetchEmail.findOne({
      to: this.emailConfig.user,
    });
  }

  onImapReady() {
    this.storeAccount().then(() => {
      this.imap.openBox("INBOX", true, this.onOpenBox.bind(this));
    });
  }

  onImapError(err) {
    console.error("IMAP error:", err);
  }

  onImapEnd() {
    console.log("IMAP connection ended.");
  }

  onOpenBox(err) {
    if (err) {
      console.error("Error opening INBOX:", err);
      return;
    }

    const searchCriteria = [
      "ALL",
      ["SINCE", this.targetDate.toISOString()],
      ["BEFORE", this.targetEndDate.toISOString()],
    ];

    // Add FROM patterns
    const fromPatterns = this.emailPatterns.map((p) => p.from).filter(Boolean);
    if (fromPatterns.length > 0) {
      let fromSearch = ["FROM", fromPatterns[0]];
      for (let i = 1; i < fromPatterns.length; i++) {
        fromSearch = ["OR", fromSearch, ["FROM", fromPatterns[i]]];
      }
      searchCriteria.push(fromSearch);
    }

    // Add SUBJECT patterns
    const subjectPatterns = this.emailPatterns
      .map((p) => p.subject)
      .filter(Boolean);
    if (subjectPatterns.length > 0) {
      let subjectSearch = ["SUBJECT", subjectPatterns[0]];
      for (let i = 1; i < subjectPatterns.length; i++) {
        subjectSearch = ["OR", subjectSearch, ["SUBJECT", subjectPatterns[i]]];
      }
      searchCriteria.push(subjectSearch);
    }

    // Add TEXT patterns
    const bodyPatterns = this.emailPatterns
      .map((p) => p.body_contains)
      .filter(Boolean);
    if (bodyPatterns.length > 0) {
      let bodySearch = ["TEXT", bodyPatterns[0]];
      for (let i = 1; i < bodyPatterns.length; i++) {
        bodySearch = ["OR", bodySearch, ["TEXT", bodyPatterns[i]]];
      }
      searchCriteria.push(bodySearch);
    }

    this.imap.search(searchCriteria, this.onSearchResults.bind(this));
  }

  async onSearchResults(searchErr, results) {
    if (searchErr) {
      console.error("Error searching emails:", searchErr);
      return;
    }

    for (const seqno of results) {
      const fetch = this.imap.fetch([seqno], { bodies: "", struct: true });

      fetch.on("message", (msg) => {
        let isSeen = false;

        msg.on("attributes", (attrs) => {
          if (attrs.flags.includes("\\Seen")) isSeen = true;
        });

        msg.on("body", (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) return;

            const emailDate = new Date(parsed.date);
            if (emailDate < this.targetDate || emailDate > this.targetEndDate)
              return;

            try {
              const emailData = {
                from: parsed.from.text || "Unknown",
                to: parsed.to.text || "Unknown",
                subject: parsed.subject || "No Subject",
                date: parsed.date || new Date(),
                bodyText: parsed.text || "",
                status: isSeen ? "seen" : "unseen",
                attachments: parsed.attachments || [],
              };

              this.allEmails.push(emailData);

              // Find matched pattern
              const matchedPattern = this.emailPatterns.find((pattern) => {
                const subjectMatch =
                  !pattern.subject ||
                  emailData.subject
                    .toLowerCase()
                    .includes(pattern.subject.toLowerCase());
                const fromMatch =
                  !pattern.from ||
                  emailData.from
                    .toLowerCase()
                    .includes(pattern.from.toLowerCase());
                const bodyMatch =
                  !pattern.body_contains ||
                  emailData.bodyText
                    .toLowerCase()
                    .includes(pattern.body_contains.toLowerCase());
                return subjectMatch && fromMatch && bodyMatch;
              });

              if (!matchedPattern) return;

              const assigneeUserId = matchedPattern.userId;

              let taskStageTitle = (
                await TaskStage.findById(matchedPattern.taskStageId)
              )?.title;

              // ✅ Step 1: Create the task first
              const newTask = new Task({
                title: emailData.subject,
                description: emailData.bodyText,
                completed: false,
                status: taskStageTitle || "todo",
                startDate: new Date(emailData.date),
                endDate: new Date(),
                createdOn: new Date(),
                modifiedOn: new Date(),
                createdBy: this.createdBy,
                isDeleted: false,
                projectId: this.projectId,
                companyId: this.companyId,
                taskStageId: this.taskStageId || matchedPattern.taskStageId,
                userId: assigneeUserId,
                creation_mode: "AUTO",
                lead_source: "EMAIL",
              });

              await newTask.save();

              // ✅ Step 2: Save attachments
              if (emailData.attachments.length > 0) {
                for (const attachment of emailData.attachments) {
                  const fileName =
                    attachment.filename ||
                    `attachment_${newTask._id}_${
                      emailData.attachments.indexOf(attachment) + 1
                    }.bin`;

                  const tempPath = path.join(
                    __dirname,
                    "../../temp_uploads",
                    fileName
                  );
                  await fs.promises.mkdir(path.dirname(tempPath), {
                    recursive: true,
                  });
                  await fs.promises.writeFile(tempPath, attachment.content);

                  const fakeReq = {
                    files: {
                      uploadFiles: [
                        {
                          name: fileName,
                          mimetype: attachment.contentType,
                          size: attachment.size,
                          mv: async (targetPath) => {
                            await fs.promises.rename(tempPath, targetPath);
                          },
                        },
                      ],
                    },
                  };

                  await validateAndSaveFiles(
                    fakeReq,
                    this.companyId,
                    this.projectId,
                    newTask._id,
                    uploadFolder,
                    this.createdBy,
                    taskStageTitle || "todo"
                  );
                }
              }
            } catch (error) {
              console.error("Error processing email:", error);
            }
          });
        });
      });
    }

    this.imap.end();
  }

  start() {
    this.imap.connect();
  }

  getEmails() {
    return this.allEmails;
  }
}

exports.fetchEmail = async ({
  emailTaskConfig,
  projectId,
  taskStageId,
  companyId,
  userId,
  emailAccounts,
}) => {
  const allEmails = [];
  const fetchers = emailAccounts.map((account) => {
    const emailConfig = {
      user: account.user,
      password: account.password,
      host: account.host,
      port: account.port,
      tls: account.tls,
      tlsOptions: { minVersion: "TLSv1.2", rejectUnauthorized: false },
      authTimeout: 30000,
    };

    const mailFetcher = new MailAttachmentFetcher({
      emailConfig,
      localFolderPath: uploadFolder,
      targetDate: emailTaskConfig.lastFetched,
      targetEndDate: emailTaskConfig.lastToFetched,
      emailPatterns: emailTaskConfig.emailPatterns,
      companyId,
      projectId,
      taskStageId,
      createdBy: userId,
    });

    return new Promise((resolve) => {
      mailFetcher.start();
      mailFetcher.imap.once("end", () => {
        allEmails.push(...mailFetcher.getEmails());
        resolve();
      });
    });
  });

  await Promise.all(fetchers);

  //console.log("All emails fetched:", allEmails);
  return allEmails;
};

// exports.fetchEmailGroup = async ({
//   emailProjectConfig,
//   groupId,
//   projectStageId,
//   projectTypeId,
//   companyId,
//   userId,
//   emailAccounts,
// }) => {
//   console.log("Running fetchEmailGroup...");
//   console.log("GroupId...", emailProjectConfig);

//   // Local folder to save attachments
//   const localFolderPath = "./attachments";

//   const allEmails = []; // Array to store all fetched emails across accounts
//   const fetchers = emailAccounts.map((account) => {
//     console.log(`Starting fetch for account: ${account.user}`);
//     const emailConfig = {
//       user: account.user,
//       password: account.password,
//       host: account.host,
//       port: account.port,
//       tls: account.tls,
//       tlsOptions: { minVersion: "TLSv1.2", rejectUnauthorized: false },
//       authTimeout: 30000,
//       // debug: console.log,
//     };

//     const mailFetcher = new MailAttachmentFetcher({
//       emailConfig,
//       localFolderPath,
//       targetDate: emailProjectConfig.lastFetched,
//       targetEndDate: emailProjectConfig.lastToFetched,
//       emailPatterns: emailProjectConfig.emailPatterns,
//     });
//     return new Promise((resolve) => {
//       mailFetcher.start();

//       mailFetcher.imap.once("end", () => {
//         // Collect emails after IMAP connection ends
//         allEmails.push(...mailFetcher.getEmails());
//         resolve();
//       });
//     });
//   });

//   await Promise.all(fetchers);

//   console.log("allEmails...", allEmails);

//   for (const email of allEmails) {
//     try {
//       const subject = (email.subject || "").trim();
//       const bodyText = (email.bodyText || "").trim();

//       // Less strict duplicate check
//       const existingProject = await Project.findOne({
//         title: subject,
//         companyId: new mongoose.Types.ObjectId(companyId),
//         isDeleted: false,
//       });

//       if (existingProject) {
//         console.log(`⏩ Project already exists: ${subject}`);
//         continue;
//       }

//       const projectStage = await ProjectStage.findById(projectStageId);
//       const stageTitle = projectStage?.title || "todo";

//       const newProject = new Project({
//         title: subject || "Untitled Project",
//         description: bodyText || "No description provided.",
//         startdate: new Date(email.date || Date.now()),
//         enddate: new Date(),
//         projectStageId: new mongoose.Types.ObjectId(projectStageId),
//         status: stageTitle,
//         taskStages: ["todo", "inprogress", "completed"],
//         notifyUsers: [new mongoose.Types.ObjectId(userId)],
//         projectUsers: [new mongoose.Types.ObjectId(userId)],
//         userid: new mongoose.Types.ObjectId(userId),
//         group: new mongoose.Types.ObjectId(groupId),
//         companyId: new mongoose.Types.ObjectId(companyId),
//         userGroups: [],
//         sendnotification: false,
//         createdBy: new mongoose.Types.ObjectId(userId),
//         createdOn: new Date(),
//         modifiedBy: new mongoose.Types.ObjectId(userId),
//         modifiedOn: new Date(),
//         isDeleted: false,
//         projectType: "AUTO",
//         creation_mode: "AUTO",
//         lead_source: "EMAIL",
//         projectTypeId: new mongoose.Types.ObjectId(projectTypeId),
//         miscellaneous: false,
//         archive: false,
//         customFieldValues: {},
//         referenceGroupIds: [],
//         references: [],
//         tag: [],
//       });

//       await newProject.save();
//       console.log(`✅ Project created from email: ${newProject.title}`);
//     } catch (error) {
//       console.error("❌ Error creating project from email:", error.message);
//     }
//   }

//   return allEmails;
// };

// ✅ Reusable helper to save attachments

async function saveAttachmentFile({
  companyId,
  projectId,
  fileName,
  fileContent,
  createdBy,
}) {
  try {
    // Create company + project folders
    const companyFolderPath = path.join(
      uploadFolder,
      companyId.toString(),
      "documents"
    );
    const projectFolderPath = path.join(
      companyFolderPath,
      projectId.toString()
    );

    // Ensure directories exist
    if (!fs.existsSync(projectFolderPath)) {
      fs.mkdirSync(projectFolderPath, { recursive: true });
    }

    // Save file physically
    const filePath = path.join(projectFolderPath, fileName);
    await fs.promises.writeFile(filePath, fileContent);

    // ✅ Store correct relative path for frontend use
    const relativePath = path
      .join(companyId.toString(), "documents", projectId.toString(), fileName)
      .replace(/\\/g, "/"); // Normalize path for cross-platform use

    // ✅ Save file entry in UploadRepositoryFile collection
    const newFile = new UploadRepositoryFile({
      title: fileName,
      fileName,
      description: "Auto-uploaded via email fetch",
      path: relativePath,
      isDeleted: false,
      createdBy,
      createdOn: new Date(),
      companyId,
      projectId,
    });

    const savedFile = await newFile.save();

    // ✅ Link file to project via ObjectId
    await Project.updateOne(
      { _id: projectId },
      {
        $push: {
          uploadFiles: savedFile._id, // <-- push ObjectId, not object
        },
      }
    );

    console.log(
      `📎 Attachment saved and linked: ${fileName} for project ${projectId}`
    );
  } catch (err) {
    console.error("❌ Error saving attachment file:", err.message);
  }
}

// ✅ Mail Attachment Fetcher Class
class MailAttachmentFetcherProject {
  constructor({
    emailConfig,
    localFolderPath,
    targetDate,
    targetEndDate,
    emailPatterns,
    companyId,
  }) {
    this.emailConfig = emailConfig;
    this.localFolderPath = localFolderPath || uploadFolder;
    this.targetDate = targetDate;
    this.targetEndDate = targetEndDate;
    this.emailPatterns = emailPatterns || [];
    this.companyId = companyId;

    if (!fs.existsSync(this.localFolderPath)) {
      fs.mkdirSync(this.localFolderPath, { recursive: true });
    }

    this.imap = new Imap(emailConfig);
    this.imap.once("ready", this.onImapReady.bind(this));
    this.imap.once("error", this.onImapError.bind(this));
    this.imap.once("end", this.onImapEnd.bind(this));

    this.allEmails = [];
  }

  onImapReady() {
    this.imap.openBox("INBOX", true, this.onOpenBox.bind(this));
  }

  onImapError(err) {
    console.error("IMAP error:", err);
  }

  onImapEnd() {
    console.log("IMAP connection ended.");
  }

  onOpenBox(err) {
    if (err) return console.error("Error opening INBOX:", err);

    const searchCriteria = [
      ["SINCE", this.targetDate.toISOString()],
      ["BEFORE", this.targetEndDate.toISOString()],
    ];

    const fromPatterns = this.emailPatterns.map((p) => p.from).filter(Boolean);
    if (fromPatterns.length) {
      let fromSearch = ["FROM", fromPatterns[0]];
      for (let i = 1; i < fromPatterns.length; i++) {
        fromSearch = ["OR", fromSearch, ["FROM", fromPatterns[i]]];
      }
      searchCriteria.push(fromSearch);
    }

    const subjectPatterns = this.emailPatterns
      .map((p) => p.subject)
      .filter(Boolean);
    if (subjectPatterns.length) {
      let subjectSearch = ["SUBJECT", subjectPatterns[0]];
      for (let i = 1; i < subjectPatterns.length; i++) {
        subjectSearch = ["OR", subjectSearch, ["SUBJECT", subjectPatterns[i]]];
      }
      searchCriteria.push(subjectSearch);
    }

    const bodyPatterns = this.emailPatterns
      .map((p) => p.body_contains)
      .filter(Boolean);
    if (bodyPatterns.length) {
      let bodySearch = ["TEXT", bodyPatterns[0]];
      for (let i = 1; i < bodyPatterns.length; i++) {
        bodySearch = ["OR", bodySearch, ["TEXT", bodyPatterns[i]]];
      }
      searchCriteria.push(bodySearch);
    }

    this.imap.search(searchCriteria, this.onSearchResults.bind(this));
  }

  async onSearchResults(err, results) {
    if (err) return console.error("Search error:", err);
    if (!results || !results.length) return this.imap.end();

    for (const seqno of results) {
      const fetch = this.imap.fetch([seqno], { bodies: "", struct: true });

      fetch.on("message", (msg) => {
        let isSeen = false;

        msg.on("attributes", (attrs) => {
          if (attrs.flags.includes("\\Seen")) isSeen = true;
        });

        msg.on("body", (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) return;

            const emailData = {
              from: parsed.from?.text || "Unknown",
              subject: parsed.subject || "No Subject",
              bodyText: parsed.text || "",
              date: parsed.date || new Date(),
              attachments: parsed.attachments || [],
              status: isSeen ? "seen" : "unseen",
            };

            this.allEmails.push(emailData);
          });
        });
      });
    }

    this.imap.end();
  }

  start() {
    this.imap.connect();
  }

  getEmails() {
    return this.allEmails;
  }
}

// ✅ Fetch Email Group and Create Projects
exports.fetchEmailGroup = async ({
  emailProjectConfig,
  groupId,
  projectStageId,
  projectTypeId,
  companyId,
  userId,
  emailAccounts,
}) => {
  const localFolderPath = path.join(
    uploadFolder,
    companyId.toString(),
    "projects"
  );
  if (!fs.existsSync(localFolderPath))
    fs.mkdirSync(localFolderPath, { recursive: true });

  const allEmails = [];
  const fetchers = emailAccounts.map((account) => {
    const mailFetcher = new MailAttachmentFetcherProject({
      emailConfig: {
        user: account.user,
        password: account.password,
        host: account.host,
        port: account.port,
        tls: account.tls,
        tlsOptions: { minVersion: "TLSv1.2", rejectUnauthorized: false },
        authTimeout: 30000,
      },
      localFolderPath,
      targetDate: emailProjectConfig.lastFetched,
      targetEndDate: emailProjectConfig.lastToFetched,
      emailPatterns: emailProjectConfig.emailPatterns,
      companyId,
    });

    return new Promise((resolve) => {
      mailFetcher.start();
      mailFetcher.imap.once("end", () => {
        allEmails.push(...mailFetcher.getEmails());
        resolve();
      });
    });
  });

  await Promise.all(fetchers);

  // Loop through fetched emails
  for (const email of allEmails) {
    try {
      const subject = (email.subject || "Untitled Project").trim();
      const bodyText = (email.bodyText || "No description").trim();

      const existingProject = await Project.findOne({
        title: subject,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
      });
      if (existingProject) continue;

      const projectStage = await ProjectStage.findById(projectStageId);
      const stageTitle = projectStage?.title || "todo";

      const newProject = new Project({
        title: subject || "Untitled Project",
        description: bodyText || "No description provided.",
        startdate: new Date(email.date || Date.now()),
        enddate: new Date(),
        projectStageId: new mongoose.Types.ObjectId(projectStageId),
        status: stageTitle,
        taskStages: ["todo", "inprogress", "completed"],
        notifyUsers: [new mongoose.Types.ObjectId(userId)],
        projectUsers: [new mongoose.Types.ObjectId(userId)],
        userid: new mongoose.Types.ObjectId(userId),
        group: new mongoose.Types.ObjectId(groupId),
        companyId: new mongoose.Types.ObjectId(companyId),
        userGroups: [],
        sendnotification: false,
        createdBy: new mongoose.Types.ObjectId(userId),
        createdOn: new Date(),
        modifiedBy: new mongoose.Types.ObjectId(userId),
        modifiedOn: new Date(),
        isDeleted: false,
        projectType: "AUTO",
        creation_mode: "AUTO",
        lead_source: "EMAIL",
        projectTypeId: new mongoose.Types.ObjectId(projectTypeId),
        miscellaneous: false,
        archive: false,
        customFieldValues: {},
        referenceGroupIds: [],
        references: [],
        tag: [],
      });

      await newProject.save();

      // ✅ Save attachments properly via helper
      for (const attachment of email.attachments) {
        const fileName = attachment.filename || `attachment_${Date.now()}.bin`;
        await saveAttachmentFile({
          companyId,
          projectId: newProject._id,
          fileName,
          fileContent: attachment.content,
          createdBy: userId,
        });
      }

      console.log(`✅ Project created with attachments: ${subject}`);
    } catch (err) {
      console.error("❌ Error creating project with attachments:", err.message);
    }
  }

  return allEmails;
};
