const mongoose = require("mongoose");

const loginLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  email: String,
  loginTime: { type: Date, default: Date.now },
  success: { type: Boolean, default: true },
  ipAddress: String,
  userAgent: String,
});

const LoginLog =
  mongoose.models.LoginLog || mongoose.model("LoginLog", loginLogSchema);

module.exports = LoginLog;
