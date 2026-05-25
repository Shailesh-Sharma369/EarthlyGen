require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");

async function checkOnlineUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGOURI ||
        process.env.MONGODB_URI ||
        "mongodb://localhost:27017/ecosoul",
    );
    console.log("✅ Connected to MongoDB\n");

    // Get all users with their online status
    const allUsers = await User.find({}).select(
      "_id fullName email isOnline lastSeen createdAt",
    );

    console.log(`📊 TOTAL USERS IN DATABASE: ${allUsers.length}\n`);
    console.log("=".repeat(80));

    // Separate online and offline users
    const onlineUsers = allUsers.filter((u) => u.isOnline === true);
    const offlineUsers = allUsers.filter((u) => u.isOnline === false);

    // Display online users
    console.log(`\n🟢 ONLINE USERS (${onlineUsers.length}):`);
    console.log("-".repeat(80));
    if (onlineUsers.length > 0) {
      onlineUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.fullName}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🆔 ID: ${user._id}`);
        console.log(
          `   ⏰ Last Seen: ${user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Never"}`,
        );
        console.log();
      });
    } else {
      console.log("   No users online currently");
    }

    // Display offline users (last 5)
    console.log(`\n🔴 OFFLINE USERS (${offlineUsers.length}):`);
    console.log("-".repeat(80));
    if (offlineUsers.length > 0) {
      const recentOffline = offlineUsers.slice(0, 5);
      recentOffline.forEach((user, index) => {
        console.log(`${index + 1}. ${user.fullName}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🆔 ID: ${user._id}`);
        console.log(
          `   ⏰ Last Seen: ${user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Never"}`,
        );
        console.log();
      });
      if (offlineUsers.length > 5) {
        console.log(`   ... and ${offlineUsers.length - 5} more offline users`);
      }
    } else {
      console.log("   No offline users");
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log(`📈 SUMMARY:`);
    console.log(`   🟢 Online: ${onlineUsers.length} users`);
    console.log(`   🔴 Offline: ${offlineUsers.length} users`);
    console.log(
      `   📊 Online Percentage: ${((onlineUsers.length / allUsers.length) * 100).toFixed(2)}%`,
    );
    console.log("=".repeat(80) + "\n");

    await mongoose.connection.close();
    console.log("✅ Connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkOnlineUsers();
