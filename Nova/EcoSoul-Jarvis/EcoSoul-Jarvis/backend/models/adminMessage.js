const mongoose = require("mongoose");

const adminMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // If receiverId is null, it's a broadcast message to all users
    isBroadcast: {
      type: Boolean,
      default: false,
    },
    text: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
    },
    messageType: {
      type: String,
      enum: ["info", "warning", "alert", "normal"],
      default: "normal",
    },
    // Media fields for advanced messaging
    mediaType: {
      type: String,
      enum: ["image", "video", "audio", "file", "gif", null],
      default: null,
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    readBy: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        readAt: Date,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AdminMessage", adminMessageSchema);
