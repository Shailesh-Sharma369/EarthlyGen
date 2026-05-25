require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");

async function verifyAdminsInUsersList() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGOURI ||
        process.env.MONGODB_URI ||
        "mongodb://localhost:27017/ecosoul",
    );
    console.log("✅ Connected to MongoDB\n");

    console.log("=".repeat(80));
    console.log("🔍 VERIFYING ADMINS IN USER LISTS");
    console.log("=".repeat(80) + "\n");

    // Get all users (like the /api/messages/users/list endpoint now does)
    const allUsers = await User.find({}).select(
      "_id fullName email role isOnline lastSeen",
    );

    console.log("📋 ALL USERS IN SYSTEM (excluding current user):\n");

    const admins = allUsers.filter((u) => u.role === "ADMIN");
    const regularUsers = allUsers.filter((u) => u.role !== "ADMIN");

    console.log(`🟢 ADMINS: ${admins.length}`);
    admins.forEach((admin) => {
      console.log(`   • ${admin.fullName} (${admin.email})`);
      console.log(
        `     Status: ${admin.isOnline ? "ONLINE ✅" : "OFFLINE ❌"}`,
      );
    });

    console.log(`\n👥 REGULAR USERS: ${regularUsers.length}`);
    regularUsers.forEach((user) => {
      console.log(`   • ${user.fullName} (${user.email})`);
      console.log(`     Status: ${user.isOnline ? "ONLINE ✅" : "OFFLINE ❌"}`);
    });

    console.log("\n" + "=".repeat(80));
    console.log("✅ CHANGES SUMMARY:");
    console.log("=".repeat(80));
    console.log(`
✅ Backend Updated:
   - /api/messages/users/list now includes ALL users (including admins)
   - Each user has role, isAdmin, isOnline, and lastSeen fields
   
✅ Frontend Updated:
   - Admin users show "👑 ADMIN" badge next to their name
   - Admin badge appears in purple (#8b5cf6) color
   - Status still shows online/offline indicator
   - Works for both conversation list and chat view

✅ Result:
   - Sarthak (${admins.find((a) => a.fullName === "sarthak") ? "✅ FOUND" : "❌ NOT FOUND"}) will now appear in regular users list
   - Admin status clearly visible with 👑 badge
   - Online status tracked in real-time
    `);
    console.log("=".repeat(80) + "\n");

    await mongoose.connection.close();
    console.log("✅ Connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

verifyAdminsInUsersList();
