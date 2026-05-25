#!/usr/bin/env python3
"""
QUICK START - Agentic AI System
================================

This script shows you how to use the AI system immediately.
No need to understand all the details - just follow along!
"""

import sys
import os

# Add project to path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

from controller import AgentController

def print_section(title):
    """Pretty print section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def main():
    print_section("🤖  AGENTIC AI - QUICK START")
    
    # Initialize the AI
    print("⏳ Initializing AI Controller...")
    controller = AgentController()
    print("✅ AI Controller Ready!\n")
    
    # Demo user
    user_id = "demo_user"
    
    # ========================================
    # EXAMPLE 1: Chat (No Authentication)
    # ========================================
    print_section("Example 1: Chat with AI")
    print('Query: "Hi, what can you help me with?"')
    
    response = controller.handle_query(
        "Hi, what can you help me with?",
        user_id=user_id
    )
    
    print(f"Response Type: {response['type']}")
    print(f"AI Says: {response['message']}\n")
    
    # ========================================
    # EXAMPLE 2: Search Products
    # ========================================
    print_section("Example 2: Search for Eco-Friendly Products")
    print('Query: "Show me bamboo products"')
    
    response = controller.handle_query(
        "Show me bamboo products",
        user_id=user_id
    )
    
    print(f"Response Type: {response['type']}")
    print(f"Intent: {response['intent']}")
    if response.get('data') and response['data'].get('products'):
        products = response['data']['products']
        print(f"Found: {response['data']['count']} products")
        if products:
            print(f"  Example: {products[0].get('name', 'Product')}")
    print(f"AI Says: {response['message']}\n")
    
    # ========================================
    # EXAMPLE 3: Get Recommendations
    # ========================================
    print_section("Example 3: Get Recommendations")
    print('Query: "Recommend sustainable products"')
    
    response = controller.handle_query(
        "Recommend sustainable products",
        user_id=user_id
    )
    
    print(f"Response Type: {response['type']}")
    print(f"Intent: {response['intent']}")
    if response.get('data') and response['data'].get('products'):
        count = len(response['data']['products'])
        print(f"Recommended: {count} products")
    print(f"AI Says: {response['message']}\n")
    
    # ========================================
    # EXAMPLE 4: Multi-turn Conversation
    # ========================================
    print_section("Example 4: Multi-Turn Conversation")
    
    queries = [
        "What eco products do you have?",
        "Show me the details",
        "Any suggestions?"
    ]
    
    for i, query in enumerate(queries, 1):
        print(f"Turn {i} - Query: '{query}'")
        response = controller.handle_query(query, user_id=user_id)
        
        if response['type'] == 'CHAT':
            print(f"         AI: {response['message'][:80]}...\n")
        else:
            print(f"         Intent: {response['intent']}")
            print(f"         Message: {response['message'][:60]}...\n")
    
    # ========================================
    # EXAMPLE 5: Actions Requiring Authentication
    # ========================================
    print_section("Example 5: Actions That Need Login")
    
    print("⚠️  These actions require authentication (login token):")
    print("  ❌ Add to cart")
    print("  ❌ Place order")
    print("  ❌ Create post")
    print("  ❌ Like post")
    print("  ❌ Send message")
    print("  ❌ Join community")
    
    print("\nTo test authenticated actions:")
    print("  1. Login on the frontend website")
    print("  2. Copy JWT token from browser console: localStorage.getItem('token')")
    print("  3. Pass it to the controller:\n")
    
    print("""  response = controller.handle_query(
      "add this to my cart",
      user_id="user_123",
      auth_token="your_jwt_token_here"  # ← Add this
  )""")
    
    # ========================================
    # NEXT STEPS
    # ========================================
    print_section("📚 Next Steps")
    
    print("""
1️⃣  READ DOCUMENTATION
   📄 README.md - Complete guide
   📄 FIXES_APPLIED.md - What was fixed
   
2️⃣  RUN TESTS
   $ python integration_test.py
   
3️⃣  USE IN YOUR APP
   - Import AgentController
   - Pass user queries
   - Display responses
   
