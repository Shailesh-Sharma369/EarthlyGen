#!pip install pymongo

from bson import ObjectId


def VIEW_PROFILE(
    datasource,                 # 🔥 NEW (SocialDataSource)
    viewer_id: str,
    profile_user_id: str
):
    """
    Agentic AI Tool: VIEW_PROFILE (UPDATED)
    ---------------------------------------
    - Uses SocialDataSource
    - No direct DB access
    - Frontend-safe response
    """

    # ---------------- FETCH USER ----------------
    user = datasource.users.find_one(
        {"_id": ObjectId(profile_user_id)},
        {
            "password": 0,
            "email": 0
        }
    )

    if not user:
        return {
            "success": False,
            "error": "User not found"
        }

    # ---------------- FETCH USER POSTS ----------------
    posts = list(
        datasource.posts.find(
            {"user_id": ObjectId(profile_user_id)},
            {
                "_id": 1,
                "content": 1,
                "likes": 1,
                "comments": 1,
                "created_at": 1
            }
        ).sort("created_at", -1)
    )

    # ---------------- FETCH USER COMMUNITIES ----------------
    communities = list(
        datasource.communities.find(
            {"members": ObjectId(profile_user_id)},
            {
                "_id": 1,
                "name": 1,
                "is_private": 1
            }
        )
    )

    # ---------------- RESPONSE ----------------
    return {
        "success": True,
        "profile": {
            "user_id": str(user["_id"]),
            "username": user.get("username"),
            "bio": user.get("bio", ""),
            "profile_image": user.get("profile_image", ""),
            "joined_at": user.get("created_at")
        },
        "stats": {
            "total_posts": len(posts),
            "total_communities": len(communities)
        },
        "posts": [
            {
                "post_id": str(p["_id"]),
                "content": p.get("content"),
                "likes": len(p.get("likes", [])),
                "comments": len(p.get("comments", [])),
                "created_at": p.get("created_at")
            }
            for p in posts
        ],
        "communities": [
            {
                "community_id": str(c["_id"]),
                "name": c.get("name"),
                "is_private": c.get("is_private")
            }
            for c in communities
        ]
    }

