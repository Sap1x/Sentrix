"""
SENTRIX — Meta Muse Spark Open Inference Verification
Performs a safe, structured verification against the Baseten endpoint.
"""
import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("BASETEN_API_KEY")
base_url = os.getenv("BASETEN_BASE_URL", "https://inference.baseten.co/v1")
model_id = os.getenv("BASETEN_MODEL_ID", "meta-models/muse-spark-open")

if not api_key or api_key == "your_baseten_api_key_here":
    print("STATUS: NO_KEY_CONFIGURED (Skipping live endpoint verification)")
    sys.exit(0)

print(f"Connecting to verified model: {model_id} via {base_url}")

headers = {
    "Authorization": f"Api-Key {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": model_id,
    "messages": [
        {
            "role": "system",
            "content": "You are the SENTRIX Infrastructure Intelligence Engine. Output JSON only."
        },
        {
            "role": "user",
            "content": "A flash flood has inundated Grand Avenue corridor by 65cm. In 20 words, identify the primary cascading risk to emergency medical transit."
        }
    ],
    "max_tokens": 400,
    "temperature": 0.2
}

try:
    with httpx.Client(timeout=30.0) as client:
        res = client.post(f"{base_url.rstrip('/')}/chat/completions", headers=headers, json=payload)
        if res.status_code == 200:
            data = res.json()
            message = data.get("choices", [{}])[0].get("message", {})
            content = message.get("content") or ""
            reasoning = message.get("reasoning_content") or ""
            print("[PASS] Meta Muse Spark Open responded with 200 OK.")
            print(f"[REASONING]: {reasoning[:120]}...")
            print(f"[OUTPUT]: {content[:150]}")
            sys.exit(0)
        else:
            print(f"[FAIL] HTTP {res.status_code}: {res.text[:120]}")
            sys.exit(1)
except Exception as e:
    print(f"[ERROR] Connection failed: {type(e).__name__}: {e}")
    sys.exit(1)
