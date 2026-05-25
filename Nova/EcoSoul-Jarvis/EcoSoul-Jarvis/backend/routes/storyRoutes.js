const router = require("express").Router();
const auth = require("../middleware/auth");
const Story = require("../models/story");
const User = require("../models/user");

// 1. CREATE STORY
router.post("/", auth, async (req, res) => {
  try {
    const { media, caption, mediaType } = req.body;

    if (!media) {
      return res.status(400).json({
        success: false,
        message: "Media URL is required",
      });
    }

    const story = new Story({
      userId: req.userId,
      media,
      caption: caption || "",
      mediaType: mediaType || "image",
    });

    await story.save();

    res.json({
      success: true,
      message: "Story created successfully",
      story,
    });
  } catch (err) {
    console.error("Create story error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 2. GET ALL STORIES (Active ones only)
router.get("/", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId).select("following");

    // Get stories from user's following + own stories
    const userIds = [req.userId, ...currentUser.following];

    const stories = await Story.find({
      userId: { $in: userIds },
      expiresAt: { $gt: new Date() }, // Only active stories
    })
      .populate("userId", "fullName profilePic")
      .sort({ createdAt: -1 })
      .limit(50);

    // Group stories by user
    const groupedStories = {};
    stories.forEach((story) => {
      const userId = story.userId._id.toString();
      if (!groupedStories[userId]) {
        groupedStories[userId] = {
          user: {
            _id: story.userId._id,
            fullName: story.userId.fullName,
            profilePic: story.userId.profilePic,
          },
          stories: [],
        };
      }
      groupedStories[userId].stories.push({
        _id: story._id,
        media: story.media,
        caption: story.caption,
        mediaType: story.mediaType,
        reactions: story.reactions.length,
        views: story.views.length,
        hasViewed: story.views.includes(req.userId),
        createdAt: story.createdAt,
      });
    });

    res.json({
      success: true,
      stories: Object.values(groupedStories),
    });
  } catch (err) {
    console.error("Get stories error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 3. GET STORY BY ID
router.get("/:storyId", auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate("userId", "fullName profilePic")
      .populate("reactions.userId", "fullName profilePic");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found or expired",
      });
    }

    // Add view if not already viewed
    const isNewView = !story.views.includes(req.userId);
    if (isNewView) {
      story.views.push(req.userId);
      await story.save();
    }

    // Emit real-time socket event for new view
    if (global.io && isNewView && story.userId.toString() !== req.userId) {
      const viewingUser = await User.findById(req.userId).select(
        "fullName profilePic avatar",
      );

      // Notify story owner about new view
      global.io.to(`user-${story.userId}`).emit("story-viewed", {
        storyId: story._id,
        userId: req.userId,
        userName: viewingUser.fullName,
        userAvatar: viewingUser.profilePic || viewingUser.avatar,
        viewedAt: new Date(),
      });

      // Broadcast to all viewers of this story
      global.io.to(`story-${story._id}`).emit("story-new-viewer", {
        storyId: story._id,
        userId: req.userId,
        userName: viewingUser.fullName,
        userAvatar: viewingUser.profilePic || viewingUser.avatar,
        totalViews: story.views.length,
        viewedAt: new Date(),
      });
    }

    res.json({
      success: true,
      story,
    });
  } catch (err) {
    console.error("Get story error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 4. REACT TO STORY
router.post("/:storyId/react", auth, async (req, res) => {
  try {
    const { reaction } = req.body;
    const validReactions = ["like", "love", "haha", "wow", "sad", "fire"];

    if (!reaction || !validReactions.includes(reaction)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reaction type",
      });
    }

    const story = await Story.findById(req.params.storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found or expired",
      });
    }

    // Check if user already reacted
    const existingReactionIndex = story.reactions.findIndex(
      (r) => r.userId.toString() === req.userId,
    );

    if (existingReactionIndex > -1) {
      // Update existing reaction
      story.reactions[existingReactionIndex].reaction = reaction;
      story.reactions[existingReactionIndex].createdAt = new Date();
    } else {
      // Add new reaction
      story.reactions.push({
        userId: req.userId,
        reaction,
      });
    }

    await story.save();

    // Emit socket event for real-time notification to story owner
    if (global.io && story.userId.toString() !== req.userId) {
      const user = await User.findById(req.userId).select(
        "fullName profilePic",
      );

      global.io.to(`user-${story.userId}`).emit("story-reacted", {
        storyId: story._id,
        userId: req.userId,
        userName: user.fullName,
        userAvatar: user.profilePic,
        reaction: reaction,
        timestamp: new Date(),
      });
    }

    // Broadcast to all viewers watching this story (real-time like count update)
    if (global.io) {
      global.io.to(`story-${story._id}`).emit("story-like-updated", {
        storyId: story._id,
        totalLikes: story.reactions.length,
        userId: req.userId,
      });
    }

    res.json({
      success: true,
      message: `Reacted with ${reaction}`,
      reactions: story.reactions.length,
    });
  } catch (err) {
    console.error("React to story error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 5. DELETE STORY
router.delete("/:storyId", auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Only owner can delete
    if (story.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this story",
      });
    }

    await Story.findByIdAndDelete(req.params.storyId);

    res.json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (err) {
    console.error("Delete story error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 6. GET USER'S OWN STORIES
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const stories = await Story.find({
      userId: req.params.userId,
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "fullName profilePic")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      stories,
    });
  } catch (err) {
    console.error("Get user stories error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 7. ADD REPLY TO STORY
router.post("/:storyId/reply", auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Reply text is required",
      });
    }

    const story = await Story.findById(req.params.storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found or expired",
      });
    }

    const reply = {
      userId: req.userId,
      text: text.trim(),
      createdAt: new Date(),
    };

    story.replies.push(reply);
    await story.save();

    // Populate the reply with user details
    await story.populate("replies.userId", "fullName profilePic avatar");

    // Get the newly added reply with populated user data
    const newReply = story.replies[story.replies.length - 1];

    // Broadcast reply to all viewers in real-time
    if (global.io) {
      const replyingUser = await User.findById(req.userId).select(
        "fullName profilePic avatar",
      );

      global.io.to(`story-${story._id}`).emit("story-new-reply", {
        storyId: story._id,
        reply: {
          userId: req.userId,
          userName: replyingUser.fullName,
          userAvatar: replyingUser.profilePic || replyingUser.avatar,
          text: text.trim(),
          createdAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: "Reply added successfully",
      reply: newReply,
    });
  } catch (err) {
    console.error("Add reply error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
