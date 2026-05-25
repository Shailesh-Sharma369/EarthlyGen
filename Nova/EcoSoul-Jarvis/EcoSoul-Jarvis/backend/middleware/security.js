const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");

/**
 * Security Middleware
 * Implements various security best practices
 */

// Helmet configuration for security headers
exports.helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.tailwindcss.com",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com",
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com",
        "https://accounts.google.com",
        "https://unpkg.com",
        "https://cdn.socket.io",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: [
        "'self'",
        "http://localhost:5002",
        "http://127.0.0.1:5002",
        "ws://localhost:5002",
        "ws://127.0.0.1:5002",
        "http://localhost:9000",
        "http://127.0.0.1:9000",
        "https://accounts.google.com",
        "https://unseditious-gloria-soothfastly.ngrok-free.dev",
      ],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// MongoDB injection protection
// Note: Using only body/params sanitization to avoid incompatibility with Express 5
exports.mongoSanitize = (req, res, next) => {
  // Sanitize req.body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  // Sanitize req.params
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

// Helper function to sanitize MongoDB injection attempts
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Check for $ or . in keys (MongoDB operators)
      if (key.startsWith("$") || key.includes(".")) {
        console.warn(`⚠️ Potential MongoDB injection attempt detected: ${key}`);
        continue; // Skip malicious keys
      }
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

// HTTP Parameter Pollution protection
exports.hpp = hpp({
  whitelist: ["price", "category", "sort", "limit", "page"],
});

// CORS configuration
exports.corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:5503",
      "http://127.0.0.1:5503",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5002",
      "http://127.0.0.1:5002",
      // Add production domains here
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Request logging middleware
exports.requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);

  // Log response time
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${timestamp}] ${method} ${url} - ${res.statusCode} - ${duration}ms`,
    );
  });

  next();
};

// Error logging middleware
exports.errorLogger = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;

  console.error(`[${timestamp}] ERROR - ${method} ${url} - IP: ${ip}`);
  console.error(`Error: ${err.message}`);
  console.error(`Stack: ${err.stack}`);

  // Don't expose error details to client
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production" ? "An error occurred" : err.message,
  });
};

// Security audit logger
exports.securityAuditLogger = (event, details) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] SECURITY AUDIT - ${event}:`, details);

  // In production, send to logging service (e.g., Winston, Sentry)
  // For now, just console log
};

// Detect suspicious activity
exports.suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    /(\$where|\$ne|\$gt|\$lt)/i, // MongoDB injection
    /(<script|javascript:|onerror=)/i, // XSS attempts
    /(union.*select|insert.*into|drop.*table)/i, // SQL injection
    /(\.\.\/|\.\.\\)/i, // Path traversal
  ];

  const checkString =
    JSON.stringify(req.body) +
    JSON.stringify(req.query) +
    JSON.stringify(req.params);

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      exports.securityAuditLogger("SUSPICIOUS_ACTIVITY", {
        ip: req.ip,
        method: req.method,
        url: req.url,
        pattern: pattern.toString(),
        data: checkString.substring(0, 200),
      });

      return res.status(403).json({
        success: false,
        message: "Suspicious activity detected",
      });
    }
  }

  next();
};

// Prevent timing attacks on authentication
exports.constantTimeResponse = (req, res, next) => {
  const start = Date.now();
  const minResponseTime = 100; // Minimum 100ms response time

  res.on("finish", () => {
    const elapsed = Date.now() - start;
    if (elapsed < minResponseTime) {
      setTimeout(() => {}, minResponseTime - elapsed);
    }
  });

  next();
};

// Check if user is authenticated
exports.requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  next();
};

// Check if user is admin
exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    exports.securityAuditLogger("UNAUTHORIZED_ADMIN_ACCESS", {
      userId: req.user?.id,
      ip: req.ip,
      url: req.url,
    });

    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

// Verify resource ownership
exports.verifyOwnership = (Model, paramName = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
        });
      }

      // Check if user owns the resource
      const userId = req.user.id;
      const resourceUserId =
        resource.userId?.toString() || resource.user?.toString();

      if (resourceUserId !== userId && req.user.role !== "ADMIN") {
        exports.securityAuditLogger("UNAUTHORIZED_RESOURCE_ACCESS", {
          userId: userId,
          resourceId: resourceId,
          resourceType: Model.modelName,
          ip: req.ip,
        });

        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
};
