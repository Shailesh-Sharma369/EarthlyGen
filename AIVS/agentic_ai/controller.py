"""
controller.py
=============
Central Agent Controller (BACKEND-INTEGRATED VERSION)
- Coordinates Remote Brain (LLM via API)
- Calls SocialCart Backend APIs
- Handles context and memory
- PRODUCTION-READY: Backend-driven architecture
- CONSULTANT MODE: Merges AI Advice + Backend Data
"""

from typing import Dict, Any, Optional
import sys
import re
import random

# Fix Windows CP1252 terminal emoji crash — must be set before any print()
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass  # Python < 3.7 fallback

import requests
from requests.exceptions import RequestException, Timeout
import os
import json
import time
from urllib.parse import urlparse, urlunparse

# ------------------------------------
# PROJECT ROOT (LOCAL PATHS)
# ------------------------------------
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# ------------------------------------
# IMPORTS
# ------------------------------------
from contract import Intent
from resolver.context_resolver import resolve_context
from memory.session_memory import SessionMemory
from planner.simple_planner import create_plan


# ====================================
# CONFIG LOADING
# ====================================

def _load_runtime_config() -> Dict[str, Any]:
    config_path = os.getenv(
        "AI_CONFIG_PATH",
        os.path.join(PROJECT_ROOT, "config.json")
    )
    if not os.path.exists(config_path):
        return {}

    try:
        with open(config_path, "r", encoding="utf-8") as file:
            loaded = json.load(file)
            return loaded if isinstance(loaded, dict) else {}
    except Exception as error:
        print(f"⚠️ Failed to load config.json: {error}")
        return {}


RUNTIME_CONFIG = _load_runtime_config()
BRAIN_CFG = RUNTIME_CONFIG.get("brain", {}) if isinstance(RUNTIME_CONFIG, dict) else {}
BACKEND_CFG = RUNTIME_CONFIG.get("backend", {}) if isinstance(RUNTIME_CONFIG, dict) else {}

# ====================================
# ENV CONFIG
# ====================================

def _normalize_brain_api_url(url: str) -> str:
    value = (url or "").strip()
    if not value:
        return "http://localhost:8000/generate"

    parsed = urlparse(value)
    path = (parsed.path or "").rstrip("/")

    if path in {"", "/"}:
        path = "/generate"

    normalized = parsed._replace(path=path)
    return urlunparse(normalized)


def _derive_brain_health_url() -> str:
    configured = (os.getenv("BRAIN_HEALTH_URL") or "").strip()
    if configured:
        return configured

    parsed = urlparse(BRAIN_API_URL)
    return urlunparse(parsed._replace(path="/health"))


BRAIN_API_URL = _normalize_brain_api_url(
    os.getenv(
        "BRAIN_API_URL",
        BRAIN_CFG.get("api_url", "https://unseditious-gloria-soothfastly.ngrok-free.dev/generate")
    )
)

BACKEND_BASE_URL = os.getenv(
    "BACKEND_BASE_URL",
    BACKEND_CFG.get("base_url", "http://localhost:5002")
)

BRAIN_API_TIMEOUT = int(os.getenv("BRAIN_API_TIMEOUT", str(BRAIN_CFG.get("timeout_seconds", 60))))
BRAIN_API_RETRIES = int(os.getenv("BRAIN_API_RETRIES", str(BRAIN_CFG.get("retries", 2))))
AI_NAME = os.getenv("AI_NAME", "Ruhi")

print(f"🧠 Brain API: {BRAIN_API_URL}")
print(f"🔌 Backend API: {BACKEND_BASE_URL}")


def is_success_response(result: dict) -> bool:
    if not isinstance(result, dict):
        return False
    return bool(result.get("success") or result.get("ok") or ("error" not in result and not result.get("error")))


def _safe_product_id(product: dict) -> Optional[str]:
    if not isinstance(product, dict):
        return None
    return (
        product.get("_id")
        or product.get("id")
        or product.get("product_id")
    )


def _safe_product_name(product: dict) -> str:
    if not isinstance(product, dict):
        return ""
    return str(product.get("name") or "").strip()


def _extract_quantity_from_text(text: str) -> Optional[int]:
    if not text:
        return None
    q = text.lower().strip()
    match = re.search(r"\b(?:qty|quantity)\s*[:=]?\s*(\d{1,2})\b", q)
    if not match:
        match = re.search(r"\badd\s+(\d{1,2})\b", q)
    if not match:
        match = re.search(r"\b(\d{1,2})\s*(?:pcs|pieces|items?)\b", q)
    if not match:
        return None
    try:
        value = int(match.group(1))
        return max(1, min(value, 99))
    except Exception:
        return None


def _extract_cart_product_phrase(text: str) -> str:
    """Extract product phrase from natural cart commands like:
    - add bamboo bottle to cart
    - add "bamboo bottle" to car
    - put neem facewash in basket
    """
    if not text:
        return ""

    raw = text.strip()
    q = raw.lower()

    patterns = [
        r"(?:add|put)\s+(.+?)\s+(?:to|in(?:to)?)\s+(?:my\s+)?(?:cart|basket|car)\b",
        r"(?:add|put)\s+(.+?)\s*$",
    ]

    phrase = ""
    for pattern in patterns:
        m = re.search(pattern, q, flags=re.IGNORECASE)
        if m:
            phrase = m.group(1).strip()
            break

    # remove common filler words if phrase includes them
    phrase = re.sub(r"\b(?:the|a|an|this|that|please|now|product|item)\b", " ", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"\s+", " ", phrase).strip(' "\'')
    return phrase


def _find_best_product_match(products: list, phrase: str) -> Optional[dict]:
    if not isinstance(products, list) or not phrase:
        return None

    target = phrase.lower().strip()
    target_tokens = [t for t in re.split(r"[^a-z0-9]+", target) if t]
    if not target_tokens:
        return None

    best = None
    best_score = -1.0

    for product in products:
        if not isinstance(product, dict):
            continue
        name = _safe_product_name(product)
        if not name:
            continue

        name_l = name.lower()
        name_tokens = [t for t in re.split(r"[^a-z0-9]+", name_l) if t]
        if not name_tokens:
            continue

        # scoring: exact > substring > token overlap
        score = 0.0
        if name_l == target:
            score = 100.0
        elif target in name_l:
            score = 80.0
        elif name_l in target:
            score = 70.0
        else:
            overlap = len(set(target_tokens) & set(name_tokens))
            score = (overlap / max(len(set(target_tokens)), 1)) * 60.0

        if score > best_score:
            best_score = score
            best = product

    # avoid weak accidental matches
    if best_score < 30.0:
        return None
    return best


