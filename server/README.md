FastAPI LLM server (local or VPS)
=================================

This folder contains a minimal FastAPI server that runs a local GGUF model via llama.cpp Python bindings and exposes a streaming chat endpoint compatible with the site.

Quick start
-----------

1) Install dependencies (Python 3.10+ recommended):

   pip install -r server/requirements.txt

2) Download a small GGUF model (fast on CPU):

   - TinyLlama 1.1B Chat Q4_K_M (recommended for quick tests)
     https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0-GGUF
     file: TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf

   Or a better but heavier model:
   - Llama-3.2-1B-Instruct Q4_K_M (CPU ok)
   - Qwen2.5-1.5B-Instruct Q4_K_M

3) Run the server with the path to your GGUF:

   set MODEL_PATH=C:\path\to\TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf
   uvicorn server.app:app --host 0.0.0.0 --port 8000 --reload

   On Linux/macOS:
   export MODEL_PATH=/path/to/model.gguf
   uvicorn server.app:app --host 0.0.0.0 --port 8000 --reload

4) Open the site with the server parameter so the frontend uses the API:

   http://localhost:8000  (server)
   file or Pages URL for the site with ?server=http://localhost:8000
   example:
   https://<user>.github.io/<repo>/?server=http://localhost:8000

Endpoints
---------

- GET /health           -> { ok: true }
- POST /chat_stream     -> NDJSON streaming: {"delta":"..."}\n ... {"done":true}\n

Notes
-----

- The server keeps the model in memory so answers are nearly instant after first load.
- To leverage GPU, install llama-cpp-python with CUDA or Metal extras and pass suitable n_gpu_layers.
- Set environment variables to tune:
  - MODEL_PATH (required)
  - N_CTX (default 4096)
  - N_GPU_LAYERS (default 0)
  - MODEL_ID (optional friendly name in logs)

