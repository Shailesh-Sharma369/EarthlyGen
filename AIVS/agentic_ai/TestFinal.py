"""
TestFinal.py
============
Backend-driven architecture smoke test helper.

This script intentionally avoids any notebook magic, direct DB access,
or local model loading. It validates only controller/server level wiring.
"""

import os
import requests


def main() -> None:
    server_url = os.getenv("PYTHON_SERVER_URL", "http://127.0.0.1:9000")
    health_url = f"{server_url}/health"

    print(f"Checking local Flask bridge: {health_url}")
    response = requests.get(health_url, timeout=10)
    response.raise_for_status()
    print("✅ Flask bridge healthy")
    print(response.json())


if __name__ == "__main__":
    main()
