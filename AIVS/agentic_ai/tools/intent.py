from tools.base import BaseTool

class IntentDetectionTool(BaseTool):
    name = "detect_intent"

    def run(self, user_query: str):
        q = user_query.lower()

        if "recommend" in q:
            intent = "RECOMMEND"
        elif "cart" in q or "add" in q:
            intent = "CART_ACTION"
        elif "open" in q:
            intent = "OPEN_PRODUCT"
        elif "buy" in q or "order" in q:
            intent = "PLACE_ORDER"
        else:
            intent = "SEARCH_PRODUCT"

        return {"intent": intent}



