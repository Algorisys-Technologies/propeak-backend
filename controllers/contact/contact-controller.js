const Contact = require("../../models/contact/contact-model");
const Project = require("../../models/project/project-model");
const mongoose = require("mongoose");

const { logError, logInfo } = require("../../common/logger");
const cacheManager = require("../../redis");
const { activeClients } = require("../..");
const { getQueueMessageCount } = require("../../rabbitmq/index");
const UploadRepositoryFile = require("../../models/global-level-repository/global-level-repository-model");
const { normalizeAddress } = require("../../utils/address");
const Account = require("../../models/account/account-model");
const errors = {
  CONTACT_DOESNT_EXIST: "Contact does not exist",
  ADDCONTACTERROR: "Error occurred while adding the contact",
  EDITCONTACTERROR: "Error occurred while updating the contact",
  DELETECONTACTERROR: "Error occurred while deleting the contact",
  NOT_AUTHORIZED: "You are not authorized",
};

exports.getContacts = async (req, res) => {
  try {
    const { companyId, accountId } = req.body;
    console.log(companyId, accountId, "is it coming ??????");
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: "Company ID is required" });
    }

    const accountName = await Account.findOne({ _id: accountId });
    const contacts = await Contact.find({
      companyId: companyId,
      account_id: accountId,
      isDeleted: false,
    });
    return res
      .status(200)
      .json({ success: true, contacts, accountName: accountName.account_name });
  } catch (error) {
    console.error("Error fetching contacts:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

exports.getAllContact = async (req, res) => {
  const { companyId, currentPage, query, accountId } = req.body;

  const regex = new RegExp(query, "i");
  console.log(regex, "from contact-controller");

  let vfolderId = null;
  if (mongoose.Types.ObjectId.isValid(query)) {
    vfolderId = new mongoose.Types.ObjectId(query);
  }
  const limit = 5;
  if (!companyId) {
    return res.status(400).json({
      success: false,
      contacts: [],
      totalPages: 0,
      currentPage: 0,
      msg: "Company ID is required.",
    });
  }
  console.log("in contacts");

  const orConditions = [
    { first_name: { $regex: regex } },
    { last_name: { $regex: regex } },
    { phone: { $regex: regex } },
    { email: { $regex: regex } },
    { title: { $regex: regex } },
  ];

  if (vfolderId) {
    orConditions.push({ vfolderId });
  }

  const contacts = await Contact.find({
    $and: [
      { $or: orConditions },
      { companyId },
      { account_id: accountId },
      { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
    ],
  })
    .skip(limit * currentPage)
    .limit(limit);

  const totalPages = Math.ceil(
    (await Contact.countDocuments({
      account_id: accountId,
      $and: [
        { $or: orConditions },
        { companyId },
        { account_id: accountId },
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      ],
    })) / limit
  );

  const totalContact = Math.ceil(
    await Contact.countDocuments({
      account_id: accountId,
      $and: [
        { $or: orConditions },
        { companyId },
        { account_id: accountId },
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      ],
    })
  );
  if (!contacts || contacts.length === 0) {
    return res.status(404).json({
      success: false,
      contacts: [],
      totalPages: 0,
      currentPage: 0,
      msg: "No contacts found for this company.",
    });
  }

  res.json({ contacts, totalPages, currentPage, totalContact });
};

// exports.getAllContact = async (req, res) => {
//   try {
//     const { companyId } = req.body;
//     console.log(companyId, "companyId")
//     // Validate companyId
//     if (!companyId) {
//       return res.status(400).json({ error: 'Company ID is required.' });
//     }

//     const cachedData = await cacheManager.getCachedData("contactData");

//     if (cachedData) {
//       console.log("Returning cached data");
//       return res.json(cachedData);
//     }

//     // Fetch contacts based on companyId
//     const result = await Contact.find({ companyId });
//     console.log("Data fetched from database:", result);

//     // Filter out deleted contacts if needed
//     const filteredResult = result.filter(contact => !contact.isDeleted);

//     // Cache the filtered result
//     cacheManager.setCachedData("contactData", filteredResult);
//     console.log("Data has been cached");

//     res.json(filteredResult);
//   } catch (err) {
//     console.error("Error occurred:", err);
//     res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
//   }
// };

exports.getContactFile = async (req, res) => {
  try {
    const { file_name } = req.body;
    console.log(file_name, "file_name");
  } catch (err) {
    console.error("Error occurred:", err);
    res
      .status(500)
      .json({ success: false, msg: `Something went wrong. ${err.message}` });
  }
};

// Get Contact By ID
exports.getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact || contact.isDeleted) {
      return res
        .status(404)
        .json({ success: false, msg: errors.CONTACT_DOESNT_EXIST });
    }
    res.json({ data: contact });
  } catch (err) {
    console.error("Error occurred:", err);
    res
      .status(500)
      .json({ success: false, msg: `Something went wrong. ${err.message}` });
  }
};

