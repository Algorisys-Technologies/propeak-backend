const Contact = require("../../models/contact/contact-model");
const mongoose = require("mongoose");

const { logError, logInfo } = require("../../common/logger");
const cacheManager = require("../../redis");
const { activeClients } = require("../..");
const { getQueueMessageCount } = require("../../rabbitmq/index");
const UploadRepositoryFile = require("../../models/global-level-repository/global-level-repository-model");
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

    const accountName = await Account.findOne({_id: accountId});
    const contacts = await Contact.find({
      companyId: companyId,
      account_id: accountId,
      isDeleted: false,
    });
    return res.status(200).json({ success: true, contacts, accountName: accountName.account_name });
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
    { title: { $regex: regex } }
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
    (await Contact.countDocuments({
      account_id: accountId,
      $and: [
        { $or: orConditions },
        { companyId },
        { account_id: accountId },
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      ],
    })))
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

  let newNumber = lastAccount && lastAccount.account_number
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

    // Find one matching uploaded file
    const checkUploadFiles = await UploadRepositoryFile.find({
      fileName: { $in: contacts.map((contact) => contact.file_name) },
    });

    console.log(checkUploadFiles, "checkUploadFiles");

    if (checkUploadFiles.length > 0) {
      for (const uploadFile of checkUploadFiles) {
        // Find the corresponding contact
        const checkContact = await Contact.findOne({
          file_name: uploadFile.fileName, // Match the file_name
        });

        console.log(checkContact, "checkContact");

        if (checkContact) {
          // Update UploadRepositoryFile title with the found contact's ID
          const data = await UploadRepositoryFile.updateOne(
            { _id: uploadFile._id },
            { title: checkContact.title }
          );

          console.log("Updated UploadRepositoryFile:", data);
        }
      }
    }

    console.log("contact created successfully:", newContacts);
    console.log(companyId, activeClients);
    const users = activeClients.get(companyId);
    console.log("live users", users);
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

    if(contactData.first_name == "" || contactData.last_name == "" || contactData.email == ""){
      return res
        .status(400)
        .send("All fields marked with an asterisk (*) are mandatory.");
    }

    // if(contactData.creationMode == "AUTO"){

    //   const contactsQueueCount = await getQueueMessageCount("contact_extraction_queue")
    //   const users = activeClients.get(companyId)
    //   users.forEach((user)=> {
    //     user.send(JSON.stringify({event: "contact-created", contactsQueueCount }))
    //   })
    // }

    const newContact = new Contact({
      ...contactData,
      companyId: companyId,
    });

    const result = await newContact.save();
    console.log("contact created successfully:", result);

    res.json({
      success: true,
      message: "Successfully added!",
      result: result,
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
