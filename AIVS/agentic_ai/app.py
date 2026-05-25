"""Colab FastAPI app for Mistral 7B + QLoRA adapter inference.

Run:
  uvicorn app:app --host 0.0.0.0 --port 8000
"""

import os

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from brain.mistral_brain import (
    ADAPTER_PATH,
    BASE_MODEL_ID,
    MAX_NEW_TOKENS,
    is_model_loaded,
    load_model,
    mistral_decide,
)


class GenerateRequest(BaseModel):
    query: str


app = FastAPI(title="Ruhi Colab Brain", version="2.0.0")


def _to_bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


LOAD_MODEL_ON_STARTUP = _to_bool(os.getenv("LOAD_MODEL_ON_STARTUP", "1"))


@app.on_event("startup")
def startup_event() -> None:
    if LOAD_MODEL_ON_STARTUP:
        load_model()


@app.get("/")
def root() -> dict:
    return {"service": "Ruhi Colab Brain", "status": "running"}


@app.get("/health")
def health() -> dict:
    return {
        "status": "healthy",
        "model_loaded": is_model_loaded(),
        "base_model_path": BASE_MODEL_PATH,
        "adapter_path": ADAPTER_PATH,
        "max_new_tokens": MAX_NEW_TOKENS,
        "quantization": "4bit-nf4",
        "load_model_on_startup": LOAD_MODEL_ON_STARTUP,
    }


@app.get("/ready")
def ready() -> dict:
    if not is_model_loaded() and LOAD_MODEL_ON_STARTUP:
        return {"status": "loading", "model_loaded": False}
    return {"status": "ready", "model_loaded": is_model_loaded()}


@app.post("/generate")
def generate(request: GenerateRequest) -> dict:
    query = (request.query or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        return mistral_decide(query)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Brain inference failed: {error}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("BRAIN_PORT", "8000")))
