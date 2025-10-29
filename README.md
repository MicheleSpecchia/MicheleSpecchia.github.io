Personal site for Michele Specchia
==================================

Local usage
-----------

- Open `index.html` directly in a browser. No build step required.

Customize
---------

- Edit your name and roles in `index.html` header.
- Update project items in the `Projects` section.
- Replace placeholder links in `contact.html` with your real profiles and e‑mail.
- Colors and spacing live in `styles.css` (CSS variables at the top).

Deploy (quick options)
----------------------

- GitHub Pages: push the folder to a repo, then enable Pages for the `main` branch.
- Netlify/Vercel: drag‑and‑drop the folder into the dashboard for instant hosting.

Local LLM (WebLLM) setup
------------------------

This site runs only local models in the browser via WebLLM (no CDN fallback). To run fully offline or behind a firewall:

1. Download a model artifact from the MLC model registry. Recommended small model for quick load: `TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC`.
2. Place the folder under `models/` so it looks like:
   - `models/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC/mlc-chat-config.json`
   - (Optionally) you can add others like `Phi-3-mini-4k-instruct-q4f16_1-MLC` or `Llama-3.2-1B-Instruct-q4f16_1-MLC`. The app will auto‑detect any folder present.
3. Required: download the WebLLM library and place it at `libs/webllm/webllm.min.js` (the app will not use CDNs).
4. Serve the site locally over HTTP(S) (WebGPU requires a secure context):
   - `python -m http.server 8000` then open `http://localhost:8000`

The app first tries local `libs/webllm/webllm.min.js` and a local model under `models/…`. If not found, it falls back to CDNs.

RAG profile (client‑side)
------------------------

- Put your profile content into `data/profile.md` (markdown, paragraphs). The site builds a tiny TF‑IDF index in the browser.
- In the terminal:
  - `ingest` reloads and re‑indexes `data/profile.md`
  - The chat will prepend top‑K relevant paragraphs as context.

GitHub Pages mode
-----------------

- Publish as a static site. Add `?online=1` to enable loading WebLLM library and a small model from CDN when a local model is not present.
- For “only local” usage, host the model artifacts under `models/<MODEL>/resolve/main` and the WASM under `libs/webllm/wasm/` and open via localhost.

Privacy
-------

This site is static and collects no personal data. See `privacy.html` for details.
