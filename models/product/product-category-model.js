const mongoose = require("mongoose");

// Define the database model
const ProductCategorySchema = new mongoose.Schema({
  companyId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
  },
  name: {
    type: String,
    unique: true,
    required: true,
  },
}
);

const ProductCategory = (module.exports = mongoose.model("product-category", ProductCategorySchema));