require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("../models/message");
const User = require("../models/user");

async function check() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGOURI;
    await mongoose.connect(uri);

    console.log("📊 MESSAGE COUNT BY RECEIVER:");
    const byReceiver = await Message.aggregate([
      { $group: { _id: "$receiverId", count: { $sum: 1 } } },
    ]);

    for (const rec of byReceiver) {
      const user = await User.findById(rec._id);
      console.log(`  ${rec._id} (${user.fullName}) - ${rec.count} messages`);
    }

    console.log("\n📊 ADMIN ACCOUNTS:");
    const admins = await User.find({ role: "ADMIN" });
    admins.forEach((a) => {
      console.log(`  ${a._id} - ${a.fullName} (${a.email})`);
    });

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    mongoose.disconnect();
  }
}

check();
