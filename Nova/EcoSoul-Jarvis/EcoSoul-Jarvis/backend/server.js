require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const http = require("http");
const socketIo = require("socket.io");

const {
  helmetConfig,
  corsOptions,
  mongoSanitize,
  hpp,
  requestLogger,
  suspiciousActivityDetector,
} = require("./middleware/security");
const { apiLimiter } = require("./middleware/rateLimiter");

const connectDB = require("./config/db");
const User = require("./models/user");
const Order = require("./models/order");

const authRoutes = require("./routes/authRoutes");
const companyAuthRoutes = require("./routes/companyAuthRoutes");
const oauthRoutes = require("./routes/oauthRoutes");
const cartRoutes = require("./routes/cartroutes");
const orderRoutes = require("./routes/orderroutes");
const productRoutes = require("./routes/productroutes");
const postRoutes = require("./routes/postroutes");
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userExtraRoutes = require("./routes/userExtraRoutes");
const groupRoutes = require("./routes/groupRoutes");
const messageRoutes = require("./routes/messageRoutes");
const adminMessageRoutes = require("./routes/adminMessageRoutes");
const activityRoutes = require("./routes/activityRoutes");
const storyRoutes = require("./routes/storyRoutes");

const adminProductRoutes = require("./routes/adminproductroutes");
const adminOrderRoutes = require("./routes/adminorderroutes");
const adminStatRoutes = require("./routes/adminstatroutes");
const adminCartsRoutes = require("./routes/adminCarts");
const contactRoutes = require("./routes/contactRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const aiRoutes = require("./routes/aiRoutes");
const ecoVerificationRoutes = require("./routes/ecoVerificationRoutes");
const userVerificationRoutes = require("./routes/userVerificationRoutes");

const app = express();

// ========== SECURITY & MIDDLEWARE (MUST BE FIRST) ==========
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(mongoSanitize);
app.use(hpp);
app.use(requestLogger);
app.use(suspiciousActivityDetector);
app.use("/api/", apiLimiter);

// ========== BODY PARSING ==========
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ========== SERVE STATIC FILES (FRONTEND) ==========
const path = require("path");

// Root route MUST come before express.static so it is not intercepted
// by express.static serving index.html for GET /
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "../frontend/homepage.html"));
});

// Disable caching for ruhi.js so browser always gets latest version
app.get("/ruhi.js", (req, res) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(path.join(__dirname, "../frontend/ruhi.js"));
});
app.use(express.static(path.join(__dirname, "../frontend")));

// ========== SERVE UPLOADED MEDIA FILES ==========
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

connectDB();

// ========== API ROUTES ==========
app.use("/api/auth", authRoutes);
app.use("/api/auth/company", companyAuthRoutes);
app.use("/api/oauth", oauthRoutes);
// FIX: userExtraRoutes MUST be before userRoutes because userRoutes has a wildcard
// GET /:userId that would intercept /leaderboard, /eco-stats, /deed, etc.
app.use("/api/user", userExtraRoutes);
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes); // Alias for consistency
app.use("/api/posts", postRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin/messages", adminMessageRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/stories", storyRoutes);

// ---------- ADMIN ----------
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/stats", adminStatRoutes);
app.use("/api/admin", adminCartsRoutes);

// ---------- CONTACT ----------
app.use("/api/contact", contactRoutes);

// ---------- NOTIFICATIONS ----------
app.use("/api/notifications", notificationRoutes);

// ---------- AI ASSISTANT (RUHI) ----------
app.use("/api/ai", aiRoutes);

// ---------- ECO VERIFICATION ----------
app.use("/api/verify/eco", ecoVerificationRoutes);
app.use("/api/verify", userVerificationRoutes);

// ========== HEALTH CHECK =========="
app.get("/api/health", (_, res) => {
  res.json({ message: "Backend running 🚀" });
});

// Root is already registered above express.static — no duplicate needed here

