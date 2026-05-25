#!/usr/bin/env python3
"""
integration_test.py
===================
Test the complete Agentic AI Controller Integration
- Test Brain API connection
- Test Backend API connection
- Test full query flow (Brain → Controller → Backend)
"""

import os
import sys
import json
import time
import requests

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

from controller import AgentController, call_brain, BRAIN_API_URL, BACKEND_BASE_URL
from contract import Intent

# ========================================
# TEST CONFIGURATION
# ========================================
BRAIN_API = os.getenv("BRAIN_API_URL", "https://unseditious-gloria-soothfastly.ngrok-free.dev/generate")
BACKEND_API = os.getenv("BACKEND_BASE_URL", "http://localhost:5002")

# Color output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

def test_header(title):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{title.center(60)}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_success(msg):
    print(f"{GREEN}✅ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}❌ {msg}{RESET}")

def print_warning(msg):
    print(f"{YELLOW}⚠️  {msg}{RESET}")

def print_info(msg):
    print(f"{BLUE}ℹ️  {msg}{RESET}")

# ========================================
# TEST 1: Brain API Connectivity
# ========================================
def test_brain_api():
    test_header("TEST 1: Brain API Connectivity")
    
    print(f"Testing Brain API at: {BRAIN_API}")
    
    try:
        # Test health endpoint first
        health_url = BRAIN_API.replace("/generate", "/health")
        print(f"Health Check: {health_url}")
        
        response = requests.get(health_url, timeout=10)
        if response.status_code == 200:
            health = response.json()
            print_success("Brain API is healthy")
            print(f"  Model loaded: {health.get('model_loaded')}")
            return True
        else:
            print_error(f"Brain health check failed: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to Brain API at {BRAIN_API}")
        print_info("Make sure Brain server is running:")
        print_info("  cd brain && python -m uvicorn mistral_brain:app --port 8000")
        return False
    except Exception as e:
        print_error(f"Brain API test failed: {e}")
        return False

# ========================================
# TEST 2: Backend API Connectivity
# ========================================
def test_backend_api():
    test_header("TEST 2: Backend API Connectivity")
    
    print(f"Testing Backend API at: {BACKEND_API}")
    
    try:
        response = requests.get(f"{BACKEND_API}/api/products", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict):
                count = len(data.get("products", data.get("data", [])))
                print_success(f"Backend API is responding ({count} products)")
            else:
                print_success("Backend API is responding")
            return True
        else:
            print_warning(f"Backend returned {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to Backend API at {BACKEND_API}")
        print_info("Make sure Backend server is running:")
        print_info("  cd Nova/EcoSoul-Jarvis/EcoSoul-Jarvis && npm start")
        return False
    except Exception as e:
        print_error(f"Backend API test failed: {e}")
        return False

# ========================================
# TEST 3: Brain Inference
# ========================================
def test_brain_inference():
    test_header("TEST 3: Brain Inference (Intent Classification)")
    
    test_queries = [
        ("show me eco-friendly products", "SEARCH_PRODUCT"),
        ("add a bamboo toothbrush to my cart", "ADD_TO_CART"),
        ("create a post about sustainability", "CREATE_POST"),
        ("like this post", "LIKE_POST"),
        ("show me communities", "DISCOVER_COMMUNITIES"),
        ("hi", "CHAT"),
    ]
    
    passed = 0
    failed = 0
    
    for query, expected_intent in test_queries:
        print(f"\nQuery: '{query}'")
        result = call_brain(query)
        
        print(f"  Mode: {result.get('mode')}")
        
        if result.get("mode") == "CHAT":
            print(f"  Message: {result.get('message')[:80]}...")
            print_success("CHAT response")
            passed += 1
        else:
            decision = result.get("decision", {})
            intent = decision.get("intent")
            consultation = decision.get("consultation", "")
            
            print(f"  Intent: {intent}")
            if consultation:
                print(f"  Consultation: {consultation[:60]}...")
            
            if intent == expected_intent:
                print_success(f"Intent matched: {expected_intent}")
                passed += 1
            else:
                print_warning(f"Intent mismatch: got {intent}, expected {expected_intent}")
                failed += 1
    
    print(f"\n{YELLOW}Brain Inference Results: {passed} passed, {failed} failed{RESET}")
    return failed == 0

