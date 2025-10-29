import os
from typing import AsyncGenerator, Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.responses import StreamingResponse, JSONResponse

try:
    from llama_cpp import Llama
except Exception as e:  # pragma: no cover
    Llama = None  # type: ignore
    _import_err = e
else:
    _import_err = None


app = FastAPI(title="Local LLM Server")

# Allow from anywhere by default; restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    temperature: float | None = 0.2
    top_p: float | None = 0.9
    max_tokens: int | None = 256


def _load_engine():
    if _import_err is not None:
        raise RuntimeError(
            f"llama-cpp-python not available: {_import_err}. Install extras in server/requirements.txt"
        )
    model_path = os.getenv("MODEL_PATH")
    if not model_path or not os.path.exists(model_path):
        raise RuntimeError("Set MODEL_PATH env var to a valid GGUF file path")
    n_ctx = int(os.getenv("N_CTX", "4096"))
    n_gpu_layers = int(os.getenv("N_GPU_LAYERS", "0"))
    return Llama(model_path=model_path, n_ctx=n_ctx, n_gpu_layers=n_gpu_layers, verbose=False)


_engine = None


@app.on_event("startup")
def _startup():  # pragma: no cover
    global _engine
    _engine = _load_engine()


@app.get("/health")
def health():
    return {"ok": True, "model": os.getenv("MODEL_ID", os.path.basename(os.getenv("MODEL_PATH", "")))}


@app.post("/chat_stream")
def chat_stream(req: ChatRequest):  # pragma: no cover
    if _engine is None:
        return JSONResponse({"error": "engine-not-loaded"}, status_code=500)

    # Convert messages to a simple prompt (system + history)
    # For small instruct models, a basic chat template works reasonably
    prompt_parts: List[str] = []
    for m in req.messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role == "system":
            prompt_parts.append(f"[SYSTEM]\n{content}\n")
        elif role == "user":
            prompt_parts.append(f"[USER]\n{content}\n")
        else:
            prompt_parts.append(f"[ASSISTANT]\n{content}\n")
    prompt = "\n".join(prompt_parts) + "\n[ASSISTANT]\n"

    def _gen() -> AsyncGenerator[bytes, None]:
        stream = _engine(
            prompt,
            max_tokens=req.max_tokens or 256,
            temperature=req.temperature or 0.2,
            top_p=req.top_p or 0.9,
            stream=True,
        )
        for chunk in stream:
            token = chunk.get("choices", [{}])[0].get("text", "")
            yield ("{" + f"\"delta\":{token!r}" + "}\n").encode("utf-8")
        yield b"{\"done\":true}\n"

    return StreamingResponse(_gen(), media_type="application/x-ndjson")

