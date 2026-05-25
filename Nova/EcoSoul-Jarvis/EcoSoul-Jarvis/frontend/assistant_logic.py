# # # import random

# # # # Dummy product database (replace with MongoDB later)
# # # PRODUCTS = [
# # #     {"name": "Red T-Shirt", "category": "tshirt", "color": "red"},
# # #     {"name": "Blue T-Shirt", "category": "tshirt", "color": "blue"},
# # #     {"name": "Running Shoes", "category": "shoes", "color": "black"},
# # #     {"name": "White Sneakers", "category": "shoes", "color": "white"},
# # #     {"name": "Leather Wallet", "category": "accessories", "color": "brown"},
# # # ]

# # # def speak_response(text, action=None):
# # #     """Return both text response and optional frontend action"""
# # #     return {"response": text, "action": action}

# # # def search_products(query):
# # #     results = [p for p in PRODUCTS if query in p["name"].lower() or query in p["category"].lower()]
# # #     if results:
# # #         names = ", ".join([p["name"] for p in results])
# # #         return f"I found these products: {names}."
# # #     else:
# # #         return "Sorry, I couldn’t find any products matching that."

# # # def recommend_products():
# # #     choice = random.choice(PRODUCTS)
# # #     return f"I recommend checking out: {choice['name']}."

# # # def handle_command(command: str):
# # #     command = command.lower()

# # #     # ----------- NAVIGATION COMMANDS -----------
# # #     if "home" in command:
# # #         return speak_response("Taking you to home page.", action="navigate_home")

# # #     elif "cart" in command or "my cart" in command:
# # #         return speak_response("Opening your cart.", action="navigate_cart")

# # #     elif "orders" in command or "my orders" in command:
# # #         return speak_response("Showing your orders.", action="navigate_orders")

# # #     elif "profile" in command or "account" in command:
# # #         return speak_response("Opening your profile.", action="navigate_profile")

# # #     elif "wishlist" in command:
# # #         return speak_response("Here is your wishlist.", action="navigate_wishlist")

# # #     # ----------- SHOPPING COMMANDS -----------
# # #     elif "search" in command:
# # #         query = command.replace("search for", "").strip()
# # #         return speak_response(search_products(query))

# # #     elif "show me" in command:
# # #         query = command.replace("show me", "").strip()
# # #         return speak_response(search_products(query))

# # #     elif "recommend" in command:
# # #         return speak_response(recommend_products())

# # #     # ----------- EXIT / LOGOUT -----------
# # #     elif "logout" in command or "back to login" in command:
# # #         return speak_response("Logging you out now.", action="logout")

# # #     elif "exit" in command or "stop" in command:
# # #         return speak_response("Goodbye! Shutting down assistant.", action="exit")

# # #     else:
# # #         return speak_response("Sorry, I don’t know how to do that yet.")

# # import random

# # # Dummy product database (later replace with MongoDB)
# # PRODUCTS = [
# #     {"name": "Red T-Shirt", "category": "tshirt", "color": "red"},
# #     {"name": "Blue T-Shirt", "category": "tshirt", "color": "blue"},
# #     {"name": "Running Shoes", "category": "shoes", "color": "black"},
# #     {"name": "White Sneakers", "category": "shoes", "color": "white"},
# #     {"name": "Leather Wallet", "category": "accessories", "color": "brown"},
# #     {"name": "Eco Water Bottle", "category": "bottle", "color": "green"},
# #     {"name": "Bamboo Toothbrush", "category": "accessories", "color": "brown"},
# # ]

# # # In-memory cart
# # CART = []

# # def speak_response(text, action=None, extra=None):
# #     """Return both text response and optional frontend action"""
# #     return {"response": text, "action": action, "extra": extra}

# # # --- Product Search ---
# # def search_products(query):
# #     results = [p for p in PRODUCTS if query in p["name"].lower() or query in p["category"].lower()]
# #     if results:
# #         names = ", ".join([p["name"] for p in results])
# #         return f"I found these products: {names}."
# #     else:
# #         return "Sorry, I couldn’t find any products matching that."

# # # --- Recommendation ---
# # def recommend_products():
# #     choice = random.choice(PRODUCTS)
# #     return f"I recommend checking out: {choice['name']}."

# # # --- Cart Actions ---
# # def add_to_cart(product_name):
# #     for p in PRODUCTS:
# #         if product_name in p["name"].lower():
# #             CART.append(p)
# #             return f"{p['name']} has been added to your cart."
# #     return "Sorry, I couldn’t find that product."

# # def remove_from_cart(product_name):
# #     for p in CART:
# #         if product_name in p["name"].lower():
# #             CART.remove(p)
# #             return f"{p['name']} has been removed from your cart."
# #     return "That item is not in your cart."

# # def show_cart():
# #     if not CART:
# #         return "Your cart is empty."
# #     names = ", ".join([p["name"] for p in CART])
# #     return f"Items in your cart: {names}."

# # # --- Main Command Handler ---
# # def handle_command(command: str):
# #     command = command.lower().strip()

