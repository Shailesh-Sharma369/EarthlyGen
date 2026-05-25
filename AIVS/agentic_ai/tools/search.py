from tools.base import BaseTool
import re


class ProductSearchTool(BaseTool):
    """
    Search products from CSV / MongoDB
    using rule-based ranking algorithm
    (FIXED: Safe price parsing)
    """

    name = "search_products"

    def run(
        self,
        query: str = "",
        max_results: int = 10,
        filters: dict = None
    ):

        # ----------------------------
        # 1. FETCH DATA
        # ----------------------------
        df = self.datasource.fetch_all()

        if df.empty:
            return []

        query = query.lower().strip()
        filters = filters or {}

        keywords = re.findall(r"\w+", query)

        results = []

        # ----------------------------
        # 2. SCORE EACH PRODUCT
        # ----------------------------
        for _, row in df.iterrows():

            score = 0

            text = (
                f"{row.get('name','')} "
                f"{row.get('category','')} "
                f"{row.get('description','')}"
            ).lower()

            # --- Keyword matching ---
            for word in keywords:
                if word in text:
                    score += 2

            # ----------------------------
            # SAFE PRICE PARSING (🔥 FIX)
            # ----------------------------
            price_raw = row.get("price", 0)
            try:
                price = float(
                    re.sub(r"[^\d.]", "", str(price_raw))
                ) if price_raw else 0.0
            except:
                price = 0.0

            max_price = filters.get("max_price")
            if max_price and price > max_price:
                continue

            # ----------------------------
            # SAFE RATING PARSING
            # ----------------------------
            rating_raw = row.get("rating", 0)
            try:
                rating = float(rating_raw) if rating_raw else 0.0
            except:
                rating = 0.0

            score += rating

            # ----------------------------
            # ECO FRIENDLY BOOST
            # ----------------------------
            eco = str(row.get("eco", "")).lower()
            if "eco" in query and eco in ["yes", "true", "1"]:
                score += 3

            # Ignore low relevance
            if score > 0:
                product = row.to_dict()
                product["_score"] = score
                results.append(product)

        # ----------------------------
        # 3. SORT & RETURN
        # ----------------------------
        results = sorted(
            results,
            key=lambda x: x["_score"],
            reverse=True
        )

        return results[:max_results]

