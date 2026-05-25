const express = require("express");
const router = express.Router();
const Notification = require("../models/notification");
const auth = require("../middleware/auth");
const {
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
} = require("../utils/notificationService");

// ============ GET NOTIFICATIONS ============

/**
 * GET /api/notifications - Get all notifications for logged-in user
 */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({
      recipientId: userId,
    })
      .populate("senderId", "fullName avatar email _id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({
      recipientId: userId,
    });

    res.json({
      success: true,
      notifications,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: notifications.length,
        total: total,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/unread - Get unread notifications
 */
router.get("/unread", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadNotifications = await Notification.find({
      recipientId: userId,
      isRead: false,
    })
      .populate("senderId", "fullName avatar email _id")
      .sort({ createdAt: -1 });

    const unreadCount = unreadNotifications.length;

    res.json({
      success: true,
      unreadCount,
      unreadNotifications,
    });
  } catch (error) {
    console.error("❌ Error fetching unread notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread notifications",
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/unread-count - Get unread notifications count
 */
router.get("/unread-count", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("❌ Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/type/:type - Get notifications by type
 */
router.get("/type/:type", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;

    const notifications = await Notification.find({
      recipientId: userId,
      type,
    })
      .populate("senderId", "fullName avatar email _id")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("❌ Error fetching notifications by type:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

// ============ UPDATE NOTIFICATIONS ============

/**
 * PATCH /api/notifications/:id/read - Mark notification as read
 */
router.patch("/:id/read", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.recipientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this notification",
      });
    }

    const updated = await markAsRead(id);

    res.json({
      success: true,
      message: "Notification marked as read",
      notification: updated,
    });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notification",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/notifications/read-all - Mark all notifications as read
 */
router.patch("/read-all", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await markAllAsRead(userId);

    res.json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Error marking all as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notifications",
      error: error.message,
    });
  }
});

// ============ DELETE NOTIFICATIONS ============

/**
 * DELETE /api/notifications/:id - Delete a notification
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.recipientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this notification",
      });
    }

    await deleteNotification(id);

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("❌ Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/notifications - Delete all notifications for user
 */
router.delete("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    await deleteAllNotifications(userId);

    res.json({
      success: true,
      message: "All notifications deleted",
    });
  } catch (error) {
    console.error("❌ Error deleting all notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notifications",
      error: error.message,
    });
  }
});

module.exports = router;
