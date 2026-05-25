const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    activityType: {
      type: String,
      enum: ["like", "comment", "post", "follow", "save"],
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // For follow activities
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    commentText: String,
    description: String, // For post activity
    mediaUrl: String, // For post activity
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Index for faster queries
activitySchema.index({ userId: 1, timestamp: -1 });
activitySchema.index({ targetUserId: 1, timestamp: -1 });

const Activity =
  mongoose.models.Activity || mongoose.model("Activity", activitySchema);

module.exports = Activity;