4️⃣  TRY WITH FRONTEND
   - Use browser login
   - Pass JWT token
   - Test add-to-cart, create-post, etc.

5️⃣  CUSTOMIZE
   - Modify system prompts in brain/mistral_brain.py
   - Add new intents in contract.py
   - Create new backend API calls in controller.py
""")
    
    # ========================================
    # USAGE PATTERNS
    # ========================================
    print_section("💡 Common Usage Patterns")
    
    patterns = {
        "Chat": """
response = controller.handle_query(
    user_query="Hi there!",
    user_id="user123"
)
if response['type'] == 'CHAT':
    print(response['message'])
""",
        
        "Search": """
response = controller.handle_query(
    user_query="Show me eco products",
    user_id="user123"
)
products = response.get('data', {}).get('products', [])
for product in products:
    print(f"- {product['name']}: ${product['price']}")
""",
        
        "Action with Auth": """
response = controller.handle_query(
    user_query="Add this to my cart",
    user_id="user123",
    auth_token="jwt_token_from_login"
)
if response['type'] == 'SUCCESS':
    print("✅ Added to cart!")
else:
    print(f"❌ Error: {response['message']}")
""",
        
        "Social Action": """
response = controller.handle_query(
    user_query="Create a post about sustainability",
    user_id="user123",
    auth_token="jwt_token"
)
if response['type'] == 'SOCIAL_ACTION':
    post_id = response.get('data', {}).get('id')
    print(f"📝 Post created: {post_id}")
"""
    }
    
    for name, code in patterns.items():
        print(f"\n{name.upper()}:")
        print(code)
    
    # ========================================
    # TROUBLESHOOTING
    # ========================================
    print_section("🔧 Troubleshooting")
    
    print("""
❌ Error: Connection refused to Brain API
✅ Solution: Start Brain server first
   cd brain && python -m uvicorn mistral_brain:app --port 8000

❌ Error: Connection refused to Backend
✅ Solution: Start Backend server first
   cd Nova/EcoSoul-Jarvis/EcoSoul-Jarvis/backend && npm start

❌ Error: JWT token invalid
✅ Solution: Make sure you're logged in on frontend
   Check localStorage.getItem('token') is not null

❌ Error: Timeout after 60 seconds
✅ Solution: Brain model is loading (first time only)
   Subsequent requests will be faster. Be patient!

❌ Error: Intent is UNKNOWN
✅ Solution: Brain might not understand the query
   Try simpler queries or check brain logs
""")
    
    # ========================================
    # CAPABILITIES
    # ========================================
    print_section("✨ What AI Can Do")
    
    print("""
✅ E-COMMERCE
  • Search for products
  • Get recommendations
  • Add/remove from cart
  • Place orders
  • Track orders
  • Cancel orders

✅ SOCIAL MEDIA
  • Create posts
  • Like/unlike posts
  • View feed
  • Discover communities
  • Join communities
  • Send messages
  • View profiles

✅ INTELLIGENCE
  • Remember last product
  • Multi-turn conversations
  • Provide sustainability tips
  • Context-aware responses
  • Error recovery
""")
    
    # ========================================
    # FINAL MESSAGE
    # ========================================
    print_section("🎉 You're All Set!")
    
    print("""
Your Agentic AI System is now FULLY FUNCTIONAL!

Current Capabilities:
✅ E-Commerce (Search, Cart, Orders)
✅ Social Media (Posts, Communities, Messages)
✅ Multi-turn Conversations
✅ Context-Aware Responses
✅ Sustainability Consultant Mode

What to Do Next:
1. Explore the README.md
2. Run integration_test.py to verify everything
3. Try different queries and see how AI responds
4. Integrate into your frontend application
5. Test authenticated actions with JWT tokens

Questions? Check:
📄 README.md - Comprehensive documentation
📄 FIXES_APPLIED.md - What was fixed and how
🧪 integration_test.py - Test suite

Happy coding! 🚀
""")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Bye!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure:")
        print("1. Brain API is running on http://localhost:8000")
        print("2. Backend API is running on http://localhost:5002")
        print("3. .env file is configured correctly")
        sys.exit(1)
