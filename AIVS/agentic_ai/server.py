#!/usr/bin/env python3
"""
server.py
=========
Python HTTP Server - Wraps AgentController for Express Backend
Runs on port 9000
Provides REST endpoints for AI queries

Usage:
  python server.py
  OR
  python -m agentic_ai.server
"""

import sys

# Fix Windows CP1252 terminal emoji crash — must be set before any print()
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass  # Python < 3.7 fallback

import os
from dotenv import load_dotenv
import json
import logging
import uuid
import base64
import tempfile
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
from urllib.parse import urlparse, urlunparse

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.absolute()
sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
print(f"Loaded BRAIN_API_URL from env: {os.getenv('BRAIN_API_URL')}")

# Session memory (imported here so server can seed it from client context)
try:
    from memory.session_memory import SessionMemory
except Exception as _sm_err:
    SessionMemory = None

# ========================================
# LOGGING SETUP
# ========================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

AI_NAME = os.getenv("AI_NAME", "Ruhi")


def _build_guest_user_id() -> str:
    return f"guest_{uuid.uuid4().hex[:10]}"


def _derive_brain_health_url() -> str:
    """
    Resolve health endpoint URL from env.
    Defaults to local brain health endpoint.
    """
    configured = (os.getenv("BRAIN_HEALTH_URL") or "").strip()
    if configured:
        return configured

    brain_api = (os.getenv("BRAIN_API_URL") or "").strip()
    if not brain_api:
        return "https://unseditious-gloria-soothfastly.ngrok-free.dev/health"

    parsed = urlparse(brain_api)
    return urlunparse(parsed._replace(path="/health"))


def _map_destination_to_action(destination: str) -> str:
    normalized = (destination or "").strip().lower()
    destination_actions = {
        "home":        "NAVIGATE_HOME",
        "products":    "NAVIGATE_PRODUCTS",
        "product":     "NAVIGATE_PRODUCTS",
        "shop":        "NAVIGATE_SHOP",
        "social":      "NAVIGATE_SOCIAL",
        "feed":        "NAVIGATE_SOCIAL",
        "account":     "NAVIGATE_ACCOUNT",
        "profile":     "NAVIGATE_PROFILE",
        "cart":        "NAVIGATE_CART",
        "basket":      "NAVIGATE_CART",
        "orders":      "NAVIGATE_ORDERS",
        "order":       "NAVIGATE_ORDERS",
        "payment":     "NAVIGATE_PAYMENT",
        "pay":         "NAVIGATE_PAYMENT",
        "checkout":    "NAVIGATE_PAYMENT",
        # Social tabs — each maps to its own action (not collapsed into NAVIGATE_SOCIAL)
        "communities": "NAVIGATE_COMMUNITIES",
        "community":   "NAVIGATE_COMMUNITIES",
        "groups":      "NAVIGATE_COMMUNITIES",
        "messages":    "NAVIGATE_MESSAGES",
        "message":     "NAVIGATE_MESSAGES",
        "inbox":       "NAVIGATE_MESSAGES",
        "dm":          "NAVIGATE_MESSAGES",
        "explore":     "NAVIGATE_EXPLORE",
        "discover":    "NAVIGATE_EXPLORE",
        # Account sub-pages
        "dashboard":   "NAVIGATE_ACCOUNT",
        "my account":  "NAVIGATE_ACCOUNT",
        "settings":    "NAVIGATE_ACCOUNT",
        "addresses":   "NAVIGATE_ACCOUNT",
        "address":     "NAVIGATE_ACCOUNT",
    }
    return destination_actions.get(normalized, "NAVIGATE_HOME")


def _derive_action_payload(result: Dict[str, Any]) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    action = result.get("action")
    payload = result.get("payload")

    data = result.get("data")
    data_dict = data if isinstance(data, dict) else None
    if action:
        return action, payload if isinstance(payload, dict) else data_dict

    intent = str(result.get("intent") or "").strip().upper()

    if intent == "NAVIGATE":
        destination = ""
        if data_dict:
            destination = str(data_dict.get("destination") or data_dict.get("page") or "")
        return _map_destination_to_action(destination), data_dict

    if intent == "OPEN_CART":
        return "NAVIGATE_CART", data_dict

    # FIXED: was "NAVIGATE_PRODUCTS" — the explicit action from controller takes priority,
    # but this fallback must also point to the detail page.
    if intent == "OPEN_PRODUCT":
        return "NAVIGATE_PRODUCT_DETAIL", data_dict

    if intent == "SEARCH_PRODUCT":
        return "SEARCH_PRODUCTS", data_dict

    # ADD_TO_CART: controller already mutated the cart on the backend.
    # Returning action=None lets ruhi.js show the success card and update
    # the cart badge without triggering a duplicate addToCart() call.
    if intent == "ADD_TO_CART":
        return None, data_dict

    # Social feed — navigate to social hub
    if intent == "READ_FEED":
        return "NAVIGATE_SOCIAL", data_dict

    # Discover communities — open communities tab
    if intent == "DISCOVER_COMMUNITIES":
        return "NAVIGATE_COMMUNITIES", data_dict

    # CREATE_POST — navigate to social page with ?action=create so the UI opens the post form
    if intent == "CREATE_POST":
        return "CREATE_POST", data_dict

    # REMOVE_FROM_CART: backend already removed item, just show a card.
    if intent == "REMOVE_FROM_CART":
        return None, data_dict

    return None, data_dict

