require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("../models/message");
const AdminMessage = require("../models/adminMessage");
const User = require("../models/user");

const checkMessages = async () => {
  try {
    const mongoUri = process.env.MONGOURI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);

    console.log("✅ Connected to MongoDB\n");

    // Get all users
    const users = await User.find().select("_id fullName email role");
    console.log("📊 All Users:");
    console.log("==============");
    users.forEach((u) => {
      console.log(`${u.fullName} (${u.email}) - Role: ${u.role}`);
    });

    // Get messages
    const messages = await Message.find()
      .populate("senderId", "fullName email")
      .populate("receiverId", "fullName email");

    console.log(`\n\n📨 Messages Collection (${messages.length} total):`);
    console.log("================================");
    if (messages.length === 0) {
      console.log("❌ No messages found");
    } else {
      messages.forEach((msg) => {
        console.log(`\nFrom: ${msg.senderId?.fullName || "Unknown"}`);
        console.log(`To: ${msg.receiverId?.fullName || "Unknown"}`);
        console.log(`Text: ${msg.text.substring(0, 50)}...`);
        console.log(`Date: ${msg.createdAt}`);
      });
    }

    // Get admin messages
    const adminMsgs = await AdminMessage.find()
      .populate("senderId", "fullName email")
      .populate("receiverId", "fullName email");

    console.log(`\n\n👨‍💼 AdminMessages Collection (${adminMsgs.length} total):`);
    console.log("==================================");
    if (adminMsgs.length === 0) {
      console.log("❌ No admin messages found");
    } else {
      adminMsgs.forEach((msg) => {
        console.log(`\nFrom: ${msg.senderId?.fullName || "Unknown"}`);
        console.log(`To: ${msg.receiverId?.fullName || "Unknown"}`);
        console.log(`Text: ${msg.text.substring(0, 50)}...`);
        console.log(`Date: ${msg.createdAt}`);
        console.log(`Broadcast: ${msg.isBroadcast}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

checkMessages();
