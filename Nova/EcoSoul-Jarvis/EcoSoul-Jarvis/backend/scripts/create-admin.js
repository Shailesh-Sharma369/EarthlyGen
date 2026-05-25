require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user");

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGOURI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGOURI or MONGO_URI not set in .env file");
    }

    await mongoose.connect(mongoUri);

    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "ADMIN" });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists:", existingAdmin.email);
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const adminEmail = "admin@ecosoul.com";
    const adminPassword = "Admin@123456";

    // Hash password
    const hash = await bcrypt.hash(adminPassword, 10);

    const admin = await User.create({
      fullName: "EcoSoul Admin",
      email: adminEmail,
      password: hash,
      role: "ADMIN",
      provider: "local",
    });

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email:", adminEmail);
    console.log("🔑 Password:", adminPassword);
    console.log("👤 User ID:", admin._id);
    console.log("\n⚠️ IMPORTANT: Change this password after first login!");

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();
