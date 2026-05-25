require("dotenv").config();
const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");

async function seedPosts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGOURI);
    console.log("✅ MongoDB connected");

    // Get ANY user from database
    let user = await User.findOne({});

    if (!user) {
      console.log("⚠️ No users found in database!");
      console.log("📋 Steps to fix:");
      console.log("1. Sign up a new user on the platform");
      console.log("2. Then run this seed script again");
      process.exit(0);
    }

    console.log(
      "✅ Using existing user:",
      user.fullName,
      "(" + user.email + ")",
    );

    // Clear existing posts
    await Post.deleteMany({});
    console.log("🗑️  Cleared existing posts");

    // Create test posts
    const testPosts = [
      {
        userId: user._id,
        text: "Just planted 10 trees in my community garden today! 🌱 Feeling great about contributing to a greener planet.",
        image: null,
        productId: null,
        likes: [],
        comments: [],
      },
      {
        userId: user._id,
        text: "Our new solar panels are generating amazing energy! ☀️ The installation process was smooth and the team was very professional.",
        image: null,
        productId: null,
        likes: [],
        comments: [
          {
            userId: user._id,
            text: "That's awesome! How much energy are you generating monthly?",
            createdAt: new Date(),
          },
        ],
      },
      {
        userId: user._id,
        text: "Zero-waste shopping challenge: 30 days complete! 🎉 I've reduced my plastic usage by 75% this month.",
        image: null,
        productId: null,
        likes: [user._id], // Pre-like for testing
        comments: [],
      },
      {
        userId: user._id,
        text: "Starting my journey to sustainability. Day 1: Switched to reusable water bottles, bamboo toothbrushes, and eco-friendly cleaning supplies. #EcoSoul #GreenLiving",
        image: null,
        productId: null,
        likes: [],
        comments: [],
      },
      {
        userId: user._id,
        text: "Did you know? Composting can reduce household waste by up to 30%! Started my first compost bin today. 🥬",
        image: null,
        productId: null,
        likes: [],
        comments: [],
      },
    ];

    const createdPosts = await Post.insertMany(testPosts);
    console.log("✅ Created", createdPosts.length, "test posts");

    createdPosts.forEach((post, index) => {
      console.log(`   Post ${index + 1}: ${post._id}`);
      console.log(`      Text: ${post.text.substring(0, 50)}...`);
    });

    console.log(
      "\n✅ Database seeded successfully! Posts are ready for testing.",
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

seedPosts();
