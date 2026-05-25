"""
social_tools_wrapper.py
=======================
COMPLETE WRAPPER FOR ALL SOCIAL MEDIA TOOLS
- Wraps functions as BaseTool classes
- Integrates with SocialDataSource
- Production-ready for Agentic AI
- HANDLES: Posts, Feed, Communities, Messages, Profiles, Likes
"""

from tools.base import BaseTool
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional


class SocialDataSource:
    """
    🔥 SOCIAL MEDIA DATABASE LAYER (MongoDB)
    Works with collections: users, posts, messages, groups
    Connects to the same Atlas cluster as the Nova Express backend.
    Reads MONGOURI from the environment variable set in .env.
    """

    def __init__(self):
        """Initialize MongoDB connection using MONGOURI from environment."""
        import os
        from urllib.parse import urlparse
        from pymongo import MongoClient

        uri = os.getenv("MONGOURI")
        if not uri:
            raise RuntimeError(
                "MONGOURI environment variable is not set. "
                "Add it to your .env file."
            )
        parsed = urlparse(uri)
        db_name = parsed.path.lstrip("/").split("?")[0] or "ecosoul"

        self.client = MongoClient(uri)
        self.db = self.client[db_name]
        self.users = self.db["users"]
        self.posts = self.db["posts"]
        self.messages = self.db["messages"]
        self.groups = self.db["groups"]   # Nova backend collection name

    # =================== POSTS ===================
    def create_post(self, data: dict):
        """Create a new post with timestamp."""
        data["created_at"] = datetime.utcnow()
        return self.posts.insert_one(data)

    def get_post(self, post_id):
        """Fetch a single post by ID."""
        return self.posts.find_one({"_id": ObjectId(post_id)})

    def update_post(self, post_id, update: dict):
        """Update post fields."""
        return self.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": update}
        )

    def delete_post(self, post_id):
        """Soft delete a post."""
        return self.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": {"is_active": False, "deleted_at": datetime.utcnow()}}
        )

    # =================== LIKES ===================
    def like_post(self, post_id, user_id):
        """Add user to post likes (prevent duplicates)."""
        return self.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$addToSet": {"likes": ObjectId(user_id)}}
        )

    def unlike_post(self, post_id, user_id):
        """Remove user from post likes."""
        return self.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$pull": {"likes": ObjectId(user_id)}}
        )

    def get_post_likes_count(self, post_id):
        """Get number of likes on a post."""
        post = self.posts.find_one({"_id": ObjectId(post_id)}, {"likes": 1})
        return len(post.get("likes", [])) if post else 0

    # =================== FEED ===================
    def read_feed(self, query: dict, page: int = 1, limit: int = 10):
        """Fetch posts with pagination."""
        skip = (page - 1) * limit
        return list(
            self.posts.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

    def get_user_timeline(self, user_id: str, page: int = 1, limit: int = 10):
        """Get a specific user's posts."""
        return self.read_feed(
            {"user_id": ObjectId(user_id), "is_active": True},
            page=page,
            limit=limit
        )

    # =================== MESSAGES ===================
    def send_message(self, data: dict):
        """Send a direct message between users."""
        data["timestamp"] = datetime.utcnow()
        return self.messages.insert_one(data)

    def get_conversation(self, user1_id: str, user2_id: str, limit: int = 50):
        """Get conversation history between two users."""
        return list(
            self.messages.find({
                "$or": [
                    {"sender_id": ObjectId(user1_id), "receiver_id": ObjectId(user2_id)},
                    {"sender_id": ObjectId(user2_id), "receiver_id": ObjectId(user1_id)}
                ]
            })
            .sort("timestamp", -1)
            .limit(limit)
        )

    def mark_message_read(self, message_id: str):
        """Mark a message as read."""
        return self.messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"is_read": True}}
        )

    # =================== GROUPS / COMMUNITIES ===================
    def create_community(self, data: dict):
        """Create a new group (community)."""
        data["created_at"] = datetime.utcnow()
        data["is_active"] = True
        return self.groups.insert_one(data)

    def get_community(self, community_id: str):
        """Fetch a group by ID."""
        return self.groups.find_one({"_id": ObjectId(community_id)})

    def discover_communities(self, search_query: str = "", limit: int = 10):
        """Search and discover groups/communities."""
        query = {"is_active": True}
        if search_query:
            query["$or"] = [
                {"name": {"$regex": search_query, "$options": "i"}},
                {"description": {"$regex": search_query, "$options": "i"}}
            ]
        return list(self.groups.find(query).limit(limit))

    def join_community(self, community_id: str, user_id: str):
        """Add user to group members."""
        return self.groups.update_one(
            {"_id": ObjectId(community_id)},
            {"$addToSet": {"members": ObjectId(user_id)}}
        )

    def leave_community(self, community_id: str, user_id: str):
        """Remove user from group members."""
        return self.groups.update_one(
            {"_id": ObjectId(community_id)},
            {"$pull": {"members": ObjectId(user_id)}}
        )

    def get_community_members_count(self, community_id: str):
        """Get number of members in a group."""
        grp = self.groups.find_one({"_id": ObjectId(community_id)}, {"members": 1})
        return len(grp.get("members", [])) if grp else 0

    # =================== USERS (Profile) ===================
    def get_user_profile(self, user_id: str):
        """Get user profile (without sensitive data)."""
        return self.users.find_one(
            {"_id": ObjectId(user_id)},
            {"password": 0, "email": 0}
        )

    def update_user_profile(self, user_id: str, update: dict):
        """Update user profile fields."""
        return self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update}
        )

    def follow_user(self, follower_id: str, following_id: str):
        """Add following relationship."""
        self.users.update_one(
            {"_id": ObjectId(follower_id)},
            {"$addToSet": {"following": ObjectId(following_id)}}
        )
        return self.users.update_one(
            {"_id": ObjectId(following_id)},
            {"$addToSet": {"followers": ObjectId(follower_id)}}
        )

    def unfollow_user(self, follower_id: str, following_id: str):
        """Remove following relationship."""
        self.users.update_one(
            {"_id": ObjectId(follower_id)},
            {"$pull": {"following": ObjectId(following_id)}}
        )
        return self.users.update_one(
            {"_id": ObjectId(following_id)},
            {"$pull": {"followers": ObjectId(follower_id)}}
        )

    def get_followers_count(self, user_id: str):
        """Get follower count."""
        user = self.users.find_one({"_id": ObjectId(user_id)}, {"followers": 1})
        return len(user.get("followers", [])) if user else 0


