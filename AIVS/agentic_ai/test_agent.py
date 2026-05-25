"""
test_agent.py
=============
Minimal backend-driven integration test utility.

Flow:
User query -> local Flask server -> AgentController -> BackendAPI + brain API
"""

import os
import requests


def run_query(query: str) -> dict:
    endpoint = os.getenv("PYTHON_SERVER_URL", "http://127.0.0.1:9000") + "/handle_query"
    payload = {
        "user_query": query,
        "user_id": "test_user",
    }
    response = requests.post(endpoint, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def main() -> None:
    print("Running backend-driven smoke query...")
    result = run_query("show me eco-friendly products")
    print("✅ Response received")
    print(result)


if __name__ == "__main__":
    main()
