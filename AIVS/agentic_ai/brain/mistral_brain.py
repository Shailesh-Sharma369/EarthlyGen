"""
Mistral Brain - Stable T4 Optimized Version
Base Model: HF (4-bit)
Adapter: Local Drive
Designed for FastAPI deployment
"""

import json
import os
import threading
import torch

from peft import PeftModel
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig
)

# ============================================================
# 1. CONFIGURATION
# ============================================================

BASE_MODEL_ID = "mistralai/Mistral-7B-Instruct-v0.1"

ADAPTER_PATH = os.getenv(
    "ADAPTER_PATH",
    "/content/drive/MyDrive/mistral_adapter_v4"
)

MAX_NEW_TOKENS = 120  # Enough for JSON output


# ============================================================
# 2. MODEL LOADING (4-BIT SAFE)
# ============================================================

_model = None
_tokenizer = None
_model_lock = threading.Lock()


def is_model_loaded():
    return _model is not None and _tokenizer is not None


def load_model():
    global _model, _tokenizer

    if is_model_loaded():
        return _model, _tokenizer

    with _model_lock:
        if is_model_loaded():
            return _model, _tokenizer

        print(f"⏳ Loading Base Model from HF: {BASE_MODEL_ID}")
        print(f"🔌 Loading Adapter from: {ADAPTER_PATH}")

        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )

        base_model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_ID,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True
        )

        _tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_ID)
        _tokenizer.pad_token = _tokenizer.eos_token

        _model = PeftModel.from_pretrained(
            base_model,
            ADAPTER_PATH,
            is_trainable=False
        )

        _model.eval()

        print("✅ Model loaded successfully (4-bit + LoRA)")

    return _model, _tokenizer


# ============================================================
# 3. SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """You are Ruhi, an "Eco-Consultant" Agentic AI for the EcoSoul platform.
You must NEVER ask new questions.
You must NEVER continue the conversation on your own.
Respond ONLY to the current user input.
If the user intent is CHAT, respond conversationally.
Otherwise, respond with an action decision.

RULES:
1. Always respond in valid JSON.
2. For product searches, provide a short educational eco-fact in the "consultation" field.
3. Classify the intent correctly from this list:
   SEARCH_PRODUCT, RECOMMEND, ADD_TO_CART, PLACE_ORDER,
   CREATE_POST, READ_FEED, DISCOVER_COMMUNITIES, JOIN_COMMUNITY, LIKE_POST,
   SEND_MESSAGE, VIEW_PROFILE, SUBMIT_DEED, GET_ECO_STATS, GET_LEADERBOARD,
   NAVIGATE, OPEN_CART, TRACK_ORDER, CANCEL_ORDER, CHAT
4. For eco product searches, set eco_only=true and/or minRating (1-5).
5. For SUBMIT_DEED, extract the deed category and description from what the user said.

SUPPORTED DEED CATEGORIES:
  Tree Planting, Zero Waste, Solar / Renewable Energy, Recycling,
  Water Conservation, Community Clean-up, Sustainable Transport,
  Animal Welfare, Eco Purchase, Other

ECO PRODUCT SEARCH ARGS:
  query       → keyword string
  limit       → number of results (default 10)
  category    → product category name
  eco_only    → true/false (only show eco-tagged products)
  minRating   → 1 to 5 (minimum sustainability rating)
  ecoTags     → comma-separated tags e.g. "Biodegradable,Plastic-Free"

EXAMPLES:

User: I need a new toothbrush
Assistant: {
  "intent": "SEARCH_PRODUCT",
  "args": {"query": "bamboo toothbrush", "eco_only": true},
  "tool": "search",
  "consultation": "Did you know 1 billion plastic toothbrushes end up in landfills yearly? A bamboo brush is a great biodegradable alternative!"
}

User: Show me the best eco products
Assistant: {
  "intent": "SEARCH_PRODUCT",
  "args": {"query": "", "eco_only": true, "minRating": 4},
  "tool": "search",
  "consultation": "Choosing products rated 4+ for sustainability helps reduce your carbon footprint significantly!"
}

User: Find plastic-free bottles
Assistant: {
  "intent": "SEARCH_PRODUCT",
  "args": {"query": "bottle", "ecoTags": "Plastic-Free", "eco_only": true},
  "tool": "search",
  "consultation": "Plastic-free bottles save hundreds of plastic bottles from landfills every year!"
}

User: Suggest phones
Assistant: {
  "intent": "RECOMMEND",
  "args": {"query": "refurbished eco friendly phones"},
  "tool": "recommend",
  "consultation": "Buying refurbished electronics reduces e-waste and saves significantly on carbon emissions compared to buying new."
}

User: Buy this bottle
Assistant: {
  "intent": "PLACE_ORDER",
  "args": {"product_id": "context_item"},
  "tool": "order",
  "consultation": "Great choice! Using this reusable bottle replaces about 167 plastic bottles per year."
}