# =================== SOCIAL TOOLS (AS BASETTOOL CLASSES) ===================

class CreatePostTool(BaseTool):
    """
    🔥 AGENTIC TOOL: Create Social Media Posts
    - Creates posts with content, media, visibility controls
    - Tracks agent-created posts
    - Supports multiple visibility levels
    """
    name = "create_post"
    description = "Create a new social media post with content, images, and visibility settings"

    def run(
        self,
        user_id: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        community_id: Optional[str] = None,
        intent: str = "general",  # education, awareness, promotion, announcement
        visibility: str = "public"  # public, followers, community
    ):
        """
        Create a post.
        
        Args:
            user_id: ID of post creator
            content: Post content/caption
            media_urls: List of image/video URLs
            community_id: Optional community ID for community posts
            intent: Post intent (for tracking)
            visibility: Post visibility level
        """
        try:
            # VALIDATION
            if not user_id or not content:
                return {
                    "status": "error",
                    "message": "user_id and content are required"
                }

            # BUILD POST DOCUMENT
            post_document = {
                "user_id": ObjectId(user_id),
                "content": content.strip(),
                "media_urls": media_urls or [],
                "community_id": ObjectId(community_id) if community_id else None,
                "intent": intent,  # 🔥 Agentic metadata
                "visibility": visibility,
                "created_by_agent": True,
                "likes": [],
                "comments": [],
                "is_active": True
            }

            # INSERT POST
            result = self.datasource.create_post(post_document)

            return {
                "status": "success",
                "message": "Post created successfully",
                "post_id": str(result.inserted_id),
                "intent": intent,
                "visibility": visibility
            }
        except Exception as e:
            return {"status": "error", "message": f"Failed to create post: {str(e)}"}