exports.updateVisitingCardsStatus = async (req, res) => {
  try {
    const visitingCardsIds = req.body.visitingCardsIds;

    const updatedVisitingCards = await UploadRepositoryFile.updateMany(
      { _id: { $in: visitingCardsIds } },
      { $set: { isExtracted: true } }
    );

    return res.status(200).json({
      success: true,
      message: "Visiting cards status updated successfully!",
    });
  } catch (err) {
    console.error("Error occurred:", err);
    res.status(500).json({
      success: false,
      message: "Error updating visiting cards status.",
    });
  }
};

// Create Contact
// exports.createContact = async (req, res) => {
//   try {
//     console.log("Request body:", req.body);
//     const newContact = new Contact(req.body);
//     const result = await newContact.save();
//     cacheManager.clearCachedData("contactData");
//     console.log("Contact created successfully:", result);

//     logInfo(result, "createContact result");
//     res.json({
//       success: true,
//       msg: `Successfully added!`,
//       result: result,
//     });
//   } catch (err) {
//     console.error("Error occurred while creating contact:", err);
//     res.status(500).json({ success: false, msg: errors.ADDCONTACTERROR });
//   }
// };

const generateUniqueAccountNumber = async () => {
  const lastAccount = await Account.findOne({}, { account_number: 1 })
    .sort({ account_number: -1 })
    .lean();

  let newNumber =
    lastAccount && lastAccount.account_number
      ? parseInt(lastAccount.account_number, 10) + 1
      : 1;

  return newNumber.toString().padStart(9, "0");
};

exports.convertToAccount = async (req, res) => {
  try {
    const { id } = req.body;

    const contact = await Contact.findOne({ _id: id });

    const account = await Account.create({
      account_name: `${contact.first_name || ""} ${contact.last_name || ""} ${
        contact.title || ""
      }`.trim(),
      account_number: await generateUniqueAccountNumber(), // genreate unique account number
      industry: contact.title || null, // No equivalent in contact
      website: contact.email || null, // No equivalent in contact
      phone: contact.phone || contact.mobile || null,
      email: contact.email || null,
      billing_address: contact.address || {
        street: null,
        city: null,
        state: null,
        postal_code: null,
        country: null,
      },
      shipping_address: contact.secondary_address
        ? { street: contact.secondary_address }
        : contact.address || {
            street: null,
            city: null,
            state: null,
            postal_code: null,
            country: null,
          },
      account_owner: contact.contact_owner || {
        name: null,
        user_id: null,
      },
      annual_revenue: null, // No equivalent in contact
      number_of_employees: null, // No equivalent in contact
      account_type: "Customer", // Default value
      description: contact.description || null,
      created_on: new Date(),
      modified_on: new Date(),
      tag: contact.tag || [],
      companyId: contact.companyId,
      vfolderId: contact.vfolderId,
    });

    await Contact.updateOne(
      { _id: id },
      { account_id: account._id, isConverted: true }
    );
    return res.json({
      success: true,
      message: "Contact converted successfully",
    });
  } catch (e) {
    console.log(e);
    return res.json({ success: false, message: "Failed Contact Conversion" });
  }
};

