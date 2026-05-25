from flask import Flask, request, jsonify, send_from_directory, Blueprint
from flask_cors import CORS
import os
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

try:
    from assistant_logic import handle_command
except Exception as e:
    print(f"Warning: Could not import assistant_logic: {str(e)}")
    handle_command = lambda cmd: {"success": False, "message": "Assistant not available"}

import uuid
from functools import wraps
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename

# set static folder as current directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_FOLDER = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "mp4", "webm", "mov"}

# Create uploads folder if it doesn't exist
os.makedirs(UPLOADS_FOLDER, exist_ok=True)

app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
app.config["UPLOAD_FOLDER"] = UPLOADS_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB max file size
CORS(app)

# Create API blueprint for all API routes
api_bp = Blueprint("api", __name__, url_prefix="/api")

# Global error handlers to return JSON for all errors
@app.errorhandler(400)
def bad_request(error):
    return jsonify({"success": False, "message": f"Bad request: {str(error)}"}), 400

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({"success": False, "message": "Unauthorized"}), 401

@app.errorhandler(403)
def forbidden(error):
    return jsonify({"success": False, "message": "Forbidden"}), 403

@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "message": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"success": False, "message": f"Server error: {str(error)}"}), 500

@app.errorhandler(Exception)
def handle_exception(error):
    import traceback
    print(f"❌ Unhandled error: {str(error)}")
    traceback.print_exc()
    return jsonify({"success": False, "message": f"Server error: {str(error)}"}), 500

# In-memory user storage (for development)
users_db = {}
tokens_db = {}
stories_db = {}  # {story_id: story_data}
user_stories_db = {}  # {user_id: [story_ids]}
companies_db = {}  # {email: company_data}

