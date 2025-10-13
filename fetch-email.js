const Imap = require("imap");
const fs = require("fs");
const mongoose = require("mongoose");
const { simpleParser } = require("mailparser");
const dotenv = require("dotenv");

dotenv.config();

const { FetchEmail } = require("./models/fetch-email/fetch-email-model");
const Task = require("./models/task/task-model");
const TaskStage = require("./models/task-stages/task-stages-model");
const Project = require("./models/project/project-model");
const ProjectStage = require("./models/project-stages/project-stages-model");

class MailAttachmentFetcher {
  constructor({
    emailConfig,
    localFolderPath,
    targetDate,
    emailPatterns,
    targetEndDate,
  }) {
    this.emailConfig = emailConfig;
    this.localFolderPath = localFolderPath;
    this.targetDate = targetDate;
    this.targetEndDate = targetEndDate;
    this.emailPatterns = emailPatterns;

    if (!fs.existsSync(localFolderPath)) {
      fs.mkdirSync(localFolderPath, { recursive: true });
      console.log(`Created folder: ${localFolderPath}`);
    } else {
      console.log(`Folder already exists: ${localFolderPath}`);
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
    console.log("IMAP connection established.");
    this.storeAccount().then(() => {
      this.imap.openBox("INBOX", true, this.onOpenBox.bind(this));
    });
  }

  onImapError(err) {
    console.error("IMAP error:", err);
    // throw err;
  }

  onImapEnd() {
    console.log("IMAP connection ended.");
  }

  onOpenBox(err) {
    if (err) {
      console.error("Error opening INBOX:", err);
      // throw err;
    }
    console.log("INBOX opened successfully.");

    // Search emails
    // ,["SUBJECT", this.targetSubject]
    const searchCriteria = [
      "ALL",
      ["SINCE", this.targetDate.toISOString()],
      ["BEFORE", this.targetEndDate.toISOString()],
    ];

    console.log(
      "emailPatterns...",
      this.emailPatterns,
      "searchCriteria...",
      searchCriteria
    );

    // Dynamically add "FROM" conditions for all patterns
    const fromPatterns = this.emailPatterns
      .map((pattern) => pattern.from)
      .filter(Boolean);
    if (fromPatterns.length > 0) {
      let fromSearch = ["FROM", fromPatterns[0]];

      for (let i = 1; i < fromPatterns.length; i++) {
        fromSearch = ["OR", fromSearch, ["FROM", fromPatterns[i]]];
      }
      searchCriteria.push(fromSearch);
    }

    const subjectPatterns = this.emailPatterns
      .map((pattern) => pattern.subject)
      .filter(Boolean);
    if (subjectPatterns.length > 0) {
      let subjectSearch = ["SUBJECT", subjectPatterns[0]];
      for (let i = 1; i < subjectPatterns.length; i++) {
        subjectSearch = ["OR", subjectSearch, ["SUBJECT", subjectPatterns[i]]];
      }
      searchCriteria.push(subjectSearch);
    }

    // Dynamically add "TEXT" conditions
    const bodyPatterns = this.emailPatterns
      .map((pattern) => pattern.body_contains)
      .filter(Boolean);
    if (bodyPatterns.length > 0) {
      let bodySearch = ["TEXT", bodyPatterns[0]];
      for (let i = 1; i < bodyPatterns.length; i++) {
        bodySearch = ["OR", bodySearch, ["TEXT", bodyPatterns[i]]];
      }
      searchCriteria.push(bodySearch);
    }

    // console.log("Search Criteria:", JSON.stringify(searchCriteria, null, 2));

    // Perform the search
    this.imap.search(searchCriteria, this.onSearchResults.bind(this));
  }

  async onSearchResults(searchErr, results) {
    if (searchErr) {
      console.error("Error searching for emails:", searchErr);
      throw searchErr;
    }

    // console.log(`Fetched ${results.length} emails after ${this.targetDate}.`);

    for (const seqno of results) {
      const fetch = this.imap.fetch([seqno], {
        bodies: "",
        struct: true,
        flags: true,
      });

      fetch.on("message", (msg, seqno) => {
        let isSeen = false;

        msg.on("attributes", (attrs) => {
          if (attrs.flags.includes("\\Seen")) {
            isSeen = true;
          }
        });

        msg.on("body", (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) {
              console.error("Error parsing email:", err);
              return;
            }

            const emailDate = new Date(parsed.date);
            if (emailDate < this.targetDate) {
              console.log(
                `Skipping email from ${parsed.date}: before target date.`
              );
              return;
            }

            if (emailDate > this.targetEndDate) {
              console.log(
                `Skipping email from ${parsed.date}: after target end date.`
              );
              return;
            }

            // Process email if it falls within the date range
            console.log(
              `Processing email from ${parsed.date}: within target range.`
            );

            // console.log(parsed, "dodo...........")

            try {
              const emailData = {
                from: parsed.from.text || "Unknown",
                to: parsed.to.text || "Unknown",
                subject: parsed.subject || "No Subject",
                date: parsed.date || new Date(),
                bodyText: parsed.text || "",
                status: isSeen ? "seen" : "unseen",
                attachments: parsed.attachments
                  ? parsed.attachments.map((att) => ({
                      filename: att.filename || `attachment_${seqno}`,
                      contentType: att.contentType,
                      size: att.size,
                      content: att.content, // Save content in MongoDB
                    }))
                  : [],
              };

              // Add to allEmails array
              this.allEmails.push(emailData);

              if (parsed.attachments && parsed.attachments.length > 0) {
                console.log(`Saving attachments from Email ${seqno}`);

                for (const attachment of parsed.attachments) {
                  const filename =
                    attachment.filename ||
                    `attachment_${seqno}_${
                      parsed.attachments.indexOf(attachment) + 1
                    }.${attachment.contentType.split("/")[1]}`;
                  const fullPath = `${this.localFolderPath}/${filename}`;

                  // Use async writeFile to avoid blocking the event loop
                  try {
                    await fs.promises.writeFile(fullPath, attachment.content);
                    console.log(`Attachment saved: ${fullPath}`);
                  } catch (error) {
                    // console.error(`Error saving attachment ${filename}:`, error);
                  }
                }
              } else {
                // console.log(`No attachments found in Email ${seqno}.`);
              }
            } catch (error) {
              // console.error(`Error checking or saving email ${seqno}:`, error);
            }
          });
        });
      });
    }

    this.imap.end();
  }

  start() {
    console.log("Starting IMAP connection...");
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
  console.log("Running fetchEmail...");
  console.log("emailTaskConfig...", emailTaskConfig);

  // Local folder to save attachments
  const localFolderPath = "./attachments";

  const allEmails = []; // Array to store all fetched emails across accounts
  const fetchers = emailAccounts.map((account) => {
    console.log(`Starting fetch for account: ${account.user}`);
    const emailConfig = {
      user: account.user,
      password: account.password,
      host: account.host,
      port: account.port,
      tls: account.tls,
      tlsOptions: { minVersion: "TLSv1.2", rejectUnauthorized: false },
      authTimeout: 30000,
      // debug: console.log,
    };

    const mailFetcher = new MailAttachmentFetcher({
      emailConfig,
      localFolderPath,
      targetDate: emailTaskConfig.lastFetched,
      targetEndDate: emailTaskConfig.lastToFetched,
      emailPatterns: emailTaskConfig.emailPatterns,
    });
    return new Promise((resolve) => {
      mailFetcher.start();

      mailFetcher.imap.once("end", () => {
        // Collect emails after IMAP connection ends
        allEmails.push(...mailFetcher.getEmails());
        resolve();
      });
    });
  });

  // Wait for all fetchers to complete
  await Promise.all(fetchers);

  console.log("All emails fetched:", allEmails);

  // Now create tasks for each email

  try {
    for (const email of allEmails) {
      // Check if a task already exists with the same title, description, and start date
      const existingTask = await Task.findOne({
        title: email.subject,
        description: email.bodyText,
        startDate: new Date(email.date).toISOString(),
        isDeleted: false,
      });

      if (existingTask) {
        console.log(
          `Task already exists: ${email.subject} - Skipping task creation.`
        );
        continue; // Skip creating a task if it already exists
      }

      let taskStageTitle =
        (await TaskStage.findOne({ _id: taskStageId }))?.title || "todo";

      const newTask = new Task({
        title: email.subject,
        description: email.bodyText,
        completed: false,
        status: taskStageTitle,
        startDate: new Date(email.date),
        endDate: new Date(),
        createdOn: new Date(),
        modifiedOn: new Date(),
        createdBy: userId,
        isDeleted: false,
        projectId: projectId,
        companyId: companyId,
        taskStageId: taskStageId,
        userId,
        creation_mode: "AUTO",
        lead_source: "EMAIL",
      });

      // Save the new task to the database
      await newTask.save();
      console.log(`New task created and saved: ${newTask.title}`);
    }
  } catch (error) {
    console.error("Error creating tasks:", error);
  }

  return allEmails;
};

