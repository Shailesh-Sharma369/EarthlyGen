# !pip install pymongo


from bson import ObjectId
from typing import List, Optional


def CREATE_POST(
    datasource,
    user_id: str,
    content: str,
    media_urls: Optional[List[str]] = None,
    community_id: Optional[str] = None,
    intent: str = "general",        # education | awareness | promotion | announcement
    visibility: str = "public"      # public | followers | community
):
    """
    Agentic AI Tool: CREATE_POST (FINAL)
    -----------------------------------
    Uses SocialDataSource
    - No direct DB access
    - Explainable agent action
    - Safe defaults
    """

    # ---------------- VALIDATION ----------------
    if not user_id or not content:
        return {
            "status": "error",
            "message": "user_id and content are required"
        }

    # ---------------- POST DOCUMENT ----------------
    post_document = {
        "user_id": ObjectId(user_id),
        "content": content.strip(),
        "media_urls": media_urls or [],
        "community_id": ObjectId(community_id) if community_id else None,

        # 🔥 AGENTIC METADATA
        "intent": intent,
        "visibility": visibility,
        "created_by_agent": True,

        # SOCIAL FIELDS
        "likes": [],
        "comments": [],
        "is_active": True
    }

    # ---------------- DB CALL VIA DATASOURCE ----------------
    result = datasource.create_post(post_document)

    return {
        "status": "success",
        "message": "Post created successfully",
        "post_id": str(result.inserted_id),
        "intent": intent,
        "visibility": visibility
    }

