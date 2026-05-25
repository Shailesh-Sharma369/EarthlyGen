const Notification = require("../models/notification");
const User = require("../models/user");

/**
 * Create and send a notification
 */
const createNotification = async ({
  recipientId,
  senderId,
  type,
  title,
  message,
  relatedId = null,
  relatedType = null,
  data = {},
}) => {
  try {
    // Don't notify user about their own actions
    if (recipientId.toString() === senderId.toString()) {
      return null;
    }

    // Check for duplicate notifications within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingNotif = await Notification.findOne({
      recipientId,
      senderId,
      type,
      relatedId,
      createdAt: { $gte: fiveMinutesAgo },
    });

    if (existingNotif) {
      return existingNotif;
    }

    // Create notification
    const notification = new Notification({
      recipientId,
      senderId,
      type,
      title,
      message,
      relatedId,
      relatedType,
      data,
    });

    await notification.save();

    // Populate sender info for real-time emission
    await notification.populate("senderId", "fullName avatar email");

    return notification;
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    throw error;
  }
};

/**
 * Emit notification via Socket.io in real-time
 */
const emitNotification = (io, notification) => {
  if (!io) return;

  const recipientRoom = `user-${notification.recipientId}`;
  io.to(recipientRoom).emit("new-notification", {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    senderId: notification.senderId._id,
    senderName: notification.senderId.fullName,
    senderAvatar: notification.senderId.avatar,
    relatedId: notification.relatedId,
    relatedType: notification.relatedType,
    data: notification.data,
    createdAt: notification.createdAt,
    isRead: notification.isRead,
  });

  console.log(
    `📢 Notification sent to ${notification.recipientId} - Type: ${notification.type}`,
  );
};

/**
 * Handle follow notification
 */
const notifyFollow = async (io, followerId, followingId) => {
  const notification = await createNotification({
    recipientId: followingId,
    senderId: followerId,
    type: "follow",
    title: "New Follower",
    message: "started following you",
    relatedId: followerId,
    relatedType: "user",
  });

  if (notification) {
    emitNotification(io, notification);
  }
};

/**
 * Handle follow request notification
 */
const notifyFollowRequest = async (io, requesterId, requesteeId) => {
  const notification = await createNotification({
    recipientId: requesteeId,
    senderId: requesterId,
    type: "follow_request",
    title: "Follow Request",
    message: "sent you a follow request",
    relatedId: requesterId,
    relatedType: "user",
  });

  if (notification) {
    emitNotification(io, notification);
  }
};

/**
 * Handle follow accept notification
 */
const notifyFollowAccept = async (io, accepterId, requesterIdId) => {
  const notification = await createNotification({
    recipientId: requesterIdId,
    senderId: accepterId,
    type: "accept_follow",
    title: "Follow Accepted",
    message: "accepted your follow request",
    relatedId: accepterId,
    relatedType: "user",
  });

  if (notification) {
    emitNotification(io, notification);
  }
};

/**
 * Handle post like notification
 */
const notifyPostLike = async (io, likerId, postId, postOwnerId) => {
  const notification = await createNotification({
    recipientId: postOwnerId,
    senderId: likerId,
    type: "post_like",
    title: "Post Liked",
    message: "liked your post",
    relatedId: postId,
    relatedType: "post",
  });

  if (notification) {
    emitNotification(io, notification);
  }
};

/**
 * Handle post comment notification
 */
const notifyPostComment = async (io, commenterId, postId, postOwnerId) => {
  const notification = await createNotification({
    recipientId: postOwnerId,
    senderId: commenterId,
    type: "post_comment",
    title: "New Comment",
    message: "commented on your post",
    relatedId: postId,
    relatedType: "post",
  });

  if (notification) {
    emitNotification(io, notification);
  }
};

/**
 * Handle comment like notification
 */
const notifyCommentLike = async (io, likerId, commentId, commentOwnerId) => {
  const notification = await createNotification({
    recipientId: commentOwnerId,
    senderId: likerId,
    type: "comment_like",
    title: "Comment Liked",
    message: "liked your comment",
    relatedId: commentId,
    relatedType: "comment",
  });

  if (notification) {
    emitNotification(io, notification);
  }
};

/**
 * Get unread notifications count
 */
const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });
    return count;
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true },
    );
    return notification;
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true },
    );
    return result;
  } catch (error) {
    console.error("❌ Error marking all as read:", error);
    throw error;
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId) => {
  try {
    await Notification.findByIdAndDelete(notificationId);
    return true;
  } catch (error) {
    console.error("❌ Error deleting notification:", error);
    throw error;
  }
};

/**
 * Delete all notifications for a user
 */
const deleteAllNotifications = async (userId) => {
  try {
    await Notification.deleteMany({ recipientId: userId });
    return true;
  } catch (error) {
    console.error("❌ Error deleting all notifications:", error);
    throw error;
  }
};

module.exports = {
  createNotification,
  emitNotification,
  notifyFollow,
  notifyFollowRequest,
  notifyFollowAccept,
  notifyPostLike,
  notifyPostComment,
  notifyCommentLike,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
};
