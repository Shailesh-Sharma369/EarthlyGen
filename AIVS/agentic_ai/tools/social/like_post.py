from bson import ObjectId
from datetime import datetime


def LIKE_POST(
    datasource,             # 🔥 NEW (SocialDataSource)
    user_id: str,
    post_id: str
):
    """
    Agentic AI Tool: LIKE_POST (UPDATED)
    ------------------------------------
    Toggles like on a post safely.

    - Uses SocialDataSource
    - ObjectId-safe
    - Agent-ready
    """

    post = datasource.get_post(post_id)

    if not post:
        return {"status": "error", "message": "Post not found"}

    user_obj_id = ObjectId(user_id)
    likes = post.get("likes", [])

    # ---------------- UNLIKE ----------------
    if user_obj_id in likes:
        datasource.unlike_post(post_id, user_id)
        return {
            "status": "success",
            "action": "unliked"
        }

    # ---------------- LIKE ----------------
    datasource.like_post(post_id, user_id)

    # Optional metadata update
    datasource.update_post(
        post_id,
        {"last_liked_at": datetime.utcnow()}
    )

    return {
        "status": "success",
        "action": "liked"
    }

