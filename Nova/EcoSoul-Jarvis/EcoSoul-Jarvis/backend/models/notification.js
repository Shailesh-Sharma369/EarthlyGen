const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Recipient of the notification
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // User who triggered the notification
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Type of notification
    type: {
      type: String,
      enum: [
        "follow",
        "follow_request",
        "accept_follow",
        "post_like",
        "post_comment",
        "comment_like",
        "post_mention",
        "comment_mention",
      ],
      required: true,
      index: true,
    },

    // Title/Subject
    title: {
      type: String,
      required: true,
    },

    // Description/Message
    message: {
      type: String,
      required: true,
    },

    // Reference to the related object (post, comment, etc.)
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Type of related object
    relatedType: {
      type: String,
      enum: ["post", "comment", "user", null],
      default: null,
    },

    // Is notification read
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Additional data as JSON
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Timestamp
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

// Index for efficient queries
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ senderId: 1, createdAt: -1 });

// Prevent duplicate notifications within 5 minutes for the same action
notificationSchema.index(
  { recipientId: 1, senderId: 1, type: 1, relatedId: 1, createdAt: 1 },
  {
    unique: false, // We'll handle uniqueness in code
    sparse: true,
  },
);

module.exports = mongoose.model("Notification", notificationSchema);
