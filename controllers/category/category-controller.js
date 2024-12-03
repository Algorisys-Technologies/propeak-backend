const mongoose = require("mongoose");
const Category = require("../../models/category/category-model");
const Project = require("../../models/project/project-model");
const uuidv4 = require("uuid/v4");
const jwt = require("jsonwebtoken");
const secret = require("../../config/secret");
const audit = require("../audit-log/audit-log-controller");
const access = require("../../check-entitlements");
const sortData = require("../../common/common");
const cacheManager = require("../../redis");
const errors = {
  NOT_AUTHORIZED: "Your are not authorized",
};

exports.categories_get_all = async (req, res) => {
  // let userRole = req.userInfo.userRole.toLowerCase();
  // let accessCheck = access.checkEntitlements(userRole);
  // if(accessCheck === false) {
  //     res.json({ err: errors.NOT_AUTHORIZED });
  //     return;
  // }

  var cachedData = await cacheManager.getCachedData("categoryData");

  if (!!cachedData) {
    if (cachedData.length > 0) {
      res.json(cachedData);
      return;
    }
  }

  Category.find({})
    //.sort({displayName: 1})
    .then((result) => {
      //cacheManager.setCachedData("categoryData", result)
      console.log(result);
      sortData.sort(result, "displayName");
      cacheManager.setCachedData("categoryData", result);

      res.json(result);
    })
    .catch((err) => {
      res
        .status(500)
        .json({ success: false, msg: `Something went wrong. ${err}` });
    });
};

