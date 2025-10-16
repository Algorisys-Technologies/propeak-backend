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
const { UploadFile } = require("./models/upload-file/upload-file-model");

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

async function saveAttachmentFile({
  companyId,
  projectId,
  fileName,
  fileContent,
  createdBy,
}) {
  try {
    // Create company + project folders
    const companyFolderPath = path.join(uploadFolder, companyId.toString());
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

    // Store relative path for frontend
    const relativePath = path
      .join(companyId.toString(), projectId.toString(), fileName)
      .replace(/\\/g, "/"); // Normalize path for Windows

    // Save file entry in UploadFile collection
    const newFile = new UploadFile({
      title: fileName,
      fileName,
      description: "Auto-uploaded via email fetch",
      path: relativePath,
      isDeleted: false,
      createdBy,
      createdOn: new Date(),
      companyId,
      projectId,
      status: "todo", // optional, set default if needed
      taskId: null, // if you want to attach to a task later
    });

    const savedFile = await newFile.save();

    // Link file to project via ObjectId
    await Project.updateOne(
      { _id: projectId },
      {
        $push: {
          uploadFiles: savedFile._id, // push ObjectId
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
      "ALL",
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

  //console.log("allEmails..", allEmails);

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
      // for (const attachment of email.attachments) {
      //   console.log("attachment...", attachment);
      //   const fileName = attachment.filename || `attachment_${Date.now()}`;
      //   await saveAttachmentFile({
      //     companyId,
      //     projectId: newProject._id,
      //     fileName,
      //     fileContent: attachment.content,
      //     createdBy: userId,
      //   });
      // }

      for (const attachment of email.attachments) {
        //console.log("attachment...", attachment);

        // Check if attachment is a real file
        const isFile =
          attachment.contentType ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || // Excel
          attachment.contentType === "application/vnd.ms-excel" || // Older Excel
          attachment.contentType.startsWith("application/") || // Other binary files like PDF, docx
          attachment.contentType.startsWith("image/"); // Images

        if (!isFile) {
          console.log(
            `⚠️ Skipping attachment "${
              attachment.filename || "unknown"
            }": not a downloadable file. Use Google Drive API to download the file programmatically (requires OAuth and permission).`
          );
          continue; // skip this attachment
        }

        // Save real file
        const fileName = attachment.filename || `attachment_${Date.now()}`;
        await saveAttachmentFile({
          companyId,
          projectId: newProject._id,
          fileName,
          fileContent: attachment.content,
          createdBy: userId,
        });
      }

      //console.log(`✅ Project created with attachments: ${subject}`);
    } catch (err) {
      console.error("❌ Error creating project with attachments:", err.message);
    }
  }

  return allEmails;
};