exports.fetchEmailGroup = async ({
  emailProjectConfig,
  groupId,
  projectStageId,
  projectTypeId,
  companyId,
  userId,
  emailAccounts,
}) => {
  console.log("Running fetchEmailGroup...");
  console.log("GroupId...", emailProjectConfig);

  // Local folder to save attachments
  const localFolderPath = "./attachments";

  const allEmails = []; // Array to store all fetched emails across accounts
  const fetchers = emailAccounts.map((account) => {
    console.log(`Starting fetch for account: ${account.user}`);
    const emailConfig = {
      user: account.user,
      password: account.password,
      host: account.host,
      port: account.port,
      tls: account.tls,
      tlsOptions: { minVersion: "TLSv1.2", rejectUnauthorized: false },
      authTimeout: 30000,
      // debug: console.log,
    };

    const mailFetcher = new MailAttachmentFetcher({
      emailConfig,
      localFolderPath,
      targetDate: emailProjectConfig.lastFetched,
      targetEndDate: emailProjectConfig.lastToFetched,
      emailPatterns: emailProjectConfig.emailPatterns,
    });
    return new Promise((resolve) => {
      mailFetcher.start();

      mailFetcher.imap.once("end", () => {
        // Collect emails after IMAP connection ends
        allEmails.push(...mailFetcher.getEmails());
        resolve();
      });
    });
  });

  await Promise.all(fetchers);

  console.log("allEmails...", allEmails);

  for (const email of allEmails) {
    try {
      const subject = (email.subject || "").trim();
      const bodyText = (email.bodyText || "").trim();

      // Less strict duplicate check
      const existingProject = await Project.findOne({
        title: subject,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
      });

      if (existingProject) {
        console.log(`⏩ Project already exists: ${subject}`);
        continue;
      }

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
      console.log(`✅ Project created from email: ${newProject.title}`);
    } catch (error) {
      console.error("❌ Error creating project from email:", error.message);
    }
  }

  return allEmails;
};
