const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // --- Existing Auth Fields ---
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false, // Not required for OAuth users (Google, GitHub, etc.)
      default: null,
    },
    phone: {
      type: String,
    },
    addresses: [
      {
        fullName: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    cart: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          default: 1,
        },
      },
    ],
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],

    // --- New Social Media Fields ---
    bio: {
      type: String,
      default: "Hello, I am using EcoSoul!",
    },
    profilePic: {
      type: String,
      default: "https://placehold.co/80x80/22c55e/FFF?text=U",
    },
    // OAuth fields
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    providerId: {
      type: String,
      default: null,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Follow requests for private accounts
    followRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Privacy setting (Instagram-like)
    isPrivate: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },
    // --- Online Status ---
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: null,
    },

    // ============================
    // 🌿 PRO-PLANET GAMIFICATION
    // ============================

    // Cumulative eco score (increases with deeds, eco purchases, community activity)
    ecoScore: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Green points (spendable/redeemable reward currency)
    greenPoints: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================
    // 💚 ECO-CREDITS SYSTEM (NEW)
    // ============================
    // Spendable credits that users earn through eco actions
    // Initial value: 100 credits on signup
    // Earned: +5 per post, +20 per community creation, +10 per task completion
    // Spent: -X as discount on product purchases
    ecoCredits: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Track eco-credits transactions for history
    creditsHistory: [
      {
        type: {
          type: String,
          enum: ["signup", "post", "community", "task", "purchase"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        description: {
          type: String,
          default: "",
        },
        relatedId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Eco-deed log: each entry records a verified good deed
    ecoDeeds: [
      {
        // Category of the deed
        category: {
          type: String,
          enum: [
            "Tree Planting",
            "Zero Waste",
            "Solar / Renewable Energy",
            "Recycling",
            "Water Conservation",
            "Eco Purchase",
            "Community Clean-up",
            "Sustainable Transport",
            "Animal Welfare",
            "Other",
          ],
          default: "Other",
        },
        // Short description of what the user did
        description: {
          type: String,
          default: "",
        },
        // Optional image proof URL
        proofImage: {
          type: String,
          default: null,
        },
        // Optional linked post ID (if deed was shared as a post)
        postId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post",
          default: null,
        },
        // Points awarded for this deed
        pointsAwarded: {
          type: Number,
          default: 10,
        },
        // eco score contribution
        scoreContribution: {
          type: Number,
          default: 5,
        },
        // Verification status (admin can verify featured deeds)
        verified: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Planet rank title derived from ecoScore
    // (computed on read via virtual, stored for fast queries)
    planetRank: {
      type: String,
      enum: [
        "Earth Newcomer", // 0-99
        "Green Explorer", // 100-299
        "Eco Warrior", // 300-599
        "Planet Guardian", // 600-999
        "Earth Champion", // 1000-1999
        "EcoSoul Legend", // 2000+
      ],
      default: "Earth Newcomer",
    },

    // ============================
    // 🔐 PASSWORD RESET FIELDS
    // ============================
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },

    // ============================
    // 😀 FACE LOGIN FIELDS
    // ============================
    faceAuth: {
      enabled: {
        type: Boolean,
        default: false,
      },
      descriptor: {
        type: [Number],
        default: [],
      },
      registeredAt: {
        type: Date,
        default: null,
      },
      lastLoginAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true },
);

// ============================
// 🌿 AUTO-RANK HOOK
// ============================
// Automatically updates planetRank before every save based on ecoScore
userSchema.pre("save", function () {
  const score = this.ecoScore || 0;
  if (score >= 2000) this.planetRank = "EcoSoul Legend";
  else if (score >= 1000) this.planetRank = "Earth Champion";
  else if (score >= 600) this.planetRank = "Planet Guardian";
  else if (score >= 300) this.planetRank = "Eco Warrior";
  else if (score >= 100) this.planetRank = "Green Explorer";
  else this.planetRank = "Earth Newcomer";
});

// ============================
// 🌿 AWARD DEED HELPER METHOD
// ============================
// Usage: await user.awardDeed({ category, description, proofImage, postId })
userSchema.methods.awardDeed = async function ({
  category = "Other",
  description = "",
  proofImage = null,
  postId = null,
  pointsAwarded = 10,
  scoreContribution = 5,
} = {}) {
  this.ecoDeeds.push({
    category,
    description,
    proofImage,
    postId,
    pointsAwarded,
    scoreContribution,
    verified: false,
    createdAt: new Date(),
  });
  this.greenPoints += pointsAwarded;
  this.ecoScore += scoreContribution;
  // planetRank auto-updated by pre-save hook
  return this.save();
};

// ============================
// 💚 ECO-CREDITS HELPER METHODS
// ============================

/**
 * Add eco-credits to user (earn credits)
 * Usage: await user.addCredits(amount, type, description, relatedId)
 */
userSchema.methods.addCredits = async function (
  amount = 0,
  type = "other",
  description = "",
  relatedId = null,
) {
  if (amount <= 0) return this;

  this.ecoCredits += amount;
  this.creditsHistory.push({
    type,
    amount,
    description,
    relatedId,
    createdAt: new Date(),
  });

  return this.save();
};

/**
 * Deduct eco-credits from user (spend credits)
 * Returns success true/false and remaining credits
 * Usage: await user.deductCredits(amount, type, description, relatedId)
 */
userSchema.methods.deductCredits = async function (
  amount = 0,
  type = "purchase",
  description = "",
  relatedId = null,
) {
  if (amount <= 0) return { success: true, remaining: this.ecoCredits };

  if (this.ecoCredits < amount) {
    return {
      success: false,
      remaining: this.ecoCredits,
      message: "Insufficient eco-credits",
    };
  }

  this.ecoCredits -= amount;
  this.creditsHistory.push({
    type,
    amount: -amount,
    description,
    relatedId,
    createdAt: new Date(),
  });

  await this.save();
  return {
    success: true,
    remaining: this.ecoCredits,
    message: "Credits deducted successfully",
  };
};

/**
 * Get eco-credits balance and recent transactions
 * Usage: const creditInfo = user.getCreditsInfo(limit)
 */
userSchema.methods.getCreditsInfo = function (limit = 10) {
  const history = this.creditsHistory
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);

  return {
    balance: this.ecoCredits,
    history,
    lastUpdated: new Date(),
  };
};

// Check karein ki model pehle se exist karta hai ya nahi (Overwrite Error fix)
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