# -------- Auth Endpoints (in Blueprint) --------
@api_bp.route("/auth/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        email = data.get("email", "").lower()
        password = data.get("password", "")
        fullName = data.get("fullName", "")
        confirmPassword = data.get("confirmPassword", "")
        
        # Validation
        if not email or not password or not fullName:
            return jsonify({"success": False, "message": "Missing required fields"}), 400
        
        if password != confirmPassword:
            return jsonify({"success": False, "message": "Passwords do not match"}), 400
        
        if len(password) < 8:
            return jsonify({"success": False, "message": "Password must be at least 8 characters"}), 400
        
        # Check if user exists
        if email in users_db:
            return jsonify({"success": False, "message": "Email already registered"}), 400
        
        # Create user
        user_id = str(uuid.uuid4())
        users_db[email] = {
            "id": user_id,
            "fullName": fullName,
            "email": email,
            "password": password  # In production, hash this!
        }
        
        # Generate token
        token = str(uuid.uuid4())
        tokens_db[token] = email
        
        return jsonify({
            "success": True,
            "message": "Account created successfully",
            "token": token,
            "user": {
                "id": user_id,
                "fullName": fullName,
                "email": email
            }
        }), 201
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@api_bp.route("/auth/signin", methods=["POST"])
def signin():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        email = data.get("email", "").lower()
        password = data.get("password", "")
        
        # Validation
        if not email or not password:
            return jsonify({"success": False, "message": "Email and password required"}), 400
        
        # Check if user exists
        if email not in users_db:
            return jsonify({"success": False, "message": "Invalid email or password"}), 401
        
        user = users_db[email]
        
        # Check password
        if user["password"] != password:  # In production, use password hashing!
            return jsonify({"success": False, "message": "Invalid email or password"}), 401
        
        # Generate token
        token = str(uuid.uuid4())
        tokens_db[token] = email
        
        return jsonify({
            "success": True,
            "message": "Signed in successfully",
            "token": token,
            "user": {
                "id": user["id"],
                "fullName": user["fullName"],
                "email": user["email"]
            }
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


# Company auth endpoints (in Blueprint)
@api_bp.route("/auth/company/signup", methods=["POST"])
def company_signup():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        email = data.get("email", "").lower()
        password = data.get("password", "")
        companyName = data.get("companyName", "")
        
        # Validation
        if not email or not password or not companyName:
            return jsonify({"success": False, "message": "Missing required fields"}), 400
        
        if len(password) < 8:
            return jsonify({"success": False, "message": "Password must be at least 8 characters"}), 400
        
        # Check if company exists
        if email in companies_db:
            return jsonify({"success": False, "message": "Email already registered"}), 400
        
        # Create company
        company_id = str(uuid.uuid4())
        companies_db[email] = {
            "id": company_id,
            "companyName": companyName,
            "email": email,
            "password": password,
            "phone": data.get("phone", ""),
            "gstNumber": data.get("gstNumber", ""),
            "address": data.get("address", ""),
            "businessType": data.get("businessType", "")
        }
        
        # Generate token
        token = str(uuid.uuid4())
        tokens_db[token] = {"type": "company", "email": email}
        
        return jsonify({
            "success": True,
            "message": "Company account created successfully",
            "token": token,
            "companyId": company_id,
            "companyName": companyName
        }), 201
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@api_bp.route("/auth/company/signin", methods=["POST"])
def company_signin():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        email = data.get("email", "").lower()
        password = data.get("password", "")
        
        # Validation
        if not email or not password:
            return jsonify({"success": False, "message": "Email and password required"}), 400
        
        # Check if company exists
        if email not in companies_db:
            return jsonify({"success": False, "message": "Invalid email or password"}), 401
        
        company = companies_db[email]
        
        # Check password
        if company["password"] != password:
            return jsonify({"success": False, "message": "Invalid email or password"}), 401
        
        # Generate token
        token = str(uuid.uuid4())
        tokens_db[token] = {"type": "company", "email": email}
        
        return jsonify({
            "success": True,
            "message": "Signed in successfully",
            "token": token,
            "companyId": company["id"],
            "companyName": company["companyName"]
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


def serve_index():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/login")
def serve_login():
    return send_from_directory(BASE_DIR, "login1.html")

@app.route("/account")
def serve_account():
    return send_from_directory(BASE_DIR, "account.html")

# -------- Helper Functions --------
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def verify_token(token):
    return token in tokens_db

def get_user_from_token(token):
    if token in tokens_db:
        email = tokens_db[token]
        if isinstance(email, dict):  # Company token
            return None
        return users_db.get(email)
    return None

# -------- File Upload Endpoint (in Blueprint) --------
@api_bp.route("/upload", methods=["POST"])
def upload_file():
    try:
        print("📤 Upload endpoint called")
        
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        print(f"Token received: {token[:20]}..." if token else "No token")
        
        if not token or not verify_token(token):
            print("❌ Token verification failed")
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        
        print("✅ Token verified")
        
        if "media" not in request.files:
            print("❌ No media file in request")
            return jsonify({"success": False, "message": "No file provided"}), 400
        
        file = request.files["media"]
        print(f"📁 File received: {file.filename}")
        
        if file.filename == "":
            print("❌ File name is empty")
            return jsonify({"success": False, "message": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            print(f"❌ File type not allowed: {file.filename}")
            return jsonify({"success": False, "message": "File type not allowed"}), 400
        
        print("✅ File validation passed")
        
        # Generate unique filename
        file_ext = file.filename.rsplit(".", 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(UPLOADS_FOLDER, unique_filename)
        
        print(f"💾 Saving to: {file_path}")
        
        # Save file
        file.save(file_path)
        
        print(f"✅ File saved successfully")
        
        # Return relative URL for frontend to use
        media_url = f"/uploads/{unique_filename}"
        
        response = {
            "success": True,
            "message": "File uploaded successfully",
            "media": media_url
        }
        
        print(f"📤 Returning response: {response}")
        return jsonify(response), 200
    
    except Exception as e:
        import traceback
        print(f"❌ Upload error: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Upload error: {str(e)}"}), 500

# -------- Story Endpoints (in Blueprint) --------
@api_bp.route("/stories", methods=["POST"])
def create_story():
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        
        if not verify_token(token):
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        
        user = get_user_from_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        data = request.get_json()
        
        required_fields = ["media", "mediaType"]
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "message": f"Missing field: {field}"}), 400
        
        # Create story
        story_id = str(uuid.uuid4())
        story = {
            "_id": story_id,
            "userId": user["id"],
            "userName": user["fullName"],
            "userEmail": user["email"],
            "media": data.get("media"),
            "caption": data.get("caption", ""),
            "textOverlay": data.get("textOverlay", ""),
            "mediaType": data.get("mediaType"),
            "privacy": data.get("privacy", "public"),
            "reactions": [],
            "views": [],
            "createdAt": datetime.now().isoformat(),
            "expiresAt": (datetime.now() + timedelta(hours=24)).isoformat()
        }
        
        # Store story
        stories_db[story_id] = story
        
        # Link to user
        if user["id"] not in user_stories_db:
            user_stories_db[user["id"]] = []
        user_stories_db[user["id"]].append(story_id)
        
        return jsonify({
            "success": True,
            "message": "Story created successfully",
            "story": story
        }), 201
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Story creation error: {str(e)}"}), 500

@api_bp.route("/stories", methods=["GET"])
def get_stories():
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        
        if not verify_token(token):
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        
        # Get all non-expired stories
        current_time = datetime.now()
        active_stories = []
        
        for story_id, story in stories_db.items():
            expires_at = datetime.fromisoformat(story["expiresAt"])
            if expires_at > current_time:
                active_stories.append(story)
        
        # Group by user
        grouped = {}
        for story in sorted(active_stories, key=lambda x: x["createdAt"], reverse=True):
            user_id = story["userId"]
            if user_id not in grouped:
                grouped[user_id] = {
                    "userId": user_id,
                    "userName": story["userName"],
                    "stories": []
                }
            grouped[user_id]["stories"].append(story)
        
        return jsonify({
            "success": True,
            "stories": list(grouped.values())
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Fetch error: {str(e)}"}), 500

@api_bp.route("/stories/<story_id>/view", methods=["POST"])
def mark_story_viewed(story_id):
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        
        if not verify_token(token):
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        
        user = get_user_from_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        if story_id not in stories_db:
            return jsonify({"success": False, "message": "Story not found"}), 404
        
        story = stories_db[story_id]
        
        # Add view if not already viewed
        if user["id"] not in [v["userId"] for v in story["views"]]:
            story["views"].append({
                "userId": user["id"],
                "userName": user["fullName"],
                "viewedAt": datetime.now().isoformat()
            })
        
        return jsonify({
            "success": True,
            "message": "View recorded",
            "views": len(story["views"])
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": f"View error: {str(e)}"}), 500

@api_bp.route("/stories/<story_id>/react", methods=["POST"])
def react_to_story(story_id):
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        
        if not verify_token(token):
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        
        user = get_user_from_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        if story_id not in stories_db:
            return jsonify({"success": False, "message": "Story not found"}), 404
        
        data = request.get_json()
        emoji = data.get("emoji", "❤️")
        
        story = stories_db[story_id]
        
        # Add or update reaction
        existing = next((r for r in story["reactions"] if r["userId"] == user["id"]), None)
        if existing:
            existing["emoji"] = emoji
        else:
            story["reactions"].append({
                "userId": user["id"],
                "userName": user["fullName"],
                "emoji": emoji
            })
        
        return jsonify({
            "success": True,
            "message": "Reaction recorded",
            "reactions": story["reactions"]
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Reaction error: {str(e)}"}), 500

@api_bp.route("/stories/<story_id>", methods=["DELETE"])
def delete_story(story_id):
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        
        if not verify_token(token):
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        
        user = get_user_from_token(token)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        if story_id not in stories_db:
            return jsonify({"success": False, "message": "Story not found"}), 404
        
        story = stories_db[story_id]
        
        # Verify ownership
        if story["userId"] != user["id"]:
            return jsonify({"success": False, "message": "Not authorized to delete"}), 403
        
        # Delete story file if exists
        if story["media"].startswith("/uploads/"):
            file_path = os.path.join(BASE_DIR, story["media"])
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except:
                    pass
        
        # Remove from dbs
        del stories_db[story_id]
        if user["id"] in user_stories_db:
            user_stories_db[user["id"]] = [s for s in user_stories_db[user["id"]] if s != story_id]
        
        return jsonify({
            "success": True,
            "message": "Story deleted"
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Delete error: {str(e)}"}), 500

# Serve Uploaded Files
@app.route("/uploads/<filename>")
def serve_upload(filename):
    return send_from_directory(UPLOADS_FOLDER, filename)

# API Endpoint for Assistant (direct app route, not in blueprint)
@app.route("/command", methods=["POST"])
def command_route():
    data = request.get_json()
    command = data.get("command", "").lower()
    result = handle_command(command)
    return jsonify(result)

# ===== REGISTER BLUEPRINT AFTER ALL API ROUTES ARE DEFINED =====
app.register_blueprint(api_bp)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5002, debug=True)