# ====================================
# BRAIN RESPONSE NORMALIZER
# ====================================

def _fallback_brain():
    return {
        "mode": "CHAT",
        "message": f"Sorry, {AI_NAME} brain response invalid."
    }


def _normalize_brain_response(raw_response: Any) -> dict:

    if not isinstance(raw_response, dict):
        return _fallback_brain()

    # Structured Agent Format
    if "mode" in raw_response:
        return raw_response

    # Plain LLM Format
    if "response" in raw_response:
        text = raw_response.get("response")

        # Try parsing JSON inside string
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict) and "mode" in parsed:
                return parsed
        except:
            pass

        return {
            "mode": "CHAT",
            "message": text
        }

    return _fallback_brain()


# ====================================
# BRAIN CALL
# ====================================

def call_brain(query: str) -> dict:
    # ── FAST PATH: local router handles navigation & simple pattern intents ──
    # These are deterministic — no need for an LLM call.
    # Run BEFORE the Mistral call to avoid the model's miscalibrated navigation.
    _FAST_PATH_WORDS = [
    # STRICT navigation only
        "open cart",
        "open profile",
        "open dashboard",
        "open messages",
        "open communities",
        "open explore",
        "go to cart",
        "go to profile",
        "go to dashboard",
        "go to messages",
]   
    q_lower = (query or "").strip().lower()
    if any(q_lower.startswith(kw) for kw in _FAST_PATH_WORDS):
        local = _local_fallback_decision(query)
        # Only fast-track if the router produced a real ACTION (not a vague CHAT)
        if local.get("mode") == "ACTION" and q_lower.startswith(("open", "go to", "navigate")):
            print(f"⚡ Fast-path router matched: {local}")
            return local
        # For CHAT responses in fast-path (greetings), also return immediately
        if local.get("mode") == "CHAT" and any(kw in q_lower for kw in ["hello", "hi", "hey", "help", "huru", "hu ru", "what can you"]):
            print(f"⚡ Fast-path greeting: {local.get('message', '')[:60]}")
            return local

    headers = {
        "Content-Type": "application/json",
        # ngrok free-tier returns an HTML interstitial unless this header is sent
        "ngrok-skip-browser-warning": "true",
    }

    print(f"🧠 Calling Brain API: {BRAIN_API_URL}")
    print(f"📤 Payload: {query[:100]}")

    attempt = 0
    while attempt <= BRAIN_API_RETRIES:
        response = None
        try:
            response = requests.post(
                BRAIN_API_URL,
                json={"query": query, "prompt": query},
                headers=headers,
                timeout=BRAIN_API_TIMEOUT
            )

            response.raise_for_status()

            normalized = _normalize_brain_response(response.json())
            print(f"✅ Brain Mode: {normalized.get('mode')}")
            return normalized

        except Timeout:
            print(f"⚠️ Brain timeout attempt {attempt+1}")
        except requests.exceptions.ConnectionError as error:
            print(f"⚠️ Brain connection error: {error}")
        except requests.exceptions.HTTPError as error:
            print(f"⚠️ Brain HTTP error: {error}")
            if response is not None and response.status_code < 500:
                break
        except Exception as error:
            print(f"❌ Brain API error: {error}")
            break

        attempt += 1
        time.sleep(2)

    print("⚠️ Brain unavailable after retries")
    return _local_fallback_decision(query)


