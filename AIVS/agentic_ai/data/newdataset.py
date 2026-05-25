import json
import random

# --- CONFIGURATION ---
filename = "future_ready_dataset.jsonl"
num_examples = 200  # Hum 200 high-quality examples banayenge

# --- DOMAIN DATA (Eco-Friendly Focus) ---
eco_items = [
    "bamboo toothbrush", "neem wood comb", "copper water bottle",
    "recycled paper notebook", "solar power bank", "jute bag",
    "organic cotton shirt", "biodegradable phone case", "metal straw set"
]

tech_items = [
    "gaming laptop", "iphone 15", "wireless earbuds", "smartwatch",
    "4k monitor", "mechanical keyboard"
]

# --- TEMPLATES (Intent Categories) ---

# 1. SEARCH (Eco-Logic & Standard)
search_templates = [
    # Template: (User Query, Tool, Param Logic, Reply Logic)
    ("I want to buy a {item}", "SEARCH_PRODUCT", "{item}", "Searching for eco-friendly {item} options."),
    ("Show me {item}", "SEARCH_PRODUCT", "{item}", "Here are some top-rated {item}."),
    ("Mujhe {item} dikhao", "SEARCH_PRODUCT", "{item}", "Ye rahe kuch behtareen {item}."),
    ("Find sustainable alternatives to plastic bottles", "SEARCH_PRODUCT", "sustainable water bottle", "Showing copper and glass bottles as plastic alternatives."),
    ("Do you have {item}?", "SEARCH_PRODUCT", "{item}", "Checking our inventory for {item}."),
]

# 2. SPECS (Technical Queries)
specs_templates = [
    ("What is the battery life of this?", "GET_PRODUCT_SPECS", "battery life", "Checking the battery specifications."),
    ("Is this waterproof?", "GET_PRODUCT_SPECS", "waterproof rating", "Verifying water resistance details."),
    ("Iska price kya hai?", "GET_PRODUCT_SPECS", "price", "Fetching the latest price for you."),
    ("Does it come with a warranty?", "GET_PRODUCT_SPECS", "warranty", "Checking warranty information."),
]

# 3. CART & CHECKOUT (Action Oriented)
action_templates = [
    ("Add this to my cart", "ADD_TO_CART", "current_item", "Added to your sustainable cart."),
    ("I want to buy this now", "CHECKOUT", "initiate_checkout", "Proceeding to secure checkout."),
    ("Bill banao", "CHECKOUT", "initiate_checkout", "Generating your invoice and checkout link."),
    ("Cart dikhao", "VIEW_CART", "view_cart", "Opening your cart."),
    ("What is in my cart?", "VIEW_CART", "view_cart", "Here are the items currently in your cart."),
]

# 4. MEMORY & HISTORY (Context Aware)
# Format: Query depends on Context
memory_templates = [
    # (Context, Query, Tool, Param, Reply)
    ("User bought Red Shoes previously", "Where is my order?", "TRACK_ORDER", "last_order", "Tracking your Red Shoes order."),
    ("User viewed Gaming Laptop", "Iska RAM kitna hai?", "GET_PRODUCT_SPECS", "RAM", "Showing RAM details for the Gaming Laptop."),
    ("Cart has Bamboo Brush", "Remove it", "UPDATE_CART", "remove_item", "Removed Bamboo Brush from your cart."),
    ("User bought nothing", "My orders?", "TRACK_ORDER", "order_history", "You haven't placed any orders yet. Start shopping sustainably!"),
]

# 5. SUSTAINABILITY CHAT (The "Earth" Nature)
chat_templates = [
    ("Why should I use bamboo?", "CHAT", "null", "Bamboo is biodegradable and grows fast, making it a perfect plastic alternative."),
    ("How to reduce plastic?", "CHAT", "null", "Switch to cloth bags, metal straws, and buy packaging-free products."),
    ("Tum kaun ho?", "CHAT", "null", "Main EcoJarvis hu, aapka personal sustainable shopping assistant."),
    ("Is this product good for earth?", "CHAT", "null", "Yes, this product is marked 'Green' because it uses recycled materials."),
    ("Hello", "CHAT", "null", "Hello! Ready to make some pro-planet choices today?"),
]

# --- GENERATION LOGIC ---
dataset = []

print("🌱 Generating Future-Ready Dataset...")

for _ in range(num_examples):
    # Randomly select a category to keep data balanced
    category = random.choice(["search", "specs", "action", "memory", "chat"])

    context_str = "No prior context."
    user_input = ""
    json_response = {}

    if category == "search":
        tmpl = random.choice(search_templates)
        item = random.choice(eco_items + tech_items)
        user_input = tmpl[0].replace("{item}", item)
        json_response = {"tool": tmpl[1], "params": tmpl[2].replace("{item}", item), "reply": tmpl[3].replace("{item}", item)}

    elif category == "specs":
        tmpl = random.choice(specs_templates)
        user_input = tmpl[0]
        json_response = {"tool": tmpl[1], "params": tmpl[2], "reply": tmpl[3]}

    elif category == "action":
        tmpl = random.choice(action_templates)
        user_input = tmpl[0]
        json_response = {"tool": tmpl[1], "params": tmpl[2], "reply": tmpl[3]}

    elif category == "memory":
        tmpl = random.choice(memory_templates)
        context_str = tmpl[0] # Injecting simulated history
        user_input = tmpl[1]
        json_response = {"tool": tmpl[2], "params": tmpl[3], "reply": tmpl[4]}

    elif category == "chat":
        tmpl = random.choice(chat_templates)
        user_input = tmpl[0]
        json_response = {"tool": tmpl[1], "params": tmpl[2], "reply": tmpl[3]}

    # --- FORMATTING FOR MISTRAL (System Prompt + Context + Input) ---
    # Hum model ko sikhayenge ki wo Context bhi padhe

    text_prompt = f"""<s>[INST] You are EcoJarvis, an AI for a sustainable e-commerce platform.
Rules:
1. Output valid JSON only.
2. Use Context to understand vague queries (like "it", "this").
3. Promote eco-friendly choices in 'reply'.

Current Context: {context_str}
User Query: {user_input} [/INST] {json.dumps(json_response)} </s>"""

    dataset.append({"text": text_prompt})

# --- SAVE TO FILE ---
with open(filename, "w") as f:
    for entry in dataset:
        json.dump(entry, f)
        f.write("\n")

print(f"✅ Dataset Saved: {filename}")
print(f"📊 Total Examples: {len(dataset)}")
print("Sample Entry:")
print(dataset[0]['text'])

from google.colab import drive
drive.mount('/content/drive')

import shutil

# Drive mount hona chahiye (Aapne pehle hi kar rakha hai)
# Path jahan aapko save karna hai
drive_path = "/content/drive/MyDrive/agentic_ai/data/future_ready_dataset.jsonl"

# File ko Colab se Drive mein copy karein
shutil.copy("future_ready_dataset.jsonl", drive_path)

print(f"✅ Dataset permanently saved to: {drive_path}")


