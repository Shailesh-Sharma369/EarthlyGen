/**
 * User verification and trust routes.
 * Local JSON storage only.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const DATA_DIR = path.join(__dirname, "../data");
const USER_VERIFY_FILE = path.join(DATA_DIR, "user_verification.json");

function ensureUserFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USER_VERIFY_FILE)) {
    fs.writeFileSync(USER_VERIFY_FILE, JSON.stringify([], null, 2));
  }
}

function readUsers() {
  ensureUserFile();
  try {
    return JSON.parse(fs.readFileSync(USER_VERIFY_FILE, "utf-8"));
  } catch (error) {
    console.error("Error reading user verification:", error.message);
    return [];
  }
}

function writeUsers(users) {
  ensureUserFile();
  fs.writeFileSync(USER_VERIFY_FILE, JSON.stringify(users, null, 2));
}

function calculateTrustScore({ email_verified, phone_verified, reviews_count }) {
  const emailVerified = Boolean(email_verified);
  const phoneVerified = Boolean(phone_verified);
  const reviewsCount = Number(reviews_count || 0);

  let trustScore = 10;
  if (emailVerified && phoneVerified) trustScore = 60;
  else if (emailVerified) trustScore = 40;

  if (reviewsCount > 0) {
    trustScore += Math.min(30, reviewsCount * 3);
  }

  trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));

  let badge = "Basic";
  if (trustScore > 80) badge = "Eco Advocate";
  else if (trustScore > 50) badge = "Trusted";

  return { trust_score: trustScore, badge };
}

router.post("/user", (req, res) => {
  try {
    const { user_id, email_verified, phone_verified, reviews_count } = req.body || {};

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: user_id"
      });
    }

    const score = calculateTrustScore({ email_verified, phone_verified, reviews_count });

    const users = readUsers();
    const index = users.findIndex((u) => String(u.user_id) === String(user_id));

    const nextUser = {
      user_id: String(user_id),
      email_verified: Boolean(email_verified),
      phone_verified: Boolean(phone_verified),
      reviews_count: Number(reviews_count || 0),
      trust_score: score.trust_score,
      badge: score.badge,
      updated_at: new Date().toISOString()
    };

    if (index >= 0) users[index] = { ...users[index], ...nextUser };
    else users.push(nextUser);

    writeUsers(users);

    return res.json({
      success: true,
      ...nextUser
    });
  } catch (error) {
    console.error("User verify error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

router.get("/user/:user_id", (req, res) => {
  try {
    const { user_id } = req.params;
    const users = readUsers();
    const user = users.find((u) => String(u.user_id) === String(user_id));

    if (!user) {
      return res.json({
        success: true,
        user_id: String(user_id),
        email_verified: false,
        phone_verified: false,
        trust_score: 10,
        badge: "Basic"
      });
    }

    return res.json({ success: true, ...user });
  } catch (error) {
    console.error("Get user verify error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

module.exports = router;