def _local_fallback_decision(query: str) -> dict:
    q = (query or "").strip().lower()

    if not q:
        return {
            "mode": "CHAT",
            "message": f"Hi, I'm {AI_NAME}. How can I help you today?"
        }

    if any(token in q for token in ["dashboard", "my account", "account", "settings"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.NAVIGATE,
                "args": {"destination": "dashboard"},
                "tool": "navigation_tool",
                "consultation": "Opening your dashboard."
            }
        }

    if any(token in q for token in ["profile"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.NAVIGATE,
                "args": {"destination": "profile"},
                "tool": "navigation_tool",
                "consultation": "Opening your profile."
            }
        }

    if any(token in q for token in ["cart", "basket"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.NAVIGATE,
                "args": {"destination": "cart"},
                "tool": "navigation_tool",
                "consultation": "Opening your cart."
            }
        }

    if any(token in q for token in ["order", "orders", "track order"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.NAVIGATE,
                "args": {"destination": "orders"},
                "tool": "navigation_tool",
                "consultation": "Opening your orders page."
            }
        }

    if any(token in q for token in ["payment", "pay now", "checkout", "proceed to pay"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.NAVIGATE,
                "args": {"destination": "payment"},
                "tool": "navigation_tool",
                "consultation": "Taking you to payment."
            }
        }

    # Messages tab (direct message — NOT generic social)
    if any(token in q for token in ["messages", "dm", "direct message", "inbox"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.NAVIGATE,
                "args": {"destination": "messages"},
                "tool": "navigation_tool",
                "consultation": "Opening your messages."
            }
        }

    # DISCOVER_COMMUNITIES — fetch real data (must be before generic community nav)
    if any(token in q for token in [
        "discover communities", "find communities", "show communities",
        "list communities", "browse communities",
        "discover groups", "find groups", "show groups",
    ]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.DISCOVER_COMMUNITIES,
                "args": {"page": 1, "limit": 12},
                "tool": "discover_communities",
                "consultation": "Discovering eco communities for you!"
            }
        }

    # Communities tab (navigation only)
    if any(token in q for token in ["community", "communities", "group", "groups"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.NAVIGATE,
                "args": {"destination": "communities"},
                "tool": "navigation_tool",
                "consultation": "Opening communities."
            }
        }

    # Explore tab
    if any(token in q for token in ["explore", "discover"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.NAVIGATE,
                "args": {"destination": "explore"},
                "tool": "navigation_tool",
                "consultation": "Opening explore feed."
            }
        }

    # Generic social navigation (explicit nav-verb only)
    if any(token in q for token in ["open social", "go to social"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.NAVIGATE,
                "args": {"destination": "social"},
                "tool": "navigation_tool",
                "consultation": "Opening social section."
            }
        }

    # ── SOCIAL ACTIONS (work via BackendAPI even when brain is offline) ──

    # READ_FEED — load actual post data from Atlas
    if any(token in q for token in [
        "read feed", "show feed", "load feed", "show my feed",
        "read my feed", "open feed", "go to feed", "see feed",
        "my feed", "show posts", "load posts", "open social feed",
    ]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.READ_FEED,
                "args": {"page": 1, "limit": 10},
                "tool": "read_feed",
                "consultation": "Loading your social feed..."
            }
        }

    # LIKE_POST — uses last_post_id from SessionMemory (say 'read feed' first)
    if any(token in q for token in [
        "like this post", "like the post", "like that post",
        "like it", "like this", "like last post",
    ]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.LIKE_POST,
                "args": {},
                "tool": "like_post",
                "consultation": "Liking the post!"
            }
        }

    # SEND_MESSAGE — extract content after 'saying' keyword if present
    if any(token in q for token in ["send message", "send a message", "message to"]):
        text = ""
        if "saying" in q:
            text = q.split("saying", 1)[1].strip()
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.SEND_MESSAGE,
                "args": {"text": text},
                "tool": "send_message",
                "consultation": "Sending your message..."
            }
        }

    # VIEW_PROFILE — show profile page
    if any(token in q for token in ["view profile", "show profile", "my profile", "open profile"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.VIEW_PROFILE,
                "args": {},
                "tool": "view_profile",
                "consultation": "Opening your profile!"
            }
        }

    # JOIN_COMMUNITY — join current/mentioned group
    if any(token in q for token in ["join community", "join group", "join this group", "join this community"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.JOIN_COMMUNITY,
                "args": {},
                "tool": "join_community",
                "consultation": "Joining the community!"
            }
        }

    # CREATE_POST — extract content text and create immediately via BackendAPI
    _POST_TRIGGERS = [
        "create a post", "create post", "write a post",
        "post a message", "post saying", "share a post",
        "publish a post", "make a post",
    ]
    if any(trigger in q for trigger in _POST_TRIGGERS) or q.startswith("post "):
        _STRIP_PREFIXES = [
            "create a post saying ", "create a post ",
            "write a post saying ", "write a post ",
            "post a message saying ", "post a message ",
            "post saying ", "share a post saying ", "share a post ",
            "publish a post saying ", "publish a post ",
            "make a post saying ", "make a post ",
            "post ",
        ]
        raw_q = query.strip()
        text = raw_q
        for prefix in _STRIP_PREFIXES:
            if raw_q.lower().startswith(prefix):
                text = raw_q[len(prefix):].strip()
                break
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.CREATE_POST,
                "args": {"content": text, "text": text, "post_type": "regular"},
                "tool": "create_post",
                "consultation": "Creating your post!" if text else "Opening post composer..."
            }
        }

    if any(token in q for token in ["eco score", "eco-score", "ecoscor", "green point", "planet rank", "my score", "eco stat", "my point"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.GET_ECO_STATS,
                "args": {},
                "tool": "eco_stats",
                "consultation": "Your eco score measures all your planet-saving actions!"
            }
        }

    if any(token in q for token in ["leaderboard", "top eco", "eco champion", "eco warrior"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.GET_LEADERBOARD,
                "args": {"limit": 10},
                "tool": "leaderboard",
                "consultation": "Check out our top planet guardians!"
            }
        }

    # Navigation should win over search when user explicitly asks to open/go to a page.
    _nav_verbs = ["go to", "open", "navigate", "take me to", "show me"]
    _nav_targets = {
        "products": "products",
        "product": "products",
        "shop": "products",
        "social": "social",
        "feed": "social",
        "account": "dashboard",
        "dashboard": "dashboard",
        "profile": "profile",
        "cart": "cart",
        "basket": "cart",
        "orders": "orders",
        "payment": "payment",
        "checkout": "payment",
        "messages": "messages",
        "communities": "communities",
        "explore": "explore",
        "home": "home",
    }
    if any(v in q for v in _nav_verbs):
        for token, destination in _nav_targets.items():
            if token in q:
                return {
                    "mode": "ACTION",
                    "decision": {
                        "intent": Intent.NAVIGATE,
                        "args": {"destination": destination},
                        "tool": "navigation_tool",
                        "consultation": f"Navigating to {destination}."
                    }
                }

    if any(token in q for token in ["product", "products", "shop", "search", "find", "eco", "eco-friendly"]):
        # Extract a real search keyword — strip UI/nav filler words so "show products"
        # doesn't get passed as the backend text-search, which would return 0 results.
        _FILLER = {
            "show", "me", "find", "search", "for", "get", "open", "browse",
            "display", "list", "all", "some", "eco", "eco-friendly", "ecofriendly",
            "sustainable", "green", "product", "products", "shop", "item", "items",
            "please", "can", "you", "i", "want", "need", "a", "an", "the",
        }
        keywords = [w for w in q.split() if w not in _FILLER]
        extracted_query = " ".join(keywords).strip()
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.SEARCH_PRODUCT,
                "args": {"query": extracted_query, "limit": 10},
                "tool": "search_products",
                "consultation": "Let me find matching products for you."
            }
        }

    if any(token in q for token in ["home", "main page"]):
        return {
            "mode": "ACTION",
            "decision": {
                "intent": Intent.NAVIGATE,
                "args": {"destination": "home"},
                "tool": "navigation_tool",
                "consultation": "Taking you to home."
            }
        }

    # ── Greeting / help ──
    if any(token in q for token in ["hello", "hi", "hey", "huru", "hu ru", "hola", "help", "what can you do"]):
        return {
            "mode": "CHAT",
            "message": (
                f"Hi! I'm {AI_NAME}, your Eco-Consultant 🌍. I can help you:\n"
                "• Browse or search eco-friendly products\n"
                "• Manage your cart and orders\n"
                "• Check your Eco Score & Leaderboard\n"
                "• Log green deeds\n"
                "• Navigate to any page\n"
                "Just ask me anything!"
            )
        }

    fallback_messages = [
    "I didn't quite understand that. You can ask me to search eco-friendly products, create posts, or check your eco score.",
    
    "Sorry, I couldn't understand your request. Try something like 'show eco products' or 'open social feed'.",
    
    "I'm not sure what you mean. I can help with products, orders, communities, or eco stats.",
    
    "That request wasn't clear to me. You can ask me to browse products, create a post, or check the leaderboard."
    ]

    return {
        "mode": "CHAT",
        "message": random.choice(fallback_messages)
    }

# ====================================
# BACKEND API CLIENT (UNCHANGED)
# ====================================

