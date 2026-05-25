require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("../models/message");
const AdminMessage = require("../models/adminMessage");
const User = require("../models/user");

async function inspect() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGOURI;
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB\n");

    // Get first message
    const firstMsg = await Message.findOne();
    if (firstMsg) {
      console.log("📨 First Message Document:");
      console.log(
        "senderId:",
        firstMsg.senderId,
        "Type:",
        typeof firstMsg.senderId,
      );
      console.log(
        "receiverId:",
        firstMsg.receiverId,
        "Type:",
        typeof firstMsg.receiverId,
      );
      console.log("text:", firstMsg.text);
      console.log("Full:", JSON.stringify(firstMsg.toObject(), null, 2));
    }

    // Get all unique sender IDs
    const senders = await Message.distinct("senderId");
    console.log("\n📊 Unique sender IDs in Messages:", senders);

    // Get all users to see their IDs
    const users = await User.find({}, "_id fullName email");
    console.log("\n👥 All users in database:");
    users.forEach((u) => {
      console.log(`  ${u._id} - ${u.fullName} (${u.email})`);
    });

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    mongoose.disconnect();
  }
}

inspect();
