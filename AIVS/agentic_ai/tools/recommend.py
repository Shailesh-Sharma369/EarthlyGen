from tools.base import BaseTool
import pandas as pd

class RecommendationTool(BaseTool):
    """
    Recommendation Tool (Hybrid: Works with CSV & MongoDB)
    - Automatically detects if we are testing (CSV) or Live (DB)
    - Prioritizes User Query & Sustainability
    """
    name = "recommend_products"

    def run(self, user_id: str = "guest", query: str = None, limit: int = 5, **kwargs):

        # ----------------------------------------
        # 1. SMART DATA FETCHING (Hybrid)
        # ----------------------------------------
        if self.datasource.source_type == "csv":
            # ✅ CSV MODE (Testing Phase)
            # Hum directly dataframe se list of dicts bana lenge
            all_products = self.datasource.fetch_all().to_dict('records')

            # Dummy preferences for testing
            preferred_category = "Personal Care"
            cart_items = set()
            eco_pref = True

        else:
            # 🚀 MONGODB MODE (Future Ready)
            # Jab aap DB connect karenge, ye block chalega
            try:
                db = self.datasource.client[self.datasource.mongo_db]
                products_col = db["products"]
                users_col = db["users"]
                carts_col = db["carts"]

                # Fetch Real Data
                user = users_col.find_one({"user_id": user_id}) or {}
                preferred_category = user.get("preferred_category")
                eco_pref = user.get("eco_preference", False)

                cart = carts_col.find_one({"user_id": user_id}) or {}
                cart_items = {i["product_id"] for i in cart.get("items", [])}

                all_products = list(products_col.find({}, {"_id": 0}))
            except Exception as e:
                print(f"⚠️ DB Error: {e}")
                return []

        # ----------------------------
        # 2. SCORING ENGINE (Same for Both)
        # ----------------------------
        scored_products = []
        query_words = query.lower().split() if query else []

        for p in all_products:
            score = 0

            # Combine fields for search
            p_str = (str(p.get("name", "")) + " " + str(p.get("category", "")) + " " + str(p.get("description", ""))).lower()

            # A. Query Match (Most Important)
            matches = sum(1 for word in query_words if word in p_str)
            if matches > 0:
                score += (matches * 10)

            # B. Sustainability Boost 🌿
            # Handle variations like "True", "yes", 1, True
            is_eco = str(p.get("eco", "")).lower() in ["true", "yes", "1"]
            if is_eco:
                score += 15

            # C. Category Match
            if preferred_category and p.get("category") == preferred_category:
                score += 5

            # D. Rating Boost
            try:
                score += float(p.get("rating", 0))
            except:
                pass

            # E. Penalize Cart Items (Optional)
            if p.get("id") in cart_items:
                score -= 5

            if score > 0:
                p["_score"] = score
                scored_products.append(p)

        # ----------------------------
        # 3. SORT & RETURN
        # ----------------------------
        scored_products.sort(key=lambda x: x["_score"], reverse=True)
        return scored_products[:limit]
