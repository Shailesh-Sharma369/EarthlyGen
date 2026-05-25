require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const fs = require("fs");
const path = require("path");

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGOURI);
    console.log("✅ Connected to MongoDB");

    // Read products1.json
    const productsPath = path.join(
      __dirname,
      "../..",
      "frontend",
      "products1.json"
    );
    const productsData = JSON.parse(fs.readFileSync(productsPath, "utf8"));

    console.log(`📦 Found ${productsData.length} products to import`);

    // Clear existing products
    await Product.deleteMany({});
    console.log("🗑️ Cleared existing products");

    // Fix field names: "old price" -> "oldPrice"
    const fixedProducts = productsData.map((p) => ({
      ...p,
      oldPrice: p["old price"] || p.oldPrice,
    }));

    // Delete the "old price" field if it exists
    fixedProducts.forEach((p) => {
      delete p["old price"];
    });

    // Insert products
    const result = await Product.insertMany(fixedProducts);
    console.log(`✅ Inserted ${result.length} products successfully!`);

    // Verify insertion
    const count = await Product.countDocuments();
    console.log(`📊 Total products in database: ${count}`);

    const sample = await Product.findOne();
    console.log("📄 Sample product:", {
      name: sample.name,
      price: sample.price,
      oldPrice: sample.oldPrice,
      stock: sample.stock,
      _id: sample._id,
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seed();
