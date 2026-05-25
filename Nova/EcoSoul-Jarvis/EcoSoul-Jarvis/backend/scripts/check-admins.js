require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");

const checkAdmins = async () => {
  try {
    const mongoUri = process.env.MONGOURI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGOURI or MONGO_URI not set in .env file");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Find all admins
    const admins = await User.find({ role: "ADMIN" }).select(
      "_id fullName email role createdAt",
    );

    if (admins.length === 0) {
      console.log("❌ No admins found");
      console.log("Run: node scripts/create-admin.js");
    } else {
      console.log("👨‍💼 Admin Users Found:");
      console.log("=======================");
      admins.forEach((admin) => {
        console.log(`\n📧 Email: ${admin.email}`);
        console.log(`👤 Name: ${admin.fullName}`);
        console.log(`🔐 Role: ${admin.role}`);
        console.log(`🆔 ID: ${admin._id}`);
        console.log(`📅 Created: ${admin.createdAt}`);
      });
    }

    // Also show total users and their roles
    const allUsers = await User.find().select("email role");
    const roleCount = {};
    allUsers.forEach((u) => {
      const role = u.role || "USER";
      roleCount[role] = (roleCount[role] || 0) + 1;
    });

    console.log("\n\n📊 Total Users by Role:");
    console.log("=======================");
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`${role}: ${count}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

checkAdmins();
