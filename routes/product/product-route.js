// create routes for product controller

//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
const productController = require("../../controllers/product/product-controller");

router.post("/create", productController.create);
router.post("/uploadProductFile", productController.uploadProductFile);
router.post("/update/:id", productController.update);
router.get("/list/:companyId", productController.list);
router.get("/get/:id", productController.get);
router.delete("/delete/:id", productController.delete);
router.get(
  "/listProductCategories/:companyId",
  productController.listProductCategories
);

module.exports = router;
