from bson import ObjectId
from datetime import datetime


def JOIN_COMMUNITY(
    datasource,                 # 🔥 NEW (SocialDataSource)
    user_id: str,
    community_id: str,
    reason: str = "interest_match"   # 🔥 NEW (explainability)
):
    """
    Agentic AI Tool: JOIN_COMMUNITY (UPDATED)
    -----------------------------------------
    - Uses SocialDataSource
    - No direct DB access
    - Explainable agent action
    - Safe against duplicate joins
    """

    user_obj_id = ObjectId(user_id)
    community_obj_id = ObjectId(community_id)

    # ---------------- CHECK COMMUNITY ----------------
    community = datasource.communities.find_one({"_id": community_obj_id})
    if not community:
        return {"status": "error", "message": "Community not found"}

    # ---------------- ALREADY MEMBER ----------------
    if user_obj_id in community.get("members", []):
        return {
            "status": "success",
            "message": "Already a member",
            "already_joined": True
        }

    # ---------------- JOIN COMMUNITY ----------------
    datasource.communities.update_one(
        {"_id": community_obj_id},
        {"$addToSet": {"members": user_obj_id}}
    )

    # ---------------- TRACK IN USER PROFILE ----------------
    datasource.users.update_one(
        {"_id": user_obj_id},
        {
            "$push": {
                "joined_communities": {
                    "community_id": community_obj_id,
                    "joined_at": datetime.utcnow(),
                    "reason": reason,
                    "joined_by_agent": True
                }
            }
        }
    )

    return {
        "status": "success",
        "message": "Successfully joined the community",
        "reason": reason
    }

