const express = require("express");
const router = express.Router();
const Message = require("../models/message");
const User = require("../models/user");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/messages");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: function (req, file, cb) {
    // Accept images, videos, audio, and common document types
    const allowedTypes =
      /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Upload media endpoint
router.post("/upload", auth, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `/uploads/messages/${req.file.filename}`;

    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of users for messaging
router.get("/users/list", auth, async (req, res) => {
  try {
    // Include all users (excluding the requesting user), including admins
    // No limit - show all users in real-time search
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select(
        "_id fullName email avatar isOnline lastSeen role isPrivate followers following",
      )
      .sort({ fullName: 1 }); // Sort alphabetically

    console.log(`📊 Fetching all users for search - Total: ${users.length}`);

    const formattedUsers = users.map((user) => ({
      id: user._id,
      name: user.fullName,
      email: user.email,
      avatar: user.avatar || "https://placehold.co/48x48",
      handle: "@" + (user.email || "user").split("@")[0],
      isOnline: user.isOnline || false,
      lastSeen: user.lastSeen,
      role: user.role || "USER",
      isAdmin: user.role === "ADMIN",
      isPrivate: user.isPrivate || false,
      followers: user.followers ? user.followers.length : 0,
      following: user.following || [],
    }));

    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message to a user
router.post("/send", auth, async (req, res) => {
  try {
    const { receiverId, text, mediaType, mediaUrl, fileName, fileSize } =
      req.body;

    // Require either text or media
    const hasText = text && text.trim() !== "";
    const hasMedia = mediaUrl && mediaType;

    if (!hasText && !hasMedia) {
      return res
        .status(400)
        .json({ error: "Message text or media is required" });
    }

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver ID is required" });
    }

    const message = new Message({
      senderId: req.user.id,
      receiverId: receiverId,
      text: text ? text.trim() : "",
      read: false,
      mediaType: mediaType || null,
      mediaUrl: mediaUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
    });

    await message.save();
    await message.populate("senderId", "fullName avatar email");
    await message.populate("receiverId", "fullName avatar email");

    const formattedMessage = {
      id: message._id,
      _id: message._id,
      senderId: message.senderId._id,
      senderName: message.senderId.fullName,
      senderAvatar: message.senderId.avatar,
      receiverId: message.receiverId._id,
      text: message.text,
      timestamp: message.createdAt,
      createdAt: message.createdAt,
      read: message.read,
      mediaType: message.mediaType,
      mediaUrl: message.mediaUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
    };

    // Emit real-time event via Socket.IO
    if (global.io) {
      global.io.to(`user-${receiverId}`).emit("new-message", {
        from: req.user.id,
        fromName: message.senderId.fullName,
        fromAvatar: message.senderId.avatar,
        senderId: req.user.id,
        senderName: message.senderId.fullName,
        text: message.text,
        mediaType: message.mediaType,
        mediaUrl: message.mediaUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        message: formattedMessage,
      });
    }

    res.status(201).json(formattedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message to admin
router.post("/admin/send", auth, async (req, res) => {
  try {
    const { text, mediaType, mediaUrl, fileName, fileSize } = req.body;

    // Require either text or media
    const hasText = text && text.trim() !== "";
    const hasMedia = mediaUrl && mediaType;

    if (!hasText && !hasMedia) {
      return res
        .status(400)
        .json({ error: "Message text or media is required" });
    }

    // Find admin user
    const User = require("../models/user");
    const admin = await User.findOne({ role: "ADMIN" });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const message = new Message({
      senderId: req.user.id,
      receiverId: admin._id,
      text: text ? text.trim() : "",
      read: false,
      mediaType: mediaType || null,
      mediaUrl: mediaUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
    });

    await message.save();
    await message.populate("senderId", "fullName avatar email");
    await message.populate("receiverId", "fullName avatar email");

    const formattedMessage = {
      id: message._id,
      _id: message._id,
      senderId: message.senderId._id,
      senderName: message.senderId.fullName,
      senderAvatar: message.senderId.avatar,
      receiverId: message.receiverId._id,
      text: message.text,
      timestamp: message.createdAt,
      createdAt: message.createdAt,
      read: message.read,
      mediaType: message.mediaType,
      mediaUrl: message.mediaUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
    };

    // Emit real-time event to admin socket (so admin sees user's message)
    if (global.io) {
      global.io.to("admin").emit("new-message", {
        _id: message._id,
        id: message._id,
        from: req.user.id,
        fromName: message.senderId.fullName,
        fromAvatar: message.senderId.avatar,
        senderId: req.user.id,
        senderName: message.senderId.fullName,
        senderAvatar: message.senderId.avatar,
        receiverId: admin._id,
        text: message.text,
        timestamp: message.createdAt,
        createdAt: message.createdAt,
        read: false,
        isAdminMessage: false,
        mediaType: message.mediaType,
        mediaUrl: message.mediaUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        message: formattedMessage,
      });
    }

    res.status(201).json(formattedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations for a user (with pagination)
router.get("/conversations", auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [{ senderId: req.user.id }, { receiverId: req.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "fullName avatar email")
      .populate("receiverId", "fullName avatar email");

    // Group messages by conversation partner
    const conversations = {};
    messages.forEach((msg) => {
      const partnerId =
        msg.senderId._id.toString() === req.user.id
          ? msg.receiverId._id
          : msg.senderId._id;
      const partnerIdStr = partnerId.toString();

      if (!conversations[partnerIdStr]) {
        conversations[partnerIdStr] = [];
      }
      conversations[partnerIdStr].push(msg);
    });

    // Format conversations
    const formattedConversations = [];
    for (const partnerId in conversations) {
      const msgs = conversations[partnerId];
      const lastMsg = msgs[0];
      const partner =
        lastMsg.senderId._id.toString() === req.user.id
          ? lastMsg.receiverId
          : lastMsg.senderId;

      const unreadCount = msgs.filter(
        (m) => m.receiverId._id.toString() === req.user.id && !m.read,
      ).length;

      formattedConversations.push({
        partnerId: partner._id,
        partnerName: partner.fullName,
        partnerAvatar: partner.avatar,
        lastMessage: lastMsg.text,
        lastMessageTime: lastMsg.createdAt,
        unreadCount,
      });
    }

    // Apply pagination
    const total = formattedConversations.length;
    const paginatedConversations = formattedConversations.slice(
      skip,
      skip + limit,
    );

    res.json({
      success: true,
      conversations: paginatedConversations.sort(
        (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
      ),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a message (soft delete - only sender can truly delete)
// IMPORTANT: Must come before /:userId GET route to avoid route conflict
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const isSender = message.senderId.toString() === req.user.id;
    const isReceiver = message.receiverId.toString() === req.user.id;
    const userRole = (await User.findById(req.user.id)).role;
    const isAdmin = userRole === "ADMIN";

    // Only sender or admin can delete
    if (!isSender && !isAdmin) {
      return res
        .status(403)
        .json({ error: "You can only delete your own messages" });
    }

    // If admin deletes, fully delete from everyone
    if (isAdmin) {
      await Message.findByIdAndDelete(req.params.messageId);

      // Notify both users that message was deleted by admin
      if (global.io) {
        global.io
          .to(`user-${message.senderId}`)
          .emit("message-deleted", { messageId: req.params.messageId });
        global.io
          .to(`user-${message.receiverId}`)
          .emit("message-deleted", { messageId: req.params.messageId });
      }
    } else {
      // User deletes only for themselves
      if (isSender) {
        message.deletedBySender = true;
      }
      if (isReceiver) {
        message.deletedByReceiver = true;
      }
      await message.save();
    }

    res.json({ success: true, fullyDeleted: isAdmin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation history with a specific user
router.get("/:userId", auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        {
          senderId: req.user.id,
          receiverId: req.params.userId,
        },
        {
          senderId: req.params.userId,
          receiverId: req.user.id,
        },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullName avatar email")
      .populate("receiverId", "fullName avatar email");

    // Mark messages as read
    await Message.updateMany(
      {
        receiverId: req.user.id,
        senderId: req.params.userId,
        read: false,
      },
      { read: true },
    );

    const formattedMessages = messages.map((msg) => ({
      id: msg._id,
      _id: msg._id,
      senderId: msg.senderId._id,
      senderName: msg.senderId.fullName,
      senderAvatar: msg.senderId.avatar,
      receiverId: msg.receiverId._id,
      text: msg.text,
      timestamp: msg.createdAt,
      read: msg.read,
      // ✅ Include media fields
      mediaType: msg.mediaType,
      mediaUrl: msg.mediaUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
    }));

    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post("/:userId", auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Message text is required" });
    }

    const message = new Message({
      senderId: req.user.id,
      receiverId: req.params.userId,
      text: text.trim(),
      read: false,
    });

    await message.save();
    await message.populate("senderId", "name avatar email");
    await message.populate("receiverId", "name avatar email");

    const formattedMessage = {
      id: message._id,
      senderId: message.senderId._id,
      senderName: message.senderId.name,
      senderAvatar: message.senderId.avatar,
      receiverId: message.receiverId._id,
      text: message.text,
      timestamp: message.createdAt,
      read: message.read,
    };

    // Emit real-time event via Socket.IO
    if (global.io) {
      global.io.to(`user-${req.params.userId}`).emit("new-message", {
        from: req.user.id,
        fromName: message.senderId.name,
        fromAvatar: message.senderId.avatar,
        message: formattedMessage,
      });
    }

    res.status(201).json(formattedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.post("/:userId/read", auth, async (req, res) => {
  try {
    await Message.updateMany(
      {
        receiverId: req.user.id,
        senderId: req.params.userId,
        read: false,
      },
      { read: true },
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message to admin
router.post("/admin/send", auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Message text is required" });
    }

    // Find admin user
    let admin = await User.findOne({ role: "ADMIN" });

    // If no admin found, return error
    if (!admin) {
      return res.status(404).json({ error: "Admin user not found" });
    }

    const message = new Message({
      senderId: req.user.id,
      receiverId: admin._id, // Always use admin._id, never "admin" string
      text: text.trim(),
      read: false,
      isAdminMessage: true,
    });

    await message.save();

    // Re-fetch and populate the message
    const populatedMessage = await Message.findById(message._id).populate(
      "senderId",
      "fullName avatar email",
    );

    if (admin) {
      await populatedMessage.populate("receiverId", "fullName avatar email");
    }

    const formattedMessage = {
      id: populatedMessage._id,
      senderId: populatedMessage.senderId._id,
      senderName: populatedMessage.senderId.fullName,
      senderAvatar: populatedMessage.senderId.avatar,
      receiverId:
        typeof populatedMessage.receiverId === "string"
          ? populatedMessage.receiverId
          : populatedMessage.receiverId._id,
      text: populatedMessage.text,
      timestamp: populatedMessage.createdAt,
      read: populatedMessage.read,
    };

    // Emit real-time event via Socket.IO
    if (global.io) {
      // ✅ Broadcast to admin room so they see the message in real-time
      global.io.to(`admin`).emit("new-message", {
        _id: message._id, // ✅ Important: Include _id for deduplication
        id: message._id,
        from: req.user.id, // ✅ Important: Include 'from' for admin panel
        fromName: req.user.fullName,
        senderId: req.user.id,
        senderName: req.user.fullName,
        senderAvatar: req.user.avatar || "https://placehold.co/48x48",
        text: message.text,
        timestamp: message.createdAt,
        createdAt: message.createdAt,
        isAdminMessage: false, // This is a user message, not admin message
        messageType: "user", // Mark as user message
      });

      // ✅ Send confirmation back to user (they already added it to state, so this is just for realtime sync)
      global.io.to(`user-${req.user.id}`).emit("admin-send-confirmation", {
        _id: message._id,
        id: message._id,
        text: message.text,
        timestamp: message.createdAt,
        createdAt: message.createdAt,
      });

      console.log(`✅ User message emitted to admin room: ${message._id}`);
    }

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error("❌ ERROR in /admin/send:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get admin conversation for a user
router.get("/admin/conversation", auth, async (req, res) => {
  try {
    const AdminMessage = require("../models/adminMessage");
    const admin = await User.findOne({ role: "ADMIN" });

    // If no admin found, return empty array (allow chat anyway)
    if (!admin) {
      console.log("⚠️ Admin not found, returning empty conversation");
      return res.json([]);
    }

    // ✅ FETCH FROM BOTH COLLECTIONS
    console.log(`📨 Fetching messages for user ${req.user.id}`);

    // 1. Get AdminMessage entries (admin → user)
    const adminMessages = await AdminMessage.find({
      receiverId: req.user.id,
      isBroadcast: false, // Only direct messages, not broadcasts
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    console.log(`✅ Found ${adminMessages.length} admin messages`);

    // 2. Get Message entries (user → admin)
    const userMessages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: admin._id },
        { senderId: admin._id, receiverId: req.user.id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullName avatar email")
      .populate("receiverId", "fullName avatar email");

    console.log(`✅ Found ${userMessages.length} user messages`);

    // ✅ MERGE AND FORMAT BOTH TYPES
    const allMessages = [
      ...adminMessages.map((msg) => {
        const senderIsAdmin =
          msg.senderId._id.toString() === admin._id.toString();
        return {
          id: msg._id,
          _id: msg._id,
          senderId: msg.senderId._id,
          senderName: msg.senderId.fullName || "Admin",
          senderAvatar:
            msg.senderId.profilePic ||
            "https://placehold.co/48x48/3b82f6/FFFFFF?text=Admin",
          text: msg.text,
          timestamp: msg.createdAt,
          createdAt: msg.createdAt,
          by: "admin",
          isAdminMessage: true,
          messageType: "admin",
        };
      }),
      ...userMessages
        .filter((msg) => {
          // Filter out soft-deleted messages for current user
          const userIsReceiver = msg.receiverId._id.toString() === req.user.id;
          const userIsSender = msg.senderId._id.toString() === req.user.id;

          if (userIsReceiver && msg.deletedByReceiver) return false;
          if (userIsSender && msg.deletedBySender) return false;

          return true;
        })
        .map((msg) => {
          const senderIsAdmin =
            msg.senderId._id.toString() === admin._id.toString();
          return {
            id: msg._id,
            _id: msg._id,
            senderId: msg.senderId._id,
            senderName: msg.senderId.fullName || "Unknown",
            senderAvatar: msg.senderId.avatar || "",
            text: msg.text,
            timestamp: msg.createdAt,
            createdAt: msg.createdAt,
            by: senderIsAdmin ? "admin" : "user",
            isAdminMessage: senderIsAdmin,
            messageType: senderIsAdmin ? "admin" : "user",
          };
        }),
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    console.log(`📨 Total messages returned: ${allMessages.length}`);

    res.json(allMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
