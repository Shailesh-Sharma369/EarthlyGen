/**
 * aiRoutes.js
 * AI Assistant Integration - Connects Express to Python AI Controller
 * Handles Ruhi AI queries and translates them to backend actions
 */

const express = require("express");
const axios = require("axios");
const router = express.Router();

// ==============================
// PYTHON CONTROLLER PROXY CONFIG
// ==============================
const PYTHON_CONTROLLER_URL = process.env.PYTHON_CONTROLLER_URL || "http://localhost:9000";

console.log(`🤖 AI Routes initialized. Python Controller: ${PYTHON_CONTROLLER_URL}`);

// ==============================
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id || decoded.userId;
      req.isAdmin = decoded.isAdmin || decoded.role === "ADMIN";
    }
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    next(); // Continue without auth (for public queries)
  }
};

/**
 * POST /api/ai/query
 * Main AI Query Endpoint
 * Accepts user query and returns AI action/response
 */
router.post("/query", authMiddleware, async (req, res) => {
  try {
    const { query, context = {}, user_id: bodyUserId } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Query cannot be empty",
      });
    }

    // Prefer JWT-derived userId for authenticated users (canonical, collision-safe).
    // For guests the frontend sends a stable `user_id` created in localStorage;
    // fall back to that so their session memory survives across requests.
    const resolvedUserId = req.userId || bodyUserId || `guest_${Date.now()}`;

    console.log(`🤖 AI Query from ${resolvedUserId}: "${query}"`);

    // ==============================
    // CALL PYTHON AI CONTROLLER
    // ==============================
    const pythonResponse = await axios.post(
      `${PYTHON_CONTROLLER_URL}/handle_query`,
      {
        user_query: query,
        user_id: resolvedUserId,
        auth_token: req.headers.authorization?.split(" ")[1] || null,
        context: context,
      },
      {
        timeout: 30000, // 30 second timeout
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const aiResult = pythonResponse.data;

    // ==============================
    // NORMALIZE RESPONSE
    // ==============================
    const response = {
      success: true,
      type: aiResult.type || "UNKNOWN",
      intent: aiResult.intent || null,
      // Prefer explicit message fields; fall back to null (not a hardcoded string) so
      // ruhi.js only speaks when the controller actually provides a message.
      message: aiResult.message || aiResult.response || aiResult.consultation || null,
      action: aiResult.action || null,
      data: aiResult.data || null,
      payload: aiResult.payload || null,
    };

    console.log(`✅ AI Response: ${response.type} - ${response.intent}`);

    return res.json(response);
  } catch (error) {
    console.error("❌ AI Query Error:", error.message);

    if (error.code === "ECONNREFUSED" || error.message.includes("ECONNREFUSED")) {
      return res.status(503).json({
        success: false,
        error: "AI controller offline",
        message: `Cannot connect to Python AI Controller at ${PYTHON_CONTROLLER_URL}. Make sure it's running on port 9000.`,
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to process AI query",
    });
  }
});

/**
 * POST /api/ai/chat
 * Chat-only endpoint (no action)
 * Returns conversational response
 */
router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Message cannot be empty",
      });
    }

    console.log(`💬 AI Chat from ${req.userId || "guest"}: "${message}"`);

    // ==============================
    // CALL PYTHON AI CONTROLLER
    // ==============================
    const pythonResponse = await axios.post(
      `${PYTHON_CONTROLLER_URL}/chat`,
      {
        message: message,
        user_id: req.userId || `guest_${Date.now()}`,
        conversation_id: conversationId,
        auth_token: req.headers.authorization?.split(" ")[1] || null,
      },
      { timeout: 30000 }
    );

    const chatResponse = {
      success: true,
      message: pythonResponse.data.message || pythonResponse.data.response || "I couldn't generate a response.",
      conversationId: conversationId,
    };

    return res.json(chatResponse);
  } catch (error) {
    console.error("❌ Chat Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/health
 * Check AI System Health
 */
router.get("/health", async (req, res) => {
  try {
    const controllerHealth = await axios.get(
      `${PYTHON_CONTROLLER_URL}/health`,
      { timeout: 5000 }
    );

    return res.json({
      success: true,
      status: "healthy",
      controller: controllerHealth.data,
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      status: "offline",
      error: error.message,
      controller_url: PYTHON_CONTROLLER_URL,
    });
  }
});

/**
 * POST /api/ai/command
 * Legacy endpoint for voice commands
 * Supports: navigate, add-to-cart, search, etc.
 */
router.post("/command", authMiddleware, async (req, res) => {
  try {
    const { command } = req.body;

    if (!command || command.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Command cannot be empty",
      });
    }

    console.log(`🎤 Voice Command: "${command}"`);

    const pythonResponse = await axios.post(
      `${PYTHON_CONTROLLER_URL}/handle_query`,
      {
        user_query: command,
        user_id: req.userId || `guest_${Date.now()}`,
        auth_token: req.headers.authorization?.split(" ")[1] || null,
      },
      { timeout: 30000 }
    );

    const result = pythonResponse.data;

    return res.json({
      success: true,
      action: result.action || null,
      response: result.message || result.response || "Command processed",
      payload: result.payload || null,
    });
  } catch (error) {
    console.error("❌ Command Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
