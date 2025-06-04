const express = require("express");
const router = express.Router();
const { Product } = require("./config");

router.get("/", (req, res) => {
  res.render("add-product", { errorMessage: null, success: false });
});

router.post("/", async (req, res) => {
  const { name, oldprice, newprice, imageUrl, description } = req.body;

  try {
    const newProduct = new Product({
      name,
      oldprice,
      newprice,
      imageUrl,
      description,
    });

    await newProduct.save();
    res.render("add-product", { success: true, errorMessage: null });
  } catch (error) {
    console.error("Error adding product:", error);
    res.render("add-product", { errorMessage: "Failed to add product", success: false });
  }
});

module.exports = router;
