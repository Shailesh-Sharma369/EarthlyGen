// Test script to check database messages
const mongoose = require("mongoose");
const AdminMessage = require("./models/adminMessage");
const Message = require("./models/message");
const User = require("./models/user");

async function checkMessages() {
  try {
    await mongoose.connect(
      "mongodb+srv://jarvis:jarvis%40123@cluster0.q86xq.mongodb.net/EcoSoul",
    );

    console.log("\n📊 Checking database messages:");

    // Get all users
    const users = await User.find().select("_id fullName email role");
    console.log(`\n👥 Total users: ${users.length}`);

    const adminUser = users.find((u) => u.role === "ADMIN");
    if (adminUser) {
      console.log(`✅ Admin found: ${adminUser.fullName} (${adminUser._id})`);
    } else {
      console.log("❌ No admin user found");
    }

    // Check AdminMessages
    const adminMessages = await AdminMessage.find().populate(
      "senderId receiverId",
    );
    console.log(`\n📨 Total AdminMessages: ${adminMessages.length}`);
    if (adminMessages.length > 0) {
      console.log("Sample AdminMessages:");
      adminMessages.slice(0, 3).forEach((msg) => {
        console.log(
          `  - ${msg.senderId?.fullName || msg.senderId} -> ${msg.receiverId?.fullName || msg.receiverId}: "${msg.text.substring(0, 20)}..."`,
        );
      });
    }

    // Check regular Messages
    const messages = await Message.find().populate("senderId receiverId");
    console.log(`\n💬 Total Messages: ${messages.length}`);
    if (messages.length > 0) {
      console.log("Sample Messages:");
      messages.slice(0, 3).forEach((msg) => {
        console.log(
          `  - ${msg.senderId?.fullName || msg.senderId} -> ${msg.receiverId?.fullName || msg.receiverId}: "${msg.text.substring(0, 20)}..."`,
        );
      });
    }

    // Check if any messages exist between admin and users
    if (adminUser) {
      const between = await Message.find({
        $or: [{ senderId: adminUser._id }, { receiverId: adminUser._id }],
      }).populate("senderId receiverId");

      console.log(`\n🔗 Messages involving admin: ${between.length}`);
      if (between.length > 0) {
        console.log("Sample:");
        between.slice(0, 3).forEach((msg) => {
          console.log(
            `  - ${msg.senderId?.fullName} -> ${msg.receiverId?.fullName}: "${msg.text.substring(0, 20)}..."`,
          );
        });
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkMessages();