# #     # ----------- NAVIGATION COMMANDS -----------
# #     if any(word in command for word in ["home", "go home", "open home", "main page"]):
# #         return speak_response("Taking you to home page.", action="navigate_home")

# #     elif any(word in command for word in ["about", "about us"]):
# #         return speak_response("Opening About page.", action="navigate_about")

# #     elif any(word in command for word in ["contact", "support", "help", "help page"]):
# #         return speak_response("Opening Contact page.", action="navigate_contact")

# #     elif any(word in command for word in ["shop", "products", "store", "browse items"]):
# #         return speak_response("Taking you to shop section.", action="navigate_shop")

# #     elif "cart" in command and not any(x in command for x in ["add", "remove"]):
# #         return speak_response("Opening your cart.", action="navigate_cart")

# #     elif any(word in command for word in ["orders", "my orders", "track order", "order status"]):
# #         return speak_response("Showing your orders.", action="navigate_orders")

# #     elif any(word in command for word in ["sign in", "login", "log in", "sign into account"]):
# #         return speak_response("Taking you to sign in page.", action="navigate_login")

# #     elif any(word in command for word in ["sign up", "register", "create account"]):
# #         return speak_response("Redirecting you to sign up page.", action="navigate_signup")

# #     elif any(word in command for word in ["profile", "account", "my account"]):
# #         return speak_response("Opening your profile.", action="navigate_profile")

# #     elif "wishlist" in command or "favourites" in command:
# #         return speak_response("Here is your wishlist.", action="navigate_wishlist")

# #     elif any(word in command for word in ["checkout", "buy now", "proceed to checkout"]):
# #         return speak_response("Proceeding to checkout.", action="navigate_checkout")

# #     # ----------- SHOPPING COMMANDS -----------
# #     elif any(word in command for word in ["search", "find", "look for"]):
# #         query = command.replace("search for", "").replace("search", "").replace("find", "").replace("look for", "").strip()
# #         return speak_response(search_products(query))

# #     elif any(word in command for word in ["show me", "display", "list"]):
# #         query = command.replace("show me", "").replace("display", "").replace("list", "").strip()
# #         return speak_response(search_products(query))

# #     elif any(word in command for word in ["recommend", "suggest", "any ideas"]):
# #         return speak_response(recommend_products())

# #     elif "add" in command and "cart" in command:
# #         query = command.replace("add", "").replace("to cart", "").replace("in cart", "").strip()
# #         return speak_response(add_to_cart(query))

# #     elif "remove" in command and "cart" in command:
# #         query = command.replace("remove", "").replace("from cart", "").replace("in cart", "").strip()
# #         return speak_response(remove_from_cart(query))

# #     elif any(word in command for word in ["show cart", "my cart items", "what's in my cart", "cart items"]):
# #         return speak_response(show_cart())

# #     # ----------- EXIT / LOGOUT -----------
# #     elif any(word in command for word in ["logout", "back to login", "sign out"]):
# #         return speak_response("Logging you out now.", action="logout")

# #     elif any(word in command for word in ["exit", "stop", "shutdown", "quit", "close assistant"]):
# #         return speak_response("Goodbye! Shutting down assistant.", action="exit")

# #     else:
# #         return speak_response("Sorry, I don’t know how to do that yet.")
# import random

# # --- INTERNET CHECK ---
# HAS_INTERNET = False
# try:
#     from duckduckgo_search import DDGS
#     HAS_INTERNET = True
#     print("✅ Internet Search: ONLINE")
# except:
#     print("⚠️ Internet Search: OFFLINE")

# # --- CARBON DB ---
# CARBON_DB = {
#     "plastic": 5.0, "electronics": 12.0, "meat": 15.0,
#     "eco": 0.5, "organic": 0.8, "bamboo": 0.2, "reusable": 0.3, 
#     "cotton": 1.5, "solar": 0.0
# }

# def get_carbon_footprint(name):
#     score = 2.5
#     for k, v in CARBON_DB.items():
#         if k in name.lower(): score = v
#     return score

# def speak_response(text, action=None, payload=None):
#     return {"response": text, "action": action, "payload": payload}

# def perform_search(query):
#     if not HAS_INTERNET: return "Internet unavailable."
#     try:
#         with DDGS() as ddgs:
#             results = list(ddgs.text(query, max_results=1))
#         if results:
#             return ". ".join(results[0]['body'].split(".")[:2]) + "."
#         return "I couldn't find an answer."
#     except: return "Search failed."

# # --- MAIN LOGIC (STRICT PRIORITY) ---
# def handle_command(command: str):
#     command = command.lower().strip()
#     print(f"🎤 Cmd: {command}")

#     # 1. GREETING & STOP (Top Priority)
#     if any(x in command for x in ["hello", "hi", "nova"]):
#         return speak_response("Hello! I am ready.")
#     if any(x in command for x in ["stop", "quiet", "chup"]):
#         return speak_response("Okay.", action="stop_mic")

#     # 2. NAVIGATION (Must be before Search)
#     if any(x in command for x in ["home", "main"]):
#         return speak_response("Opening Home.", action="navigate_home")
    
