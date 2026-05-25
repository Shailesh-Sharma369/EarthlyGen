const rateLimit = require("express-rate-limit");

/**
 * Rate Limiting Middleware
 * Protects against brute force and DDoS attacks
 */

// General API rate limiter
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (was 100)
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate limit product fetches and other GET requests
    return (
      req.method === "GET" &&
      (req.path === "/products" || req.path.includes("/products"))
    );
  },
});

// Strict rate limiter for authentication endpoints
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes",
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for signup
exports.signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 signups per hour
  message: {
    success: false,
    message: "Too many accounts created, please try again after an hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for password reset
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: "Too many password reset attempts, please try again after an hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for email verification
exports.emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 verification emails per 15 minutes
  message: {
    success: false,
    message: "Too many verification emails sent, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for cart operations
exports.cartLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 cart operations per minute
  message: {
    success: false,
    message: "Too many cart operations, please slow down",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for order creation
exports.orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 orders per hour
  message: {
    success: false,
    message: "Too many orders, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for post creation
exports.postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 posts per 15 minutes
  message: {
    success: false,
    message: "Too many posts, please slow down",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for comments
exports.commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each IP to 20 comments per 5 minutes
  message: {
    success: false,
    message: "Too many comments, please slow down",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for likes
exports.likeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 likes per minute
  message: {
    success: false,
    message: "Too many likes, please slow down",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
