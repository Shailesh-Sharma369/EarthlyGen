require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("../models/message");
const User = require("../models/user");

async function migrate() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGOURI;
    await mongoose.connect(uri);

    // Get old admin and new admin
    const oldAdmin = await User.findById("6973ca2dc587b0a69088e1a0");
    const newAdmin = await User.findOne({
      email: "SARTHAKDESHMUKH792@GMAIL.COM",
    });

    console.log("🔄 MIGRATING MESSAGES...");
    console.log(`From: ${oldAdmin.fullName} (${oldAdmin._id})`);
    console.log(`To:   ${newAdmin.fullName} (${newAdmin._id})\n`);

    // Count messages before migration
    const beforeCount = await Message.countDocuments({
      receiverId: oldAdmin._id,
    });
    console.log(`📊 Messages to migrate: ${beforeCount}`);

    // Migrate all messages from old admin to new admin
    const result = await Message.updateMany(
      { receiverId: oldAdmin._id },
      { receiverId: newAdmin._id },
    );

    console.log(`✅ Updated ${result.modifiedCount} messages`);

    // Verify migration
    const oldCount = await Message.countDocuments({
      receiverId: oldAdmin._id,
    });
    const newCount = await Message.countDocuments({
      receiverId: newAdmin._id,
    });

    console.log(`\n📊 After migration:`);
    console.log(`   Old admin messages: ${oldCount}`);
    console.log(`   New admin messages: ${newCount}`);

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    mongoose.disconnect();
  }
}

migrate();
