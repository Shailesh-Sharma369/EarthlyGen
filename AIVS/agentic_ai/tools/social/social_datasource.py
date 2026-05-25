# tools/social_datasource.py

import os
from urllib.parse import urlparse
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

class SocialDataSource:

    def __init__(self):
        uri = os.getenv("MONGOURI")
        if not uri:
            raise RuntimeError(
                "MONGOURI environment variable is not set. "
                "Add it to your .env file."
            )
        # Extract database name from the URI path segment
        parsed = urlparse(uri)
        db_name = parsed.path.lstrip("/").split("?")[0] or "ecosoul"

        self.client = MongoClient(uri)
        self.db = self.client[db_name]

        self.users = self.db["users"]
        self.posts = self.db["posts"]
        self.messages = self.db["messages"]
        self.groups = self.db["groups"]   # Nova backend stores communities as 'groups'

    # ---------- POSTS ----------
    def create_post(self, data: dict):
        data["created_at"] = datetime.utcnow()
        return self.posts.insert_one(data)

    def get_post(self, post_id):
        return self.posts.find_one({"_id": ObjectId(post_id)})

    def update_post(self, post_id, update):
        return self.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": update}
        )

    # ---------- LIKES ----------
    def like_post(self, post_id, user_id):
        return self.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$addToSet": {"likes": ObjectId(user_id)}}
        )

    def unlike_post(self, post_id, user_id):
        return self.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$pull": {"likes": ObjectId(user_id)}}
        )

    # ---------- FEED ----------
    def read_feed(self, query, page=1, limit=10):
        skip = (page - 1) * limit
        return list(
            self.posts.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

    # ---------- MESSAGES ----------
    def send_message(self, data):
        data["timestamp"] = datetime.utcnow()
        return self.messages.insert_one(data)

    # ---------- GROUPS / COMMUNITIES ----------
    def join_community(self, community_id, user_id, reason):
        self.groups.update_one(
            {"_id": ObjectId(community_id)},
            {"$addToSet": {"members": ObjectId(user_id)}}
        )

