const express = require("express");
const Post = require("../models/post");
const { ECO_DEED_CATEGORIES } = require("../models/post");
const Activity = require("../models/activity");
const User = require("../models/user");
const auth = require("../middleware/auth");
const {
  notifyPostLike,
  notifyPostComment,
} = require("../utils/notificationService");

const router = express.Router();

/* CREATE POST */
router.post("/", auth, async (req, res) => {
  try {
    const {
      text,
      image,
      productId,
      postType,
      ecoCategory,
      deedDescription,
      linkedDeedId,
    } = req.body;

    // Validate eco_deed posts
    if (postType === "eco_deed" && !ecoCategory) {
      return res.status(400).json({
        success: false,
        message: "ecoCategory is required for eco deed posts",
      });
    }
    if (ecoCategory && !ECO_DEED_CATEGORIES.includes(ecoCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ecoCategory. Must be one of: ${ECO_DEED_CATEGORIES.join(", ")}`,
      });
    }

    const post = new Post({
      userId: req.user.id,
      text,
      image,
      productId: productId || null,
      postType: postType === "eco_deed" ? "eco_deed" : "regular",
      ecoCategory: postType === "eco_deed" ? ecoCategory : null,
      deedDescription: postType === "eco_deed" ? deedDescription || null : null,
      linkedDeedId: linkedDeedId || null,
    });

    await post.save();

    // Record post activity
    const activity = new Activity({
      userId: req.user.id,
      postId: post._id,
      activityType: postType === "eco_deed" ? "eco_deed" : "post",
      description: text,
      mediaUrl: image,
      timestamp: new Date(),
    });
    await activity.save();

    // 💚 Award eco-credits for post creation (+5 credits)
    const user = await User.findById(req.user.id);
    if (user) {
      await user.addCredits(5, "post", "Created a post", post._id);
    }

    // Emit real-time event to followers
    if (global.io) {
      const userWithFollowers = await User.findById(req.user.id).populate(
        "followers",
      );
      if (userWithFollowers && userWithFollowers.followers) {
        userWithFollowers.followers.forEach((follower) => {
          global.io.to(`user-${follower._id}`).emit("new-activity", {
            type: postType === "eco_deed" ? "eco_deed" : "post",
            from: { id: req.user.id, name: userWithFollowers.fullName },
            postId: post._id,
            ecoCategory: post.ecoCategory,
            description: text,
            mediaUrl: image,
            timestamp: new Date(),
          });
        });
      }
    }

    res.json({ success: true, post });
  } catch (err) {
    console.error("Create post error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

/* GET FEED WITH PAGINATION */
router.get("/", auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Optional filters
    const postType = req.query.postType || null; // ?postType=eco_deed
    const ecoCategory = req.query.ecoCategory || null; // ?ecoCategory=Tree+Planting
    const ecoVerified = req.query.ecoVerified; // ?ecoVerified=true

    const filter = {};
    if (postType) filter.postType = postType;
    if (ecoCategory) filter.ecoCategory = new RegExp(ecoCategory, "i");
    if (ecoVerified === "true") filter.ecoVerified = true;

    const total = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .populate("userId", "fullName profilePic email ecoScore planetRank")
      .populate("productId")
      .populate("comments.userId", "fullName profilePic email")
      .populate("ecoVerifiedBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get feed error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

/* GET ECO DEED POSTS ONLY */
router.get("/deeds", auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const skip = (page - 1) * limit;
    const ecoCategory = req.query.ecoCategory || null;
    const ecoVerified = req.query.ecoVerified; // ?ecoVerified=true for verified only

    const filter = { postType: "eco_deed" };
    if (ecoCategory) filter.ecoCategory = new RegExp(ecoCategory, "i");
    if (ecoVerified === "true") filter.ecoVerified = true;

    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .populate(
        "userId",
        "fullName profilePic email ecoScore greenPoints planetRank",
      )
      .populate("comments.userId", "fullName profilePic")
      .populate("ecoVerifiedBy", "fullName")
      .sort({ ecoVerified: -1, createdAt: -1 }) // verified deeds shown first
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      ecoCategory: ecoCategory || null,
    });
  } catch (err) {
    console.error("Get eco deeds error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

/* ADMIN: VERIFY / UNVERIFY AN ECO DEED POST */
router.patch("/:id/verify-deed", auth, async (req, res) => {
  try {
    // Admin check
    const requestingUser = await User.findById(req.user.id).select("role");
    if (!requestingUser || requestingUser.role !== "ADMIN") {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }

    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid post ID" });
    }

    const post = await Post.findById(req.params.id);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    if (post.postType !== "eco_deed") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Only eco deed posts can be verified",
        });
    }

    // Toggle verification
    const nowVerified = !post.ecoVerified;
    post.ecoVerified = nowVerified;
    post.ecoVerifiedBy = nowVerified ? req.user.id : null;
    post.ecoVerifiedAt = nowVerified ? new Date() : null;
    await post.save();

    // Notify post author via Socket.io
    if (global.io) {
      global.io.to(`user-${post.userId}`).emit("deed-verified", {
        postId: post._id,
        ecoVerified: post.ecoVerified,
        ecoCategory: post.ecoCategory,
        verifiedBy: req.user.id,
        timestamp: new Date(),
      });
    }

    console.log(
      `✅ Deed post ${post._id} ${nowVerified ? "verified" : "unverified"} by admin ${req.user.id}`,
    );

    res.json({
      success: true,
      message: nowVerified ? "Deed post verified!" : "Deed post unverified.",
      post: {
        _id: post._id,
        ecoVerified: post.ecoVerified,
        ecoVerifiedAt: post.ecoVerifiedAt,
        ecoCategory: post.ecoCategory,
      },
    });
  } catch (err) {
    console.error("Verify deed error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

/* GET: Eco deed categories list (public) */
router.get("/deed-categories", (req, res) => {
  res.json({ success: true, categories: ECO_DEED_CATEGORIES });
});

/* GET SAVED POSTS */
router.get("/saved", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("📌 Fetching saved posts for user:", userId);

    // Find all posts where this user is in the saved array
    const savedPosts = await Post.find({ saved: userId })
      .populate("userId", "fullName profilePic email")
      .populate("productId")
      .populate("comments.userId", "fullName profilePic email")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${savedPosts.length} saved posts`);

    res.json({
      success: true,
      posts: savedPosts,
      count: savedPosts.length,
    });
  } catch (err) {
    console.error("Get saved posts error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

// PUT: Like / Unlike a Post
router.put("/:id/like", auth, async (req, res) => {
  try {
    console.log(
      "📌 LIKE REQUEST - PostID:",
      req.params.id,
      "UserID:",
      req.user.id,
    );

    // Validate ObjectId format
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log("❌ INVALID POST ID FORMAT:", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      console.log("❌ POST NOT FOUND");
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const userId = req.user.id;
    const alreadyLiked = post.likes.some((like) => like.toString() === userId);

    if (alreadyLiked) {
      // Unlike: Remove user from likes
      post.likes = post.likes.filter((like) => like.toString() !== userId);
      // Remove activity record
      await Activity.deleteOne({
        userId: userId,
        postId: req.params.id,
        activityType: "like",
      });
      console.log("💔 UNLIKED");
    } else {
      // Like: Add user to likes
      post.likes.push(userId);

      // Record activity
      const activity = new Activity({
        userId: userId,
        postId: req.params.id,
        activityType: "like",
        timestamp: new Date(),
      });
      await activity.save();

      // Create and send notification
      try {
        await notifyPostLike(global.io, userId, req.params.id, post.userId);
      } catch (notifErr) {
        console.error("❌ Error sending notification:", notifErr);
      }

      // Emit real-time event to post author
      if (global.io) {
        const user = await User.findById(userId);
        global.io.to(`user-${post.userId}`).emit("new-activity", {
          type: "like",
          from: {
            id: userId,
            name: user.fullName,
          },
          postId: req.params.id,
          timestamp: new Date(),
        });
      }

      console.log("❤️ LIKED");
    }

    await post.save();
    console.log("✅ LIKE SAVED - Likes count:", post.likes.length);
    res.json({
      success: true,
      likes: post.likes,
      likesCount: post.likes.length,
    });
  } catch (err) {
    console.error("❌ LIKE ERROR:", err.message, err.stack);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

// PUT: Save / Unsave a Post
router.put("/:id/save", auth, async (req, res) => {
  try {
    console.log(
      "💾 SAVE REQUEST - PostID:",
      req.params.id,
      "UserID:",
      req.user.id,
    );

    // Validate ObjectId format
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log("❌ INVALID POST ID FORMAT:", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      console.log("❌ POST NOT FOUND");
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const userId = req.user.id;
    const alreadySaved = post.saved.some((save) => save.toString() === userId);

    if (alreadySaved) {
      // Unsave: Remove user from saved
      post.saved = post.saved.filter((save) => save.toString() !== userId);
      // Remove activity record
      await Activity.deleteOne({
        userId: userId,
        postId: req.params.id,
        activityType: "save",
      });
      console.log("🗑️ UNSAVED");
    } else {
      // Save: Add user to saved
      post.saved.push(userId);

      // Record save activity
      const activity = new Activity({
        userId: userId,
        postId: req.params.id,
        activityType: "save",
        timestamp: new Date(),
      });
      await activity.save();

      console.log("💾 SAVED");
    }

    await post.save();
    console.log("✅ SAVE STATUS UPDATED - Saved count:", post.saved.length);
    res.json({
      success: true,
      saved: post.saved,
      savedCount: post.saved.length,
    });
  } catch (err) {
    console.error("❌ SAVE ERROR:", err.message, err.stack);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

// PUT: Edit a Post
router.put("/:id", auth, async (req, res) => {
  try {
    console.log(
      "📝 EDIT POST REQUEST - PostID:",
      req.params.id,
      "UserID:",
      req.user.id,
    );

    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log("❌ INVALID POST ID FORMAT:", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      console.log("❌ POST NOT FOUND");
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Check if user is the post author
    if (post.userId.toString() !== req.user.id) {
      console.log("❌ UNAUTHORIZED - Not post author");
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Update post text
    if (req.body.text) {
      post.text = req.body.text;
    }

    await post.save();
    console.log("✅ POST UPDATED");
    res.json({ success: true, post });
  } catch (err) {
    console.error("❌ EDIT POST ERROR:", err.message, err.stack);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

// DELETE: Delete a Post
router.delete("/:id", auth, async (req, res) => {
  try {
    console.log(
      "🗑️ DELETE POST REQUEST - PostID:",
      req.params.id,
      "UserID:",
      req.user.id,
    );

    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log("❌ INVALID POST ID FORMAT:", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      console.log("❌ POST NOT FOUND");
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Check if user is the post author
    if (post.userId.toString() !== req.user.id) {
      console.log("❌ UNAUTHORIZED - Not post author");
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await Post.findByIdAndDelete(req.params.id);
    console.log("✅ POST DELETED");
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    console.error("❌ DELETE POST ERROR:", err.message, err.stack);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

// POST: Add a Comment
router.post("/:id/comment", auth, async (req, res) => {
  try {
    console.log(
      "📌 COMMENT REQUEST - PostID:",
      req.params.id,
      "UserID:",
      req.user.id,
      "Text:",
      req.body.text,
    );

    // Validate ObjectId format
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log("❌ INVALID POST ID FORMAT for comment:", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      console.log("❌ POST NOT FOUND for comment");
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const newComment = {
      userId: req.user.id,
      text: req.body.text,
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    // Get the saved comment with its _id
    const savedComment = post.comments[post.comments.length - 1];

    // Record comment activity
    const activity = new Activity({
      userId: req.user.id,
      postId: req.params.id,
      activityType: "comment",
      commentText: req.body.text,
      commentId: savedComment._id,
      timestamp: new Date(),
    });
    await activity.save();

    // Create and send notification
    try {
      await notifyPostComment(
        global.io,
        req.user.id,
        req.params.id,
        post.userId,
      );
    } catch (notifErr) {
      console.error("❌ Error sending notification:", notifErr);
    }

    // Emit real-time event to post author
    if (global.io) {
      const user = await User.findById(req.user.id);
      global.io.to(`user-${post.userId}`).emit("new-activity", {
        type: "comment",
        from: {
          id: req.user.id,
          name: user.fullName,
        },
        postId: req.params.id,
        commentText: req.body.text,
        timestamp: new Date(),
      });
    }

    console.log(
      "✅ COMMENT ADDED - ID:",
      savedComment._id,
      "UserID:",
      savedComment.userId,
      "Text:",
      savedComment.text,
      "Total comments:",
      post.comments.length,
    );

    // Return the newly added comment with its generated _id
    res.json({
      success: true,
      comment: {
        _id: savedComment._id,
        userId: savedComment.userId,
        text: savedComment.text,
        createdAt: savedComment.createdAt,
      },
      comments: post.comments,
    });
  } catch (err) {
    console.error("❌ COMMENT ERROR:", err.message, err.stack);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

// DELETE: Delete a Comment
router.delete("/:id/comment/:commentId", auth, async (req, res) => {
  try {
    console.log(
      "📌 DELETE COMMENT REQUEST - PostID:",
      req.params.id,
      "CommentID:",
      req.params.commentId,
    );

    // Validate ObjectId format
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(
        "❌ INVALID POST ID FORMAT for delete comment:",
        req.params.id,
      );
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.commentId)) {
      console.log("❌ INVALID COMMENT ID FORMAT:", req.params.commentId);
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID format",
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      console.log("❌ POST NOT FOUND for delete comment");
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      console.log("❌ COMMENT NOT FOUND");
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    // Check if user is comment author or post owner
    if (comment.userId.toString() !== req.user.id) {
      console.log("❌ UNAUTHORIZED - Not comment author");
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    post.comments.id(req.params.commentId).deleteOne();
    await post.save();

    console.log(
      "✅ COMMENT DELETED - Remaining comments:",
      post.comments.length,
    );
    res.json({
      success: true,
      message: "Comment deleted",
      comments: post.comments,
    });
  } catch (err) {
    console.error("❌ DELETE COMMENT ERROR:", err.message, err.stack);
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

module.exports = router;
