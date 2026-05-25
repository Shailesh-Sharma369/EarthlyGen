const mongoose = require("mongoose");

// Shared eco deed categories (kept in sync with user.js ecoDeeds)
const ECO_DEED_CATEGORIES = [
  "Tree Planting",
  "Zero Waste",
  "Solar / Renewable Energy",
  "Recycling",
  "Water Conservation",
  "Community Clean-up",
  "Sustainable Transport",
  "Animal Welfare",
  "Eco Purchase",
  "Other",
];

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    text: String,
    image: String,

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    // ============================
    // 🌿 ECO DEED FIELDS (v4)
    // ============================

    // "regular" = normal social post | "eco_deed" = verified good deed post
    postType: {
      type: String,
      enum: ["regular", "eco_deed"],
      default: "regular",
      index: true,
    },

    // Eco deed category — only set when postType === "eco_deed"
    ecoCategory: {
      type: String,
      enum: ECO_DEED_CATEGORIES,
      default: null,
    },

    // Detailed deed description (separate from the social caption in `text`)
    deedDescription: {
      type: String,
      default: null,
    },

    // Verification status — admin marks deed posts as verified
    ecoVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Admin who verified this deed
    ecoVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // When it was verified
    ecoVerifiedAt: {
      type: Date,
      default: null,
    },

    // Optional linked ecoDeeds subdoc ID from the user model
    linkedDeedId: {
      type: String,
      default: null,
    },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    saved: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    comments: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

const Post = mongoose.models.Post || mongoose.model("Post", postSchema);

module.exports = Post;
module.exports.ECO_DEED_CATEGORIES = ECO_DEED_CATEGORIES;
