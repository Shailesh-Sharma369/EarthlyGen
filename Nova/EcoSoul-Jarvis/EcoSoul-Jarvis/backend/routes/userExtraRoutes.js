const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/user");
const { notifyFollow } = require("../utils/notificationService");

const router = express.Router();

router.get("/addresses", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("addresses");
  res.json({ success: true, addresses: user.addresses });
});

router.post("/address", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (req.body.isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
  }
  user.addresses.push(req.body);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

router.get("/dashboard/stats", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({
    success: true,
    stats: {
      totalOrders: user.orders?.length || 0,
      totalSpent: user.totalSpent || 0,
    },
  });
});

// ============ FOLLOW ENDPOINTS ============

/**
 * POST /api/user/follow/:userId - Follow a user
 */
router.post("/follow/:userId", auth, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    // Security: Don't allow following self
    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const follower = await User.findById(followerId);
    const following = await User.findById(followingId);

    if (!follower || !following) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already following
    if (follower.following && follower.following.includes(followingId)) {
      return res.status(400).json({
        success: false,
        message: "Already following this user",
      });
    }

    // Add to following list
    if (!follower.following) follower.following = [];
    follower.following.push(followingId);

    // Add to followers list
    if (!following.followers) following.followers = [];
    following.followers.push(followerId);

    await follower.save();
    await following.save();

    // Send notification
    try {
      await notifyFollow(global.io, followerId, followingId);
    } catch (notifErr) {
      console.error("❌ Error sending follow notification:", notifErr);
    }

    res.json({
      success: true,
      message: "User followed successfully",
      following: follower.following,
      followersCount: following.followers.length,
    });
  } catch (error) {
    console.error("❌ Error following user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to follow user",
      error: error.message,
    });
  }
});

/**
 * POST /api/user/unfollow/:userId - Unfollow a user
 */
router.post("/unfollow/:userId", auth, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    const follower = await User.findById(followerId);
    const following = await User.findById(followingId);

    if (!follower || !following) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove from following list
    follower.following = follower.following.filter(
      (id) => id.toString() !== followingId,
    );

    // Remove from followers list
    following.followers = following.followers.filter(
      (id) => id.toString() !== followerId,
    );

    await follower.save();
    await following.save();

    res.json({
      success: true,
      message: "User unfollowed successfully",
      following: follower.following,
      followersCount: following.followers.length,
    });
  } catch (error) {
    console.error("❌ Error unfollowing user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unfollow user",
      error: error.message,
    });
  }
});

/**
 * GET /api/user/:userId/followers - Get followers of a user
 */
router.get("/:userId/followers", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "followers",
      "fullName profilePic email _id",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      followers: user.followers || [],
      followersCount: user.followers ? user.followers.length : 0,
    });
  } catch (error) {
    console.error("❌ Error fetching followers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch followers",
      error: error.message,
    });
  }
});

/**
 * GET /api/user/:userId/following - Get users that this user is following
 */
router.get("/:userId/following", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "following",
      "fullName profilePic email _id",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      following: user.following || [],
      followingCount: user.following ? user.following.length : 0,
    });
  } catch (error) {
    console.error("❌ Error fetching following:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch following",
      error: error.message,
    });
  }
});

/**
 * GET /api/user/:userId/is-following/:targetUserId - Check if user is following target user
 */
router.get("/:userId/is-following/:targetUserId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isFollowing = user.following
      ? user.following.some((id) => id.toString() === req.params.targetUserId)
      : false;

    res.json({
      success: true,
      isFollowing,
    });
  } catch (error) {
    console.error("❌ Error checking follow status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check follow status",
      error: error.message,
    });
  }
});

/**
 * GET /api/user/leaderboard
 * Top eco-champions ranked by ecoScore descending
 * Query: ?limit=10
 */