// ========== SERVE FRONTEND FOR UNMATCHED ROUTES ==========
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ========== SERVER WITH SOCKET.IO ==========
const PORT = process.env.PORT || 5002;
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Make io accessible to routes
app.io = io;
global.io = io;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.warn(
      `⚠️  Port ${PORT} in use — killing old process and retrying...`,
    );
    const { execSync } = require("child_process");
    try {
      // Works on Windows (netstat) and falls back gracefully on other OS
      const raw = execSync(`netstat -ano | findstr :${PORT} | findstr LISTEN`, {
        encoding: "utf8",
      });
      const pid = raw.trim().split(/\s+/).pop();
      if (pid && pid !== process.pid.toString()) {
        execSync(`taskkill /PID ${pid} /F`);
        console.log(`✅ Killed PID ${pid}. Restarting in 1s...`);
        setTimeout(() => server.listen(PORT), 1000);
      }
    } catch (e) {
      console.error(
        "Could not auto-kill old process. Run manually:\n  Get-Job | Stop-Job; Get-Job | Remove-Job",
      );
      process.exit(1);
    }
  } else {
    throw err;
  }
});

// Socket.io connection handling for real-time messaging
io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  // ✅ SECURITY: Verify token on connection
  const token = socket.handshake.auth.token;
  let authenticatedUserId = null;
  let isAdmin = false;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      authenticatedUserId = decoded.id || decoded.userId;
      isAdmin = decoded.isAdmin || decoded.role === "ADMIN";
      socket.userId = authenticatedUserId;
      socket.isAdmin = isAdmin;
      console.log(
        `✅ User ${authenticatedUserId} authenticated (Admin: ${isAdmin})`,
      );

      // ===== UPDATE USER STATUS TO ONLINE =====
      User.findByIdAndUpdate(
        authenticatedUserId,
        { isOnline: true, lastSeen: new Date() },
        { new: true },
      )
        .then(() => {
          // Broadcast user online status to all connected users
          io.emit("user-status-changed", {
            userId: authenticatedUserId,
            isOnline: true,
            timestamp: new Date(),
          });
          console.log(`✅ User ${authenticatedUserId} marked as ONLINE`);
        })
        .catch((err) =>
          console.error(`❌ Error updating user status:`, err.message),
        );
    } catch (err) {
      console.log(
        `❌ Authentication failed for socket ${socket.id}:`,
        err.message,
      );
      socket.emit("auth-error", { message: "Invalid or expired token" });
      socket.disconnect();
      return;
    }
  } else {
    console.log(`⚠️ No token provided for socket ${socket.id}`);
    socket.emit("auth-error", { message: "Token required" });
    socket.disconnect();
    return;
  }

  // User joins their personal room for receiving messages
  socket.on("join-user-room", (userId) => {
    // ✅ SECURITY: Verify user is joining their own room or is admin
    if (socket.userId !== userId && !socket.isAdmin) {
      socket.emit("error", { message: "Not authorized to join this room" });
      return;
    }
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined their room (Socket: ${socket.id})`);
  });

  // Admin joins admin room for receiving messages from users
  socket.on("join-admin-room", () => {
    // ✅ SECURITY: Only admin can join admin room
    if (!socket.isAdmin) {
      socket.emit("error", { message: "Only admin can join admin room" });
      return;
    }
    socket.join("admin");
    console.log(`👨‍💼 Admin joined admin room (Socket: ${socket.id})`);
  });

  // Join story room for real-time viewer updates
  socket.on("join-story-room", (data) => {
    const { storyId } = data;
    if (!storyId) {
      socket.emit("error", { message: "Story ID is required" });
      return;
    }
    socket.join(`story-${storyId}`);
    console.log(`📖 User ${socket.userId} joined story room: story-${storyId}`);
  });

  // Leave story room
  socket.on("leave-story-room", (data) => {
    const { storyId } = data;
    if (!storyId) return;
    socket.leave(`story-${storyId}`);
    console.log(`📖 User ${socket.userId} left story room: story-${storyId}`);
  });

  // Listen for typing indicator
  socket.on("typing", (data) => {
    const { to, userId, userName, isTyping } = data;

    // Send typing indicator to recipient
    if (to === "admin" && socket.isAdmin) {
      // If messaging admin, send to all admins
      io.to("admin").emit("user-typing", {
        userId,
        userName,
        isTyping,
        from: userId,
      });
    } else {
      // Send to specific user
      io.to(`user-${to}`).emit("user-typing", {
        userId,
        userName,
        isTyping,
        from: userId,
      });
    }
  });

  // Listen for message read status
  socket.on("message-read", (data) => {
    const { to, from } = data;
    io.to(`user-${to}`).emit("message-read-status", {
      from,
    });
  });

  // ============ INSTAGRAM-STYLE SOCIAL EVENTS ============

  // ✅ NEW: Follow user event
  socket.on("follow-user", async (data) => {
    const { targetUserId, followerName } = data;
    console.log(`👥 Follow event: ${socket.userId} following ${targetUserId}`);

    try {
      // Get follower details
      const follower = await User.findById(socket.userId).select(
        "fullName profilePic",
      );

      if (follower) {
        // Send real-time notification to the person being followed
        io.to(`user-${targetUserId}`).emit("user-followed", {
          followerId: socket.userId,
          followerName: follower.fullName,
          followerAvatar: follower.profilePic,
          timestamp: new Date(),
        });

        console.log(`✅ Follow notification sent to user ${targetUserId}`);
      }
    } catch (err) {
      console.error("Error processing follow event:", err);
    }
  });

  // ✅ NEW: Like post event
  socket.on("like-post", async (data) => {
    const { postId, postOwnerId, userName } = data;
    console.log(
      `❤️ Like event: ${socket.userId} liked post ${postId} of ${postOwnerId}`,
    );

    try {
      // Get liker details
      const liker = await User.findById(socket.userId).select(
        "fullName profilePic",
      );

      if (liker && postOwnerId !== socket.userId) {
        // Don't send notification if user liked their own post
        io.to(`user-${postOwnerId}`).emit("post-liked", {
          userId: socket.userId,
          userName: liker.fullName,
          userAvatar: liker.profilePic,
          postId: postId,
          timestamp: new Date(),
        });

        console.log(`✅ Like notification sent to post owner ${postOwnerId}`);
      }
    } catch (err) {
      console.error("Error processing like event:", err);
    }
  });

  // ✅ NEW: Comment on post event
  socket.on("comment-post", async (data) => {
    const { postId, postOwnerId, text } = data;
    console.log(
      `💬 Comment event: ${socket.userId} commented on post ${postId}`,
    );

    try {
      const commenter = await User.findById(socket.userId).select(
        "fullName profilePic",
      );

      if (commenter && postOwnerId !== socket.userId) {
        io.to(`user-${postOwnerId}`).emit("post-commented", {
          userId: socket.userId,
          userName: commenter.fullName,
          userAvatar: commenter.profilePic,
          postId: postId,
          text: text,
          timestamp: new Date(),
        });

        console.log(
          `✅ Comment notification sent to post owner ${postOwnerId}`,
        );
      }
    } catch (err) {
      console.error("Error processing comment event:", err);
    }
  });

  // ========== NOTIFICATION SOCKET HANDLERS ==========

  // User joins notification room
  socket.on("join-notification-room", (userId) => {
    if (socket.userId !== userId && !socket.isAdmin) {
      socket.emit("error", { message: "Not authorized" });
      return;
    }
    socket.join(`user-${userId}`);
    console.log(`🔔 User ${userId} joined notification room`);
  });

  // ✅ FIXED: Listen for new follow and SEND NOTIFICATION
  socket.on("user-followed", (data) => {
    const { followerId, followingId } = data;
    console.log(`📢 Follow event: ${followerId} followed ${followingId}`);

    // Send real-time notification to the person being followed
    io.to(`user-${followingId}`).emit("new-notification", {
      type: "follow",
      from: followerId,
      message: "Someone followed you!",
      timestamp: new Date(),
    });
  });

  // ✅ FIXED: Listen for post like and SEND NOTIFICATION
  socket.on("post-liked", (data) => {
    const { likerId, postId, postOwnerId } = data;
    console.log(
      `❤️ Post like event: ${likerId} liked post ${postId} of ${postOwnerId}`,
    );

    // Send notification to post owner
    io.to(`user-${postOwnerId}`).emit("new-notification", {
      type: "post-like",
      from: likerId,
      postId: postId,
      message: "Someone liked your post! ❤️",
      timestamp: new Date(),
    });
  });

  // ✅ FIXED: Listen for post comment and SEND NOTIFICATION
  socket.on("post-commented", (data) => {
    const { commenterId, postId, postOwnerId } = data;
    console.log(
      `💬 Comment event: ${commenterId} commented on post ${postId} of ${postOwnerId}`,
    );

    // Send notification to post owner
    io.to(`user-${postOwnerId}`).emit("new-notification", {
      type: "post-comment",
      from: commenterId,
      postId: postId,
      message: "Someone commented on your post! 💬",
      timestamp: new Date(),
    });
  });

  // ✅ FIXED: Listen for comment like and SEND NOTIFICATION
  socket.on("comment-liked", (data) => {
    const { likerId, commentId, commentOwnerId } = data;
    console.log(
      `❤️ Comment like event: ${likerId} liked comment ${commentId} of ${commentOwnerId}`,
    );

    // Send notification to comment owner
    io.to(`user-${commentOwnerId}`).emit("new-notification", {
      type: "comment-like",
      from: likerId,
      commentId: commentId,
      message: "Someone liked your comment! ❤️",
      timestamp: new Date(),
    });
  });

  // ✅ FIXED: Listen for follow request and SEND NOTIFICATION
  socket.on("follow-requested", (data) => {
    const { requesterId, requesteeId } = data;
    console.log(
      `📬 Follow request event: ${requesterId} requested to follow ${requesteeId}`,
    );

    // Send notification to the person receiving follow request
    io.to(`user-${requesteeId}`).emit("new-notification", {
      type: "follow-request",
      from: requesterId,
      message: "Someone requested to follow you! 📬",
      timestamp: new Date(),
    });
  });

  // ✅ FIXED: Listen for follow accept and SEND NOTIFICATION
  socket.on("follow-accepted", (data) => {
    const { accepterId, requesterId } = data;
    console.log(
      `✅ Follow accept event: ${accepterId} accepted follow request from ${requesterId}`,
    );

    // Send notification to the requester
    io.to(`user-${requesterId}`).emit("new-notification", {
      type: "follow-accepted",
      from: accepterId,
      message: "Your follow request was accepted! ✅",
      timestamp: new Date(),
    });
  });

  // ✅ NEW: Privacy status updated event (real-time broadcast)
  socket.on("privacy-status-updated", (data) => {
    const { userId, isPrivate, userName } = data;
    console.log(
      `🔒 Privacy status updated: User ${userName} (${userId}) set account to ${isPrivate ? "Private" : "Public"}`,
    );

    // Broadcast to all connected users except sender
    socket.broadcast.emit("privacy-status-updated", {
      userId,
      isPrivate,
      userName,
    });

    console.log(`📡 Privacy status broadcasted to all users`);
  });

  // ✅ NEW: Send message event
  socket.on("user-message-sent", (data) => {
    const {
      to,
      from,
      messageId,
      text,
      timestamp,
      mediaType,
      mediaUrl,
      fileName,
      fileSize,
    } = data;
    console.log(`💬 Message sent from ${from} to ${to}`, {
      hasMedia: !!mediaType,
      mediaType,
      mediaUrl,
    });

    // ✅ Send full message to recipient with all media fields
    io.to(`user-${to}`).emit("new-message", {
      from: from,
      senderId: from,
      _id: messageId,
      text: text,
      timestamp: timestamp,
      mediaType: mediaType,
      mediaUrl: mediaUrl,
      fileName: fileName,
      fileSize: fileSize,
    });

    // Also notify recipient
    io.to(`user-${to}`).emit("new-notification", {
      type: "message",
      from: from,
      messageId: messageId,
      message: "You have a new message!",
      timestamp: new Date(),
    });

    console.log(`✅ Message delivered to user-${to} with media data`);
  });

  // ========== WEBRTC CALLING HANDLERS (Real-time P2P Calling) ==========

  // WebRTC: Incoming call request
  socket.on("webrtc:call-request", (data) => {
    const { to, from, fromUser, fromName, callType, offer, fromProfilePic } =
      data;
    console.log(`📞 Call request: ${fromUser || fromName} (${from}) → ${to}`);

    // Forward call request to recipient with offer
    io.to(`user-${to}`).emit("webrtc:call-request", {
      from,
      fromUser: fromUser || fromName,
      callType,
      offer,
      timestamp: new Date(),
    });

    console.log(`✅ Call request with offer forwarded to user-${to}`);
  });

  // WebRTC: Call accepted
  socket.on("webrtc:call-accepted", (data) => {
    const { to, from, fromUser, answer } = data;
    console.log(`✅ Call accepted: ${from} ← ${to}`);

    // Forward acceptance to caller with answer
    io.to(`user-${to}`).emit("webrtc:call-accepted", {
      from,
      fromUser,
      answer,
      timestamp: new Date(),
    });

    console.log(`✅ Call acceptance with answer forwarded to user-${to}`);
  });

  // WebRTC: Call rejected
  socket.on("webrtc:call-rejected", (data) => {
    const { to, from, fromUser, reason } = data;
    console.log(`❌ Call rejected: ${from} ✗ ${to} (${reason || "declined"})`);

    // Forward rejection to caller
    io.to(`user-${to}`).emit("webrtc:call-rejected", {
      from,
      fromUser,
      reason,
      timestamp: new Date(),
    });

    console.log(`✅ Call rejection forwarded to user-${to}`);
  });

  // WebRTC: ICE Candidate exchange (peer info for NAT traversal)
  socket.on("webrtc:ice-candidate", (data) => {
    const { to, from, candidate } = data;
    console.log(`🧊 ICE candidate: ${from} → ${to}`);

    // Forward ICE candidate to peer
    io.to(`user-${to}`).emit("webrtc:ice-candidate", {
      from,
      candidate,
      timestamp: new Date(),
    });
  });

  // WebRTC: SDP Offer (call initiation)
  socket.on("webrtc:offer", (data) => {
    const { to, from, offer } = data;
    console.log(`📤 SDP Offer: ${from} → ${to}`);

    // Forward offer to recipient
    io.to(`user-${to}`).emit("webrtc:offer", {
      from,
      offer,
      timestamp: new Date(),
    });

    console.log(`✅ SDP Offer forwarded to user-${to}`);
  });

  // WebRTC: SDP Answer (call acceptance response)
  socket.on("webrtc:answer", (data) => {
    const { to, from, answer } = data;
    console.log(`📥 SDP Answer: ${from} → ${to}`);

    // Forward answer to caller
    io.to(`user-${to}`).emit("webrtc:answer", {
      from,
      answer,
      timestamp: new Date(),
    });

    console.log(`✅ SDP Answer forwarded to user-${to}`);
  });

  // WebRTC: Call ended
  socket.on("webrtc:call-ended", (data) => {
    const { to, from, duration } = data;
    console.log(`📴 Call ended: ${from} ↔ ${to} (${duration}s)`);

    // Notify peer that call ended
    io.to(`user-${to}`).emit("webrtc:call-ended", {
      from,
      duration,
      timestamp: new Date(),
    });

    console.log(`✅ Call ended notification forwarded to user-${to}`);
  });

  // ========== ADVANCED RTC HANDLERS (NEW) ==========

  // Advanced RTC: Initiate call (new event name)
  socket.on("rtc:initiate-call", (data) => {
    console.log("\n🔌 === RECEIVED rtc:initiate-call ===");
    console.log("Raw data:", JSON.stringify(data, null, 2));
    console.log("Data type:", typeof data);
    console.log("Data keys:", Object.keys(data || {}));

    const {
      recipientId,
      recipientName,
      callerId,
      callerName,
      callType,
      offer,
      roomUrl,
      callerAvatar,
    } = data || {};

    console.log("Extracted values:");
    console.log("  callerId:", callerId);
    console.log("  callerName:", callerName);
    console.log("  recipientId:", recipientId);
    console.log("  callType:", callType);
    console.log("  roomUrl:", roomUrl || "❌ UNDEFINED");
    console.log("  callerAvatar:", callerAvatar ? "✅ present" : "❌ missing");

    // Forward call request to recipient
    io.to(`user-${recipientId}`).emit("rtc:incoming-call", {
      callerId,
      callerName,
      callType,
      offer,
      roomUrl, // ← Being forwarded
      callerAvatar,
      timestamp: new Date(),
    });

    console.log(
      `✅ Forwarded to user-${recipientId} with roomUrl: ${roomUrl || "undefined"}\n`,
    );
  });

  // Advanced RTC: Accept call (new event name)
  socket.on("rtc:accept-call", (data) => {
    const {
      callerId,
      receiverId,
      receiverName,
      answer,
      receiverAvatar, // 🔧 FIX: Accept receiverAvatar from frontend
    } = data;
    console.log(`✅ Advanced call accepted: ${receiverId} → ${callerId}`);
    console.log(
      `   Receiver avatar included: ${receiverAvatar ? "✅ yes" : "❌ no"}`,
    );

    // Forward acceptance to caller with answer AND receiver avatar
    io.to(`user-${callerId}`).emit("rtc:call-accepted", {
      receiverId,
      receiverName,
      answer,
      receiverAvatar, // 🔧 FIX: Forward receiver avatar back to caller
      timestamp: new Date(),
    });

    console.log(
      `✅ Advanced call acceptance with answer forwarded to user-${callerId}`,
    );
  });

  // Advanced RTC: Reject call (new event name)
  socket.on("rtc:reject-call", (data) => {
    const { recipientId, reason } = data;
    console.log(
      `❌ Advanced call rejected: sender → ${recipientId} (${reason || "declined"})`,
    );

    // Forward rejection to caller
    io.to(`user-${recipientId}`).emit("rtc:call-rejected", {
      reason: reason || "User declined",
      timestamp: new Date(),
    });

    console.log(`✅ Advanced call rejection forwarded to user-${recipientId}`);
  });

  // Advanced RTC: End call (new event)
  socket.on("rtc:end-call", (data) => {
    const { recipientId, duration } = data;
    console.log(
      `📴 Advanced call ended: sender ↔ ${recipientId} (${duration}s)`,
    );

    // Notify peer that call ended
    io.to(`user-${recipientId}`).emit("rtc:call-ended", {
      enderId: socket.userId,
      duration,
      timestamp: new Date(),
    });

    console.log(
      `✅ Advanced call ended notification forwarded to user-${recipientId}`,
    );
  });

  // Advanced RTC: ICE Candidate exchange (same as before)
  socket.on("rtc:ice-candidate", (data) => {
    const { to, candidate } = data;
    console.log(`🧊 Advanced ICE candidate: ${socket.userId} → ${to}`);

    // Forward ICE candidate to peer
    io.to(`user-${to}`).emit("rtc:ice-candidate", {
      from: socket.userId,
      candidate,
      timestamp: new Date(),
    });
  });

  // Advanced RTC: Answer (new event)
  socket.on("rtc:answer", (data) => {
    const { to, answer } = data;
    console.log(`📥 Advanced SDP Answer: ${socket.userId} → ${to}`);

    // Forward answer to caller
    io.to(`user-${to}`).emit("rtc:answer", {
      from: socket.userId,
      answer,
      timestamp: new Date(),
    });

    console.log(`✅ Advanced SDP Answer forwarded to user-${to}`);
  });

  // ========== END ADVANCED RTC HANDLERS ==========

  // ========== END WEBRTC HANDLERS ==========

  socket.on("disconnect", () => {
    console.log(`🔴 User disconnected: ${socket.id}`);

    // ===== UPDATE USER STATUS TO OFFLINE =====
    if (authenticatedUserId) {
      User.findByIdAndUpdate(
        authenticatedUserId,
        { isOnline: false, lastSeen: new Date() },
        { new: true },
      )
        .then(() => {
          // Broadcast user offline status to all connected users
          io.emit("user-status-changed", {
            userId: authenticatedUserId,
            isOnline: false,
            lastSeen: new Date(),
            timestamp: new Date(),
          });
          console.log(`✅ User ${authenticatedUserId} marked as OFFLINE`);
        })
        .catch((err) =>
          console.error(
            `❌ Error updating user status on disconnect:`,
            err.message,
          ),
        );
    }
  });
});

// ========== USER ADDRESS ROUTES (SHOULD BE IN userRoutes.js) ==========
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.isAdmin = decoded.isAdmin;
    next();
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

// Get user addresses
app.get("/api/user/addresses", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("addresses");
    return res.json({ success: true, addresses: user?.addresses || [] });
  } catch (err) {
    console.error("Get addresses error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// Add address
app.post("/api/user/address", authMiddleware, async (req, res) => {
  try {
    const { fullName, phone, address, city, state, pincode, isDefault } =
      req.body;

    // Validate inputs
    if (!fullName || !phone || !address || !city || !state || !pincode) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    user.addresses.push({
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: !!isDefault,
    });

    await user.save();
    return res.json({
      success: true,
      message: "Address added successfully",
      addresses: user.addresses,
    });
  } catch (err) {
    console.error("Add address error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// Get dashboard stats
app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "cart orders totalSpent",
    );
    return res.json({
      success: true,
      stats: {
        totalOrders: user?.orders?.length || 0,
        cartItems: user?.cart?.length || 0,
        totalSpent: user?.totalSpent || 0,
        wishlistItems: 0,
      },
    });
  } catch (err) {
    console.error("Get stats error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