User: I want to share my good deed - I planted 5 trees today
Assistant: {
  "intent": "SUBMIT_DEED",
  "args": {"category": "Tree Planting", "description": "Planted 5 trees today"},
  "tool": "deed",
  "consultation": "Amazing! Each tree absorbs around 21 kg of CO2 per year. You just offset 105 kg annually!"
}

User: I recycled all my plastic this week
Assistant: {
  "intent": "SUBMIT_DEED",
  "args": {"category": "Recycling", "description": "Recycled all plastic waste this week"},
  "tool": "deed",
  "consultation": "Recycling one tonne of plastic saves 7.4 cubic metres of landfill space. Keep it up!"
}

User: I used public transport today instead of my car
Assistant: {
  "intent": "SUBMIT_DEED",
  "args": {"category": "Sustainable Transport", "description": "Used public transport instead of car"},
  "tool": "deed",
  "consultation": "Taking public transport instead of driving can reduce your CO2 emissions by 70% for that journey!"
}

User: Post about my tree planting on my feed
Assistant: {
  "intent": "CREATE_POST",
  "args": {
    "text": "Just planted 5 trees in my neighbourhood! 🌳 Every tree counts!",
    "post_type": "eco_deed",
    "eco_category": "Tree Planting",
    "deed_description": "Planted 5 trees in the neighbourhood"
  },
  "tool": "create_post",
  "consultation": "Sharing your green deeds inspires others to take action too!"
}

User: Show me the eco leaderboard
Assistant: {
  "intent": "GET_LEADERBOARD",
  "args": {"limit": 10},
  "tool": "leaderboard",
  "consultation": "Our top planet guardians are leading by example! Every eco deed counts toward a greener Earth."
}

User: Who are the top eco warriors?
Assistant: {
  "intent": "GET_LEADERBOARD",
  "args": {"limit": 5},
  "tool": "leaderboard",
  "consultation": "These champions are making a real difference for our planet! Let their actions inspire yours."
}

User: What is my eco score?
Assistant: {
  "intent": "GET_ECO_STATS",
  "args": {},
  "tool": "eco_stats",
  "consultation": "Your eco score tracks all your planet-saving actions. Keep logging deeds to climb the ranks!"
}

User: How many green points do I have?
Assistant: {
  "intent": "GET_ECO_STATS",
  "args": {},
  "tool": "eco_stats",
  "consultation": "Green points are earned for every eco deed — planting trees, recycling, using public transport and more!"
}

User: What is my planet rank?
Assistant: {
  "intent": "GET_ECO_STATS",
  "args": {},
  "tool": "eco_stats",
  "consultation": "Your planet rank reflects your total positive environmental impact. Keep it up!"
}

User: Hi there
Assistant: {
  "intent": "CHAT",
  "message": "Hello! I am Ruhi, your Eco-Consultant. I can help you find eco-friendly products, log your green deeds, and connect with the planet-loving community!",
  "tool": "none"
}

Respond ONLY in valid JSON.
"""


# ============================================================
# 4. JSON EXTRACTION
# ============================================================

def _extract_json(text: str):
    try:
        start = text.find("{")
        if start == -1:
            return None

        bracket_count = 0
        end = -1

        for i, char in enumerate(text[start:], start):
            if char == "{":
                bracket_count += 1
            elif char == "}":
                bracket_count -= 1
                if bracket_count == 0:
                    end = i + 1
                    break

        if end == -1:
            return None

        clean_json = text[start:end]
        return json.loads(clean_json)

    except Exception:
        return None


# ============================================================
# 5. MAIN DECISION FUNCTION
# ============================================================

def mistral_decide(user_query: str) -> dict:
    model, tokenizer = load_model()

    query = (user_query or "").strip()
    if not query:
        return {
            "mode": "ACTION",
            "decision": {
                "intent": "UNKNOWN",
                "args": {},
                "tool": "",
                "consultation": ""
            }
        }

    prompt = f"{SYSTEM_PROMPT}\nUser: {query}\nAssistant:"

    inputs = tokenizer(prompt, return_tensors="pt")
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=False,
            temperature=0.0,
            top_p=1.0,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id
        )

    generated_text = tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True
    ).strip()

    print(f"\n🔍 RAW MODEL OUTPUT: {generated_text}")

    action_json = _extract_json(generated_text)

    if not action_json or "intent" not in action_json:
        return {
            "mode": "ACTION",
            "decision": {
                "intent": "UNKNOWN",
                "args": {},
                "tool": "",
                "consultation": ""
            }
        }

    intent = action_json.get("intent", "").upper()

    if intent == "CHAT" or action_json.get("tool") == "none":
        return {
            "mode": "CHAT",
            "message": action_json.get("message") or action_json.get("consultation", "")
        }

    return {
        "mode": "ACTION",
        "decision": {
            "intent": intent,
            "args": action_json.get("args", {}),
            "tool": action_json.get("tool", ""),
            "consultation": action_json.get("consultation", "")
        }
    }