const express = require("express");
const Product = require("../models/product");
const router = express.Router();

// Get all active products
// router.get("/", async (req, res) => {
//   const products = await Product.find({ isActive: true });
//   res.json({ success: true, products });
// });

// // GET PRODUCTS WITH OPTIONAL LIMIT
// router.get("/", async (req, res) => {
//   try {
//     const limit = parseInt(req.query.limit);

//     let products;
//     if (limit) {
//       products = await Product.find().limit(limit);
//     } else {
//       products = await Product.find(); // ALL products
//     }

//     res.json({
//       success: true,
//       products
//     });
//   } catch (err) {
//     res.status(500).json({ success: false });
//   }
// });

router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit);
    const search = (req.query.search || "").trim();
    const category = (req.query.category || "").trim();
    const minRating = parseFloat(req.query.minRating);        // e.g. ?minRating=3
    const ecoOnly = req.query.ecoOnly === "true";             // ?ecoOnly=true
    const ecoTagsParam = (req.query.ecoTags || "").trim();    // ?ecoTags=Vegan,Organic

    // Build MongoDB filter
    const filter = {};

    // Keyword search across name, category, eco_impact, ecoTags
    if (search) {
      const regex = new RegExp(search, "i"); // case-insensitive
      filter.$or = [
        { name: regex },
        { category: regex },
        { eco_impact: regex },
        { ecoTags: regex },
      ];
    }

    // Exact category filter (additive with search)
    if (category) {
      filter.category = new RegExp(category, "i");
    }

    // Minimum sustainability rating filter
    if (!isNaN(minRating) && minRating >= 1) {
      filter.sustainabilityRating = { $gte: minRating };
    }

    // ecoOnly: only products that have any ecoTags OR have a sustainabilityRating
    if (ecoOnly) {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { ecoTags: { $exists: true, $not: { $size: 0 } } },
            { sustainabilityRating: { $exists: true, $ne: null } },
          ],
        },
      ];
    }

    // Filter by specific eco tags (comma-separated, AND logic — product must have ALL listed tags)
    if (ecoTagsParam) {
      const tags = ecoTagsParam.split(",").map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        filter.ecoTags = { $all: tags.map((t) => new RegExp(`^${t}$`, "i")) };
      }
    }

    // Sort: if minRating or ecoOnly requested → sort by sustainabilityRating desc, else newest first
    const sortOrder =
      !isNaN(minRating) || ecoOnly
        ? { sustainabilityRating: -1, createdAt: -1 }
        : { createdAt: -1 };

    let query = Product.find(filter).sort(sortOrder);

    if (!isNaN(limit) && limit > 0) {
      query = query.limit(limit);
    }

    const products = await query;

    res.json({
      success: true,
      products,
      count: products.length,
      search: search || null,
      category: category || null,
      minRating: !isNaN(minRating) ? minRating : null,
      ecoOnly: ecoOnly || false,
      ecoTags: ecoTagsParam || null,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


module.exports = router;
