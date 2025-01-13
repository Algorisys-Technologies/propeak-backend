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

const Product = require('../../models/product/product-model');

exports.list = async function (req, res) {
  try {
    const page = req.query.page ? req.query.page : 0;
    const limit = 10
    const products = await Product.find({companyId: req.params.companyId}).limit(limit).skip(limit * page);
    const totalPages = Math.ceil(await Product.find({companyId: req.params.companyId}).countDocuments() / limit);
    res.json({success: true, result: products, totalPages: totalPages});
  } catch (error) {
    res.json({ message: error, success: false , result: [], totalPages: 0});
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
    res.json({ message: error, success: false, result: {} });
  }
}



exports.create = async function (req, res) {
  try {
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
    res.json({ message: error, success: false });
  }
}

exports.update = async function (req, res) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send('Product not found');
    }
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
    res.json({ message: error, success: false });
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