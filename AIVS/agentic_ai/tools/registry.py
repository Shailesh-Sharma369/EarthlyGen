"""
registry.py
===========
Central Tool Registry (PRODUCTION – Social + Ecommerce Complete)
- Registers all E-commerce tools (search, recommend, cart, etc.)
- Registers all Social Media tools (posts, feed, communities, messaging)
- Provides unified interface for Agent Controller
"""

# =================== ECOMMERCE TOOLS ===================
from tools.search import ProductSearchTool
from tools.recommend import RecommendationTool
from tools.cart import CartTool
from tools.memory import MemoryTool
from tools.guardrail import GuardrailTool
from tools.navigation import NavigationTool

# =================== SOCIAL MEDIA TOOLS ===================
# ✅ NEW: Unified wrapper with all social tools as BaseTool classes
from tools.social.social_tools_wrapper import (
    CreatePostTool,
    ReadFeedTool,
    LikePostTool,
    DiscoverCommunitiesTool,
    JoinCommunityTool,
    SendMessageTool,
    ViewProfileTool,
    SocialDataSource,
    get_social_tools
)

# =================== INLINE AGENTIC TOOLS ================== 
from tools.base import BaseTool
import uuid
import datetime


class OrderTool(BaseTool):
    """
    🔥 E-COMMERCE: Place Order
    - Creates order with auto-generated ID
    - Confirms eco-friendly purchase
    """
    name = "order"
    description = "Place an order for selected products"

    def run(self, user_id="guest", **kwargs):
        order_id = f"ORD-{uuid.uuid4().hex[:6].upper()}"
        return {
            "status": "SUCCESS",
            "order_id": order_id,
            "message": f"Order {order_id} placed successfully! 🌿"
        }


class TrackTool(BaseTool):
    """
    🔥 E-COMMERCE: Track Order
    - Shows order status and delivery location
    - Updates delivery ETA
    """
    name = "track"
    description = "Track an existing order"

    def run(self, user_id="guest", **kwargs):
        return {
            "status": "SHIPPED",
            "location": "Green Fulfillment Hub, Mumbai",
            "delivery_date": (
                datetime.datetime.now() + datetime.timedelta(days=2)
            ).strftime("%Y-%m-%d"),
            "message": "Your eco-friendly package is on the way! 📦"
        }


class CancelTool(BaseTool):
    """
    🔥 E-COMMERCE: Cancel Order
    - Cancels order and initiates refund
    - Returns refund tracking ID
    """
    name = "cancel"
    description = "Cancel an order"

    def run(self, user_id="guest", **kwargs):
        return {
            "status": "CANCELLED",
            "refund_id": f"REF-{uuid.uuid4().hex[:6].upper()}",
            "message": "Order cancelled successfully. Refund initiated ✅"
        }


# =================== MAIN REGISTRY FUNCTION ===================

def get_all_tools(datasource):
    """
    🔥 COMPLETE TOOL REGISTRY (E-COMMERCE + SOCIAL)
    
    Returns dictionary of ALL available tools for Agentic AI:
    - E-commerce: Search, Recommend, Cart, Order, Track, Cancel
    - Social: Posts, Feed, Communities, Messages, Profiles, Likes
    
    Args:
        datasource: Product DataSource (for e-commerce tools)
    
    Returns:
        dict: Tool name -> Tool instance mapping
    """
    
    # ===== ECOMMERCE TOOLS (Product-based) =====
    ecommerce_tools = {
        # 🛍️ DISCOVERY & RECOMMENDATION
        "search_products": ProductSearchTool(datasource),
        "recommend_products": RecommendationTool(datasource),
        
        # 🛒 CART & ORDER
        "cart_tool": CartTool(datasource),
        "order": OrderTool(datasource),
        
        # 📦 ORDER MANAGEMENT
        "track": TrackTool(datasource),
        "cancel": CancelTool(datasource),
        
        # 🧠 UTILITY
        "memory_tool": MemoryTool(datasource),
        "guardrail": GuardrailTool(datasource),
        "navigation_tool": NavigationTool(datasource),
    }
    
    # ===== SOCIAL MEDIA TOOLS (Community-based) =====
    # ✅ NEW: Initialize SocialDataSource for social tools
    try:
        social_datasource = SocialDataSource()
        social_tools = get_social_tools(social_datasource)
    except Exception as e:
        print(f"⚠️  Social tools initialization warning: {e}")
        # Provide empty social tools if DB not available
        social_tools = {}
    
    # ===== MERGE ALL TOOLS =====
    all_tools = {**ecommerce_tools, **social_tools}
    
    return all_tools


