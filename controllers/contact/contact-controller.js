const Contact = require("../../models/contact/contact-model");
const mongoose = require("mongoose");

const { logError, logInfo } = require("../../common/logger");
const cacheManager = require("../../redis");
const { activeClients } = require("../..");
const { getQueueMessageCount } = require("../../rabbitmq/index");
const errors = {
  CONTACT_DOESNT_EXIST: "Contact does not exist",
  ADDCONTACTERROR: "Error occurred while adding the contact",
  EDITCONTACTERROR: "Error occurred while updating the contact",
  DELETECONTACTERROR: "Error occurred while deleting the contact",
  NOT_AUTHORIZED: "You are not authorized",
};

exports.getAllContact = async (req, res) => {
  const { companyId, currentPage, query, accountId } = req.body;

  const regex = new RegExp(query, "i");

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

  const contacts = await Contact.find({
    $or: [
      { first_name: { $regex: regex } },
      { last_name: { $regex: regex } },
      { phone: { $regex: regex } },
      { email: { $regex: regex } },
      { title: { $regex: regex } },
    ],
    companyId: companyId,
    account_id: accountId,
    isDeleted: false,
  })
    .skip(limit * currentPage)
    .limit(limit);

  const totalPages = Math.ceil(await Contact.countDocuments({account_id: accountId, $or: [{first_name:{ $regex: regex } }, {last_name:{ $regex: regex } }, {phone:{ $regex: regex } }, {email:{ $regex: regex }}, {title: {$regex: regex}} ],companyId: companyId,
    isDeleted: false,}) / limit)
  if (!contacts || contacts.length === 0) {
    return res.status(404).json({
      success: false,
      contacts: [],
      totalPages: 0,
      currentPage: 0,
      msg: "No contacts found for this company.",
    });
  }

  res.json({ contacts, totalPages, currentPage });
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


exports.createMultipleContacts = async (req, res) => {
  console.log("Creating contactsssss...");

  try {
    const {contacts, companyId} = req.body;
    
    const newContact = await Contact.insertMany(contacts);

    console.log("contact created successfully:", newContact);
    console.log(companyId, activeClients)
    const users = activeClients.get(companyId)
    console.log("live users", users)
    users?.forEach((user)=> {
      user.send(JSON.stringify({event: "contacts-created", message:`${contacts.length} Contacts created successfully`}))
    })

    res.json({
      success: true,
      message: "Successfully added!",
      result: newContact,
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