class BackendAPI:
    def __init__(self, base_url: str = BACKEND_BASE_URL):
        self.base_url = base_url.rstrip('/')

    def ping(self) -> dict:
        endpoints = ["/api/health", "/health", "/"]

        for endpoint in endpoints:
            url = f"{self.base_url}{endpoint}"
            try:
                response = requests.get(url, timeout=5)
                if response.status_code < 500:
                    return {
                        "connected": True,
                        "endpoint": endpoint,
                        "status_code": response.status_code,
                        "base_url": self.base_url,
                    }
            except Exception:
                continue

        return {"connected": False}

    def _make_request(self, method, endpoint, token=None, json_data=None, params=None):
        url = f"{self.base_url}{endpoint}"
        headers = {}

        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            r = requests.request(
                method,
                url,
                headers=headers,
                json=json_data,
                params=params,
                timeout=30
            )
            r.raise_for_status()
            result = r.json()

            if isinstance(result, dict):
                if "success" not in result and "error" not in result:
                    result = {"success": True, **result}
                return result

            return {"success": False, "error": "Invalid response format"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_products(self, limit: Optional[int] = None, search: Optional[str] = None,
                     category: Optional[str] = None, min_rating: Optional[float] = None,
                     eco_only: bool = False, eco_tags: Optional[str] = None) -> dict:
        params = {}
        if limit:
            params["limit"] = limit
        if search and search.strip():
            params["search"] = search.strip()
        if category and category.strip():
            params["category"] = category.strip()
        if min_rating is not None and min_rating >= 1:
            params["minRating"] = min_rating
        if eco_only:
            params["ecoOnly"] = "true"
        if eco_tags and eco_tags.strip():
            params["ecoTags"] = eco_tags.strip()
        return self._make_request("GET", "/api/products", params=params)

    def add_to_cart(self, token: str, product_id: str, quantity: int = 1) -> dict:
        return self._make_request(
            "POST",
            "/api/cart/add",
            token=token,
            json_data={"productId": product_id, "quantity": quantity}
        )

    def get_cart(self, token: str) -> dict:
        return self._make_request("GET", "/api/cart", token=token)

    def remove_from_cart(self, token: str, item_id: str) -> dict:
        return self._make_request("DELETE", f"/api/cart/{item_id}", token=token)

    def checkout(self, token: str) -> dict:
        return self._make_request("POST", "/api/orders/checkout", token=token)

    def get_orders(self, token: str) -> dict:
        return self._make_request("GET", "/api/orders", token=token)

    def track_order(self, token: str, order_id: str) -> dict:
        return self._make_request("GET", f"/api/orders/{order_id}/track", token=token)

    def cancel_order(self, token: str, order_id: str) -> dict:
        return self._make_request("PATCH", f"/api/orders/{order_id}/cancel", token=token)

    def get_order_by_id(self, token: str, order_id: str) -> dict:
        return self._make_request("GET", f"/api/orders/{order_id}", token=token)

    def create_post(self, token: str, text: str, image: Optional[str] = None,
                    product_id: Optional[str] = None, post_type: str = "regular",
                    eco_category: Optional[str] = None,
                    deed_description: Optional[str] = None,
                    linked_deed_id: Optional[str] = None) -> dict:
        payload = {"text": text, "postType": post_type}
        if image:
            payload["image"] = image
        if product_id:
            payload["productId"] = product_id
        if post_type == "eco_deed" and eco_category:
            payload["ecoCategory"] = eco_category
        if deed_description:
            payload["deedDescription"] = deed_description
        if linked_deed_id:
            payload["linkedDeedId"] = linked_deed_id
        return self._make_request("POST", "/api/posts", token=token, json_data=payload)

    def get_feed(self, token: str, page: int = 1, limit: int = 10) -> dict:
        return self._make_request(
            "GET",
            "/api/posts",
            token=token,
            params={"page": page, "limit": limit}
        )

    def like_post(self, token: str, post_id: str) -> dict:
        return self._make_request("PUT", f"/api/posts/{post_id}/like", token=token)

    def get_groups(self, token: str, page: int = 1, limit: int = 12) -> dict:
        return self._make_request(
            "GET",
            "/api/groups",
            token=token,
            params={"page": page, "limit": limit}
        )

    def join_group(self, token: str, group_id: str) -> dict:
        return self._make_request("POST", f"/api/groups/{group_id}/join", token=token)

    def send_message(self, token: str, receiver_id: str, text: str) -> dict:
        return self._make_request(
            "POST",
            "/api/messages/send",
            token=token,
            json_data={"receiverId": receiver_id, "text": text}
        )

    def get_profile(self, token: str) -> dict:
        return self._make_request("GET", "/api/user/me", token=token)

    def get_user_profile(self, token: str, user_id: str) -> dict:
        """GET /api/user/:userId — fetch any user's public profile"""
        return self._make_request("GET", f"/api/user/{user_id}", token=token)

    def get_leaderboard(self, token: str, limit: int = 10) -> dict:
        """GET /api/user/leaderboard — top eco champions"""
        return self._make_request("GET", "/api/user/leaderboard", token=token, params={"limit": limit})

    def get_eco_stats(self, token: str) -> dict:
        """GET /api/user/eco-stats — returns ecoScore, greenPoints, planetRank, deed counts"""
        return self._make_request("GET", "/api/user/eco-stats", token=token)

    def log_eco_deed(self, token: str, category: str, description: str,
                     proof_image: Optional[str] = None, post_id: Optional[str] = None) -> dict:
        """POST /api/user/deed — log an eco deed and earn green points + eco score"""
        return self._make_request(
            "POST",
            "/api/user/deed",
            token=token,
            json_data={
                "category": category,
                "description": description,
                "proofImage": proof_image,
                "postId": post_id,
            }
        )


# ====================================
# AGENT CONTROLLER
# ====================================

class AgentController:

    def __init__(self, backend_url: str = BACKEND_BASE_URL):
        self.backend = BackendAPI(backend_url)
        self.backend_connection = self.verify_backend_connection()
        self.verify_brain_connection()

    def verify_backend_connection(self):
        status = self.backend.ping()
        if status.get("connected"):
            print("✅ Backend connected")
        else:
            print("⚠️ Backend not reachable")
        return status

    def verify_brain_connection(self):
        health_url = _derive_brain_health_url()
        try:
            r = requests.get(
                health_url,
                timeout=5,
                headers={"ngrok-skip-browser-warning": "true"},
            )
            if r.status_code == 200:
                print("Brain connected successfully.")
            else:
                print(f"Brain health check returned {r.status_code}")
        except Exception as e:
            print(f"Brain not reachable: {e}")

    # ⚡ YOUR EXISTING handle_query FUNCTION REMAINS SAME BELOW
    def handle_query(self, user_query: str, user_id: str = "user_1", 
                    auth_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Main query handler - coordinates AI and backend
        
        Args:
            user_query: User input text
            user_id: User identifier
            auth_token: JWT token for authenticated requests
            
        Returns:
            Normalized response dict
        """

        # =====================================
        # STEP 0: INITIALIZE MEMORY (NEW)
        # =====================================
        SessionMemory.get(user_id)  # Initialize user memory if not exists
        print(f"💾 Session initialized for user: {user_id}")

        # =====================================
        # STEP 1: CONTEXT & HISTORY
        # =====================================
        history = SessionMemory.get_chat_history(user_id)
        memory_snapshot = SessionMemory.get(user_id)
        current_product = memory_snapshot.get("last_opened_product")

        # =====================================
        # STEP 2: BRAIN DECISION (REMOTE API CALL)
        # =====================================
        brain_result = call_brain(user_query)
        print(f"🧠 Brain Result Mode: {brain_result.get('mode')}")
        
        # Validate brain response format
        if not isinstance(brain_result, dict):
            print("⚠️ Invalid brain response format, using fallback")
            brain_result = {
                "mode": "ACTION",
                "decision": {
                    "intent": "UNKNOWN",
                    "args": {},
                    "tool": "",
                    "consultation": ""
                }
            }
        
        # -------------------------------
        # CHAT MODE
        # -------------------------------
        if brain_result.get("mode") == "CHAT":
            ai_message = brain_result.get("message", f"Hi, I'm {AI_NAME}. I can help with products, orders, and social features.")
            SessionMemory.add_chat_history(user_id, user_query, ai_message)
            return {
                "type": "CHAT",
                "intent": "CHAT",
                "message": ai_message,
                "data": None
            }

        # -------------------------------
        # ACTION MODE
        # -------------------------------
        decision = brain_result.get("decision", {})
        intent = decision.get("intent", Intent.UNKNOWN)
        args = decision.get("args", {})
        consultation_msg = decision.get("consultation", "")

        # =====================================
        # STEP 3: CONTEXT RESOLUTION
        # =====================================
        args = resolve_context(user_id, intent, args)

        # =====================================
        # STEP 3.5: PLANNER — multi-step awareness
        # =====================================
        exec_plan = create_plan(intent, args)
        print(f"📋 Plan [{intent}]: {[step[0] for step in exec_plan]}")
        is_multistep = len(exec_plan) > 1

        # =====================================
        # STEP 4: EXECUTE INTENT → BACKEND API
        # =====================================
        
        try:
            # ========== E-COMMERCE INTENTS ==========
            
            if intent == Intent.SEARCH_PRODUCT:
                query = args.get("query", "").strip()
                limit = args.get("limit", 10)
                category = args.get("category", "")
                min_rating = args.get("min_rating") or args.get("minRating")
                eco_only = bool(args.get("eco_only") or args.get("ecoOnly"))
                eco_tags = args.get("eco_tags") or args.get("ecoTags", "")

                print(f"🔍 Product Search - query: '{query}', limit: {limit}, category: '{category}', "
                      f"minRating: {min_rating}, ecoOnly: {eco_only}, ecoTags: '{eco_tags}'")

                result = self.backend.get_products(
                    limit=limit,
                    search=query or None,
                    category=category or None,
                    min_rating=float(min_rating) if min_rating else None,
                    eco_only=eco_only,
                    eco_tags=eco_tags or None,
                )

                if is_success_response(result) or result.get("products"):
                    products = result.get("products", result.get("data", []))
                    SessionMemory.update(user_id, "last_products", products)

                    found_msg = f"Found {len(products)} eco-friendly products"
                    if query:
                        found_msg += f" for '{query}'"
                    found_msg += "!"

                    return {
                        "type": "SUCCESS",
                        "intent": intent,
                            "action": "SEARCH_PRODUCTS",
                            "payload": {"query": query},
                        "data": {"products": products, "count": len(products), "query": query},
                        "message": consultation_msg or found_msg
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to search products: {result.get('error') or result.get('message')}",
                        "data": None
                    }

            elif intent == Intent.RECOMMEND:
                # Recommendations: use query keyword if brain provided one
                rec_query = args.get("query", "").strip()
                result = self.backend.get_products(limit=5, search=rec_query or None, eco_only=True)
                
                if is_success_response(result) or result.get("products"):
                    products = result.get("products", result.get("data", []))
                    SessionMemory.update(user_id, "last_products", products)
                    
                    return {
                        "type": "SUCCESS",
                        "intent": intent,
                        "data": {"products": products},
                        "message": consultation_msg or "Here are some sustainable recommendations!"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to get recommendations: {result.get('error') or result.get('message')}",
                        "data": None
                    }
            
            elif intent == Intent.ADD_TO_CART:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required to add to cart",
                        "data": None
                    }
                
                product_id = args.get("product_id")
                quantity = args.get("quantity", 1)

                # Try to extract quantity from natural language if brain didn't provide one.
                parsed_qty = _extract_quantity_from_text(user_query)
                if parsed_qty and (not args.get("quantity") or int(args.get("quantity", 0)) <= 1):
                    quantity = parsed_qty

                # If user names a product, resolve it from currently visible list first.
                # This is prioritized over generic fallback product ids.
                last_products = memory_snapshot.get("last_products", [])
                requested_phrase = (
                    str(args.get("query") or "").strip()
                    or str(args.get("product_name") or "").strip()
                    or _extract_cart_product_phrase(user_query)
                )

                if requested_phrase and isinstance(last_products, list) and last_products:
                    matched_product = _find_best_product_match(last_products, requested_phrase)
                    if matched_product:
                        matched_id = _safe_product_id(matched_product)
                        if matched_id:
                            product_id = matched_id
                            print(f"📦 ADD_TO_CART name-match: '{requested_phrase}' -> {matched_id} ({_safe_product_name(matched_product)})")
                
                # 1st priority: explicit product_id from brain
                # 2nd priority: last explicitly opened product
                if not product_id and current_product:
                    product_id = _safe_product_id(current_product)

                # FIX: 3rd priority — fallback to first product from last search if nothing else is available
                # This makes "add this to cart" work right after a product search
                if not product_id:
                    if last_products and isinstance(last_products, list) and len(last_products) > 0:
                        first_product = last_products[0]
                        if isinstance(first_product, dict):
                            product_id = _safe_product_id(first_product)
                            quantity = args.get("quantity", 1)
                            print(f"📦 ADD_TO_CART fallback: using first product from last_products: {product_id}")
                
                if not product_id:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "No product selected. Please specify which product to add or search for one first.",
                        "data": None
                    }
                
                result = self.backend.add_to_cart(auth_token, product_id, quantity)
                
                if is_success_response(result) or result.get("items"):
                    SessionMemory.update(user_id, "last_cart_action", "ADD")
                    return {
                        "type": "SUCCESS",
                        "intent": intent,
                            "action": "ADD_TO_CART",
                            "payload": {
                                "productId": product_id,
                                "quantity": quantity
                            },
                            "data": result,
                        "message": consultation_msg or result.get("message", "✅ Added to cart!")
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to add to cart: {result.get('error') or result.get('message')}",
                        "data": None
                    }
            
            elif intent == Intent.REMOVE_FROM_CART:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required",
                        "data": None
                    }
                
                item_id = args.get("item_id")

                # Compatibility fallback: resolve item_id from product_id/context
                if not item_id:
                    product_id = args.get("product_id")
                    cart_result = self.backend.get_cart(auth_token)
                    if cart_result.get("success"):
                        cart_items = cart_result.get("items", [])

                        def _item_product_id(cart_item: dict) -> Optional[str]:
                            raw_product = cart_item.get("productId")
                            if isinstance(raw_product, dict):
                                return raw_product.get("_id") or raw_product.get("id")
                            return raw_product

                        if product_id:
                            matched = next(
                                (cart_item for cart_item in cart_items if str(_item_product_id(cart_item)) == str(product_id)),
                                None
                            )
                            if matched:
                                item_id = matched.get("_id") or matched.get("id")
                        elif len(cart_items) == 1:
                            single_item = cart_items[0]
                            item_id = single_item.get("_id") or single_item.get("id")

                if not item_id:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Item ID required to remove from cart",
                        "data": None
                    }
                
                result = self.backend.remove_from_cart(auth_token, item_id)
                
                if result.get("success"):
                    return {
                        "type": "SUCCESS",
                        "intent": intent,
                        "data": result,
                        "message": result.get("message", "Removed from cart")
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to remove: {result.get('error')}",
                        "data": None
                    }
            
            elif intent == Intent.OPEN_CART:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required",
                        "data": None
                    }
                
                result = self.backend.get_cart(auth_token)
                
                if result.get("success"):
                    normalized_cart = {
                        "items": result.get("items", []),
                        "total_items": len(result.get("items", []))
                    }
                    return {
                        "type": "NAVIGATION",
                        "intent": intent,
                        "data": normalized_cart,
                        "message": "Opening your cart"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to open cart: {result.get('error')}",
                        "data": None
                    }
            
            elif intent == Intent.PLACE_ORDER:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required",
                        "data": None
                    }

                # ── Multi-step plan: verify cart before checkout ──
                if is_multistep:
                    print(f"🔀 Running multi-step PLACE_ORDER plan: {[s[0] for s in exec_plan]}")
                    cart_check = self.backend.get_cart(auth_token)
                    cart_items = cart_check.get("items", [])
                    if not cart_items:
                        return {
                            "type": "ERROR",
                            "intent": intent,
                            "message": "Your cart is empty. Please find and add products first — say 'show me eco-friendly products' to browse!",
                            "data": None
                        }
                    print(f"✅ Cart has {len(cart_items)} item(s) — proceeding to checkout")

                result = self.backend.checkout(auth_token)
                
                if result.get("success"):
                    order = result.get("order", {})
                    order_id = result.get("orderId") or order.get("_id")

                    if not order and order_id:
                        order_result = self.backend.get_order_by_id(auth_token, order_id)
                        if order_result.get("success"):
                            order = order_result.get("order", {})

                    if not order and order_id:
                        order = {"_id": order_id}

                    return {
                        "type": "SUCCESS",
                        "intent": intent,
                        "data": order,
                        "message": consultation_msg or f"Order placed successfully! Order ID: {order.get('_id')}"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to place order: {result.get('message') or result.get('error')}",
                        "data": None
                    }
            
            elif intent == Intent.TRACK_ORDER:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required",
                        "data": None
                    }
                
                order_id = args.get("order_id")
                if not order_id:
                    # Get latest order
                    orders_result = self.backend.get_orders(auth_token)
                    if orders_result.get("success") and orders_result.get("orders"):
                        order_id = orders_result["orders"][0].get("_id")
                
                if not order_id:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "No orders found to track",
                        "data": None
                    }
                
                result = self.backend.track_order(auth_token, order_id)
                
                if result.get("success"):
                    order = result.get("order", {})
                    status = order.get("status", "UNKNOWN")
                    return {
                        "type": "SUCCESS",
                        "intent": intent,
                        "data": order,
                        "message": f"🚚 Your order is: {status}"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to track order: {result.get('error')}",
                        "data": None
                    }
            
            elif intent == Intent.CANCEL_ORDER:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required",
                        "data": None
                    }
                
                order_id = args.get("order_id")
                if not order_id:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Order ID required to cancel",
                        "data": None
                    }
                
                result = self.backend.cancel_order(auth_token, order_id)
                
                if result.get("success"):
                    return {
                        "type": "SUCCESS",
                        "intent": intent,
                        "data": result,
                        "message": "✅ Order cancelled successfully. Refund initiated."
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to cancel order: {result.get('message')}",
                        "data": None
                    }
            
            # ========== SOCIAL MEDIA INTENTS ==========
            
            elif intent == Intent.CREATE_POST:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required to create posts",
                        "data": None
                    }

                text = args.get("content") or args.get("text", "")
                image = args.get("image")
                product_id = args.get("product_id")
                post_type = args.get("post_type", "regular")
                eco_category = args.get("eco_category") or args.get("ecoCategory")
                deed_description = args.get("deed_description") or args.get("deedDescription")
                linked_deed_id = args.get("linked_deed_id") or args.get("linkedDeedId")

                if not text:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Post content cannot be empty",
                        "data": None
                    }

                result = self.backend.create_post(
                    auth_token, text, image, product_id,
                    post_type=post_type,
                    eco_category=eco_category,
                    deed_description=deed_description,
                    linked_deed_id=linked_deed_id,
                )

                # Robust response validation
                if is_success_response(result) or result.get("post"):
                    post = result.get("post") or result
                    is_deed = post.get("postType") == "eco_deed" if isinstance(post, dict) else False
                    return {
                        "type": "SOCIAL_ACTION",
                        "intent": intent,
                        "data": post,
                        "message": consultation_msg or (
                            f"🌿 Eco deed post shared ({eco_category})! Your green action is inspiring!" if is_deed
                            else "✨ Post created successfully!"
                        )
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to create post: {result.get('error') or result.get('message') or 'Unknown error'}",
                        "data": None
                    }
            
            elif intent == Intent.READ_FEED:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required to view feed",
                        "data": None
                    }
                
                page = args.get("page", 1)
                limit = args.get("limit", 10)
                
                result = self.backend.get_feed(auth_token, page, limit)
                
                # Robust validation
                if is_success_response(result) or result.get("posts"):
                    posts = result.get("posts", [])

                    # FIX: Store the first post_id in session memory so that
                    # "like this post" works immediately after "read my feed"
                    if posts and isinstance(posts, list) and len(posts) > 0:
                        first_post = posts[0]
                        if isinstance(first_post, dict):
                            first_post_id = first_post.get("_id") or first_post.get("id")
                            if first_post_id:
                                SessionMemory.update(user_id, "last_post_id", str(first_post_id))
                                SessionMemory.update(user_id, "last_feed_posts", posts)
                                print(f"📍 Stored last_post_id in memory: {first_post_id}")

                    return {
                        "type": "SOCIAL_FEED",
                        "intent": intent,
                        "data": result,
                        "message": consultation_msg or f"📱 Loaded {len(posts)} posts!"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to load feed: {result.get('error') or result.get('message')}",
                        "data": None
                    }
            
            elif intent == Intent.LIKE_POST:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required to like posts",
                        "data": None
                    }
                
                post_id = args.get("post_id")

                # FIX: If brain didn't provide post_id, fall back to the most recently
                # loaded post from the feed (stored during READ_FEED).
                # This makes "like this post" work naturally after "read my feed".
                if not post_id:
                    post_id = memory_snapshot.get("last_post_id")
                    if post_id:
                        print(f"👍 LIKE_POST: using last_post_id from session memory: {post_id}")

                if not post_id:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "No post selected. Try saying 'read my feed' first, then 'like this post'.",
                        "data": None
                    }
                
                result = self.backend.like_post(auth_token, post_id)
                
                if is_success_response(result) or result.get("action"):
                    action = result.get("action", "liked")
                    return {
                        "type": "SOCIAL_ACTION",
                        "intent": intent,
                        "data": result,
                        "message": f"👍 Post {action}!"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to like post: {result.get('error') or result.get('message')}",
                        "data": None
                    }
            
            elif intent == Intent.DISCOVER_COMMUNITIES:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required to discover communities",
                        "data": None
                    }
                
                page = args.get("page", 1)
                limit = args.get("limit", 12)
                
                result = self.backend.get_groups(auth_token, page, limit)
                
                if is_success_response(result) or result.get("groups"):
                    groups = result.get("groups", [])
                    return {
                        "type": "SOCIAL_DISCOVERY",
                        "intent": intent,
                        "data": result,
                        "message": consultation_msg or f"🌍 Found {len(groups)} communities!"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to discover communities: {result.get('error') or result.get('message')}",
                        "data": None
                    }
            
            elif intent == Intent.JOIN_COMMUNITY:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required to join communities",
                        "data": None
                    }
                
                group_id = args.get("community_id") or args.get("group_id")
                if not group_id:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Community ID is required to join",
                        "data": None
                    }
                
                result = self.backend.join_group(auth_token, group_id)
                
                if is_success_response(result):
                    return {
                        "type": "SOCIAL_ACTION",
                        "intent": intent,
                        "data": result,
                        "message": consultation_msg or "🎉 Joined community successfully!"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to join community: {result.get('message') or result.get('error')}",
                        "data": None
                    }
            
            elif intent == Intent.SEND_MESSAGE:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required to send messages",
                        "data": None
                    }
                
                receiver_id = args.get("receiver_id") or args.get("user_id")
                text = args.get("text") or args.get("message", "")
                
                if not receiver_id or not text:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Receiver ID and message text are both required",
                        "data": None
                    }
                
                result = self.backend.send_message(auth_token, receiver_id, text)
                
                if is_success_response(result) or result.get("id"):
                    return {
                        "type": "SOCIAL_ACTION",
                        "intent": intent,
                        "data": result,
                        "message": "💬 Message sent successfully!"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to send message: {result.get('error') or result.get('message')}",
                        "data": None
                    }

            # ========== GAMIFICATION INTENT ==========

            elif intent == Intent.SUBMIT_DEED:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required to log an eco deed",
                        "data": None
                    }

                category = args.get("category", "Other")
                description = args.get("description") or args.get("text", "")
                proof_image = args.get("proof_image") or args.get("proofImage")
                post_id = args.get("post_id") or args.get("postId")

                if not description:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Please describe the good deed you performed.",
                        "data": None
                    }

                result = self.backend.log_eco_deed(
                    auth_token, category, description, proof_image, post_id
                )

                if is_success_response(result) or result.get("deed"):
                    deed_data = result.get("deed")
                    linked_deed_id = str(deed_data.get("_id")) if deed_data and deed_data.get("_id") else None

                    # Auto-create an eco deed social post so deed appears in the community feed
                    if auth_token and linked_deed_id:
                        try:
                            post_text = f"🌿 [{category}] {description}"
                            self.backend.create_post(
                                auth_token,
                                text=post_text,
                                post_type="eco_deed",
                                eco_category=category,
                                deed_description=description,
                                linked_deed_id=linked_deed_id,
                            )
                            print(f"🌱 Eco deed post auto-created for deed {linked_deed_id}")
                        except Exception as post_err:
                            print(f"⚠️ Could not auto-create deed post: {post_err}")

                    return {
                        "type": "ECO_DEED",
                        "intent": intent,
                        "data": {
                            "deed": deed_data,
                            "ecoScore": result.get("ecoScore"),
                            "greenPoints": result.get("greenPoints"),
                            "planetRank": result.get("planetRank"),
                        },
                        "message": result.get("message") or consultation_msg or "🌿 Eco deed logged! Keep saving the planet!"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to log deed: {result.get('message') or result.get('error')}",
                        "data": None
                    }
            
            elif intent == Intent.VIEW_PROFILE:
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Authentication required to view profile",
                        "data": None
                    }

                # Brain may supply a target user id (viewing someone else's profile)
                target_user_id = (
                    args.get("profile_user_id")
                    or args.get("user_id")
                    or args.get("userId")
                )

                if target_user_id and target_user_id != user_id:
                    result = self.backend.get_user_profile(auth_token, target_user_id)
                else:
                    result = self.backend.get_profile(auth_token)

                if is_success_response(result) or result.get("user"):
                    profile = result.get("user") or result
                    return {
                        "type": "SOCIAL_PROFILE",
                        "intent": intent,
                        "data": profile,
                        "message": f"👤 {profile.get('fullName', 'Profile')} loaded!"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Failed to load profile: {result.get('error') or result.get('message')}",
                        "data": None
                    }
            
            # ========== NAVIGATION INTENTS ==========
            
            elif intent == Intent.INIT_PAYMENT:
                # INIT_PAYMENT is primarily a frontend navigation action.
                # The actual payment is handled by paymentRoutes on the backend;
                # Ruhi just directs the user to the payment page after confirming cart.
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Please log in before proceeding to payment.",
                        "data": None
                    }

                # Verify the cart is not empty before sending user to payment
                cart_check = self.backend.get_cart(auth_token)
                cart_items = cart_check.get("items", [])
                if not cart_items:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Your cart is empty. Add some eco-friendly products first!",
                        "data": None
                    }

                return {
                    "type": "NAVIGATION",
                    "intent": intent,
                    "action": "NAVIGATE_PAYMENT",
                    "data": {
                        "method": args.get("method", "UPI"),
                        "cartItemCount": len(cart_items)
                    },
                    "message": consultation_msg or f"🛒 Taking you to payment! You have {len(cart_items)} item(s) in your cart."
                }

            elif intent == Intent.OPEN_PRODUCT:
                # Frontend-only action, use memory
                product_id = args.get("product_id")
                
                if product_id:
                    return {
                        "type": "NAVIGATION",
                        "intent": intent,
                        "action": "NAVIGATE_PRODUCT_DETAIL",
                        "data": {"product_id": product_id},
                        "message": "Opening product..."
                    }
                elif current_product:
                    pid = current_product.get("_id") or current_product.get("id")
                    return {
                        "type": "NAVIGATION",
                        "intent": intent,
                        "action": "NAVIGATE_PRODUCT_DETAIL",
                        "data": current_product,
                        "message": f"Opening {current_product.get('name', 'product')}..."
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "No product selected",
                        "data": None
                    }
            
            elif intent == Intent.NAVIGATE:
                destination = args.get("destination", "home")
                _action_map = {
                    "home":          "NAVIGATE_HOME",
                    "social":        "NAVIGATE_SOCIAL",
                    "feed":          "NAVIGATE_SOCIAL",
                    "products":      "NAVIGATE_PRODUCTS",
                    "shop":          "NAVIGATE_PRODUCTS",
                    "cart":          "NAVIGATE_CART",
                    "basket":        "NAVIGATE_CART",
                    "orders":        "NAVIGATE_ORDERS",
                    "order":         "NAVIGATE_ORDERS",
                    "dashboard":     "NAVIGATE_ACCOUNT",
                    "account":       "NAVIGATE_ACCOUNT",
                    "settings":      "NAVIGATE_ACCOUNT",
                    "address":       "NAVIGATE_ACCOUNT",
                    "addresses":     "NAVIGATE_ACCOUNT",
                    "profile":       "NAVIGATE_PROFILE",
                    "payment":       "NAVIGATE_PAYMENT",
                    "pay":           "NAVIGATE_PAYMENT",
                    "checkout":      "NAVIGATE_PAYMENT",
                    "messages":      "NAVIGATE_MESSAGES",
                    "message":       "NAVIGATE_MESSAGES",
                    "inbox":         "NAVIGATE_MESSAGES",
                    "dm":            "NAVIGATE_MESSAGES",
                    "communities":   "NAVIGATE_COMMUNITIES",
                    "community":     "NAVIGATE_COMMUNITIES",
                    "groups":        "NAVIGATE_COMMUNITIES",
                    "explore":       "NAVIGATE_EXPLORE",
                    "discover":      "NAVIGATE_EXPLORE",
                }
                nav_action = _action_map.get(destination.lower(), "NAVIGATE_HOME")
                return {
                    "type": "NAVIGATION",
                    "action": nav_action,
                    "intent": intent,
                    "data": {"destination": destination},
                    "message": f"Navigating to {destination}..."
                }

            elif intent == Intent.GET_LEADERBOARD:
                limit = int(args.get("limit", 10))
                # FIX: leaderboard is public (no auth required), pass token if available
                result = self.backend.get_leaderboard(auth_token, limit)

                if is_success_response(result) or result.get("leaderboard"):
                    leaders = result.get("leaderboard", [])
                    top3 = ", ".join(
                        f"{l.get('rank')}° {l.get('fullName')} ({l.get('ecoScore')} pts)"
                        for l in leaders[:3]
                    ) if leaders else "No entries yet!"
                    return {
                        "type": "SUCCESS",
                        "intent": intent,
                        "data": result,
                        "message": consultation_msg or f"🏆 Eco Leaderboard — Top 3: {top3}"
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Could not load leaderboard: {result.get('message') or result.get('error')}",
                        "data": None
                    }

            elif intent == Intent.GET_ECO_STATS:
                # Fetch current user's eco score, green points, planet rank, deed count
                if not auth_token:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": "Please log in to see your eco stats.",
                        "data": None
                    }

                result = self.backend.get_eco_stats(auth_token)

                if is_success_response(result) or result.get("ecoStats"):
                    stats = result.get("ecoStats", result)
                    eco_score   = stats.get("ecoScore", 0)
                    green_points = stats.get("greenPoints", 0)
                    planet_rank = stats.get("planetRank", "Earth Newcomer")
                    total_deeds = stats.get("totalDeeds", 0)
                    return {
                        "type": "SUCCESS",
                        "intent": intent,
                        "data": stats,
                        "message": (
                            consultation_msg or
                            f"🌍 Your Eco Profile: Score {eco_score} pts • "
                            f"🌱 Green Points: {green_points} • "
                            f"🏆 Rank: {planet_rank} • "
                            f"Total Deeds: {total_deeds}"
                        )
                    }
                else:
                    return {
                        "type": "ERROR",
                        "intent": intent,
                        "message": f"Could not load eco stats: {result.get('message') or result.get('error')}",
                        "data": None
                    }
            
            # ========== UNKNOWN INTENT ==========
            
            else:
                return {
                    "type": "ERROR",
                    "intent": Intent.UNKNOWN,
                    "message": "I'm not sure how to help with that. Try asking about products, orders, or social features.",
                    "data": None
                }
        
        except Exception as e:
            print(f"❌ Controller Error: {e}")
            return {
                "type": "ERROR",
                "intent": intent,
                "message": f"An unexpected error occurred: {str(e)}",
                "data": None
            }
        
        finally:
            # Save to history
            SessionMemory.add_chat_history(
                user_id, user_query, f"Action: {intent}"
            )














