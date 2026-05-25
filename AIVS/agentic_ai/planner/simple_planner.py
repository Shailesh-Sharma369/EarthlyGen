"""
simple_planner.py
=================
Rule-based multi-step planner
Maps Intents -> Specific Tool Names + Step Sequences

In the production controller (BackendAPI architecture) this is used for:
  1. Logging / tracing what each intent will do
  2. Multi-step flow detection (len(plan) > 1) — drives PLACE_ORDER cart validation
"""

from contract import Intent

def create_plan(intent: str, args: dict) -> list:
    """
    Returns list of executable steps
    Each step = (step_name, step_args)
    """
    plan = []

    # --- 1. COMPLEX FLOWS (Multi-step) ---

    if intent == Intent.PLACE_ORDER:
        # Search -> Pick Cheapest -> Add -> Confirm
        plan.append(("search_products", {"query": args.get("query", "")}))
        plan.append(("pick_cheapest", {}))
        plan.append(("cart_tool", {"action": "ADD"}))
        plan.append(("confirm_order", {}))

    # --- 2. SINGLE ACTION FLOWS (Direct Tool Mapping) ---

    elif intent == Intent.SEARCH_PRODUCT:
        plan.append(("search_products", args))

    elif intent == Intent.RECOMMEND:
        # Map Intent.RECOMMEND -> "recommend_products" tool
        plan.append(("recommend_products", args))

    elif intent == Intent.ADD_TO_CART:
        plan.append((
            "cart_tool",
            {
                "action": "ADD",
                "product_id": args.get("product_id"),
                "quantity": args.get("quantity", 1)
            }
        ))

    elif intent == Intent.REMOVE_FROM_CART:
        plan.append((
            "cart_tool",
            {
                "action": "REMOVE",
                "product_id": args.get("product_id")
            }
        ))

    elif intent == Intent.OPEN_CART:
        # Navigate to cart page
        plan.append(("navigation_tool", {"page": "CART"}))

    elif intent == Intent.NAVIGATE:
        plan.append(("navigation_tool", {"page": args.get("page", "HOME")}))

    elif intent == Intent.INIT_PAYMENT:
        plan.append(("payment_tool", {"method": args.get("method", "UPI")}))

    # --- NEW PHASE 2 INTENTS (Agentic Actions) ---

    elif intent == Intent.TRACK_ORDER:
        # Maps to the new simulation logic in Controller
        plan.append(("track_order_tool", args))

    elif intent == Intent.CANCEL_ORDER:
        # Maps to the new simulation logic in Controller
        plan.append(("cancel_order_tool", args))

    # --- SOCIAL INTENTS ---

    elif intent == Intent.CREATE_POST:
        plan.append((
            "create_post",
            {
                "text": args.get("text") or args.get("content", ""),
                "post_type": args.get("post_type", "regular"),
                "eco_category": args.get("eco_category"),
                "deed_description": args.get("deed_description"),
                "image": args.get("image"),
                "product_id": args.get("product_id"),
                "community_id": args.get("community_id"),
            }
        ))

    elif intent == Intent.READ_FEED:
        plan.append((
            "read_feed",
            {
                "feed_type": args.get("feed_type", "home"),
                "page": args.get("page", 1)
            }
        ))

    elif intent == Intent.DISCOVER_COMMUNITIES:
        plan.append((
            "discover_communities",
            {"search_query": args.get("search_query", "")}
        ))

    elif intent == Intent.VIEW_PROFILE:
        plan.append((
            "view_profile",
            {"profile_user_id": args.get("profile_user_id")}
        ))

    elif intent == Intent.LIKE_POST:
        plan.append((
            "like_post",
            {"post_id": args.get("post_id")}
        ))

    elif intent == Intent.JOIN_COMMUNITY:
        plan.append((
            "join_community",
            {"community_id": args.get("community_id")}
        ))

    elif intent == Intent.SEND_MESSAGE:
        plan.append((
            "send_message",
            {
                "receiver_id": args.get("receiver_id") or args.get("recipient_id"),
                "text": args.get("text") or args.get("message", "")
            }
        ))

    # --- 3. GAMIFICATION INTENTS ---

    elif intent == Intent.SUBMIT_DEED:
        # Step 1: Log deed, earn points; Step 2: auto-post handled inline by controller
        plan.append((
            "log_deed",
            {
                "category": args.get("category", "Other"),
                "description": args.get("description", ""),
                "proof_image": args.get("proof_image"),
            }
        ))

    elif intent == Intent.GET_LEADERBOARD:
        plan.append(("get_leaderboard", {"limit": args.get("limit", 10)}))

    # --- 4. OPEN_PRODUCT ---

    elif intent == Intent.OPEN_PRODUCT:
        plan.append((
            "open_product",
            {"product_id": args.get("product_id")}
        ))

    # --- 5. FALLBACK ---
    else:
        # Try to execute intent name as tool name directly
        plan.append((intent.lower(), args))

    return plan
