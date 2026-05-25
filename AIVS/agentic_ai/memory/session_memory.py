"""
session_memory.py
=================
Agent Session Memory
Short-term + preference memory + Chat History (UPDATED)
"""

from typing import List, Dict, Any
from threading import RLock

class SessionMemory:
    _store = {}
    _lock = RLock()

    @classmethod
    def get(cls, user_id: str) -> dict:
        with cls._lock:
            if user_id not in cls._store:
                cls._store[user_id] = {
                    # --- interaction ---
                    "last_intent": None,
                    "last_action": None,

                    # --- chat history ---
                    "chat_history": [],  # List of {"user": "...", "ai": "..."}

                    # --- product context ---
                    "last_products": [],
                    "last_opened_product": None,

                    # --- social context ---
                    # Stores the _id of the most recently loaded feed post so that
                    # voice commands like "like this post" work without needing an explicit post_id
                    "last_post_id": None,
                    "last_feed_posts": [],  # Full list from last READ_FEED

                    # --- cart / order ---
                    "last_cart_action": None,
                    "last_cart_item_id": None,

                    # --- preferences ---
                    "preferred_category": None,
                    "eco_preference": False
                }
            return cls._store[user_id]

    @classmethod
    def update(cls, user_id: str, key: str, value: Any):
        with cls._lock:
            memory = cls.get(user_id)
            memory[key] = value

    # ==========================================
    # NEW METHODS FOR CHAT HISTORY
    # ==========================================
    @classmethod
    def add_chat_history(cls, user_id: str, user_msg: str, ai_msg: str):
        """Adds a conversation turn to history"""
        with cls._lock:
            memory = cls.get(user_id)

            # Add new turn
            memory["chat_history"].append({
                "user": user_msg,
                "ai": ai_msg
            })

            # Keep only last 10 turns to save memory (sliding window)
            if len(memory["chat_history"]) > 10:
                memory["chat_history"].pop(0)

    @classmethod
    def get_chat_history(cls, user_id: str) -> List[Dict[str, str]]:
        """Returns list of chat turns"""
        return cls.get(user_id)["chat_history"]

    @classmethod
    def reset(cls, user_id: str):
        with cls._lock:
            if user_id in cls._store:
                del cls._store[user_id]