router.get("/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const users = await User.find({ ecoScore: { $gt: 0 } })
      .select("fullName profilePic ecoScore greenPoints planetRank")
      .sort({ ecoScore: -1 })
      .limit(limit);

    res.json({
      success: true,
      leaderboard: users.map((u, idx) => ({
        rank: idx + 1,
        _id: u._id,
        fullName: u.fullName,
        profilePic: u.profilePic,
        ecoScore: u.ecoScore || 0,
        greenPoints: u.greenPoints || 0,
        planetRank: u.planetRank || "Earth Newcomer",
      })),
    });
  } catch (err) {
    console.error("❌ leaderboard error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 🌿 PRO-PLANET GAMIFICATION ENDPOINTS
// ============================================================

/**
 * GET /api/user/eco-stats
 * Returns current user's ecoScore, greenPoints, planetRank, deed count
 */
router.get("/eco-stats", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "ecoScore greenPoints planetRank ecoDeeds fullName profilePic"
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({
      success: true,
      ecoStats: {
        ecoScore: user.ecoScore || 0,
        greenPoints: user.greenPoints || 0,
        planetRank: user.planetRank || "Earth Newcomer",
        totalDeeds: user.ecoDeeds ? user.ecoDeeds.length : 0,
        verifiedDeeds: user.ecoDeeds ? user.ecoDeeds.filter((d) => d.verified).length : 0,
        user: {
          id: user._id,
          fullName: user.fullName,
          profilePic: user.profilePic,
        },
      },
    });
  } catch (err) {
    console.error("❌ eco-stats error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/user/deeds
 * Returns the logged-in user's full eco-deed history
 */
router.get("/deeds", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("ecoDeeds ecoScore greenPoints planetRank")
      .populate("ecoDeeds.postId", "text image");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Sort newest first
    const deeds = [...(user.ecoDeeds || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      deeds,
      ecoScore: user.ecoScore,
      greenPoints: user.greenPoints,
      planetRank: user.planetRank,
    });
  } catch (err) {
    console.error("❌ deeds fetch error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/user/deed
 * Submit a new eco deed (logs deed, awards points + score)
 * Body: { category, description, proofImage?, postId? }
 *
 * Points table (per category):
 *   Tree Planting          → 25 pts, +15 score
 *   Solar/Renewable Energy → 20 pts, +12 score
 *   Zero Waste             → 15 pts, +10 score
 *   Recycling              → 12 pts, +8  score
 *   Water Conservation     → 12 pts, +8  score
 *   Community Clean-up     → 15 pts, +10 score
 *   Sustainable Transport  → 10 pts, +7  score
 *   Eco Purchase           → 5  pts, +3  score
 *   Animal Welfare         → 10 pts, +7  score
 *   Other                  → 10 pts, +5  score
 */
router.post("/deed", auth, async (req, res) => {
  try {
    const { category = "Other", description, proofImage, postId } = req.body;

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Deed description is required" });
    }

    // Points/score lookup by category
    const DEED_REWARDS = {
      "Tree Planting":            { points: 25, score: 15 },
      "Solar / Renewable Energy": { points: 20, score: 12 },
      "Zero Waste":               { points: 15, score: 10 },
      "Recycling":                { points: 12, score: 8 },
      "Water Conservation":       { points: 12, score: 8 },
      "Community Clean-up":       { points: 15, score: 10 },
      "Sustainable Transport":    { points: 10, score: 7 },
      "Eco Purchase":             { points: 5,  score: 3 },
      "Animal Welfare":           { points: 10, score: 7 },
      "Other":                    { points: 10, score: 5 },
    };

    const reward = DEED_REWARDS[category] || DEED_REWARDS["Other"];

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await user.awardDeed({
      category,
      description: description.trim(),
      proofImage: proofImage || null,
      postId: postId || null,
      pointsAwarded: reward.points,
      scoreContribution: reward.score,
    });

    // Broadcast eco rank update via Socket.io if rank changed
    if (global.io) {
      global.io.to(`user-${user._id}`).emit("eco-rank-updated", {
        userId: user._id,
        ecoScore: user.ecoScore,
        greenPoints: user.greenPoints,
        planetRank: user.planetRank,
      });
    }

    console.log(`🌿 Deed logged for user ${user._id}: ${category} (+${reward.points}pts, +${reward.score}score)`);

    res.status(201).json({
      success: true,
      message: `Eco deed logged! +${reward.points} Green Points, +${reward.score} Eco Score`,
      deed: user.ecoDeeds[user.ecoDeeds.length - 1],
      ecoScore: user.ecoScore,
      greenPoints: user.greenPoints,
      planetRank: user.planetRank,
    });
  } catch (err) {
    console.error("❌ deed submit error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/user/:userId/deed/:deedId/verify
 * Admin-only: Verify a specific eco deed (marks it as verified)
 */
router.patch("/:userId/deed/:deedId/verify", auth, async (req, res) => {
  try {
    // Only admins can verify deeds
    const requestingUser = await User.findById(req.user.id).select("role");
    if (!requestingUser || requestingUser.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const deed = user.ecoDeeds.id(req.params.deedId);
    if (!deed) return res.status(404).json({ success: false, message: "Deed not found" });

    if (deed.verified) {
      return res.status(400).json({ success: false, message: "Deed already verified" });
    }

    // Verified deeds get a bonus 10 score points
    deed.verified = true;
    user.ecoScore += 10;
    await user.save();

    console.log(`✅ Deed ${req.params.deedId} verified by admin for user ${req.params.userId}`);

    res.json({
      success: true,
      message: "Deed verified! +10 bonus Eco Score awarded",
      deed,
      ecoScore: user.ecoScore,
      planetRank: user.planetRank,
    });
  } catch (err) {
    console.error("❌ deed verify error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
