const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");

const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ================= GOOGLE LOGIN ================= */
// router.post("/google", async (req, res) => {
//   try {
//     const { idToken } = req.body;

//     if (!idToken) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing Google token",
//       });
//     }

//     // ✅ VERIFY TOKEN (SECURE WAY)
//     const ticket = await client.verifyIdToken({
//       idToken,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const payload = ticket.getPayload();
//     const { sub, email, name, picture } = payload;

//     // ✅ FIND USER (GOOGLE OR EMAIL BASED)
//     let user = await User.findOne({
//       $or: [
//         { provider: "google", providerId: sub },
//         { email },
//       ],
//     });

//     // ✅ CREATE USER IF NOT EXISTS
//     if (!user) {
//       user = await User.create({
//         fullName: name,
//         email,
//         avatar: picture,
//         provider: "google",
//         providerId: sub,
//       });
//     } else if (!user.providerId) {
//       // 🔗 Link Google account to existing user
//       user.provider = "google";
//       user.providerId = sub;
//       user.avatar = picture || user.avatar;
//       await user.save();
//     }

//     // ✅ JWT
//     const token = jwt.sign(
//   {
//     userId: user._id,
//     role: user.role || "USER",
//   },
//   process.env.JWT_SECRET,
//   { expiresIn: "7d" }
// );

//     return res.json({
//       success: true,
//       token,
//       user: {
//         id: user._id,
//         fullName: user.fullName,
//         email: user.email,
//         avatar: user.avatar,
//       },
//     });
//   } catch (err) {
//     console.error("Google OAuth error:", err.message);
//     return res.status(401).json({
//       success: false,
//       message: "Google authentication failed",
//     });
//   }
// });

router.post("/google", async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: "Google OAuth not configured (missing GOOGLE_CLIENT_ID)",
      });
    }

    const { idToken } = req.body;
    if (!idToken) {
      return res
        .status(400)
        .json({ success: false, message: "Missing Google token" });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({
      $or: [{ provider: "google", providerId: sub }, { email }],
    });

    if (!user) {
      user = await User.create({
        fullName: name,
        email,
        password: null,
        avatar: picture,
        provider: "google",
        providerId: sub,
        username: email.split("@")[0],
      });
    } else if (user.provider === "local") {
      user.provider = "google";
      user.providerId = sub;
      user.avatar = picture || user.avatar;
      user.username = user.username || email.split("@")[0];
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
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
        avatar: user.avatar,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("❌ Google OAuth error:");
    console.error("  Name:", err.name);
    console.error("  Message:", err.message);

    let errorMessage = "Google authentication failed";
    let statusCode = 401;

    if (err.message.includes("invalid_token_audience")) {
      errorMessage =
        "❌ ORIGIN NOT AUTHORIZED: Add http://localhost:5500 to Google Cloud Console authorized origins";
      statusCode = 403;
    } else if (
      err.message.includes("invalid_token") ||
      err.message.includes("Token used too late")
    ) {
      errorMessage =
        "❌ INVALID TOKEN: Token has expired. Try signing in again.";
    } else {
      errorMessage = "❌ " + (err.message || "Unknown error");
    }

    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
    });
  }
});

module.exports = router;