#     # "Product/Shop" specific navigation
#     if any(x in command for x in ["products", "shop", "store", "items"]):
#         return speak_response("Opening Products Page.", action="navigate_shop")

#     if any(x in command for x in ["social", "community"]):
#         return speak_response("Opening Social Page.", action="navigate_social")
    
#     if "cart" in command and "add" not in command:
#         return speak_response("Opening Cart.", action="navigate_cart")

#     # 3. PAYMENT
#     if any(x in command for x in ["pay", "checkout", "buy now"]):
#         return speak_response("Proceeding to payment.", action="NAVIGATE_PAYMENT")

#     # 4. SHOPPING (Add to cart)
#     if "add" in command or "buy" in command:
#         name = command.replace("add", "").replace("buy", "").replace("to cart", "").strip()
#         co2 = get_carbon_footprint(name)
#         return speak_response(f"Adding {name}. Eco impact: {co2} kg.", action="ADD_TO_CART", payload={"name": name})

#     # 5. SEARCH (Last Resort - Only if nothing else matches)
#     # This prevents "products" from being searched on Google
#     if len(command) > 3:
#         return speak_response(perform_search(command))
    
#     return speak_response("Please say that again.")

import random

# --- INTERNET SEARCH SETUP ---
HAS_INTERNET = False
try:
    from duckduckgo_search import DDGS
    HAS_INTERNET = True
    print("✅ Internet Search: ONLINE")
except:
    print("⚠️ Internet Search: OFFLINE (Run: pip install duckduckgo-search)")

# --- CARBON FOOTPRINT DATA ---
CARBON_DB = {
    "plastic": 5.0, "electronics": 12.0, "meat": 15.0,
    "eco": 0.5, "organic": 0.8, "bamboo": 0.2, "reusable": 0.3, 
    "cotton": 1.5, "solar": 0.0, "oil": 1.2, "soap": 0.4
}

def get_carbon_footprint(name):
    score = 2.5
    for k, v in CARBON_DB.items():
        if k in name.lower(): score = v
    return score

def speak_response(text, action=None, payload=None):
    return {"response": text, "action": action, "payload": payload}

def perform_search(query):
    if not HAS_INTERNET: return "I cannot search right now."
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=1))
        if results:
            return ". ".join(results[0]['body'].split(".")[:2]) + "."
        return "I couldn't find an answer."
    except: return "Search failed."

def handle_command(command: str):
    command = command.lower().strip()
    print(f"🎤 Command: {command}")

    # === 1. BASIC COMMANDS ===
    if any(x in command for x in ["stop", "quiet", "chup", "exit"]):
        return speak_response("Okay, stopping.", action="stop_mic")
    
    if any(x in command for x in ["hello", "hi", "nova"]):
        return speak_response("Hello! I am ready.")

    # === 2. SHOPPING (Highest Priority) ===
    if "add" in command or "buy" in command or "lelo" in command:
        name = command.replace("add", "").replace("buy", "").replace("to cart", "").replace("please", "").strip()
        co2 = get_carbon_footprint(name)
        return speak_response(f"OK. Eco footprint: {co2} kg.", action="ADD_TO_CART", payload={"name": name})

    # === 3. PAYMENT ===
    if any(x in command for x in ["pay", "checkout"]):
        return speak_response("Redirecting to payment.", action="NAVIGATE_PAYMENT")

    # === 4. NAVIGATION (Full Site Coverage) ===
    
    # Home
    if any(x in command for x in ["home", "main", "top"]):
        return speak_response("Going to Home.", action="navigate_home")

    # Products (Main Shop Page)
    if any(x in command for x in ["product", "shop", "store", "items", "browse"]):
        return speak_response("Opening Products Page.", action="navigate_shop")

    # Social Media
    if any(x in command for x in ["social", "community", "feed"]):
        return speak_response("Opening Social Feed.", action="navigate_social")

    # Cart
    if "cart" in command:
        return speak_response("Opening Cart.", action="navigate_cart")

    # --- SPECIFIC SECTIONS ---
    
    # Reviews
    if any(x in command for x in ["review", "rating", "feedback"]):
        return speak_response("Showing Customer Reviews.", action="navigate_reviews")

    # Testimonials
    if any(x in command for x in ["testimonial", "story", "stories"]):
        return speak_response("Showing Testimonials.", action="navigate_testimonials")

    # About Us
    if any(x in command for x in ["about", "who are you", "company"]):
        return speak_response("Opening About Us section.", action="navigate_about")

    # Contact Us
    if any(x in command for x in ["contact", "support", "help", "email", "phone"]):
        return speak_response("Opening Contact details.", action="navigate_contact")

    # Offers
    if "offer" in command or "discount" in command:
        return speak_response("Showing latest offers.", action="navigate_offers")

    # === 5. FALLBACK SEARCH (Last Resort) ===
    # If users ask general questions like "What is bamboo?" or "How to save earth?"
    if len(command) > 3:
        return speak_response(perform_search(command))
    
    return speak_response("I didn't understand.")