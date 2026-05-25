// config/db.js
const mongoose = require("mongoose");

module.exports = async () => {
  try {
    // Validate environment variables
    if (!process.env.MONGOURI) {
      throw new Error("❌ MONGOURI environment variable is not set");
    }

    if (!process.env.JWT_SECRET) {
      console.warn(
        "⚠️  WARNING: JWT_SECRET environment variable is not set. Using default (INSECURE!)",
      );
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGOURI, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1); // Exit process if DB connection fails
  }
};
