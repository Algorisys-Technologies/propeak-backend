const mongoose = require("mongoose");
const ProductCategory = require("../../models/product/product-category-model");
const Product = require("../../models/product/product-model");
const xlsx = require("xlsx");
const Task = require("../../models/task/task-model");

exports.list = async function (req, res) {
  try {
    const page = req.query.page ? req.query.page : 0;
    const q = req.query.q || "";
    const regex = new RegExp(q, "i");

    const limit = 6;
    const products = await Product.find({
      name: { $regex: regex },
      companyId: req.params.companyId,
    })
      .limit(limit)
      .skip(limit * page);
    const totalPages = Math.ceil(
      (await Product.find({
        name: { $regex: regex },
        companyId: req.params.companyId,
      }).countDocuments()) / limit
    );
    res.json({ success: true, result: products, totalPages: totalPages });
  } catch (error) {
    res.json({
      message: "Failed Listing Products",
      success: false,
      result: [],
      totalPages: 0,
    });
  }
};

exports.get = async function (req, res) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, result: product });
  } catch (error) {
    res.json({
      message: "Failed Listing Products",
      success: false,
      result: {},
    });
  }
};

exports.create = async function (req, res) {
  try {
    console.log(req.body);
    const isProductCategoryExists = await ProductCategory.findOne({
      name: req.body.category,
    });

    if (!isProductCategoryExists) {
      await ProductCategory.create({
        name: req.body.category,
        companyId: req.body.companyId,
      });
    }

    const product = new Product({
      name: req.body.name,
      category: req.body.category,
      base_price: req.body.base_price,
      stock: req.body.stock,
      description: req.body.description,
      companyId: req.body.companyId,
      created_on: new Date(),
      modified_on: new Date(),
    });
    const result = await product.save();
    res.json({
      success: true,
      message: "Product created successfully",
      result: result,
    });
  } catch (error) {
    console.log(error);
    res.json({ message: "Error Adding Product", success: false });
  }
};

exports.update = async function (req, res) {
  try {
    const isProductCategoryExists = await ProductCategory.findOne({
      name: req.body.category,
    });

    if (!isProductCategoryExists) {
      await ProductCategory.create({
        name: req.body.category,
        companyId: req.body.companyId,
      });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send("Product not found");
    }
    console.log(req.body);
    product.name = req.body.name;
    product.category = req.body.category;
    product.base_price = req.body.base_price;
    product.stock = req.body.stock;
    product.companyId = req.body.companyId;
    product.description = req.body.description;
    product.modified_on = new Date();
    const result = await product.save();
    res.json({
      success: true,
      message: "Product updated successfully",
      result: result,
    });
  } catch (error) {
    console.log(error);
    res.json({ message: "Failed Updating Product", success: false });
  }
};

exports.delete = async function (req, res) {
  try {
    console.log("in delete Product");
    const tasksWithProduct = await Task.find({
      "interested_products.product_id": req.params.id,
    });

    console.log("tasksWithProduct", tasksWithProduct);

    if (tasksWithProduct.length > 0) {
      return res.json({
        success: false,
        message: "Product is assigned to a Task so it cannot be Deleted!",
      });
    }

    // if tasks length then it should return message product already assigned to a task it cannot be deleted
    const result = await Product.deleteOne({ _id: req.params.id });

    // logic to check if product is assigned to task
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.json({ message: "Failed deleting product", success: false });
  }
};

exports.uploadProductFile = async function (req, res) {
  try {
    if (!req.files || !req.files.productFile) {
      return res
        .status(400)
        .json({ success: false, message: "Product file is required." });
    }

    const productFile = req.files.productFile;
    const companyId = req.body.companyId;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: "Company ID is required." });
    }
    const workbook = xlsx.read(productFile.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const productsData = xlsx.utils.sheet_to_json(worksheet);
    if (!productsData.length) {
      return res.status(400).json({
        success: false,
        message: "The file is empty or not properly formatted.",
      });
    }
    const products = productsData.map((product) => ({
      companyId: companyId,
      name: product.name || "",
      category: product.category !== undefined ? product.category.trim() : "",
      base_price: product.base_price || 0,
      stock: product.stock || 0,
      description:
        product.description !== undefined ? product.description.trim() : "",
      created_on: new Date(),
      modified_on: new Date(),
    }));

    const categoryNames = [...new Set(products.map((p) => p.category))];
    const existingCategories = await ProductCategory.find({
      name: { $in: categoryNames },
      companyId,
    }).distinct("name");
    const newCategories = categoryNames.filter(
      (name) => !existingCategories.includes(name)
    );

    // Step 4: Insert new categories into the database
    if (newCategories.length > 0) {
      await ProductCategory.insertMany(
        newCategories.map((name) => ({ name, companyId }))
      );
    }

    // Step 5: Extract unique product names from input
    const productNames = [...new Set(products.map((p) => p.name))];

    // Step 6: Fetch existing product names from the database
    const existingProductNames = await Product.find({
      name: { $in: productNames },
      companyId,
    }).distinct("name");

    // Step 7: Filter products to insert only new ones
    const newProducts = products.filter(
      (p) => !existingProductNames.includes(p.name)
    );

    // Step 8: Insert new products into the database
    if (newProducts.length > 0) {
      await Product.insertMany(newProducts);
    }

    res.json({
      success: true,
      message: `${newProducts.length} Products uploaded successfully.`,
    });
  } catch (error) {
    console.error("Error uploading product file:", error);
    res.json({ success: false, message: "Failed Products Upload" });
  }
};

exports.listProductCategories = async function (req, res) {
  try {
    const productsCategories = await ProductCategory.find({
      companyId: req.params.companyId,
    });
    res.json({ success: true, result: productsCategories });
  } catch (error) {
    res.json({
      message: "Failed Listing Products Categories",
      success: false,
      result: [],
    });
  }
};
