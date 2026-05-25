from bson import ObjectId
from datetime import datetime, timedelta


def SEND_MESSAGE(
    datasource,                 # 🔥 NEW (SocialDataSource)
    sender_id: str,
    receiver_id: str,
    message_text: str,
    cooldown_seconds: int = 30   # 🔥 anti-spam default
):
    """
    Agentic AI Tool: SEND_MESSAGE (UPDATED)
    ---------------------------------------
    - Uses SocialDataSource
    - No direct DB access
    - Spam-safe (rate limited)
    - Explainable agent action
    """

    # ---------------- VALIDATION ----------------
    if not sender_id or not receiver_id or not message_text:
        return {
            "status": "error",
            "message": "sender_id, receiver_id and message_text are required"
        }

    sender_obj = ObjectId(sender_id)
    receiver_obj = ObjectId(receiver_id)

    # ---------------- USER CHECK ----------------
    sender = datasource.users.find_one({"_id": sender_obj})
    receiver = datasource.users.find_one({"_id": receiver_obj})

    if not sender or not receiver:
        return {
            "status": "error",
            "message": "Sender or Receiver not found"
        }

    # ---------------- ANTI-SPAM CHECK ----------------
    last_msg = datasource.messages.find_one(
        {
            "sender_id": sender_obj,
            "receiver_id": receiver_obj
        },
        sort=[("timestamp", -1)]
    )

    if last_msg:
        delta = datetime.utcnow() - last_msg["timestamp"]
        if delta < timedelta(seconds=cooldown_seconds):
            return {
                "status": "blocked",
                "message": "Please wait before sending another message"
            }

    # ---------------- SEND MESSAGE ----------------
    message_doc = {
        "sender_id": sender_obj,
        "receiver_id": receiver_obj,
        "message_text": message_text.strip(),
        "timestamp": datetime.utcnow(),
        "is_read": False,

        # 🔥 AGENTIC METADATA
        "sent_by_agent": True
    }

    datasource.send_message(message_doc)

    return {
        "status": "success",
        "message": "Message sent successfully"
    }

