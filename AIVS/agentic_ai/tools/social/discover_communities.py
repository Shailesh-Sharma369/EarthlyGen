#!pip install pymongo

from bson import ObjectId
from typing import Optional


def DISCOVER_COMMUNITIES(
    datasource,                     # 🔥 NEW (SocialDataSource)
    user_id: str,
    search_query: str = "",
    limit: int = 10
):
    """
    Agentic AI Tool: DISCOVER_COMMUNITIES (UPDATED)
    -----------------------------------------------
    - Uses SocialDataSource
    - No direct DB access
    - Frontend-safe response
    """

    # ---------------- QUERY BUILD ----------------
    query = {"is_active": True}

    if search_query:
        query["$or"] = [
            {"name": {"$regex": search_query, "$options": "i"}},
            {"description": {"$regex": search_query, "$options": "i"}}
        ]

    # ---------------- FETCH COMMUNITIES ----------------
    cursor = (
        datasource.communities
        .find(
            query,
            {
                "name": 1,
                "description": 1,
                "created_by": 1,
                "members": 1,
                "created_at": 1
            }
        )
        .limit(limit)
    )

    communities = []

    for community in cursor:
        communities.append({
            "community_id": str(community["_id"]),
            "name": community.get("name"),
            "description": community.get("description"),
            "members_count": len(community.get("members", [])),
            "created_by": str(community.get("created_by")) if community.get("created_by") else None,
            "created_at": community.get("created_at")
        })

    return {
        "status": "success",
        "count": len(communities),
        "communities": communities
    }

