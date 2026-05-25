#!/usr/bin/env python3
"""
test_ruhi_integration.py
========================
Test script to verify Ruhi AI Integration

Tests:
1. Express Backend connectivity
2. Python AI Server connectivity
3. Brain API connectivity (if enabled)
4. End-to-end query flow
5. Authentication flow
"""

import sys
import json
import time
import requests
from typing import Dict, Tuple
from pathlib import Path

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Configuration
BACKEND_URL = "http://localhost:5002"
PYTHON_SERVER_URL = "http://localhost:9000"
BRAIN_API_URL = "http://localhost:8000"

# Test results
results = {
    "backend": False,
    "python_server": False,
    "brain_api": False,
    "ai_query": False,
    "voice_command": False,
}

def print_header(title):
    """Print section header"""
    print(f"\n{BOLD}{BLUE}{'=' * 60}{RESET}")
    print(f"{BOLD}{BLUE}{title}{RESET}")
    print(f"{BOLD}{BLUE}{'=' * 60}{RESET}\n")

def print_success(message):
    """Print success message"""
    print(f"{GREEN}✅ {message}{RESET}")

def print_error(message):
    """Print error message"""
    print(f"{RED}❌ {message}{RESET}")

def print_warning(message):
    """Print warning message"""
    print(f"{YELLOW}⚠️  {message}{RESET}")

def print_info(message):
    """Print info message"""
    print(f"{BLUE}ℹ️  {message}{RESET}")

def test_backend() -> bool:
    """Test Express backend connectivity"""
    print_header("TEST 1: Express Backend")
    
    try:
        print_info(f"Testing: {BACKEND_URL}")
        
        response = requests.get(f"{BACKEND_URL}/", timeout=5)
        
        if response.status_code == 200:
            print_success(f"Backend is running")
            print(f"  Response: {response.json()}")
            results["backend"] = True
            return True
        else:
            print_error(f"Backend responded with status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to backend at {BACKEND_URL}")
        print_warning("Make sure Express is running: npm start")
        return False
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        return False

def test_python_server() -> bool:
    """Test Python AI Server connectivity"""
    print_header("TEST 2: Python AI Server")
    
    try:
        print_info(f"Testing: {PYTHON_SERVER_URL}")
        
        response = requests.get(f"{PYTHON_SERVER_URL}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Python Server is running")
            print(f"  Service: {data.get('service')}")
            print(f"  Status: {data.get('status')}")
            print(f"  Controller: {data.get('controller')}")
            results["python_server"] = True
            return True
        else:
            print_error(f"Server responded with status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to Python Server at {PYTHON_SERVER_URL}")
        print_warning("Make sure Python server is running: python server.py")
        return False
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        return False

def test_brain_api() -> bool:
    """Test Brain API connectivity"""
    print_header("TEST 3: Brain API (Optional)")
    
    try:
        print_info(f"Testing: {BRAIN_API_URL}/health")
        
        response = requests.get(f"{BRAIN_API_URL}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Brain API is running")
            print(f"  Status: {data.get('status')}")
            results["brain_api"] = True
            return True
        else:
            print_warning(f"Brain API offline (status {response.status_code})")
            print_warning("This is optional if using cloud deployment")
            return False
            
    except requests.exceptions.ConnectionError:
        print_warning(f"Brain API not running at {BRAIN_API_URL}")
        print_info("This is optional - you can use cloud Brain API")
        return False
    except Exception as e:
        print_warning(f"Brain API not available: {e}")
        return False

def test_ai_query() -> bool:
    """Test AI query endpoint"""
    print_header("TEST 4: AI Query Endpoint")
    
    if not results["python_server"]:
        print_warning("Skipping: Python Server not running")
        return False
    
    try:
        print_info("Testing: POST /api/ai/query")
        
        payload = {
            "query": "show me eco-friendly products",
            "context": {
                "currentPage": "/products",
                "userId": "test_user_123"
            }
        }
        
        print(f"  Query: {payload['query']}")
        
        response = requests.post(
            f"{BACKEND_URL}/api/ai/query",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"AI Query successful")
            print(f"  Type: {data.get('type')}")
            print(f"  Intent: {data.get('intent')}")
            print(f"  Message: {data.get('message')[:100]}...")
            results["ai_query"] = True
            return True
        else:
            print_error(f"Query failed with status {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print_error(f"Query error: {e}")
        return False

def test_voice_command() -> bool:
    """Test voice command endpoint"""
    print_header("TEST 5: Voice Command Endpoint")
    
    if not results["python_server"]:
        print_warning("Skipping: Python Server not running")
        return False
    
    try:
        print_info("Testing: POST /api/ai/command")
        
        payload = {
            "command": "add bamboo toothbrush to cart"
        }
        
        print(f"  Command: {payload['command']}")
        
        response = requests.post(
            f"{BACKEND_URL}/api/ai/command",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Voice Command successful")
            print(f"  Action: {data.get('action')}")
            print(f"  Response: {data.get('response')}")
            results["voice_command"] = True
            return True
        else:
            print_error(f"Command failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"Command error: {e}")
        return False

def print_summary():
    """Print test summary"""
    print_header("TEST SUMMARY")
    
    tests = {
        "backend": "Express Backend",
        "python_server": "Python AI Server",
        "brain_api": "Brain API (Optional)",
        "ai_query": "AI Query Endpoint",
        "voice_command": "Voice Command Endpoint",
    }
    
    passing = 0
    for key, name in tests.items():
        status = "✅ PASS" if results[key] else "❌ FAIL"
        if results[key]:
            passing += 1
            print(f"{status} - {name}")
        elif key == "brain_api":
            print(f"⏭️  SKIP - {name} (optional)")
        else:
            print(f"{status} - {name}")
    
    total = len([k for k in results if k != "brain_api"]) + (1 if results["brain_api"] else 0)
    print(f"\n{BOLD}Result: {passing}/{total} tests passed{RESET}")
    
    if passing == len([k for k in results if k != "brain_api"]):
        print_success("All critical tests passed! Ruhi is ready to use.")
        return True
    else:
        print_error("Some tests failed. Check output above for details.")
        return False

def main():
    """Main test runner"""
    print(f"{BOLD}{BLUE}")
    print("""
╔════════════════════════════════════════════════════════════╗
║         RUHI AI INTEGRATION - TEST SUITE                  ║
║                                                            ║
║  This script verifies all components of Ruhi integration   ║
║  Required: Express backend and Python AI server running    ║
╚════════════════════════════════════════════════════════════╝
    """)
    print(f"{RESET}")
    
    print_info(f"Backend URL: {BACKEND_URL}")
    print_info(f"Python Server URL: {PYTHON_SERVER_URL}")
    print_info(f"Brain API URL: {BRAIN_API_URL}")
    print()
    
    # Run tests
    test_backend()
    time.sleep(1)
    
    test_python_server()
    time.sleep(1)
    
    test_brain_api()
    time.sleep(1)
    
    if results["backend"] and results["python_server"]:
        test_ai_query()
        time.sleep(1)
        
        test_voice_command()
    
    # Print summary
    success = print_summary()
    
    print()
    if success:
        print(f"{GREEN}{BOLD}🎉 Everything is working! You can now use Ruhi.{RESET}")
        print(f"   Open: {BACKEND_URL}")
        print(f"   Click the green orb or press Alt+R to activate Ruhi")
    else:
        print(f"{YELLOW}Please fix the errors above before using Ruhi.{RESET}")
    
    print()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
