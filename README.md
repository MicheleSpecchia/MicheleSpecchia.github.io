Personal site with client‑side LLM and optional server
======================================================

Quick start (static)
--------------------
- Open `index.html` in a browser or serve locally.
- Use the terminal box: `ingest`, `diag`, `ctx`, and questions.

GitHub Pages
------------
- Commit/push the repo to GitHub and enable Pages for the repository.
- To reduce first‑load latency, keep only the library at `libs/webllm/` and let the model load from CDN (or connect a server, see below).

RAG profile
-----------
- Edit `data/profile.md` with your real bio/skills/projects/contacts.
- In the terminal: `ingest` to index and persist in the browser.

Fast server (optional)
----------------------
Run a small API that keeps a GGUF model in memory for fast replies.

1) Install dependencies:
   `pip install -r server/requirements.txt`
2) Download a GGUF (e.g., TinyLlama 1.1B Q4_K_M).
3) Run:
   `MODEL_PATH=/path/to/model.gguf uvicorn server.app:app --host 0.0.0.0 --port 8000`
4) Open the site with `?server=http://localhost:8000`.

Troubleshooting on GitHub Pages
-------------------------------
- If you placed model files under `models/...` using Git LFS, Pages serves pointer files and WebLLM fails. Either remove LFS for those files or let the loader use the CDN/remote model.
- If the browser shows “library missing”, ensure `libs/webllm/index.js` exists in the repo or open with `?online=1` after forcing a hard refresh.