# ========================================
# TEST 4: Controller Integration
# ========================================
def test_controller():
    test_header("TEST 4: Controller Integration Flow")
    
    controller = AgentController(BACKEND_API)
    user_id = "test_user_integration"
    
    test_cases = [
        {
            "name": "Search Products",
            "query": "show me eco-friendly products",
            "expected_type": "SUCCESS"
        },
        {
            "name": "Get Recommendations",
            "query": "recommend sustainable items",
            "expected_type": "SUCCESS"
        },
        {
            "name": "Chat (No Auth Required)",
            "query": "hi there",
            "expected_type": "CHAT"
        }
    ]
    
    passed = 0
    failed = 0
    
    for test in test_cases:
        print(f"\nTest: {test['name']}")
        print(f"  Query: '{test['query']}'")
        
        try:
            response = controller.handle_query(
                test['query'],
                user_id=user_id,
                auth_token=None
            )
            
            print(f"  Response Type: {response.get('type')}")
            print(f"  Intent: {response.get('intent')}")
            
            if response.get('message'):
                print(f"  Message: {response.get('message')[:80]}...")
            
            if response.get('type') == test['expected_type']:
                print_success(f"Response type matched")
                passed += 1
            else:
                print_warning(f"Response type mismatch: got {response.get('type')}, expected {test['expected_type']}")
                failed += 1
                
        except Exception as e:
            print_error(f"Controller test failed: {e}")
            failed += 1
    
    print(f"\n{YELLOW}Controller Results: {passed} passed, {failed} failed{RESET}")
    return failed == 0

# ========================================
# TEST 5: Session Memory
# ========================================
def test_session_memory():
    test_header("TEST 5: Session Memory")
    
    from memory.session_memory import SessionMemory
    
    user_id = "test_memory_user"
    
    # Test memory initialization
    memory = SessionMemory.get(user_id)
    print(f"Initialized memory for {user_id}")
    print_success("Session memory initialized")
    
    # Test memory update
    SessionMemory.update(user_id, "last_products", [{"id": "p1", "name": "Test"}])
    updated_memory = SessionMemory.get(user_id)
    
    if updated_memory.get("last_products"):
        print_success("Memory update works")
    else:
        print_error("Memory update failed")
        return False
    
    # Test chat history
    SessionMemory.add_chat_history(user_id, "Hey", "Hello!")
    history = SessionMemory.get_chat_history(user_id)
    
    if history and len(history) > 0:
        print_success(f"Chat history works ({len(history)} entries)")
        return True
    else:
        print_error("Chat history failed")
        return False

# ========================================
# MAIN TEST RUNNER
# ========================================
def main():
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{'AGENTIC AI INTEGRATION TEST SUITE'.center(60)}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    results = {}
    
    # Run tests
    print(f"\n{YELLOW}Starting tests...{RESET}\n")
    
    results["Brain API"] = test_brain_api()
    time.sleep(1)
    
    results["Backend API"] = test_backend_api()
    time.sleep(1)
    
    results["Session Memory"] = test_session_memory()
    time.sleep(1)
    
    if results["Brain API"]:
        results["Brain Inference"] = test_brain_inference()
        time.sleep(1)
        
        if results["Brain API"] and results["Backend API"]:
            results["Controller Integration"] = test_controller()
    
    # Summary
    test_header("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    failed = sum(1 for v in results.values() if not v)
    
    for test_name, result in results.items():
        status = f"{GREEN}✅ PASS{RESET}" if result else f"{RED}❌ FAIL{RESET}"
        print(f"{test_name}: {status}")
    
    print(f"\n{YELLOW}Total: {passed} passed, {failed} failed{RESET}")
    
    if failed == 0:
        print(f"\n{GREEN}🎉 All tests passed! System is ready to use.{RESET}")
        return 0
    else:
        print(f"\n{RED}⚠️  Some tests failed. Please check the errors above.{RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
