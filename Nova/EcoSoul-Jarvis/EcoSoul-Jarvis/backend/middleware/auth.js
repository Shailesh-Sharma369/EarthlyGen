const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  console.log("\n🔐 === AUTH MIDDLEWARE CALLED ===");
  console.log("🔐 Path:", req.path);
  console.log("🔐 Method:", req.method);

  const authHeader = req.headers.authorization;
  console.log("🔐 Auth Header:", authHeader ? "Present" : "Missing");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ AUTH FAILED: No Bearer token");
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    console.log("🔐 Token (first 30 chars):", token.substring(0, 30) + "...");
    console.log("🔐 JWT_SECRET exists:", !!process.env.JWT_SECRET);
    console.log("🔐 JWT_SECRET length:", process.env.JWT_SECRET?.length || 0);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token decoded successfully!");
    console.log("✅ Decoded payload:", decoded);

    req.user = {
      id: decoded.userId || decoded.id,
      role: decoded.role || "USER",
      email: decoded.email,
    };

    // Also set req.userId for backward compatibility
    req.userId = req.user.id;

    console.log("✅ req.user set:", req.user);
    console.log("✅ AUTH PASSED - Calling next()");

    next();
  } catch (err) {
    console.error("❌ JWT ERROR:", err.name);
    console.error("❌ JWT ERROR Message:", err.message);
    console.error("❌ JWT ERROR Stack:", err.stack);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
