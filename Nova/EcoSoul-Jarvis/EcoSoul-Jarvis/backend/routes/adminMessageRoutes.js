const express = require("express");
const router = express.Router();
const AdminMessage = require("../models/adminMessage");
const User = require("../models/user");
const auth = require("../middleware/auth");

// Get all messages for a user (including broadcast)
router.get("/", auth, async (req, res) => {
  try {
    const messages = await AdminMessage.find({
      $or: [
        { receiverId: req.user.id },
        { isBroadcast: true },
        { senderId: req.user.id },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic email");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (for admin to send messages to)
router.get("/users/list", auth, async (req, res) => {
  try {
    // Fetch all non-admin users for admin messaging
    const users = await User.find({ role: { $ne: "ADMIN" } })
      .select(
        "_id fullName email profilePic isOnline lastSeen role isPrivate followers following",
      )
      .sort({ fullName: 1 }); // Sort alphabetically

    console.log(`📊 Admin fetching all users - Total: ${users.length}`);

    const formattedUsers = users.map((user) => ({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      handle: "@" + (user.email || "user").split("@")[0],
      isOnline: user.isOnline || false,
      lastSeen: user.lastSeen,
      role: user.role || "USER",
      isPrivate: user.isPrivate || false,
      followers: user.followers ? user.followers.length : 0,
      following: user.following || [],
    }));
    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message to a specific user or broadcast
router.post("/send", auth, async (req, res) => {
  try {
    const {
      receiverId,
      text,
      subject,
      messageType,
      isBroadcast,
      mediaType,
      mediaUrl,
      fileName,
      fileSize,
    } = req.body;

    // Require either text or media
    const hasText = text && text.trim() !== "";
    const hasMedia = mediaUrl && mediaType;

    if (!hasText && !hasMedia) {
      return res
        .status(400)
        .json({ error: "Message text or media is required" });
    }

    const message = new AdminMessage({
      senderId: req.user.id,
      receiverId: !isBroadcast ? receiverId : null,
      text: text ? text.trim() : "",
      subject,
      messageType,
      isBroadcast: isBroadcast || false,
      mediaType: mediaType || null,
      mediaUrl: mediaUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
    });

    await message.save();
    await message.populate("senderId", "fullName profilePic");
    await message.populate("receiverId", "fullName profilePic email");

    console.log(
      `✉️ Admin message sent: ${isBroadcast ? "BROADCAST" : "to " + receiverId}`,
    );

    // Emit real-time event via Socket.IO
    if (global.io) {
      const socketPayload = {
        _id: message._id,
        id: message._id,
        senderId: message.senderId._id,
        senderName: message.senderId.fullName || "Admin",
        senderAvatar:
          message.senderId.profilePic ||
          "https://placehold.co/48x48/3b82f6/FFFFFF?text=Admin",
        receiverId: message.receiverId ? message.receiverId._id : null,
        text: message.text,
        timestamp: message.createdAt,
        createdAt: message.createdAt,
        read: false,
        isAdminMessage: true,
        messageType: "admin",
        subject: message.subject,
        mediaType: message.mediaType,
        mediaUrl: message.mediaUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
      };

      if (isBroadcast) {
        // Send to all connected users
        global.io.emit("new-message", socketPayload);
        console.log(`📢 Broadcast admin message sent to all users`);
      } else {
        // Send to specific user's room (so user sees admin's message)
        global.io.to(`user-${receiverId}`).emit("new-message", socketPayload);
        console.log(`📨 Admin message sent to user ${receiverId}`);
      }
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete message (must come before /:messageId/* routes)
// Tries both AdminMessage and Message collections
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const Message = require("../models/message");
    const { messageId } = req.params;

    console.log(`🗑️ Delete request for message: ${messageId}`);
    console.log(`👤 Requester user ID: ${req.user.id}`);

    // Try to find in AdminMessage collection first
    let message = await AdminMessage.findById(messageId);
    let collection = "admin";

    // If not found in AdminMessage, try Message collection
    if (!message) {
      message = await Message.findById(messageId);
      collection = "user";
    }

    if (!message) {
      console.log(`❌ Message not found: ${messageId}`);
      return res
        .status(404)
        .json({ error: "Message not found in any collection" });
    }

    console.log(`✅ Message found in ${collection} collection`);

    // Only the sender can delete the message
    if (message.senderId.toString() !== req.user.id) {
      console.log(
        `❌ Authorization failed: sender ${message.senderId} !== requester ${req.user.id}`,
      );
      return res
        .status(403)
        .json({ error: "Not authorized to delete this message" });
    }

    // Delete from the appropriate collection
    if (collection === "admin") {
      await AdminMessage.findByIdAndDelete(messageId);
    } else {
      await Message.findByIdAndDelete(messageId);
    }

    console.log(`🗑️ Message deleted from ${collection} collection`);
    res.json({ success: true, message: "Message deleted", collection });
  } catch (error) {
    console.error(`❌ Error deleting message:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Mark message as read
router.post("/:messageId/read", auth, async (req, res) => {
  try {
    const message = await AdminMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if already read by this user
    const alreadyRead = message.readBy.some(
      (r) => r.userId.toString() === req.user.id,
    );

    if (!alreadyRead) {
      message.readBy.push({
        userId: req.user.id,
        readAt: new Date(),
      });
    }

    await message.save();

    // Emit read status to admin
    if (global.io) {
      global.io.emit("message-read-status", {
        messageId: req.params.messageId,
        userId: req.user.id,
        readAt: new Date(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for admin panel (all messages sent)
router.get("/admin/all", auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const messages = await AdminMessage.find()
      .sort({ createdAt: -1 })
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic email");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation with a specific user (for admin) - including user messages
router.get("/conversation/:userId", auth, async (req, res) => {
  try {
    const Message = require("../models/message");
    const mongoose = require("mongoose");

    console.log("\n📨 === GET CONVERSATION ===");
    console.log("Logged-in user ID:", req.user.id);
    console.log("Logged-in user role:", req.user.role);
    console.log("Target User ID (param):", req.params.userId);

    // ✅ SECURITY: Only admin can view user conversations
    if (req.user.role !== "ADMIN") {
      console.error("❌ User is not admin! Role:", req.user.role);
      return res
        .status(403)
        .json({ error: "Only admins can view user conversations" });
    }

    // ✅ IMPORTANT: Get the ACTUAL admin user from database (admin ID should match req.user.id)
    const actualAdmin = await User.findById(req.user.id);
    if (!actualAdmin || actualAdmin.role !== "ADMIN") {
      console.error("❌ Admin user not found or role mismatch!");
      return res.status(400).json({ error: "Admin user not found" });
    }

    const adminId = actualAdmin._id;

    // Validate target user ID
    if (!req.params.userId) {
      console.error("❌ User ID is missing!");
      return res.status(400).json({ error: "User ID is missing" });
    }

    // Convert IDs to ObjectId for proper MongoDB matching
    let adminObjectId, userObjectId;
    try {
      adminObjectId = new mongoose.Types.ObjectId(adminId);
      userObjectId = new mongoose.Types.ObjectId(req.params.userId);
      console.log("✅ IDs converted to ObjectId successfully");
    } catch (err) {
      console.error("❌ Invalid ObjectId:", err.message);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    console.log("Actual Admin ObjectId:", adminObjectId.toString());
    console.log("Target User ObjectId:", userObjectId.toString());

    // Get admin messages (admin to user) - AdminMessage collection only stores admin→user
    console.log("\n📨 Querying AdminMessage collection...");
    const adminMessages = await AdminMessage.find({
      senderId: adminObjectId,
      receiverId: userObjectId,
      isBroadcast: false, // Only direct messages to this user
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    console.log(`✅ Found ${adminMessages.length} admin messages`);
    if (adminMessages.length > 0) {
      console.log(
        `   Sample: ${adminMessages[0].senderId?.fullName} -> ${adminMessages[0].receiverId?.fullName}`,
      );
    }

    // Get user messages (user to admin - stored in Message collection with special handling)
    console.log("\n📨 Querying Message collection...");
    console.log(
      `   Query 1: senderId=${userObjectId}, receiverId=${adminObjectId}`,
    );
    console.log(
      `   Query 2: senderId=${adminObjectId}, receiverId=${userObjectId}`,
    );

    const userMessages = await Message.find({
      $or: [
        {
          senderId: userObjectId,
          receiverId: adminObjectId, // Admin
        },
        {
          senderId: adminObjectId, // Admin
          receiverId: userObjectId,
        },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    console.log(`✅ Found ${userMessages.length} user messages`);
    if (userMessages.length > 0) {
      console.log(
        `   Sample: ${userMessages[0].senderId?.fullName} -> ${userMessages[0].receiverId?.fullName}`,
      );
    }

    // Merge and sort both types of messages
    const allMessages = [
      ...adminMessages.map((msg) => ({
        ...msg.toObject(),
        messageType: "admin",
      })),
      ...userMessages.map((msg) => ({
        ...msg.toObject(),
        messageType: "user",
      })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    console.log(`\n✅ Total messages to return: ${allMessages.length}`);
    res.json(allMessages);
  } catch (error) {
    console.error("❌ ERROR in /conversation/:userId:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

module.exports = router;
