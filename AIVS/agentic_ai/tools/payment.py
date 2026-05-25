from tools.base import BaseTool
from datetime import datetime
import uuid
import requests


class PaymentTool(BaseTool):
    """
    Payment Tool (Backend Delegated)
    Algorithm: Order Validation + Backend Delegated Payment Initialization
    """

    name = "payment_tool"

    def run(self, user_id: str, method: str = "UPI"):
        """
        method: UPI / CARD / WALLET
        """

        db = self.datasource.client[self.datasource.mongo_db]

        carts_col = db["carts"]
        products_col = db["products"]
        orders_col = db["orders"]

        # ----------------------------
        # 1. FETCH CART
        # ----------------------------
        cart = carts_col.find_one({"user_id": user_id})
        if not cart or not cart.get("items"):
            return {
                "status": "FAILED",
                "message": "Cart is empty."
            }

        # ----------------------------
        # 2. CALCULATE TOTAL
        # ----------------------------
        total_amount = 0
        order_items = []

        for item in cart["items"]:
            product = products_col.find_one(
                {"id": item["product_id"]},
                {"_id": 0}
            )
            if not product:
                continue

            price = float(product.get("price", 0))
            qty = int(item.get("quantity", 1))
            total_amount += price * qty

            order_items.append({
                "product_id": product["id"],
                "name": product.get("name"),
                "price": price,
                "quantity": qty
            })

        if total_amount <= 0:
            return {
                "status": "FAILED",
                "message": "Invalid cart total."
            }

        # ----------------------------
        # 3. CREATE ORDER (PENDING)
        # ----------------------------
        order_id = str(uuid.uuid4())

        order_doc = {
            "order_id": order_id,
            "user_id": user_id,
            "items": order_items,
            "amount": total_amount,
            "payment_method": method,
            "payment_status": "PENDING",
            "created_at": datetime.utcnow()
        }

        orders_col.insert_one(order_doc)

        # ----------------------------
        # 4. DELEGATE PAYMENT TO BACKEND
        # ----------------------------
        # NOTE: Backend runs on port 5002 (EcoSoul Node.js server).
        # Payment is initiated on the backend's payment route.
        backend_payment_api = "http://localhost:5002/api/payment/send-verification"

        payload = {
            "order_id": order_id,
            "amount": total_amount,
            "method": method,
            "user_id": user_id
        }

        try:
            backend_response = requests.post(
                backend_payment_api,
                json=payload,
                timeout=5
            ).json()
        except Exception:
            return {
                "status": "FAILED",
                "message": "Backend payment service unavailable."
            }

        # ----------------------------
        # 5. RETURN PAYMENT SESSION
        # ----------------------------
        return {
            "status": "INITIATED",
            "order_id": order_id,
            "payment": backend_response
        }