# ========================================
# IMPORTS
# ========================================
try:
    from flask import Flask, request, jsonify, Response
    from flask_cors import CORS
    from controller import AgentController, call_brain
    logger.info("✅ All imports successful")
except ImportError as e:
    logger.error(f"❌ Import error: {e}")
    logger.error("Install dependencies: pip install flask flask-cors requests")
    sys.exit(1)

# ========================================
# FLASK APP SETUP
# ========================================
app = Flask(__name__)
CORS(app)

# Initialize controller
try:
    controller = AgentController()
    logger.info("✅ AgentController initialized")
except Exception as e:
    logger.error(f"❌ Failed to initialize controller: {e}")
    controller = None

# ========================================
# HEALTH CHECK
# ========================================
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        # Fresh live check — not stale init-time cache
        backend_status = controller.verify_backend_connection() if controller else None
        return jsonify({
            "status": "healthy",
            "service": f"{AI_NAME} AI Server",
            "assistant_name": AI_NAME,
            "controller": "ready" if controller else "not initialized",
            "nova_backend": backend_status,
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
        }), 200
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# ========================================
# MAIN QUERY ENDPOINT
# ========================================
@app.route('/handle_query', methods=['POST'])
def handle_query():
    """
    Main AI query endpoint
    
    Request JSON:
    {
        "user_query": "your question",
        "user_id": "user_123",
        "auth_token": "jwt_token",
        "context": {}
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        user_query = data.get("user_query", "").strip()
        if not user_query:
            return jsonify({"error": "user_query is required"}), 400
        
        user_id = data.get("user_id") or _build_guest_user_id()
        auth_token = data.get("auth_token")
        context = data.get("context", {})

        # Seed SessionMemory from client-sent chatHistory so the brain has
        # conversation context even after a server restart.
        if SessionMemory:
            client_history = context.get("chatHistory", [])
            if client_history:
                mem = SessionMemory.get(user_id)
                # Only seed if server-side memory is empty (fresh restart)
                if not mem.get("chat_history"):
                    for turn in client_history[-6:]:
                        if turn.get("user") and turn.get("ai"):
                            SessionMemory.add_chat_history(user_id, turn["user"], turn["ai"])

        logger.info(f"🤖 Query from {user_id}: '{user_query}'")

        # Call controller
        if not controller:
            return jsonify({
                "error": "Controller not initialized",
                "message": "AI service unavailable"
            }), 503
        
        result = controller.handle_query(
            user_query=user_query,
            user_id=user_id,
            auth_token=auth_token
        )

        derived_action, derived_payload = _derive_action_payload(result)
        
        logger.info(f"✅ Response type: {result.get('type')}, intent: {result.get('intent')}")
        
        # Normalize response
        response = {
            "success": True,
            "type": result.get("type", "UNKNOWN"),
            "intent": result.get("intent"),
            "message": result.get("message") or result.get("response") or result.get("consultation"),
            "action": derived_action,
            "data": result.get("data"),
            "payload": derived_payload,
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"❌ Query error: {e}", exc_info=True)
        return jsonify({
            "error": str(e),
            "message": "Failed to process query"
        }), 500

# ========================================
# CHAT ENDPOINT (CONVERSATIONAL)
# ========================================
@app.route('/chat', methods=['POST'])
def chat():
    """
    Chat-only endpoint for conversational responses
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        message = data.get("message", "").strip()
        if not message:
            return jsonify({"error": "message is required"}), 400
        
        user_id = data.get("user_id") or _build_guest_user_id()
        
        logger.info(f"💬 Chat from {user_id}: '{message}'")
        
        if not controller:
            return jsonify({"error": "Controller not initialized"}), 503
        
        result = controller.handle_query(
            user_query=message,
            user_id=user_id,
            auth_token=data.get("auth_token")
        )
        
        return jsonify({
            "success": True,
            "type": "CHAT",
            "message": result.get("message") or result.get("response"),
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Chat error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# ========================================
# BRAIN HEALTH CHECK
# ========================================
@app.route('/brain/health', methods=['GET'])
def brain_health():
    """Check if brain API is accessible"""
    try:
        import requests
        brain_url = _derive_brain_health_url()
        response = requests.get(
            brain_url,
            timeout=5,
            headers={"ngrok-skip-browser-warning": "true"},
        )
        
        if response.status_code == 200:
            return jsonify({
                "status": "healthy",
                "brain": response.json()
            }), 200
        else:
            return jsonify({
                "status": "offline",
                "code": response.status_code
            }), 503
    except Exception as e:
        logger.warning(f"Brain health check failed: {e}")
        return jsonify({
            "status": "offline",
            "error": str(e)
        }), 503

# ========================================
# STATUS ENDPOINT
# ========================================
@app.route('/status', methods=['GET'])
def status():
    """Get full system status"""
    try:
        import requests
        
        brain_status = "offline"
        try:
            brain_url = _derive_brain_health_url()
            brain_response = requests.get(
                brain_url,
                timeout=3,
                headers={"ngrok-skip-browser-warning": "true"},
            )
            brain_status = "healthy" if brain_response.status_code == 200 else "offline"
        except:
            brain_status = "offline"
        
        backend_status = controller.verify_backend_connection() if controller else {"connected": False}

        return jsonify({
            "service": "Ruhi AI Server",
            "status": "running",
            "assistant_name": AI_NAME,
            "controller": "ready" if controller else "not initialized",
            "brain": brain_status,
            "nova_backend": backend_status,
            "version": "1.0.0",
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/backend/health', methods=['GET'])
def backend_health():
    """Explicitly verify Nova backend connectivity used by controller orchestration."""
    if not controller:
        return jsonify({"connected": False, "error": "Controller not initialized"}), 503

    status = controller.verify_backend_connection()
    code = 200 if status.get("connected") else 503
    return jsonify(status), code

# ========================================
# ERROR HANDLERS
# ========================================
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(error):
    logger.error(f"Server error: {error}")
    return jsonify({"error": "Internal server error"}), 500


# ========================================
# VOICE ENDPOINTS (OPTIONAL)
# ========================================
@app.route('/voice/tts', methods=['POST'])
def tts():
    """Convert text to speech audio (WAV base64)."""
    try:
        data = request.get_json() or {}
        text = (data.get("text") or "").strip()
        if not text:
            return jsonify({"success": False, "error": "text is required"}), 400

        try:
            import pyttsx3
        except ImportError:
            return jsonify({
                "success": False,
                "error": "TTS dependency missing",
                "hint": "Install pyttsx3: pip install pyttsx3"
            }), 501

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            engine = pyttsx3.init()
            rate = int(data.get("rate", 180))
            engine.setProperty("rate", rate)
            engine.save_to_file(text, tmp_path)
            engine.runAndWait()

            with open(tmp_path, "rb") as audio_file:
                audio_b64 = base64.b64encode(audio_file.read()).decode("utf-8")

            return jsonify({
                "success": True,
                "assistant": AI_NAME,
                "mime": "audio/wav",
                "audio_base64": audio_b64,
                "text": text
            }), 200
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass
    except Exception as error:
        logger.error(f"TTS error: {error}", exc_info=True)
        return jsonify({"success": False, "error": str(error)}), 500


@app.route('/voice/stt', methods=['POST'])
def stt():
    """Convert WAV base64 audio to text using SpeechRecognition."""
    try:
        data = request.get_json() or {}
        audio_base64 = data.get("audio_base64")
        language = data.get("language", "en-US")

        if not audio_base64:
            return jsonify({"success": False, "error": "audio_base64 is required"}), 400

        try:
            import speech_recognition as sr
        except ImportError:
            return jsonify({
                "success": False,
                "error": "STT dependency missing",
                "hint": "Install SpeechRecognition: pip install SpeechRecognition"
            }), 501

        audio_bytes = base64.b64decode(audio_base64)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            recognizer = sr.Recognizer()
            with sr.AudioFile(tmp_path) as source:
                audio_data = recognizer.record(source)

            transcript = recognizer.recognize_google(audio_data, language=language)

            return jsonify({
                "success": True,
                "assistant": AI_NAME,
                "transcript": transcript,
                "language": language
            }), 200
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass
    except Exception as error:
        logger.error(f"STT error: {error}", exc_info=True)
        return jsonify({"success": False, "error": str(error)}), 500

# ========================================
# MAIN
# ========================================
if __name__ == '__main__':
    PORT = int(os.getenv("PYTHON_SERVER_PORT", 9000))
    
    logger.info("=" * 60)
    logger.info("🚀 Ruhi AI Server Starting...")
    logger.info("=" * 60)
    logger.info(f"Assistant: {AI_NAME}")
    logger.info(f"Port: {PORT}")
    logger.info(f"BRAIN_API_URL: {os.getenv('BRAIN_API_URL', 'https://unseditious-gloria-soothfastly.ngrok-free.dev/generate')}")
    logger.info(f"BRAIN_HEALTH_URL: {_derive_brain_health_url()}")
    logger.info(f"BACKEND_BASE_URL: {os.getenv('BACKEND_BASE_URL', 'http://localhost:5002')}")
    logger.info("=" * 60)
    
    try:
        app.run(
            host='127.0.0.1',
            port=PORT,
            debug=os.getenv("DEBUG", "0") == "1",
            threaded=True
        )
    except KeyboardInterrupt:
        logger.info("\n⚠️ Server shutting down...")
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        sys.exit(1)
