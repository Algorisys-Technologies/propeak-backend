// create controller actions for product model

// const mongoose = require("mongoose");

// // Define the database model
// const ProductSchema = new mongoose.Schema({
//   name: {
//     type: String,
//   },
//   category: {
//     type: String,
//   },
//   base_price: {
//     type: Number,
//   },
//   stock: {
//     type: Number,
//   },
//   description: {
//     type: String,
//   },
//   created_on: {
//     type: Date,
//   },
//   modified_on: {
//     type: Date,
//   },
// }
// );


// const Product = (module.exports = mongoose.model("product", ProductSchema));

const ProductCategory = require('../../models/product/product-category-model');
const Product = require('../../models/product/product-model');
const xlsx = require('xlsx')

exports.list = async function (req, res) {
  try {
    const page = req.query.page ? req.query.page : 0;
    const q = req.query.q || ""
    const regex = new RegExp(q, "i");


    const limit = 10
    const products = await Product.find({name: {$regex: regex},companyId: req.params.companyId}).limit(limit).skip(limit * page);
    const totalPages = Math.ceil(await Product.find({name: {$regex: regex},companyId: req.params.companyId}).countDocuments() / limit);
    res.json({success: true, result: products, totalPages: totalPages});
  } catch (error) {
    res.json({ message: "Failed Listing Products", success: false , result: [], totalPages: 0});
  }
}

exports.get = async function (req, res) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.json({ success: false, message: 'Product not found'});
    }
    res.json({success: true, result: product});
  } catch (error) {
    res.json({ message: "Failed Listing Products", success: false, result: {} });
  }
}



exports.create = async function (req, res) {
  try {
    console.log(req.body)
    const isProductCategoryExists = await ProductCategory.findOne({name: req.body.category})

    if(!isProductCategoryExists){
      await ProductCategory.create({name: req.body.category, companyId: req.body.companyId})
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
    res.json({success: true, message: 'Product created successfully', result: result});
  } catch (error) {
    console.log(error)
    res.json({ message: "Error Adding Product", success: false });
  }
}

exports.update = async function (req, res) {
  try {

    const isProductCategoryExists = await ProductCategory.findOne({name: req.body.category})

    if(!isProductCategoryExists){
      await ProductCategory.create({name: req.body.category, companyId: req.body.companyId})
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send('Product not found');
    }
    console.log(req.body)
    product.name = req.body.name;
    product.category = req.body.category;
    product.base_price = req.body.base_price;
    product.stock = req.body.stock;
    product.companyId = req.body.companyId;
    product.description = req.body.description;
    product.modified_on = new Date();
    const result = await product.save();
    res.json({success: true, message: 'Product updated successfully', result: result});
  } catch (error) {
    console.log(error)
    res.json({ message: "Failed Updating Product", success: false });
  }
}

exports.delete = async function (req, res) {
  try {
    const result = await Product.deleteOne({ _id: req.params.id });
    res.json({success: true, message: 'Product deleted successfully'});
  } catch (error) {
    res.json({ message: error, success: false });
  }
}

exports.uploadProductFile = async function (req, res) {
  try {
    // Ensure file is provided
    if (!req.files || !req.files.productFile) {
      return res.status(400).json({ success: false, message: 'Product file is required.' });
    }

    const productFile = req.files.productFile;
    const companyId = req.body.companyId;

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required.' });
    }

    // Parse the uploaded Excel file
    const workbook = xlsx.read(productFile.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const productsData = xlsx.utils.sheet_to_json(worksheet);

    // Validate if data exists in the Excel file
    if (!productsData.length) {
      return res.status(400).json({ success: false, message: 'The file is empty or not properly formatted.' });
    }

    // Map products to the schema fields
    const products = productsData.map(product => ({
      companyId: companyId,
      name: product.name || '',
      category: product.category || '',
      base_price: product.base_price || 0,
      stock: product.stock || 0,
      description: product.description || '',
      created_on: new Date(),
      modified_on: new Date(),
    }));

    const categoryNames = [...new Set(products.map((p) => p.category))];

  // Step 2: Fetch existing categories from the database
  const existingCategories = await ProductCategory.find({
    name: { $in: categoryNames },
    companyId,
  }).distinct("name");

  // Step 3: Determine new categories to insert
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

    res.json({ success: true, message: `${newProducts.length} Products uploaded successfully.` });
  } catch (error) {
    console.error('Error uploading product file:', error);
    res.json({ success: false, message: 'Failed Products Upload' });
  }
};


exports.listProductCategories = async function (req, res) {
  try {

    const productsCategories = await ProductCategory.find({companyId: req.params.companyId})
    res.json({success: true, result: productsCategories});
  } catch (error) {
    res.json({ message: "Failed Listing Products Categories", success: false , result: []});
  }
}