exports.createMultipleContacts = async (req, res) => {
  console.log("Creating contactsssss...");

  try {
    const { contacts, companyId } = req.body;

    // Insert contacts into the Contact collection
    const newContacts = await Contact.insertMany(contacts);

    // Auto-create projects for each new contact
    for (const contact of newContacts) {
      try {
        // ✅ Check required fields for project creation
        const projectRequiredFields = [
          contact.userId,
          contact.projectOwnerId,
          contact.notifyUserId,
          contact.projectTypeId,
          contact.projectStageId,
          contact.groupId,
        ];
        const canCreateProject = projectRequiredFields.every(
          (field) => !!field
        );

        if (!canCreateProject) {
          console.log(
            `Skipping project creation for contact ${contact._id} — missing required project fields.`
          );
          continue; // Go to next contact without creating project
        }

        // Prepare project title
        const company = contact.title?.trim();
        const name = `${contact.first_name || ""} ${
          contact.last_name || ""
        }`.trim();

        let projectTitle =
          company && company.length > 0
            ? company
            : name && name.length > 0
            ? name
            : `Contact-${contact.mobile || Date.now()}`;

        // Prepare normalized address
        let address = `${contact.address?.street || ""}, City: ${
          contact.address?.city || ""
        }, State: ${contact.address?.state || ""}, Pincode: ${
          contact.address?.postal_code || ""
        }, Country: ${contact.address?.country || ""}`;

        // function normalizeAddress(addr) {
        //   return addr
        //     .replace(/City:\s*\w+\,?/gi, "")
        //     .replace(/State:\s*\w+\,?/gi, "")
        //     .replace(/Pincode:\s*\d+\,?/gi, "")
        //     .replace(/Country:\s*IN\b/gi, "India")
        //     .replace(/\s+/g, " ")
        //     .replace(/,+/g, ",")
        //     .trim()
        //     .toLowerCase();
        // }

        const normalizedAddress = normalizeAddress(address);

        // Check if project already exists
        let existingProject = await Project.findOne({
          companyId,
          group: contact.groupId || null,
          title: projectTitle,
          isDeleted: false,
        });

        // Build project users array
        const projectUsers = Array.from(
          new Set(
            [contact.userId, contact.projectOwnerId, contact.notifyUserId]
              .filter(Boolean)
              .map((id) => id.toString())
          ),
          (idStr) => new mongoose.Types.ObjectId(idStr)
        );

        if (!existingProject) {
          existingProject = new Project({
            companyId,
            title: projectTitle,
            description: contact.description,
            contactId: contact._id || null,
            accountId: contact.account_id || null,
            startdate: new Date(),
            enddate: null,
            status: "todo",
            projectStageId: contact.projectStageId || null,
            taskStages: ["todo", "inprogress", "completed"],
            userid: contact.projectOwnerId,
            createdBy: contact.userId ? contact.userId : null,
            createdOn: new Date(),
            modifiedOn: new Date(),
            sendnotification: false,
            group: contact.groupId || null,
            isDeleted: false,
            miscellaneous: false,
            archive: false,
            customFieldValues: {
              address: normalizedAddress,
              first_name: contact.first_name,
              last_name: contact.last_name,
              email: contact.email,
              phone: contact.phone,
              mobile: contact.mobile,
              department: contact.department,
              account_name: contact.account_name,
              secondary_address: contact.secondary_address,
            },
            projectUsers,
            notifyUsers: [contact.notifyUserId],
            messages: [],
            uploadFiles: [],
            tasks: [],
            customTaskFields: [],
            projectTypeId: contact.projectTypeId || null,
            creation_mode: "AUTO",
            lead_source: "CONTACT_CONVERSION",
            tag: ["contact-conversion"],
          });

          await existingProject.save();
          console.log(
            `Project created for contact ${contact._id}: ${projectTitle}`
          );
        } else {
          console.log(
            `Project already exists for contact ${contact._id} - Skipping.`
          );
        }
      } catch (err) {
        console.error(
          `Failed to create project for contact ${contact._id}`,
          err
        );
      }
    }

    // Find one matching uploaded file
    const checkUploadFiles = await UploadRepositoryFile.find({
      fileName: { $in: contacts.map((contact) => contact.file_name) },
    });

    //console.log(checkUploadFiles, "checkUploadFiles");

    if (checkUploadFiles.length > 0) {
      for (const uploadFile of checkUploadFiles) {
        // Find the corresponding contact
        const checkContact = await Contact.findOne({
          file_name: uploadFile.fileName, // Match the file_name
        });

        //console.log(checkContact, "checkContact");

        if (checkContact) {
          // Update UploadRepositoryFile title with the found contact's ID
          const data = await UploadRepositoryFile.updateOne(
            { _id: uploadFile._id },
            { title: checkContact.title }
          );

          // console.log("Updated UploadRepositoryFile:", data);
        }
      }
    }

    //console.log("contact created successfully:", newContacts);
    //console.log(companyId, activeClients);
    const users = activeClients.get(companyId);
    //console.log("live users", users);
    users?.forEach((user) => {
      user.send(
        JSON.stringify({
          event: "contacts-created",
          message: `${contacts.length} Contacts created successfully`,
        })
      );
    });

    res.json({
      success: true,
      message: "Successfully added!",
      result: newContacts,
    });
  } catch (err) {
    console.error("Error occurred while creating contact:", err);
    res.status(500).json({
      success: false,
      msg: "Error adding contact. Please try again later.",
    });
  }
};