class ReadFeedTool(BaseTool):
    """
    🔥 AGENTIC TOOL: Read Social Feed
    - Home feed, community feed, or user profile feed
    - Paginated results
    - Frontend-safe response format
    """
    name = "read_feed"
    description = "Read social media feed (home, community, or profile)"

    def run(
        self,
        user_id: str,
        feed_type: str = "home",  # home, community, profile
        community_id: Optional[str] = None,
        profile_user_id: Optional[str] = None,
        page: int = 1,
        limit: int = 10
    ):
        """
        Read feed posts.
        
        Args:
            user_id: Current user ID
            feed_type: Type of feed (home/community/profile)
            community_id: Community ID (required for community feed)
            profile_user_id: User ID (required for profile feed)
            page: Page number for pagination
            limit: Posts per page
        """
        try:
            query = {"is_active": True}

            if feed_type == "community":
                if not community_id:
                    return {"status": "error", "message": "community_id required"}
                query["community_id"] = ObjectId(community_id)

            elif feed_type == "profile":
                if not profile_user_id:
                    return {"status": "error", "message": "profile_user_id required"}
                query["user_id"] = ObjectId(profile_user_id)

            # FETCH POSTS
            posts = self.datasource.read_feed(query, page=page, limit=limit)

            feed = []
            for post in posts:
                user = self.datasource.users.find_one(
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
                        "username": user.get("username", "Unknown") if user else "Unknown",
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
        except Exception as e:
            return {"status": "error", "message": f"Failed to read feed: {str(e)}"}


class LikePostTool(BaseTool):
    """
    🔥 AGENTIC TOOL: Like/Unlike Posts
    - Toggle like on posts
    - Prevents duplicate likes
    - Returns like count
    """
    name = "like_post"
    description = "Like or unlike a social media post"

    def run(self, user_id: str, post_id: str):
        """
        Toggle like on a post.
        
        Args:
            user_id: ID of user liking
            post_id: ID of post
        """
        try:
            post = self.datasource.get_post(post_id)
            if not post:
                return {"status": "error", "message": "Post not found"}

            user_obj_id = ObjectId(user_id)
            likes = post.get("likes", [])

            # UNLIKE
            if user_obj_id in likes:
                self.datasource.unlike_post(post_id, user_id)
                return {
                    "status": "success",
                    "action": "unliked",
                    "likes_count": len(likes) - 1
                }

            # LIKE
            self.datasource.like_post(post_id, user_id)
            return {
                "status": "success",
                "action": "liked",
                "likes_count": len(likes) + 1
            }
        except Exception as e:
            return {"status": "error", "message": f"Failed to like post: {str(e)}"}


class DiscoverCommunitiesTool(BaseTool):
    """
    🔥 AGENTIC TOOL: Discover Communities
    - Search communities by name/description
    - Return community details with member count
    - Paginated results
    """
    name = "discover_communities"
    description = "Discover and search communities"

    def run(self, user_id: str, search_query: str = "", limit: int = 10):
        """
        Discover communities.
        
        Args:
            user_id: Current user ID
            search_query: Search keyword
            limit: Max results
        """
        try:
            cursor = self.datasource.discover_communities(search_query, limit)

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
        except Exception as e:
            return {"status": "error", "message": f"Failed to discover communities: {str(e)}"}


class JoinCommunityTool(BaseTool):
    """
    🔥 AGENTIC TOOL: Join Communities
    - Join user to community
    - Tracks reason for joining
    - Prevents duplicate joins
    """
    name = "join_community"
    description = "Join a community"

    def run(
        self,
        user_id: str,
        community_id: str,
        reason: str = "interest_match"
    ):
        """
        Join a community.
        
        Args:
            user_id: User joining
            community_id: Target community
            reason: Reason for joining (explainability)
        """
        try:
            user_obj_id = ObjectId(user_id)
            community_obj_id = ObjectId(community_id)

            # CHECK COMMUNITY
            community = self.datasource.get_community(community_id)
            if not community:
                return {"status": "error", "message": "Community not found"}

            # CHECK IF ALREADY MEMBER
            if user_obj_id in community.get("members", []):
                return {
                    "status": "success",
                    "message": "Already a member",
                    "already_joined": True
                }

            # JOIN COMMUNITY
            self.datasource.join_community(community_id, user_id)

            return {
                "status": "success",
                "message": "Successfully joined the community",
                "reason": reason
            }
        except Exception as e:
            return {"status": "error", "message": f"Failed to join community: {str(e)}"}


class SendMessageTool(BaseTool):
    """
    🔥 AGENTIC TOOL: Send Direct Messages
    - User-to-user messaging
    - Anti-spam cooldown (30 seconds)
    - Tracks agent-sent messages
    """
    name = "send_message"
    description = "Send a direct message to another user"

    def run(
        self,
        sender_id: str,
        receiver_id: str,
        message_text: str,
        cooldown_seconds: int = 30
    ):
        """
        Send a direct message.
        
        Args:
            sender_id: Sender user ID
            receiver_id: Receiver user ID
            message_text: Message content
            cooldown_seconds: Anti-spam cooldown
        """
        try:
            # VALIDATION
            if not sender_id or not receiver_id or not message_text:
                return {
                    "status": "error",
                    "message": "sender_id, receiver_id and message_text are required"
                }

            sender_obj = ObjectId(sender_id)
            receiver_obj = ObjectId(receiver_id)

            # CHECK USERS EXIST
            sender = self.datasource.users.find_one({"_id": sender_obj})
            receiver = self.datasource.users.find_one({"_id": receiver_obj})

            if not sender or not receiver:
                return {"status": "error", "message": "Sender or Receiver not found"}

            # ANTI-SPAM CHECK
            last_msg = self.datasource.messages.find_one(
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
                        "message": f"Please wait {cooldown_seconds}s before sending another message"
                    }

            # SEND MESSAGE
            message_doc = {
                "sender_id": sender_obj,
                "receiver_id": receiver_obj,
                "message_text": message_text.strip(),
                "timestamp": datetime.utcnow(),
                "is_read": False,
                "sent_by_agent": True  # 🔥 Agentic metadata
            }

            self.datasource.send_message(message_doc)

            return {
                "status": "success",
                "message": "Message sent successfully"
            }
        except Exception as e:
            return {"status": "error", "message": f"Failed to send message: {str(e)}"}


class ViewProfileTool(BaseTool):
    """
    🔥 AGENTIC TOOL: View User Profile
    - View user profile, posts, communities
    - Get follow counts and stats
    - Frontend-safe response
    """
    name = "view_profile"
    description = "View a user's profile and their social activity"

    def run(self, viewer_id: str, profile_user_id: str):
        """
        View user profile.
        
        Args:
            viewer_id: User viewing
            profile_user_id: Profile to view
        """
        try:
            # FETCH USER
            user = self.datasource.get_user_profile(profile_user_id)
            if not user:
                return {
                    "status": "error",
                    "message": "User not found"
                }

            # FETCH USER POSTS
            posts = self.datasource.get_user_timeline(profile_user_id)

            # FETCH USER COMMUNITIES
            communities = list(
                self.datasource.communities.find(
                    {"members": ObjectId(profile_user_id)},
                    {"_id": 1, "name": 1, "is_private": 1}
                )
            )

            return {
                "status": "success",
                "profile": {
                    "user_id": str(user["_id"]),
                    "username": user.get("username", "Unknown"),
                    "bio": user.get("bio", ""),
                    "profile_image": user.get("profile_image", ""),
                    "joined_at": user.get("created_at")
                },
                "stats": {
                    "total_posts": len(posts),
                    "total_communities": len(communities),
                    "followers_count": self.datasource.get_followers_count(profile_user_id)
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
                ]
            }
        except Exception as e:
            return {"status": "error", "message": f"Failed to view profile: {str(e)}"}


# =================== TOOL REGISTRY ===================

def get_social_tools(datasource):
    """
    🔥 RETURNS ALL SOCIAL TOOLS AS BASETTOOL INSTANCES
    Used by registry.py to include in agent tools
    """
    return {
        "create_post": CreatePostTool(datasource),
        "read_feed": ReadFeedTool(datasource),
        "like_post": LikePostTool(datasource),
        "discover_communities": DiscoverCommunitiesTool(datasource),
        "join_community": JoinCommunityTool(datasource),
        "send_message": SendMessageTool(datasource),
        "view_profile": ViewProfileTool(datasource)
    }
