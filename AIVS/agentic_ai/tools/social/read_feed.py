from bson import ObjectId
from typing import Optional


def READ_FEED(
    datasource,                     # 🔥 NEW (SocialDataSource)
    user_id: str,
    feed_type: str = "home",         # home | community | profile
    community_id: Optional[str] = None,
    profile_user_id: Optional[str] = None,
    page: int = 1,
    limit: int = 10
):
    """
    Agentic AI Tool: READ_FEED (UPDATED)
    -----------------------------------
    - Uses SocialDataSource
    - No direct DB access
    - Same response shape (frontend safe)
    """

    # ---------------- VALIDATION ----------------
    query = {"is_active": True}

    if feed_type == "community":
        if not community_id:
            return {
                "status": "error",
                "message": "community_id is required for community feed"
            }
        query["community_id"] = ObjectId(community_id)

    elif feed_type == "profile":
        if not profile_user_id:
            return {
                "status": "error",
                "message": "profile_user_id is required for profile feed"
            }
        query["user_id"] = ObjectId(profile_user_id)

    # ---------------- FETCH POSTS ----------------
    posts = datasource.read_feed(
        query=query,
        page=page,
        limit=limit
    )

    feed = []

    for post in posts:
        user = datasource.users.find_one(
            {"_id": post["user_id"]},
            {"password": 0}
        )

        feed.append({
            "post_id": str(post["_id"]),
            "content": post.get("content"),
            "media_urls": post.get("media_urls", []),
            "community_id": str(post["community_id"]) if post.get("community_id") else None,
            "created_at": post.get("created_at"),
            "likes_count": len(post.get("likes", [])),
            "comments_count": len(post.get("comments", [])),
            "user": {
                "user_id": str(user["_id"]) if user else None,
                "username": user.get("username") if user else "Unknown",
                "profile_pic": user.get("profile_pic") if user else None
            }
        })

    return {
        "status": "success",
        "page": page,
        "limit": limit,
        "feed_count": len(feed),
        "data": feed
    }

