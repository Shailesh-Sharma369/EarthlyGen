// const mongoose = require("mongoose");

// const productSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//   },

//   price: {
//     type: Number,
//     required: true,
//   },

//   stock: {
//     type: Number,
//     required: true,
//     default: 0,
//   },

//   image: {
//     type: String,
//     default: "https://via.placeholder.com/300",
//   },

//   category: {
//     type: String,
//     enum: ["Eco", "Kitchen", "Fashion", "Grocery", "Other"],
//     default: "Other",
//   },

//   isActive: {
//     type: Boolean,
//     default: true,
//   },
// }, { timestamps: true });

// module.exports = mongoose.model("Product", productSchema);

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    // Yeh field tumhare DB mein "old price" (space ke sath) hai,
    // lekin coding mein hum camelCase use karte hain.
    // Best hoga DB mein key ko rename karke "oldPrice" kar do.
    oldPrice: {
      type: Number,
    },

    stock: {
      type: Number,
      required: true,
      default: 0,
    },

    image: {
      type: String,
      default: "https://via.placeholder.com/300",
    },

    category: {
      type: String,
      // All categories from products1.json
      enum: [
        "Bags",
        "Beauty",
        "Bottles",
        "Cooking / Hair Oils",
        "Cosmetics",
        "Fitness",
        "Food & Beverage",
        "Gardening",
        "Health",
        "Home & Kitchen",
        "Home Care",
        "Lifestyle",
        "Office",
        "Personal Care",
        "Pet Care",
        "Other",
      ],
      default: "Other",
    },

    // Eco impact description (text)
    eco_impact: {
      type: String,
      default: "",
    },

    // Estimated carbon footprint (kg CO2)
    carbon_footprint: {
      type: Number,
      default: null,
    },

    // ============================
    // 🌿 ECO RATING FIELDS (v3)
    // ============================

    // Sustainability rating: 1 (lowest) → 5 (highest eco score)
    sustainabilityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null, // null = not rated yet
    },

    // Eco-attribute tags (e.g. ['Biodegradable','Plastic-Free','Vegan'])
    ecoTags: {
      type: [String],
      default: [],
      // Common tags (not enforced as enum so admins can add custom tags)
      // Suggested: Biodegradable, Plastic-Free, Vegan, Organic, Recycled,
      //            Zero-Waste, Fair-Trade, Carbon-Neutral, Chemical-Free,
      //            Compostable, Reusable, Cruelty-Free, Solar-Powered
    },

    // Verification status set during product onboarding.
    eco_status: {
      type: String,
      enum: ["certified", "eco_verified", "partially_eco", "not_verified"],
      default: "not_verified",
    },

    eco_confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    eco_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    eco_category: {
      type: String,
      default: "Poor",
    },

    eco_verified_at: {
      type: Date,
      default: null,
    },

    isEcoVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Text index for fast full-text search across name + eco fields
productSchema.index(
  { name: "text", eco_impact: "text", ecoTags: "text" },
  { name: "product_eco_text_index", weights: { name: 10, ecoTags: 5, eco_impact: 3 } }
);

// Pehle check karein ki model exist karta hai ya nahi
module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);
