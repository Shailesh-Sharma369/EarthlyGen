"""
context_resolver.py
===================
Resolves missing arguments using agent memory
"""

from memory.session_memory import SessionMemory
from contract import Intent


def resolve_context(user_id: str, intent: str, args: dict) -> dict:
    memory = SessionMemory.get(user_id)

    # -------------------------------
    # ADD TO CART
    # -------------------------------
    if intent == Intent.ADD_TO_CART:
        if not args.get("product_id"):

            # Priority 1: last opened product
            if memory["last_opened_product"]:
                args["product_id"] = memory["last_opened_product"]["id"]

            # Priority 2: first from last search
            elif memory["last_products"]:
                args["product_id"] = memory["last_products"][0]["id"]

    # -------------------------------
    # REMOVE FROM CART
    # -------------------------------
    if intent == Intent.REMOVE_FROM_CART:
        if not args.get("item_id") and memory.get("last_cart_item_id"):
            args["item_id"] = memory["last_cart_item_id"]

        # Keep product_id as fallback key for controller-side resolution
        if not args.get("product_id"):
            if memory["last_opened_product"]:
                args["product_id"] = memory["last_opened_product"].get("id")
            elif memory["last_products"]:
                args["product_id"] = memory["last_products"][0].get("id")

    # -------------------------------
    # OPEN PRODUCT
    # -------------------------------
    if intent == Intent.OPEN_PRODUCT:
        if not args.get("product_id") and memory["last_products"]:
            args["product_id"] = memory["last_products"][0]["id"]

    # -------------------------------
    # INIT PAYMENT
    # -------------------------------
    if intent == Intent.INIT_PAYMENT:
        if "method" not in args:
            args["method"] = "UPI"  # default safe fallback

    # -------------------------------
    # UPDATE MEMORY
    # -------------------------------
    memory["last_intent"] = intent

    return args

