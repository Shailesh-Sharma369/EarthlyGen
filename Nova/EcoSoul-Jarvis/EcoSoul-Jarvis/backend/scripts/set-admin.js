require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");

const setUserAsAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGOURI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGOURI or MONGO_URI not set in .env file");
    }

    await mongoose.connect(mongoUri);

    console.log("✅ Connected to MongoDB");

    // Get email from command line argument
    const userEmail = process.argv[2];

    if (!userEmail) {
      console.log("❌ Please provide an email address:");
      console.log("   Usage: node set-admin.js your-email@example.com");
      await mongoose.disconnect();
      process.exit(1);
    }

    // Find and update user
    const user = await User.findOneAndUpdate(
      { email: userEmail.toLowerCase() },
      { role: "ADMIN" },
      { new: true },
    );

    if (!user) {
      console.log("❌ User not found:", userEmail);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log("✅ User promoted to ADMIN!");
    console.log("👤 Name:", user.fullName);
    console.log("📧 Email:", user.email);
    console.log("🔐 Role:", user.role);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

setUserAsAdmin();
