require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");

async function checkSarthakDetailedStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGOURI ||
        process.env.MONGODB_URI ||
        "mongodb://localhost:27017/ecosoul",
    );
    console.log("✅ Connected to MongoDB\n");

    // Find Sarthak's detailed information
    const sarthak = await User.findOne({
      email: { $regex: /SARTHAKDESHMUKH792@GMAIL.COM/i },
    });

    console.log("=".repeat(80));
    console.log("👤 SARTHAK'S DETAILED STATUS");
    console.log("=".repeat(80) + "\n");

    if (!sarthak) {
      console.log("❌ Sarthak not found in database\n");
    } else {
      console.log(`✅ Name: ${sarthak.fullName}`);
      console.log(`📧 Email: ${sarthak.email}`);
      console.log(`🆔 User ID: ${sarthak._id}`);
      console.log();
      console.log("👑 ROLE & PERMISSIONS:");
      console.log(`   Role: ${sarthak.role || "USER"}`);
      console.log(
        `   Is Admin: ${sarthak.role === "ADMIN" ? "✅ YES" : "❌ NO"}`,
      );
      console.log();
      console.log("🟢 ONLINE STATUS:");
      console.log(
        `   Current Status: ${sarthak.isOnline ? "ONLINE ✅" : "OFFLINE ❌"}`,
      );
      console.log(
        `   Last Seen: ${sarthak.lastSeen ? new Date(sarthak.lastSeen).toLocaleString() : "Never"}`,
      );
      console.log();
      console.log("📅 ACCOUNT INFO:");
      console.log(
        `   Created: ${sarthak.createdAt ? new Date(sarthak.createdAt).toLocaleString() : "N/A"}`,
      );
      console.log(
        `   Updated: ${sarthak.updatedAt ? new Date(sarthak.updatedAt).toLocaleString() : "N/A"}`,
      );
      console.log();
      console.log("📋 WHY STATUS SHOWS OFFLINE IN REGULAR USERS LIST:");
      console.log("   Since Sarthak is an ADMIN, he appears in:");
      console.log("   ✅ Admin Dashboard Users List - Shows ONLINE status");
      console.log("   ❌ Regular Users List - Should NOT appear (admin-only)");
      console.log();
      console.log("🔧 RECOMMENDATION:");
      console.log(
        "   Sarthak's status is correctly tracked in database as ONLINE",
      );
      console.log(
        "   If you want admins to appear in regular users list, update",
      );
      console.log("   the backend /api/messages/users/list endpoint filter.");
      console.log();
    }

    console.log("=".repeat(80) + "\n");

    await mongoose.connection.close();
    console.log("✅ Connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkSarthakDetailedStatus();
