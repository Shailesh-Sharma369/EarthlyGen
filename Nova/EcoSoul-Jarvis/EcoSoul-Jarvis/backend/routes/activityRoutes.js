const express = require("express");
const router = express.Router();
const Activity = require("../models/activity");
const Post = require("../models/post");
const User = require("../models/user");
const auth = require("../middleware/auth");

// Get user's activity feed
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const activities = await Activity.find({
      userId: req.params.userId,
    })
      .populate("userId", "fullName avatar")
      .populate("postId", "text image likes comments")
      .populate("targetUserId", "fullName avatar")
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's stats (likes, comments, posts count)
router.get("/stats/:userId", auth, async (req, res) => {
  try {
    const likes = await Activity.countDocuments({
      userId: req.params.userId,
      activityType: "like",
    });
    const comments = await Activity.countDocuments({
      userId: req.params.userId,
      activityType: "comment",
    });
    const posts = await Activity.countDocuments({
      userId: req.params.userId,
      activityType: "post",
    });
    const saves = await Activity.countDocuments({
      userId: req.params.userId,
      activityType: "save",
    });
    const followers = await User.findById(req.params.userId).select(
      "followers",
    );

    res.json({
      likes,
      comments,
      posts,
      saves,
      followers: followers ? followers.followers.length : 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get who liked a post
router.get("/post/:postId/likers", auth, async (req, res) => {
  try {
    const activities = await Activity.find({
      postId: req.params.postId,
      activityType: "like",
    })
      .populate("userId", "fullName avatar email")
      .sort({ timestamp: -1 })
      .limit(20);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get post comments with activity tracking
router.get("/post/:postId/comments", auth, async (req, res) => {
  try {
    const activities = await Activity.find({
      postId: req.params.postId,
      activityType: "comment",
    })
      .populate("userId", "fullName avatar email")
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record a like activity
router.post("/record/like", auth, async (req, res) => {
  try {
    const { postId } = req.body;

    // Check if user already liked
    const existingLike = await Activity.findOne({
      userId: req.user.id,
      postId: postId,
      activityType: "like",
    });

    if (existingLike) {
      return res.status(400).json({ error: "Already liked this post" });
    }

    const activity = new Activity({
      userId: req.user.id,
      postId: postId,
      activityType: "like",
      timestamp: new Date(),
    });

    await activity.save();
    await activity.populate("userId", "fullName avatar email");

    // Emit real-time event
    if (global.io) {
      const post = await Post.findById(postId);
      if (post) {
        global.io.to(`user-${post.userId}`).emit("new-activity", {
          type: "like",
          from: {
            id: req.user.id,
            name: (await User.findById(req.user.id)).fullName,
          },
          postId: postId,
          timestamp: new Date(),
        });
      }
    }

    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record a comment activity
router.post("/record/comment", auth, async (req, res) => {
  try {
    const { postId, commentText } = req.body;

    const activity = new Activity({
      userId: req.user.id,
      postId: postId,
      activityType: "comment",
      commentText: commentText,
      timestamp: new Date(),
    });

    await activity.save();
    await activity.populate("userId", "fullName avatar email");

    // Emit real-time event
    if (global.io) {
      const post = await Post.findById(postId);
      if (post) {
        global.io.to(`user-${post.userId}`).emit("new-activity", {
          type: "comment",
          from: {
            id: req.user.id,
            name: (await User.findById(req.user.id)).fullName,
          },
          postId: postId,
          commentText: commentText,
          timestamp: new Date(),
        });
      }
    }

    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record a post activity
router.post("/record/post", auth, async (req, res) => {
  try {
    const { postId, description, mediaUrl } = req.body;

    const activity = new Activity({
      userId: req.user.id,
      postId: postId,
      activityType: "post",
      description: description,
      mediaUrl: mediaUrl,
      timestamp: new Date(),
    });

    await activity.save();
    await activity.populate("userId", "fullName avatar email");

    // Emit real-time event to followers
    if (global.io) {
      const user = await User.findById(req.user.id);
      // Notify all followers
      user.followers.forEach((followerId) => {
        global.io.to(`user-${followerId}`).emit("new-activity", {
          type: "post",
          from: {
            id: req.user.id,
            name: user.fullName,
          },
          postId: postId,
          description: description,
          mediaUrl: mediaUrl,
          timestamp: new Date(),
        });
      });
    }

    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record a follow activity
router.post("/record/follow", auth, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    const activity = new Activity({
      userId: req.user.id,
      targetUserId: targetUserId,
      activityType: "follow",
      timestamp: new Date(),
    });

    await activity.save();
    await activity.populate("userId", "fullName avatar email");

    // Emit real-time event
    if (global.io) {
      global.io.to(`user-${targetUserId}`).emit("new-activity", {
        type: "follow",
        from: {
          id: req.user.id,
          name: (await User.findById(req.user.id)).fullName,
        },
        timestamp: new Date(),
      });
    }

    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get activity timeline (for discover/feed)
router.get("/timeline", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const followingIds = user.following || [];
    followingIds.push(req.user.id); // Include own activities

    const activities = await Activity.find({
      userId: { $in: followingIds },
      activityType: { $in: ["like", "comment", "post"] },
    })
      .populate("userId", "fullName avatar")
      .populate("postId", "text image")
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