exports.categories_post = async (req, res) => {
  const userRole = req.userInfo.userRole.toLowerCase();
  const accessCheck = access.checkEntitlements(userRole);
  if (!accessCheck) {
    return res.json({ err: errors.NOT_AUTHORIZED });
  }

  const { _id, ...categoryData } = req.body; // Destructure data


  try {
    if (_id) {
      const updatedCategory = await Category.findByIdAndUpdate(
        _id,
        categoryData
      );

      console.log(updatedCategory.title)

      // Update projects with the new category title (unchanged logic)
      await Project.find()
        .exec()
        .then((projects) => {
          projects.forEach((project) => {
            if(project.category.includes(updatedCategory.title)){
              console.log(updatedCategory.title)
              project.category = project.category.replace(
                updatedCategory.title,
                req.body.title.toLowerCase()
              );
            }
            
          });
          return Promise.all(projects.map((project) => project.save())); // Save all modified projects
        })
        .then((savedProjects) => {
          console.log("Projects updated successfully:");
        })
        .catch((err) => {
          console.error("Error updating projects:", err);
        });

      // Audit logging
      const auditFields = Object.keys(updatedCategory._doc).filter(
        (field) => field !== 'id' && field !== '_id'
      );
      const oldValues = await Category.findById(_id); // Get original values for audit
      await Promise.all(
        auditFields.map((field) =>
          audit.insertAuditLog(
            oldValues[field] || "", // Use empty string if field is initially empty
            updatedCategory._id,
            "Category",
            field,
            updatedCategory[field],
            req.userInfo.userName,
            ""
          )
        )
      );

      res.json({
        success: true,
        msg: 'Successfully Updated!',
        result: req.body,
      });
    } else {
      const newCategory = new Category(categoryData);
      const savedCategory = await newCategory.save();

      // Audit logging for new category
      const auditFields = Object.keys(savedCategory._doc).filter(
        (field) => field !== 'id' && field !== '_id'
      );
      await Promise.all(
        auditFields.map((field) =>
          audit.insertAuditLog(
            "",
            savedCategory._id,
            "Category",
            field,
            savedCategory[field],
            req.userInfo.userName,
            ""
          )
        )
      );

      res.json({
        success: true,
        msg: 'Successfully added!',
        result: savedCategory,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Something went wrong.' });
  } finally {
    // Clear cache if needed (assuming cacheManager is a caching library)
    if (cacheManager) {
      await cacheManager.clearCachedData("categoryData");
    }
  }
};



exports.categories_put = (req, res) => {
  console.log("in put")
  let userRole = req.userInfo.userRole.toLowerCase();
  let accessCheck = access.checkEntitlements(userRole);
  if (accessCheck === false) {
    res.json({ err: errors.NOT_AUTHORIZED });
    return;
  }
  let updatedCategory = {
    _id: req.params.id,
    sequence: req.body.sequence,
    title: req.body.title,
    displayName: req.body.displayName,
    show: req.body.show,
  };

  Category.findOneAndUpdate({ _id: req.params.id }, updatedCategory, {
    context: "query",
  })
    .then((oldResult) => {

      Project.find({})
        .exec() // Execute the query
        .then((projects) => {
          projects.forEach((project) => {
            if (project.category.includes(oldResult.title)) {

              console.log(project)

              project.category = project.category.replace(
                oldResult.title,
                req.body.title.toLowerCase()
              );
            }
          });
          return Promise.all(projects.map((project) => project.save())); // Save all modified projects
        })
        .then((savedProjects) => {
          console.log("Projects updated successfully:");
        })
        .catch((err) => {
          console.error("Error updating projects:", err);
        });
      Category.findOne({ _id: req.params.id })
        .then((newResult) => {
          let userIdToken = req.userInfo.userName;
          let fields = [];
          var res1 = Object.assign({}, oldResult);
          for (let keys in res1._doc) {
            if (keys !== "id" && keys !== "_id") {
              fields.push(keys);
            }
          }
          fields.filter((field) => {
            if (oldResult[field] !== newResult[field]) {
              audit.insertAuditLog(
                oldResult[field],
                newResult.id,
                "Category",
                field,
                newResult[field],
                userIdToken,
                ""
              );
            }
          });
          res.json({
            success: true,
            msg: `Successfully updated!`,
          });
        })
        .catch((err) => {
          res
            .status(500)
            .json({ success: false, msg: `Something went wrong. ${err}` });
          return;
        });
    })
    .catch((err) => {
      if (err.errors) {
        // Show failed if all else fails for some reasons
        res
          .status(500)
          .json({ success: false, msg: `Something went wrong. ${err}` });
      }
    });
};

exports.categories_delete = (req, res) => {
  let userRole = req.userInfo.userRole.toLowerCase();
  let accessCheck = access.checkEntitlements(userRole);
  if (accessCheck === false) {
    res.json({ err: errors.NOT_AUTHORIZED });
    return;
  }
  Category.findOneAndDelete({ _id: req.body.id })
    .then((result) => {
      cacheManager.clearCachedData("categoryData");
      let userIdToken = req.userInfo.userName;
      let field = "";
      var res1 = Object.assign({}, result);
      for (let keys in res1._doc) {
        if (keys === "title") {
          field = keys;
        }
      }
      audit.insertAuditLog(
        result[field],
        result.id,
        "Category",
        field,
        "",
        userIdToken,
        ""
      );

      Project.find({})
        .exec() // Execute the query
        .then((projects) => {
          projects.forEach((project) => {
            if (project.category.includes(result.title)) {

              console.log(project)

              let categoriesString =  project.category.replace(
                result.title,
                ''
              )
              let categories = categoriesString.split(',').filter((a)=> a)

              project.category = categories.join()
            }
          });
          return Promise.all(projects.map((project) => project.save())); // Save all modified projects
        })
        .then((savedProjects) => {
          console.log("Projects updated successfully:");
        })
        .catch((err) => {
          console.error("Error updating projects:", err);
        });

      

      res.json({
        success: true,
        msg: `It has been deleted.`,
        result: {
          _id: result._id,
          title: result.title,
          displayName: result.displayName,
          show: result.show,
        },
      });
    })
    .catch((err) => {
      res.status(404).json({ success: false, msg: "Nothing to delete." });
    });
};

const getCategoryById = (p, data) => {
  var jsonResponse;
  var oldResult = {
    title: p.title,
    displayName: p.displayName,
    show: p.show,
    sequence: p.sequence,
  };

  p.title = data.title;
  p.displayName = data.displayName;
  p.show = data.show;
  p.save()
    .then((result) => {
      cacheManager.clearCachedData("categoryData");
      let userIdToken = data.userName;
      let fields = [];
      var res1 = Object.assign({}, result);
      for (let keys in res1._doc) {
        if (keys !== "id" && keys !== "_id") {
          fields.push(keys);
        }
      }
      fields.filter((field) => {
        if (oldResult[field] !== result[field]) {
          audit.insertAuditLog(
            oldResult[field],
            result.id,
            "Category",
            field,
            result[field],
            userIdToken,
            ""
          );
        }
      });

      jsonResponse = {
        success: true,
        msg: `Successfully Updated!`,
        result: {
          _id: result._id,
          title: result.title,
          displayName: result.displayName,
          sequence: result.sequence,
          show: result.show,
        },
      };
    })
    .catch((err) => {
      if (err.errors) {
        // Show failed if all else fails for some reasons
        jsonResponse = { success: false, msg: `Something went wrong. ${err}` };
      }
    });

  return jsonResponse;
};
