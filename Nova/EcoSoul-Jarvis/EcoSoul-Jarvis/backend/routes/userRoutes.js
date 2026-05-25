const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Configure email service
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 1. GET USER (Fixed bugs)
router.get("/me", auth, async (req, res) => {
  try {
    // FIX 1: req.userId use karein (middleware se aata hai)
    const user = await User.findById(req.userId)
      // FIX 2: 'avatar' ki jagah 'profilePic' select karein
      .select(
        "_id fullName email profilePic bio followers phone ecoScore greenPoints planetRank ecoDeeds",
      );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        totalDeeds: user.ecoDeeds ? user.ecoDeeds.length : 0,
        verifiedDeeds: user.ecoDeeds
          ? user.ecoDeeds.filter((d) => d.verified).length
          : 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 2. UPDATE PROFILE (Already Good, just ensuring consistency)
router.put("/profile", auth, async (req, res) => {
  try {
    const { fullName, email, phone, profilePic, bio } = req.body;

    console.log("📝 PUT /profile received:", {
      fullName,
      email,
      phone,
      profilePic,
      bio,
    });

    const user = await User.findById(req.userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Fields update
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (bio !== undefined) user.bio = bio;

    // Save Profile Pic
    if (profilePic) user.profilePic = profilePic;

    console.log("💾 Saving user with:", {
      fullName: user.fullName,
      bio: user.bio,
    });
    await user.save();
    console.log("✅ User saved successfully");

    // Broadcast profile photo update to all connected users via Socket.IO
    if (profilePic && req.app.get("io")) {
      req.app.get("io").emit("profile-photo-updated", {
        userId: user._id.toString(),
        photoUrl: profilePic,
        timestamp: Date.now(),
      });
      console.log(`📢 Broadcasted profile photo update for user ${user._id}`);
    }

    res.json({
      success: true,
      message: "Profile updated",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profilePic: user.profilePic,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 3. GET ALL USERS (For Admin Dashboard)
router.get("/all", auth, async (req, res) => {
  try {
    const admin = require("../middleware/admin");
    const users = await User.find()
      .select("_id name email role createdAt")
      .limit(100);

    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ============ INSTAGRAM-STYLE SOCIAL FEATURES ============

// 4. FOLLOW USER (Updated for Private Account Support)
router.post("/:userId/follow", auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.userId;

    // Can't follow yourself
    if (targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    // Get both users
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId),
    ]);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already following
    if (currentUser.following.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "You are already following this user",
      });
    }

    // Check if account is private
    if (targetUser.isPrivate) {
      // Check if follow request already sent
      if (targetUser.followRequests.includes(currentUserId)) {
        return res.status(400).json({
          success: false,
          message: "Follow request already sent",
        });
      }

      // Send follow request
      targetUser.followRequests.push(currentUserId);
      await targetUser.save();

      // Emit socket event for follow request notification
      if (global.io) {
        global.io.to(`user-${targetUserId}`).emit("follow-request-received", {
          requesterId: currentUserId,
          requesterName: currentUser.fullName,
          requesterAvatar: currentUser.profilePic,
          timestamp: new Date(),
        });
      }

      return res.json({
        success: true,
        message: `Follow request sent to ${targetUser.fullName}`,
        requestPending: true,
      });
    }

    // Public account - directly follow
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await Promise.all([currentUser.save(), targetUser.save()]);

    // Emit socket event for real-time notification
    if (global.io) {
      global.io.to(`user-${targetUserId}`).emit("user-followed", {
        followerId: currentUserId,
        followerName: currentUser.fullName,
        followerAvatar: currentUser.profilePic,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: `You are now following ${targetUser.fullName}`,
      following: currentUser.following,
      followers: targetUser.followers.length,
    });
  } catch (err) {
    console.error("Follow error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 5. UNFOLLOW USER
router.post("/:userId/unfollow", auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.userId;

    // Can't unfollow yourself
    if (targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Invalid operation",
      });
    }

    // Get both users
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId),
    ]);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if not following
    if (!currentUser.following.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "You are not following this user",
      });
    }

    // Remove from both arrays
    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== targetUserId,
    );
    targetUser.followers = targetUser.followers.filter(
      (id) => id.toString() !== currentUserId,
    );

    await Promise.all([currentUser.save(), targetUser.save()]);

    // Emit socket event for real-time notification
    if (global.io) {
      global.io.to(`user-${targetUserId}`).emit("user-unfollowed", {
        unfollowerId: currentUserId,
        unfollowerName: currentUser.fullName,
        unfollowerAvatar: currentUser.profilePic,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: `You unfollowed ${targetUser.fullName}`,
      following: currentUser.following,
    });
  } catch (err) {
    console.error("Unfollow error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 5B. ACCEPT FOLLOW REQUEST
router.post("/follow-requests/:requesterId/accept", auth, async (req, res) => {
  try {
    const requesterId = req.params.requesterId;
    const currentUserId = req.userId;

    const [currentUser, requester] = await Promise.all([
      User.findById(currentUserId),
      User.findById(requesterId),
    ]);

    if (!requester) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if follow request exists
    if (!currentUser.followRequests.includes(requesterId)) {
      return res.status(400).json({
        success: false,
        message: "No follow request found from this user",
      });
    }

    // Remove from follow requests
    currentUser.followRequests = currentUser.followRequests.filter(
      (id) => id.toString() !== requesterId,
    );

    // Add to followers/following
    currentUser.followers.push(requesterId);
    requester.following.push(currentUserId);

    await Promise.all([currentUser.save(), requester.save()]);

    // Emit socket event
    if (global.io) {
      global.io.to(`user-${requesterId}`).emit("follow-request-accepted", {
        accepterId: currentUserId,
        accepterName: currentUser.fullName,
        accepterAvatar: currentUser.profilePic,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: `You accepted ${requester.fullName}'s follow request`,
      followers: currentUser.followers.length,
    });
  } catch (err) {
    console.error("Accept follow request error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 5C. REJECT FOLLOW REQUEST
router.post("/follow-requests/:requesterId/reject", auth, async (req, res) => {
  try {
    const requesterId = req.params.requesterId;
    const currentUserId = req.userId;

    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if follow request exists
    if (!currentUser.followRequests.includes(requesterId)) {
      return res.status(400).json({
        success: false,
        message: "No follow request found from this user",
      });
    }

    // Remove from follow requests
    currentUser.followRequests = currentUser.followRequests.filter(
      (id) => id.toString() !== requesterId,
    );

    await currentUser.save();

    res.json({
      success: true,
      message: "Follow request rejected",
    });
  } catch (err) {
    console.error("Reject follow request error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 5D. GET MY FOLLOW REQUESTS
router.get("/follow-requests", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate(
      "followRequests",
      "_id fullName profilePic bio",
    );

    res.json({
      success: true,
      followRequests: user.followRequests || [],
    });
  } catch (err) {
    console.error("Get follow requests error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 5E. UPDATE PRIVACY SETTING
router.put("/privacy", auth, async (req, res) => {
  try {
    const { isPrivate } = req.body;

    if (typeof isPrivate !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isPrivate must be a boolean value",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isPrivate = isPrivate;
    await user.save();

    res.json({
      success: true,
      message: `Account is now ${isPrivate ? "private" : "public"}`,
      isPrivate: user.isPrivate,
    });
  } catch (err) {
    console.error("Update privacy error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// SEARCH USERS (Real-time search with query parameter) - MUST BE BEFORE /:userId ROUTES
router.get("/search/query", auth, async (req, res) => {
  try {
    const query = req.query.q || "";

    if (query.length < 2) {
      return res.json({ success: true, users: [] });
    }

    // Search by fullName or email using regex for real-time matching
    const users = await User.find({
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
      .select("_id fullName email profilePic bio isPrivate followers following")
      .limit(20); // Limit results for performance

    // Enrich user data with follower info for current user
    const enrichedUsers = users.map((user) => ({
      _id: user._id,
      name: user.fullName,
      email: user.email,
      avatar: user.profilePic,
      bio: user.bio,
      isPrivate: user.isPrivate,
      followersCount: user.followers ? user.followers.length : 0,
      followingCount: user.following ? user.following.length : 0,
      isFollowing: user.followers
        ? user.followers.some((f) => f.toString() === req.userId)
        : false,
    }));

    res.json({ success: true, users: enrichedUsers });
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 6. GET FOLLOWERS LIST
router.get("/:userId/followers", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate(
        "followers",
        "_id fullName email profilePic bio isOnline lastSeen",
      )
      .select("followers");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json(user.followers);
  } catch (err) {
    console.error("Get followers error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 7. GET FOLLOWING LIST
router.get("/:userId/following", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate(
        "following",
        "_id fullName email profilePic bio isOnline lastSeen",
      )
      .select("following");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json(user.following);
  } catch (err) {
    console.error("Get following error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 8. GET USER BY ID (Public Profile)
router.get("/:userId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select(
        "_id fullName email profilePic bio followers following followRequests isPrivate isOnline lastSeen createdAt",
      )
      .populate("followers", "_id fullName profilePic")
      .populate("following", "_id fullName profilePic");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if current user is following this user
    const isFollowing = user.followers.some(
      (follower) => follower._id.toString() === req.userId,
    );

    // Check if current user has sent a follow request
    const hasRequestedFollow = user.followRequests.some(
      (requester) => requester.toString() === req.userId,
    );

    res.json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        bio: user.bio,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        isFollowing,
        hasRequestedFollow,
        isPrivate: user.isPrivate,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// FORGOT PASSWORD - Send reset link via email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User with this email not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

    // Save reset token to database
    user.resetToken = resetTokenHash;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5002"}/reset-password?token=${resetToken}&email=${email}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Link - EcoSoul Jarvis",
      html: `
        <div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50; text-align: center;">🔐 Password Reset Request</h2>
            <p style="color: #555; line-height: 1.6;">
              We received a request to reset your password. Click the button below to reset it.
            </p>
            <p style="color: #555; line-height: 1.6;">
              <strong>This link will expire in 1 hour.</strong>
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              Or copy this link:<br>
              <small>${resetLink}</small>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message:
        "Password reset link sent to your email. Please check your inbox.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// RESET PASSWORD - Complete password reset using token
router.post("/reset-password", async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, reset token, and new password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Hash the provided token to compare with stored hash
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Verify token matches
    if (user.resetToken !== resetTokenHash) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid reset token" });
    }

    // Check if token has expired
    if (Date.now() > user.resetTokenExpiry) {
      return res.status(401).json({
        success: false,
        message: "Reset token has expired. Please request a new one.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// CHANGE PASSWORD - Update password (requires authentication)
router.post("/change-password", auth, async (req, res) => {
  try {
    const { newPassword, currentPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Verify current password if provided
    if (currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res
          .status(401)
          .json({ success: false, message: "Current password is incorrect" });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// DELETE ACCOUNT - Permanently delete user account
router.delete("/delete-account", auth, async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Delete user from database
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
