const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { validateSignup, validateSignin } = require("../middleware/validation");
const { authLimiter, signupLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ success: false, message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

function normalizeDescriptor(input) {
  if (!Array.isArray(input)) return [];
  const normalized = input
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  return normalized;
}

function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return Number.POSITIVE_INFINITY;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/* SIGNUP */
router.post("/signup", signupLimiter, validateSignup, async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ success: false, message: "User exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hash,
      provider: "local",
      // 💚 Initialize eco-credits with 100 on signup
      ecoCredits: 100,
      creditsHistory: [
        {
          type: "signup",
          amount: 100,
          description: "Welcome bonus: 100 eco-credits",
          createdAt: new Date(),
        },
      ],
    });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role || "USER",
        isAdmin: user.role === "ADMIN",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        ecoCredits: user.ecoCredits,
        ecoScore: user.ecoScore,
      },
    });
  } catch (e) {
    console.error("Signup error:", e);
    res.status(500).json({ success: false, message: "Signup failed" });
  }
});

/* SIGNIN */
router.post("/signin", authLimiter, validateSignin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Case-insensitive email search
    const user = await User.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
    });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role || "USER",
        isAdmin: user.role === "ADMIN",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        ecoCredits: user.ecoCredits,
        ecoScore: user.ecoScore,
      },
    });
  } catch (e) {
    console.error("Signin error:", e);
    res.status(500).json({ success: false, message: "Signin failed" });
  }
});

/* FACE REGISTER */
router.post("/face/register", authLimiter, async (req, res) => {
  try {
    const { email, password, faceDescriptor } = req.body || {};

    if (!email || !password || !faceDescriptor) {
      return res.status(400).json({
        success: false,
        message: "email, password and faceDescriptor are required",
      });
    }

    const descriptor = normalizeDescriptor(faceDescriptor);
    if (descriptor.length < 64) {
      return res.status(400).json({
        success: false,
        message: "Invalid face descriptor. Please capture your face again.",
      });
    }

    const user = await User.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "This account has no local password. Use social login.",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    user.faceAuth = {
      enabled: true,
      descriptor,
      registeredAt: new Date(),
      lastLoginAt: user.faceAuth?.lastLoginAt || null,
    };
    await user.save();

    return res.json({
      success: true,
      message: "Face login registered successfully",
    });
  } catch (error) {
    console.error("Face register error:", error);
    return res.status(500).json({ success: false, message: "Face register failed" });
  }
});

/* FACE SIGNIN */
router.post("/face/signin", authLimiter, async (req, res) => {
  try {
    const { email, faceDescriptor } = req.body || {};

    if (!email || !faceDescriptor) {
      return res.status(400).json({
        success: false,
        message: "email and faceDescriptor are required",
      });
    }

    const descriptor = normalizeDescriptor(faceDescriptor);
    if (descriptor.length < 64) {
      return res.status(400).json({
        success: false,
        message: "Invalid face descriptor. Please capture your face again.",
      });
    }

    const user = await User.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.faceAuth?.enabled || !Array.isArray(user.faceAuth?.descriptor) || user.faceAuth.descriptor.length < 64) {
      return res.status(400).json({
        success: false,
        message: "Face login is not registered for this account",
      });
    }

    const distance = euclideanDistance(descriptor, user.faceAuth.descriptor);
    const threshold = Number(process.env.FACE_LOGIN_THRESHOLD || 0.48);
    const matched = distance <= threshold;

    if (!matched) {
      return res.status(401).json({
        success: false,
        message: "Face did not match",
        distance,
      });
    }

    user.faceAuth.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role || "USER",
        isAdmin: user.role === "ADMIN",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        ecoCredits: user.ecoCredits,
        ecoScore: user.ecoScore,
      },
      distance,
    });
  } catch (error) {
    console.error("Face signin error:", error);
    return res.status(500).json({ success: false, message: "Face signin failed" });
  }
});

/* AUTH ME */
/* GET USER PROFILE */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* 💚 GET ECO-CREDITS INFO */
router.get("/eco-credits", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "ecoCredits creditsHistory",
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Limit to latest 20 transactions
    const history = user.creditsHistory
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);

    res.json({
      success: true,
      ecoCredits: user.ecoCredits,
      creditsHistory: history,
      lastUpdated: new Date(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* 💚 MIGRATE EXISTING USERS - Initialize 100 credits for users who don't have any */
router.post("/migrate-credits", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If user already has credits, no need to migrate
    if (user.ecoCredits && user.ecoCredits > 0) {
      return res.json({
        success: true,
        message: "User already has eco-credits",
        ecoCredits: user.ecoCredits,
        alreadyMigrated: true,
      });
    }

    // Initialize 100 credits for existing user
    user.ecoCredits = 100;
    user.creditsHistory = user.creditsHistory || [];
    user.creditsHistory.push({
      type: "signup",
      amount: 100,
      description: "Migration: Welcome bonus - 100 eco-credits",
      createdAt: new Date(),
    });

    await user.save();

    res.json({
      success: true,
      message: "✅ 100 eco-credits initialized for your account!",
      ecoCredits: user.ecoCredits,
      justMigrated: true,
    });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ success: false, message: "Migration failed" });
  }
});

module.exports = router;