exports.createContact = async (req, res) => {
  console.log("Creating contactsssss...");

  try {
    const { companyId, ...contactData } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        msg: "Company ID is required to create a contact.",
      });
    }

    if (
      contactData.first_name == "" ||
      contactData.last_name == "" ||
      contactData.email == ""
    ) {
      return res
        .status(400)
        .send("All fields marked with an asterisk (*) are mandatory.");
    }

    const newContact = new Contact({
      ...contactData,
      companyId: companyId,
    });

    const savedContact = await newContact.save();

    //console.log("Contact created successfully:", savedContact);

    // ✅ Check required fields for project creation
    const projectRequiredFields = [
      savedContact.userId,
      savedContact.projectOwnerId,
      savedContact.notifyUserId,
      savedContact.projectTypeId,
      savedContact.projectStageId,
      savedContact.groupId,
    ];

    const canCreateProject = projectRequiredFields.every((field) => !!field);

    if (!canCreateProject) {
      console.log(
        `Skipping project creation for contact ${savedContact._id} — missing required project fields.`
      );
      return res.json({
        success: true,
        message:
          "Contact created successfully, but project was not created due to missing required fields.",
        result: savedContact,
      });
    }

    // ---------- AUTO-CREATE PROJECT ----------
    try {
      const company = savedContact.title?.trim();
      const name = `${savedContact.first_name || ""} ${
        savedContact.last_name || ""
      }`.trim();

      let projectTitle =
        company && company.length > 0
          ? company
          : name && name.length > 0
          ? name
          : `Contact-${savedContact.mobile || Date.now()}`;

      let address = `${savedContact.address?.street || ""}, City: ${
        savedContact.address?.city || ""
      }, State: ${savedContact.address?.state || ""}, Pincode: ${
        savedContact.address?.postal_code || ""
      }, Country: ${savedContact.address?.country || ""}`;

      // function normalizeAddress(addr) {
      //   return addr
      //     .replace(/City:\s*\w+\,?/gi, "")
      //     .replace(/State:\s*\w+\,?/gi, "")
      //     .replace(/Pincode:\s*\d+\,?/gi, "")
      //     .replace(/Country:\s*IN\b/gi, "India")
      //     .replace(/\s+/g, " ")
      //     .replace(/,+/g, ",")
      //     .trim()
      //     .toLowerCase();
      // }

      const normalizedAddress = normalizeAddress(address);

      let existingProject = await Project.findOne({
        companyId,
        group: savedContact.groupId || null,
        title: projectTitle,
        isDeleted: false,
      });

      const projectUsers = Array.from(
        new Set(
          [
            savedContact.userId,
            savedContact.projectOwnerId,
            savedContact.notifyUserId,
          ]
            .filter(Boolean)
            .map((id) => id.toString())
        ),
        (idStr) => new mongoose.Types.ObjectId(idStr)
      );

      if (!existingProject) {
        existingProject = new Project({
          companyId,
          title: projectTitle,
          description: savedContact.description,
          contactId: savedContact._id || null,
          accountId: savedContact.account_id || null,
          startdate: new Date(),
          enddate: null,
          status: "todo",
          projectStageId: savedContact.projectStageId || null,
          taskStages: ["todo", "inprogress", "completed"],
          userid: savedContact.projectOwnerId,
          createdBy: savedContact.userId ? savedContact.userId : null,
          createdOn: new Date(),
          modifiedOn: new Date(),
          sendnotification: false,
          group: savedContact.groupId || null,
          isDeleted: false,
          miscellaneous: false,
          archive: false,
          customFieldValues: {
            address: normalizedAddress,
            first_name: savedContact.first_name,
            last_name: savedContact.last_name,
            email: savedContact.email,
            phone: savedContact.phone,
            mobile: savedContact.mobile,
            department: savedContact.department,
            account_name: savedContact.account_name,
            secondary_address: savedContact.secondary_address,
          },
          projectUsers,
          notifyUsers: [savedContact.notifyUserId],
          messages: [],
          uploadFiles: [],
          tasks: [],
          customTaskFields: [],
          projectTypeId: savedContact.projectTypeId || null,
          creation_mode: "AUTO",
          lead_source: "CONTACT_CONVERSION",
          tag: ["contact-conversion"],
        });

        await existingProject.save();
        console.log(
          `Project created for contact ${savedContact._id}: ${projectTitle}`
        );
      } else {
        console.log(
          `Project already exists for contact ${savedContact._id} - Skipping.`
        );
      }
    } catch (projectErr) {
      console.error(
        `Failed to create project for contact ${savedContact._id}`,
        projectErr
      );
    }

    res.json({
      success: true,
      message: "Successfully added!",
      result: savedContact,
    });
  } catch (err) {
    console.error("Error occurred while creating contact:", err);
    res.status(500).json({
      success: false,
      msg: "Error adding contact. Please try again later.",
    });
  }
};

// Update Contact
exports.updateContact = async (req, res) => {
  try {
    const updatedContact = req.body;
    console.log(updatedContact, "updatedContact");
    console.log(req.body.id, "req.body._id ");
    const result = await Contact.findOneAndUpdate(
      { _id: req.body.id },
      updatedContact,
      { new: true }
    );
    console.log(result, "resultsssss");
    // console.log(_id, "_id")
    if (!result) {
      return res
        .status(404)
        .json({ success: false, msg: errors.CONTACT_DOESNT_EXIST });
    }
    cacheManager.clearCachedData("contactData");
    logInfo(result, "updateContact result");
    console.log(result, "resulysssssss");
    res.json({
      success: true,
      message: `Successfully updated!`,
      result: result,
    });
  } catch (err) {
    console.error("Error occurred:", err);
    res.status(500).json({ success: false, msg: errors.EDITCONTACTERROR });
  }
};

exports.deleteContact = async (req, res) => {
  console.log("Deleting this contact...");
  try {
    const contactId = req.params.id;

    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { isDeleted: true },
      { new: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    return res.status(200).json({
      data: updatedContact,
      success: true,
      message: "Contact marked as deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
