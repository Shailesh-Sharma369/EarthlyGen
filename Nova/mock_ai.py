"""
Mock AI Server - Standalone Python Server
Provides AI responses without Brain API
Runs on port 9000 independently from Node.js backend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

# Load test data
TEST_DATA_PATH = os.path.join(os.path.dirname(__file__), 'backend', 'test-data.json')

def load_test_data():
    """Load mock responses from test-data.json"""
    try:
        with open(TEST_DATA_PATH, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ Could not load test-data.json: {e}")
        return None

TEST_DATA = load_test_data()

def get_mock_response(query):
    """Find matching mock response for query"""
    if not TEST_DATA:
        return {
            "type": "RESPONSE",
            "intent": "FALLBACK",
            "message": "I'm here to help! Try asking about products, social features, or navigation.",
            "response": "I'm here to help! Try asking about products, social features, or navigation."
        }
    
    query_lower = query.lower()
    
    # Collect all intents
    all_intents = []
    all_intents.extend(TEST_DATA.get('shopping_intents', []))
    all_intents.extend(TEST_DATA.get('social_intents', []))
    all_intents.extend(TEST_DATA.get('navigation_intents', []))
    all_intents.extend(TEST_DATA.get('account_intents', []))
    all_intents.extend(TEST_DATA.get('search_intents', []))
    all_intents.extend(TEST_DATA.get('help_intents', []))
    
    # Find best match
    for intent in all_intents:
        if query_lower in intent.get('query', '').lower() or \
           any(keyword in query_lower for keyword in intent.get('query', '').lower().split()):
            return intent
    
    # Fallback
    return TEST_DATA.get('fallback', {
        "type": "RESPONSE",
        "intent": "FALLBACK",
        "message": "I didn't understand that. Try asking about products, social features, or help.",
        "response": "I didn't understand that. Try asking about products, social features, or help."
    })

# =========================================
# HEALTH CHECK ENDPOINT
# =========================================
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "OK",
        "service": "Mock AI Server",
        "mock_mode": True
    }), 200

# =========================================
# MAIN AI ENDPOINT
# =========================================
@app.route('/handle_query', methods=['POST'])
def handle_query():
    """
    Main AI query handler
    Accepts: {user_query, user_id, auth_token, context}
    Returns: {type, intent, message, response, action}
    """
    try:
        data = request.get_json()
        user_query = data.get('user_query', '')
        user_id = data.get('user_id', 'guest')
        
        if not user_query:
            return jsonify({
                "success": False,
                "error": "Query cannot be empty"
            }), 400
        
        print(f"🤖 AI Query from {user_id}: \"{user_query}\"")
        
        # Get mock response
        mock_response = get_mock_response(user_query)
        
        response = {
            "success": True,
            "type": mock_response.get('type', 'RESPONSE'),
            "intent": mock_response.get('intent', 'UNKNOWN'),
            "message": mock_response.get('response', mock_response.get('message', 'Action completed')),
            "response": mock_response.get('response', mock_response.get('message', 'Action completed')),
            "action": mock_response.get('action', None),
            "is_mock": True
        }
        
        print(f"✅ AI Response: {response['type']} - {response['intent']}")
        return jsonify(response), 200
        
    except Exception as e:
        print(f"❌ AI Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# =========================================
# ALTERNATIVE ENDPOINT (compatible with aiRoutes.js)
# =========================================
@app.route('/query', methods=['POST'])
def query():
    """Alternative query endpoint for compatibility"""
    return handle_query()

# =========================================
# DEBUG ENDPOINT - List all intents
# =========================================
@app.route('/intents', methods=['GET'])
def list_intents():
    """List all available intents for debugging"""
    if not TEST_DATA:
        return jsonify({"error": "Test data not loaded"}), 500
    
    intents = {
        "shopping": len(TEST_DATA.get('shopping_intents', [])),
        "social": len(TEST_DATA.get('social_intents', [])),
        "navigation": len(TEST_DATA.get('navigation_intents', [])),
        "account": len(TEST_DATA.get('account_intents', [])),
        "search": len(TEST_DATA.get('search_intents', [])),
        "help": len(TEST_DATA.get('help_intents', []))
    }
    
    return jsonify({
        "total": sum(intents.values()),
        "by_category": intents
    }), 200

# =========================================
# START SERVER
# =========================================
if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_PORT', 9000))
    
    print("\n" + "="*60)
    print("🚀 Mock AI Server Starting...")
    print("="*60)
    print(f"✅ Flask server starting on http://localhost:{port}")
    print(f"✅ Mock mode: ENABLED")
    print(f"✅ Test data: {'LOADED' if TEST_DATA else 'NOT FOUND'}")
    print("\n📋 Endpoints:")
    print(f"  GET  http://localhost:{port}/health     - Health check")
    print(f"  POST http://localhost:{port}/handle_query - Main AI endpoint")
    print(f"  GET  http://localhost:{port}/intents      - List all intents")
    print("="*60 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True,
        use_reloader=False  # Disable reloader to prevent duplicate output
    )
