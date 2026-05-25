const express = require("express");
const Group = require("../models/group");
const CommunityEvent = require("../models/communityEvent");
const User = require("../models/user");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * CREATE NEW GROUP/COMMUNITY
 */
router.post("/", auth, async (req, res) => {
  try {
    const { name, description, banner } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    const newGroup = new Group({
      name: name.trim(),
      description: description || "",
      banner:
        banner || "https://placehold.co/300x100/a7f3d0/065f46?text=Community",
      creatorId: userId,
      members: [userId],
      memberCount: 1,
    });

    await newGroup.save();
    await newGroup.populate("creatorId", "fullName profilePic");

    // 💚 Award eco-credits for community creation (+20 credits)
    const user = await User.findById(userId);
    if (user) {
      await user.addCredits(
        20,
        "community",
        "Created a community",
        newGroup._id,
      );
    }

    console.log(`✅ Group created: ${newGroup.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: "Community created successfully",
      group: {
        id: newGroup._id,
        name: newGroup.name,
        description: newGroup.description,
        banner: newGroup.banner,
        creatorId: newGroup.creatorId._id,
        members: newGroup.memberCount,
        joined: true,
      },
    });
  } catch (err) {
    console.error("Group creation error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create community: " + err.message,
    });
  }
});

/**
 * GET ALL GROUPS (WITH PAGINATION)
 */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Group.countDocuments();

    const groups = await Group.find()
      .populate("creatorId", "fullName profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const groupsData = groups.map((g) => ({
      id: g._id,
      name: g.name,
      description: g.description,
      banner: g.banner,
      creatorId: g.creatorId._id,
      members: g.memberCount.toString() + "k",
      joined: g.members.includes(userId),
    }));

    res.json({
      success: true,
      groups: groupsData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Groups fetch error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch communities",
    });
  }
});

/**
 * GET SINGLE GROUP
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId)
      .populate("creatorId", "fullName profilePic")
      .populate("members", "fullName profilePic")
      .populate("posts");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        banner: group.banner,
        creatorId: group.creatorId._id,
        members: group.memberCount,
        joined: group.members.some((m) => m._id.toString() === userId),
        posts: group.posts || [],
      },
    });
  } catch (err) {
    console.error("Group fetch error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch community",
    });
  }
});

/**
 * JOIN GROUP
 */
router.post("/:id/join", auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if already member
    if (group.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this community",
      });
    }

    group.members.push(userId);
    group.memberCount = group.members.length;
    await group.save();

    console.log(`✅ User ${userId} joined group ${groupId}`);

    res.json({
      success: true,
      message: "You joined the community",
      memberCount: group.memberCount,
    });
  } catch (err) {
    console.error("Join group error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to join community",
    });
  }
});

/**
 * LEAVE GROUP
 */
router.post("/:id/leave", auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if member
    if (!group.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "You are not a member of this community",
      });
    }

    group.members = group.members.filter((id) => id.toString() !== userId);
    group.memberCount = group.members.length;
    await group.save();

    console.log(`✅ User ${userId} left group ${groupId}`);

    res.json({
      success: true,
      message: "You left the community",
      memberCount: group.memberCount,
    });
  } catch (err) {
    console.error("Leave group error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to leave community",
    });
  }
});

/**
 * DELETE GROUP (creator only)
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Only creator can delete
    if (group.creatorId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own communities",
      });
    }

    await Group.deleteOne({ _id: groupId });

    console.log(`✅ Group ${groupId} deleted by user ${userId}`);

    res.json({
      success: true,
      message: "Community deleted successfully",
    });
  } catch (err) {
    console.error("Delete group error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete community",
    });
  }
});

/**
 * CREATE EVENT IN COMMUNITY
 */
router.post("/:groupId/events", auth, async (req, res) => {
  try {
    const { title, description, date, location, image } = req.body;
    const { groupId } = req.params;
    const userId = req.user.id;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Verify user is member of the community
    if (!group.members.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only community members can create events",
      });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Event title is required",
      });
    }

    const newEvent = new CommunityEvent({
      groupId,
      creatorId: userId,
      title: title.trim(),
      description: description || "",
      date: new Date(date),
      location: location.trim(),
      image: image || null,
      attendees: [userId],
      attendeeCount: 1,
    });

    await newEvent.save();
    await newEvent.populate("creatorId", "fullName profilePic");

    console.log(`📅 Event created: ${newEvent.title} in community ${groupId}`);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: {
        id: newEvent._id,
        groupId: newEvent.groupId,
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date,
        location: newEvent.location,
        image: newEvent.image,
        attendees: newEvent.attendeeCount,
        going: true,
        creatorId: newEvent.creatorId._id,
        creatorName: newEvent.creatorId.fullName,
      },
    });
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create event: " + err.message,
    });
  }
});

/**
 * GET EVENTS FOR A COMMUNITY
 */
router.get("/:groupId/events", auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    const events = await CommunityEvent.find({ groupId })
      .populate("creatorId", "fullName profilePic")
      .populate("attendees", "fullName profilePic")
      .sort({ date: 1 });

    const userId = req.user.id;
    const formattedEvents = events.map((event) => ({
      id: event._id,
      groupId: event.groupId,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      image: event.image,
      attendees: event.attendeeCount,
      going: event.attendees.some((a) => a._id.toString() === userId),
      creatorId: event.creatorId._id,
      creatorName: event.creatorId.fullName,
      status: event.status,
    }));

    res.json({
      success: true,
      events: formattedEvents,
    });
  } catch (err) {
    console.error("Get events error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
});

/**
 * ATTEND/UNATTEND EVENT
 */
router.put("/:groupId/events/:eventId/attend", auth, async (req, res) => {
  try {
    const { groupId, eventId } = req.params;
    const userId = req.user.id;

    // Verify event exists
    const event = await CommunityEvent.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.groupId.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: "Event does not belong to this community",
      });
    }

    const alreadyAttending = event.attendees.some(
      (a) => a.toString() === userId,
    );

    if (alreadyAttending) {
      // Remove user from attendees
      event.attendees = event.attendees.filter((a) => a.toString() !== userId);
      event.attendeeCount = Math.max(0, event.attendeeCount - 1);
      console.log(`📅 User left event: ${event.title}`);
    } else {
      // Add user to attendees
      event.attendees.push(userId);
      event.attendeeCount = event.attendees.length;
      console.log(`📅 User joined event: ${event.title}`);
    }

    await event.save();

    res.json({
      success: true,
      going: !alreadyAttending,
      attendees: event.attendeeCount,
    });
  } catch (err) {
    console.error("Attend event error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update event attendance",
    });
  }
});

/**
 * DELETE EVENT (only by creator or group admin)
 */
router.delete("/:groupId/events/:eventId", auth, async (req, res) => {
  try {
    const { groupId, eventId } = req.params;
    const userId = req.user.id;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Verify event exists
    const event = await CommunityEvent.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Verify user is creator or community owner
    if (
      event.creatorId.toString() !== userId &&
      group.creatorId.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Only event creator or community admin can delete this event",
      });
    }

    await CommunityEvent.findByIdAndDelete(eventId);

    console.log(`📅 Event deleted: ${event.title}`);

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
});

/**
 * GET GROUP POSTS (with pagination)
 */
router.get("/:groupId/posts", auth, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Security: User must be member of group to see posts
    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You must be a member to view community posts",
      });
    }

    // Get total count
    const total = await Post.countDocuments({ groupId: groupId });

    // Fetch posts
    const posts = await Post.find({ groupId: groupId })
      .populate("userId", "fullName profilePic")
      .populate("productId", "name price image")
      .populate("comments.userId", "fullName profilePic")
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
    console.error("Get group posts error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch community posts",
    });
  }
});

/**
 * CREATE POST IN GROUP
 */
router.post("/:groupId/posts", auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, image, productId } = req.body;
    const userId = req.user.id;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Security: User must be member
    if (!group.members.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "You must be a member to post in this community",
      });
    }

    // Validate post content
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Post text is required",
      });
    }

    // Create post
    const post = new Post({
      userId,
      groupId,
      text: text.trim(),
      image,
      productId: productId || null,
    });

    await post.save();
    await post.populate("userId", "fullName profilePic email");

    console.log(`✅ Post created in group ${groupId}`);

    // Emit real-time event
    if (global.io) {
      global.io.to(`group-${groupId}`).emit("new-group-post", {
        postId: post._id,
        userId,
        userName: post.userId.fullName,
        text: post.text,
        timestamp: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (err) {
    console.error("Create group post error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create post: " + err.message,
    });
  }
});

module.exports = router;
