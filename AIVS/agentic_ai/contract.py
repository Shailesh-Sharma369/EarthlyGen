"""
contracts.py
============
Defines the strict communication contract between:
LLM ↔ Agent Controller ↔ Tools ↔ Frontend

This is the SINGLE SOURCE OF TRUTH.
All components MUST follow this.
"""

from typing import TypedDict, Optional, Dict, Any, Literal


# =============================
# 1️⃣ INTENT ENUM (LLM OUTPUT)
# =============================
class Intent:
    # --- Discovery ---
    SEARCH_PRODUCT = "SEARCH_PRODUCT"
    RECOMMEND = "RECOMMEND"

    # --- Navigation ---
    OPEN_PRODUCT = "OPEN_PRODUCT"
    OPEN_CART = "OPEN_CART"
    NAVIGATE = "NAVIGATE"

    # --- Cart ---
    ADD_TO_CART = "ADD_TO_CART"
    REMOVE_FROM_CART = "REMOVE_FROM_CART"

    # --- Order / Payment ---
    PLACE_ORDER = "PLACE_ORDER"
    INIT_PAYMENT = "INIT_PAYMENT"

    # --- Order Management (NEW PHASE 2) ---
    TRACK_ORDER = "TRACK_ORDER"
    CANCEL_ORDER = "CANCEL_ORDER"

    # --- Social Media ---
    CREATE_POST = "CREATE_POST"
    READ_FEED = "READ_FEED"
    DISCOVER_COMMUNITIES = "DISCOVER_COMMUNITIES"
    VIEW_PROFILE = "VIEW_PROFILE"
    LIKE_POST = "LIKE_POST"
    JOIN_COMMUNITY = "JOIN_COMMUNITY"
    SEND_MESSAGE = "SEND_MESSAGE"

    # --- Pro-Planet Gamification ---
    SUBMIT_DEED = "SUBMIT_DEED"          # Log an eco good-deed (tree planting, recycling, etc.)
    GET_LEADERBOARD = "GET_LEADERBOARD"  # Show top eco-champions leaderboard
    GET_ECO_STATS = "GET_ECO_STATS"      # Get current user's eco-score, green points, planet rank

    # --- Fallback ---
    UNKNOWN = "UNKNOWN"


# =============================
# 2️⃣ TOOL CALL FORMAT
# =============================
class ToolCall(TypedDict):
    tool_name: str                 # e.g. "search_products", "cart_tool"
    arguments: Dict[str, Any]      # tool-specific args


# =============================
# 3️⃣ FRONTEND ACTION FORMAT
# =============================
class FrontendAction(TypedDict):
    type: str                      # one of FrontendActions
    payload: Optional[Dict[str, Any]]


# =============================
# 4️⃣ AGENT RESPONSE CONTRACT
# =============================
class AgentResponse(TypedDict, total=False):
    intent: str                             # final resolved intent
    tool_call: Optional[ToolCall]              # backend action
    frontend_action: Optional[FrontendAction]  # UI navigation / update
    data: Optional[Any]                        # tool result
    message: Optional[str]                     # user-facing text


# =============================
# 5️⃣ FRONTEND ACTION TYPES
# =============================
# IMPORTANT: These values must match exactly what server.py sends
# and what ruhi.js executeAction() switch handles.
class FrontendActions:
    # ========== E-COMMERCE NAVIGATION ==========
    NAVIGATE_HOME = "NAVIGATE_HOME"
    NAVIGATE_PRODUCTS = "NAVIGATE_PRODUCTS"
    NAVIGATE_SHOP = "NAVIGATE_SHOP"
    NAVIGATE_CART = "NAVIGATE_CART"
    NAVIGATE_ORDERS = "NAVIGATE_ORDERS"
    NAVIGATE_PAYMENT = "NAVIGATE_PAYMENT"
    NAVIGATE_ACCOUNT = "NAVIGATE_ACCOUNT"
    NAVIGATE_PROFILE = "NAVIGATE_PROFILE"
    NAVIGATE_PRODUCT_DETAIL = "NAVIGATE_PRODUCT_DETAIL"

    # ========== SOCIAL NAVIGATION ==========
    NAVIGATE_SOCIAL = "NAVIGATE_SOCIAL"

    # ========== SEARCH ==========
    SEARCH_PRODUCTS = "SEARCH_PRODUCTS"

    # ========== SOCIAL ACTIONS ==========
    CREATE_POST = "CREATE_POST"
    VIEW_FEED = "VIEW_FEED"
    VIEW_PROFILE = "VIEW_PROFILE"
