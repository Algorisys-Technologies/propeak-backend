const mongoose = require("mongoose");

// Define the database model
const ProductSchema = new mongoose.Schema({
  companyId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
  },
  name: {
    type: String,
    unique: true,
    required: true,
 
  },
  category: {
    type: String,
    // required: true,
  },
  base_price: {
    type: Number,
  },
  stock: {
    type: Number,
  },
  description: {
    type: String,
  },
  created_on: {
    type: Date,
  },
  modified_on: {
    type: Date,
  },
}
);

const Product = (module.exports = mongoose.model("product", ProductSchema));