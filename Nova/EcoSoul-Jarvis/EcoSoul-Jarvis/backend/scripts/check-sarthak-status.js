require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");

async function checkSarthakStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGOURI ||
        process.env.MONGODB_URI ||
        "mongodb://localhost:27017/ecosoul",
    );
    console.log("✅ Connected to MongoDB\n");

    // Find Sarthak by email
    const sarthakUsers = await User.find({
      $or: [
        { email: { $regex: /sarthak/i } },
        { fullName: { $regex: /sarthak/i } },
      ],
    }).select("_id fullName email role isOnline lastSeen createdAt");

    console.log("=".repeat(80));
    console.log("🔍 SEARCHING FOR SARTHAK IN DATABASE");
    console.log("=".repeat(80) + "\n");

    if (sarthakUsers.length === 0) {
      console.log("❌ No users found with 'Sarthak' in name or email\n");
    } else {
      sarthakUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.fullName}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🆔 User ID: ${user._id}`);
        console.log(
          `   👑 Role: ${user.role || "USER"} ${user.role === "ADMIN" ? "✅ ADMIN" : ""}`,
        );
        console.log(
          `   🟢 Online Status: ${user.isOnline ? "ONLINE ✅" : "OFFLINE ❌"}`,
        );
        console.log(
          `   ⏰ Last Seen: ${user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Never"}`,
        );
        console.log(
          `   📅 Created At: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A"}`,
        );
        console.log();
      });
    }

    console.log("=".repeat(80));
    console.log("📋 ALL USERS WITH ADMIN ROLE:");
    console.log("=".repeat(80) + "\n");

    const admins = await User.find({ role: "ADMIN" }).select(
      "_id fullName email isOnline lastSeen",
    );

    if (admins.length === 0) {
      console.log("❌ No admin users found in database\n");
    } else {
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.fullName}`);
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   🆔 ID: ${admin._id}`);
        console.log(
          `   🟢 Online Status: ${admin.isOnline ? "ONLINE ✅" : "OFFLINE ❌"}`,
        );
        console.log(
          `   ⏰ Last Seen: ${admin.lastSeen ? new Date(admin.lastSeen).toLocaleString() : "Never"}`,
        );
        console.log();
      });
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

checkSarthakStatus();
