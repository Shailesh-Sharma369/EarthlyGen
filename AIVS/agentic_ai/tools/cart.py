from tools.base import BaseTool
from datetime import datetime


class CartTool(BaseTool):
    """
    MongoDB-based Cart Tool
    Algorithm: Rule-based Stateful Cart Management
    """

    name = "cart_tool"

    def run(
        self,
        user_id: str,
        product_id: str,
        action: str = "ADD",
        quantity: int = 1
    ):
        """
        Actions:
        - ADD
        - REMOVE
        - UPDATE_QTY
        - CLEAR
        """

        # ----------------------------
        # 1. CONNECT COLLECTION
        # ----------------------------
        col = self.datasource.client[self.datasource.mongo_db]["carts"]

        # ----------------------------
        # 2. FETCH EXISTING CART
        # ----------------------------
        cart = col.find_one({"user_id": user_id})

        if not cart:
            cart = {
                "user_id": user_id,
                "items": [],
                "updated_at": datetime.utcnow()
            }

        items = cart.get("items", [])

        # ----------------------------
        # 3. APPLY ACTION LOGIC
        # ----------------------------
        if action == "ADD":
            found = False
            for item in items:
                if item["product_id"] == product_id:
                    item["quantity"] += quantity
                    found = True
                    break

            if not found:
                items.append({
                    "product_id": product_id,
                    "quantity": quantity
                })

        elif action == "UPDATE_QTY":
            for item in items:
                if item["product_id"] == product_id:
                    item["quantity"] = quantity

            # remove invalid qty
            items = [i for i in items if i["quantity"] > 0]

        elif action == "REMOVE":
            items = [
                i for i in items
                if i["product_id"] != product_id
            ]

        elif action == "CLEAR":
            items = []

        # ----------------------------
        # 4. SAVE UPDATED CART
        # ----------------------------
        col.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "items": items,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )

        # ----------------------------
        # 5. RETURN CLEAN RESPONSE
        # ----------------------------
        return {
            "user_id": user_id,
            "items": items,
            "total_items": sum(i["quantity"] for i in items)
        }

