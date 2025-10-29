// Update year and add interactive typing for the name
document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const nameWrap = document.getElementById('name');
  const nameSpan = document.getElementById('typed-name');
  const caret = nameWrap ? nameWrap.querySelector('.caret') : null;
  const promptWrap = document.getElementById('prompt');
  const promptSpan = document.getElementById('typed-prompt');
  if (!nameWrap || !nameSpan || !promptWrap || !promptSpan || !caret) return;

  const fullName = (nameWrap.dataset.text || nameSpan.textContent || '').trim();
  const fullPrompt = (promptWrap.dataset.text || promptSpan.textContent || '').trim();
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer;
  function resetSpans(){ promptSpan.textContent=''; nameSpan.textContent=''; }

  function typeTextInto(targetSpan, text, speed = 90, jitter = 40) {
    return new Promise((resolve) => {
      clearTimeout(timer);
      targetSpan.textContent = '';
      let i = 0;
      const step = () => {
        if (i < text.length) {
          targetSpan.textContent += text.charAt(i++);
          const delay = speed + Math.random() * jitter;
          timer = setTimeout(step, delay);
        } else {
          resolve();
        }
      };
      step();
    });
  }

  async function run() {
    if (prefersReduced) {
      promptSpan.textContent = fullPrompt;
      nameSpan.textContent = fullName;
      caret.classList.add('off');
      return Promise.resolve();
    }
    resetSpans();
    caret.classList.add('off');
    await typeTextInto(promptSpan, fullPrompt);
    // slight pause before typing the name
    await new Promise((r) => setTimeout(r, 250));
    caret.classList.remove('off');
    await typeTextInto(nameSpan, fullName);
    caret.classList.add('off');
  }

  // Initial typing
  run();


  // Cursor 01 particle effect
  const reduce = prefersReduced;
  if (reduce) return;

  const canvas = document.getElementById('fx');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!canvas || !ctx) return;

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#34d399';
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5); // cap per performance

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // draw using CSS pixels
  }
  window.addEventListener('resize', resize);
  resize();

  // Pre-render sprites for '0' e '1' in varie dimensioni per evitare fillText ogni frame
  const glyphSizes = [14, 18, 22, 26];
  function makeGlyph(char, size, color) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    g.font = `700 ${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    const metrics = g.measureText(char);
    const w = Math.ceil(metrics.width) + 12;
    const h = Math.ceil(size * 1.4) + 12;
    c.width = w; c.height = h;
    g.font = `700 ${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    // Glow prerenderizzato (una volta sola, non per frame)
    g.shadowColor = color;
    g.shadowBlur = 6;
    g.fillText(char, w / 2, h / 2);
    // rimuovi shadow per successive drawImage
    g.shadowBlur = 0;
    return c;
  }
  const SPRITES = {
    '0': glyphSizes.map((s) => makeGlyph('0', s, accent)),
    '1': glyphSizes.map((s) => makeGlyph('1', s, accent)),
  };

  const particles = [];
  const MAX = 260;

  function spawn(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.4;
      const bit = Math.random() < 0.5 ? '0' : '1';
      const idx = (Math.random() * SPRITES['0'].length) | 0;
      const sprite = SPRITES[bit][idx];
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        ttl: 700 + Math.random() * 600,
        sprite
      });
      if (particles.length > MAX) particles.shift();
    }
  }

  let lastX = null, lastY = null;
  window.addEventListener('pointermove', (e) => {
    const x = e.clientX, y = e.clientY;
    let count = 6;
    if (lastX != null && lastY != null) {
      const d = Math.hypot(x - lastX, y - lastY);
      count = Math.max(2, Math.min(12, Math.floor(d / 4)));
    }
    spawn(x, y, count);
    lastX = x; lastY = y;
  });
  window.addEventListener('pointerdown', (e) => spawn(e.clientX, e.clientY, 18));

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(32, now - last); // ms
    last = now;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.ttl) {
        particles.splice(i, 1);
        continue;
      }
      const t = dt / 16;
      p.x += p.vx * t;
      p.y += p.vy * t;
      p.vx *= 0.987; // attrito leggero
      p.vy *= 0.987;
      // leggera espansione radiale
      if (lastX != null && lastY != null) {
        const dx = p.x - lastX, dy = p.y - lastY; const d = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * 0.008;
        p.vy += (dy / d) * 0.008;
      }
      const alpha = 1 - p.life / p.ttl;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      const img = p.sprite;
      // allinea alla griglia di pixel per evitare aliasing/"storto"
      const dx = Math.round(p.x - img.width / 2);
      const dy = Math.round(p.y - img.height / 2);
      ctx.drawImage(img, dx, dy);
    }
    ctx.restore();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});

// Terminal background bits + client-side chatbot (WebLLM)
document.addEventListener('DOMContentLoaded', () => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ff41';

  // ----- Terminal field (01 background) -----
  const termCanvas = document.getElementById('fx-term');
  const tctx = termCanvas && termCanvas.getContext ? termCanvas.getContext('2d') : null;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  function makeGlyph(char, size, color) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    g.font = `700 ${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    const metrics = g.measureText(char);
    const w = Math.ceil(metrics.width) + 12;
    const h = Math.ceil(size * 1.4) + 12;
    c.width = w; c.height = h;
    g.font = `700 ${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.shadowColor = color; g.shadowBlur = 4;
    g.fillText(char, w / 2, h / 2);
    g.shadowBlur = 0;
    return c;
  }
  const glyphSizes = [12, 14, 16];
  const SPRITES = {
    '0': glyphSizes.map((s) => makeGlyph('0', s, accent)),
    '1': glyphSizes.map((s) => makeGlyph('1', s, accent))
  };

  const field = [];
  let fW = 0, fH = 0, FIELD_MAX = 0;
  function initField() {
    if (!termCanvas || !tctx) return;
    const rect = termCanvas.parentElement.getBoundingClientRect();
    termCanvas.width = Math.max(1, Math.floor(rect.width * DPR));
    termCanvas.height = Math.max(1, Math.floor(rect.height * DPR));
    termCanvas.style.width = rect.width + 'px';
    termCanvas.style.height = rect.height + 'px';
    tctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fW = rect.width; fH = rect.height;
    field.length = 0;
    FIELD_MAX = Math.max(18, Math.min(90, Math.floor((fW * fH) / 2200)));
    for (let i = 0; i < FIELD_MAX; i++) {
      const bit = Math.random() < 0.5 ? '0' : '1';
      const idx = (Math.random() * SPRITES['0'].length) | 0;
      const sprite = SPRITES[bit][idx];
      field.push({
        x: Math.random() * fW,
        y: Math.random() * fH,
        vy: 0.25 + Math.random() * 0.6,
        sprite
      });
    }
  }
  if (tctx && !prefersReduced) {
    initField();
    const onResize = () => initField();
    window.addEventListener('resize', onResize);
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(32, now - last); last = now;
      tctx.clearRect(0, 0, fW, fH);
      tctx.imageSmoothingEnabled = false;
      for (let i = 0; i < field.length; i++) {
        const p = field[i];
        p.y += p.vy * (dt / 16);
        if (p.y > fH + 20) { p.y = -20; p.x = Math.random() * fW; }
        const img = p.sprite;
        tctx.globalAlpha = 0.5;
        tctx.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height / 2));
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ----- Terminal Chat (WebLLM) -----
  const log = document.getElementById('term-log');
  const input = document.getElementById('cmd');
  const allowOnline = /github\.io$/.test(location.hostname) || new URLSearchParams(location.search).has('online');
  if (!log || !input) return;

  function pushLine(role, text = '') {
    const line = document.createElement('div');
    line.className = `term-line term-line-${role}`;
    const sign = document.createElement('span');
    sign.className = 'term-sign';
    sign.textContent = role === 'user' ? '$' : '>'; // prompt symbols
    const content = document.createElement('span');
    content.className = 'content';
    content.textContent = text;
    line.appendChild(sign); line.appendChild(content);
    log.appendChild(line); log.scrollTop = log.scrollHeight;
    return content;
  }

  function help() {
    pushLine('ai', "Comandi: help, clear, ingest, diag, ctx. Parole chiave: bio, missione/valori, competenze | skills | linguaggi | stack | tecnologie, progetti | portfolio, esperienza, formazione, contatti | email | github | linkedin. Su GitHub Pages usa ?online=1 per usare i CDN.");
  }

  async function diag() {
    const okGpu = 'gpu' in navigator;
    pushLine('ai', `WebGPU: ${okGpu ? 'OK' : 'assente'}`);
    pushLine('ai', `Libreria WebLLM: ${window.webllm ? 'OK' : 'mancante'}`);
    const candidates = [
      'models/Llama-3.2-1B-Instruct-q4f16_1-MLC',
      'models/Phi-3-mini-4k-instruct-q4f16_1-MLC',
      'models/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC'
    ];
    for (const p of candidates) {
      try {
        const r = await fetch(`${p}/mlc-chat-config.json`, { cache: 'no-store' });
        pushLine('ai', `${p}: ${r.ok ? 'trovato' : 'non trovato'}`);
      } catch {
        pushLine('ai', `${p}: errore di accesso`);
      }
    }
    // Check resolve/main and WASM for Llama e TinyLlama
    const pLlama = 'models/Llama-3.2-1B-Instruct-q4f16_1-MLC/resolve/main';
    try {
      const rL = await fetch(`${pLlama}/mlc-chat-config.json`, { cache: 'no-store' });
      pushLine('ai', `Struttura resolve/main (Llama 1B): ${rL.ok ? 'trovata' : 'NON trovata'} -> ${pLlama}`);
    } catch { pushLine('ai', `Struttura resolve/main (Llama 1B): errore accesso -> ${pLlama}`); }
    const wasmLlama = 'libs/webllm/wasm/Llama-3.2-1B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm';
    try {
      const r = await fetch(wasmLlama, { method: 'HEAD', cache: 'no-store' });
      pushLine('ai', `WASM (Llama 1B): ${r.ok ? 'trovato' : 'non trovato'} -> ${wasmLlama}`);
    } catch { pushLine('ai', `WASM (Llama 1B): errore accesso -> ${wasmLlama}`); }
    const pTiny = 'models/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC/resolve/main';
    try {
      const r2 = await fetch(`${pTiny}/mlc-chat-config.json`, { cache: 'no-store' });
      pushLine('ai', `Struttura resolve/main (TinyLlama): ${r2.ok ? 'trovata' : 'NON trovata'} -> ${pTiny}`);
    } catch { pushLine('ai', `Struttura resolve/main (TinyLlama): errore accesso -> ${pTiny}`); }
    const wasmTiny = 'libs/webllm/wasm/TinyLlama-1.1B-Chat-v1.0-q4f16_1-ctx2k_cs1k-webgpu.wasm';
    try {
      const r = await fetch(wasmTiny, { method: 'HEAD', cache: 'no-store' });
      pushLine('ai', `WASM (TinyLlama): ${r.ok ? 'trovato' : 'non trovato'} -> ${wasmTiny}`);
    } catch { pushLine('ai', `WASM (TinyLlama): errore accesso -> ${wasmTiny}`); }
    pushLine('ai', 'Se uno dei percorsi sopra è "trovato" e la libreria è OK, riprova a inviare un messaggio.');
  }

  let engine = null;
  const history = [{ role: 'system', content: 'Parla in italiano. Rispondi in modo breve, chiaro e professionale. Regola: usa SOLO il Contesto fornito; se l\'informazione non è nel Contesto rispondi esattamente: "Non presente nel profilo".' }];
  // Persona: rispondi come Michele in prima persona
  history[0].content = 'Sei Michele Specchia. Rispondi sempre in prima persona ("io"). Parla in italiano in modo breve, chiaro e professionale. Usa SOLO il CONTESTO fornito (estratto dal mio profilo). Se qualcosa non è nel CONTESTO, non improvvisare: rispondi in modo neutro (ad esempio: "Non saprei rispondere con certezza su questo") e proponi un tema del profilo di cui puoi parlare. Evita preamboli e riferimenti al fatto di essere un modello.';

  async function loadWebLLMIfNeeded() {
    if (window.webllm) return true;
    if (!window.isSecureContext) {
      pushLine('ai', "Attenzione: WebGPU richiede un contesto sicuro (HTTPS o http://localhost). Avvia il sito con un server locale, ad es. 'python -m http.server'.");
    }
    // niente WebGPU? passo a fallback testuale
    if (!('gpu' in navigator)) {
      pushLine('ai', 'Questo browser non espone WebGPU. Prova Chrome/Edge aggiornati (digita chrome://gpu) o attiva la flag WebGPU.');
      return false;
    }
    // Prova prima come modulo ESM da node_modules o libs, poi come UMD locale
    const moduleCandidates = [
      './node_modules/@mlc-ai/web-llm/lib/index.js',
      './libs/webllm/index.js',
      './libs/webllm/lib/index.js'
    ];
    for (const m of moduleCandidates) {
      try {
        const mod = await import(m + `?v=${Date.now()}`);
        if (mod) { window.webllm = mod; pushLine('ai', `Libreria caricata da ${m}`); return true; }
      } catch { /* prova prossimo */ }
    }
    // UMD locale, se presente
    const umd = './libs/webllm/webllm.min.js';
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = umd; s.async = true; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
      if (window.webllm) { pushLine('ai', `Libreria caricata da ${umd}`); return true; }
    } catch {}
    // Fallback CDN (GitHub Pages o qualsiasi HTTPS). Le CDN funzionano solo su HTTPS.
    const onlineCapable = (location.protocol === 'https:');
    if (onlineCapable) {
      const cdns = [
        'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/dist/webllm.min.js',
        'https://unpkg.com/@mlc-ai/web-llm/dist/webllm.min.js'
      ];
      for (const url of cdns) {
        try {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url; s.async = true; s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
          });
          if (window.webllm) { pushLine('ai', `Libreria caricata da CDN (${url})`); return true; }
        } catch {}
      }
    }
    pushLine('ai', "Libreria WebLLM non trovata. In locale: servi 'node_modules/@mlc-ai/web-llm/lib/index.js' o copia in 'libs/webllm/'. Online: apri via HTTPS (GitHub Pages) per usare la CDN automaticamente.");
    return false;
  }

  async function ensureEngine() {
    if (engine) return engine;
    const ready = await loadWebLLMIfNeeded();
    if (!ready || !window.webllm) return null;
    const { CreateMLCEngine } = window.webllm;
    // Solo locale: cerchiamo un modello in models/... e non usiamo CDN
    const candidates = [
      { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', nice: 'Llama 3.2 1B (local)', folder: 'Llama-3.2-1B-Instruct-q4f16_1-MLC' },
      { id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', nice: 'Phi-3 mini 4k (local)', folder: 'Phi-3-mini-4k-instruct-q4f16_1-MLC' },
      { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', nice: 'TinyLlama 1.1B (local)', folder: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC' },
    ];
    let chosen = null;
    let options = {};
    function wasmFor(folder){
      if (folder.startsWith('TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC')) return 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-ctx2k_cs1k-webgpu.wasm';
      if (folder.startsWith('Phi-3-mini-4k-instruct-q4f16_1-MLC')) return 'Phi-3-mini-4k-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm';
      if (folder.startsWith('Llama-3.2-1B-Instruct-q4f16_1-MLC')) return 'Llama-3.2-1B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm';
      return null;
    }
    for (const c of candidates) {
      try {
        const localPath = `models/${c.folder}`;
        // prova prima la struttura resolve/main, poi la root
        const tryBases = [ `${localPath}/resolve/main`, localPath ];
        let foundBase;
        for (const base of tryBases) {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 1200);
          const resp = await fetch(`${base}/mlc-chat-config.json`, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
          clearTimeout(t);
          if (resp.ok) { foundBase = base; break; }
        }
        if (foundBase) {
          const modelId = 'local-' + c.id;
          const wasmName = wasmFor(c.folder);
          const wasmLocal = wasmName ? `libs/webllm/wasm/${wasmName}` : null;
          const absModelBase = new URL(foundBase.replace(/\\/g, '/') + '/', window.location.origin).href;
          const absWasm = wasmLocal ? new URL(wasmLocal.replace(/\\/g, '/'), window.location.origin).href : undefined;
          options = {
            appConfig: {
              model_list: [
                {
                  model: absModelBase,
                  model_id: modelId,
                  model_name: `Local ${c.nice}`,
                  model_lib: absWasm,
                  low_resource_required: true,
                },
              ],
            },
          };
          pushLine('ai', `Caricamento modello locale: ${c.folder}${foundBase.endsWith('/resolve/main') ? ' (resolve/main)' : ''}...`);
          chosen = { modelId };
          break;
        }
      } catch (_) { /* continue */ }
    }
    let modelToLoad = chosen?.modelId;
    let initOptions = options;
    const onlineCapable = (location.protocol === 'https:');

    // Rileva repository GitHub Pages con file modello tracciati via LFS (pointer di ~100 byte)
    // e in tal caso forza il fallback al modello remoto
    if (modelToLoad && initOptions && initOptions.appConfig && initOptions.appConfig.model_list && initOptions.appConfig.model_list[0] && initOptions.appConfig.model_list[0].model && onlineCapable) {
      try {
        const base = initOptions.appConfig.model_list[0].model; // URL assoluto della cartella resolve/main
        const shardUrl = new URL('params_shard_0.bin', base).href;
        const resp = await fetch(shardUrl, { method: 'HEAD', cache: 'no-store' });
        if (resp && resp.ok) {
          const len = parseInt(resp.headers.get('content-length') || '0', 10);
          const ct = (resp.headers.get('content-type') || '').toLowerCase();
          const looksLikeLFSPointer = (len > 0 && len < 10000) || ct.includes('text/plain');
          if (looksLikeLFSPointer) {
            pushLine('ai', 'Rilevati file modello serviti come pointer (Git LFS). Passo al modello remoto.');
            modelToLoad = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
            initOptions = {}; // usa prebuiltAppConfig
          }
        }
      } catch (_) { /* ignora e continua */ }
    }

    if (!modelToLoad && onlineCapable) {
      modelToLoad = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
      initOptions = {};
      pushLine('ai', `Caricamento modello remoto: ${modelToLoad}...`);
    }
    if (!modelToLoad) {
      pushLine('ai', "Modello locale non trovato. Aggiungi i file in 'models/.../resolve/main' oppure abilita la modalità online con ?online=1.");
      return null;
    }
    const status = pushLine('ai', 'Caricamento modello...');
    engine = await CreateMLCEngine(modelToLoad, {
      ...initOptions,
      initProgressCallback: (r) => { status.textContent = r.text || 'Inizializzazione...'; log.scrollTop = log.scrollHeight; },
    });
    pushLine('ai', 'Modello pronto.');
    return engine;
  }

  function sanitize(text) {
    if (!text) return text;
    let out = text;
    // 1) taglia eventuali copie dell'istruzione di sistema (IT/EN)
    const sysRe = /parla\s+in\s+italiano[\s\S]*?(?=\n\n|$)/i;
    out = out.replace(sysRe, '').trimStart();
    const sysEn = /in\s+italian,?\s+please\s+respond[\s\S]*?(?=\n\n|$)/i;
    out = out.replace(sysEn, '').trimStart();
    const genericSys = /you\s+are\s+a\s+helpful\s+assistant[\s\S]*/i;
    out = out.replace(genericSys, '').trimStart();
    // 2) rimuovi frasi boilerplate comuni
    const lines = out.split(/\r?\n/);
    const drop = [
      /^(sure|certainly)[^a-zA-Z0-9]*.*$/i,
      /^here('?|’)?s\s+a\s+(brief|short).*$/i,
      /^i('?|’)d\s+be\s+happy\s+to\s+help.*$/i,
      /^parla\s+in\s+italiano.*$/i,
      /^in\s+italian.*$/i,
      /^non\s+ripettere.*$/i,
      /^se\s+non\s+sei\s+sicuro.*$/i
    ];
    const kept = lines.filter(l => !drop.some(re => re.test(l.trim())));
    out = kept.join('\n').trim();
    // 3) pulizia spazi multipli
    return out.replace(/\n{3,}/g, '\n\n');
  }

  async function chat(userText) {
    // Server mode: if a ?server= URL is provided, prefer it
    const serverUrl = new URLSearchParams(location.search).get('server') || (window.SERVER_URL || '');
    if (serverUrl) {
      try {
        await serverChat(userText, serverUrl);
        return; // handled by server
      } catch (e) {
        pushLine('ai', 'Server non raggiungibile, passo al modello nel browser.');
      }
    }
    const eng = await ensureEngine();
    if (!eng) {
      // fallback locale: messaggio statico
      pushLine('ai', 'Sono in modalità offline: non posso usare il modello nel browser. Riprova con connessione o WebGPU attivo.');
      return;
    }
    const messages = [...history];
    if (window.__ragReady && typeof window.__ragSearch === 'function') {
      const hits = window.__ragSearch(userText);
      window.__lastCtx = hits;
      // Costruisci il contesto: 1) routing per keyword note, 2) RAG, 3) baseline
      let ctxItems = [];
      if (typeof window.__ragRoute === 'function') {
        const routed = window.__ragRoute(userText) || [];
        ctxItems.push(...routed);
      }
      ctxItems.push(...(hits || []).map(h=>h.text));
      if (ctxItems.length < 3 && typeof window.__ragBaseline === 'function') {
        const base = window.__ragBaseline();
        for (const b of base){ if(!ctxItems.includes(b)) ctxItems.push(b); }
      }
      if (ctxItems.length) {
        const ctx = ctxItems.slice(0,6).map((t,i)=>`[${i+1}] ${t}`).join('\\n\\n');
        window.__lastCtxStr = ctx;
        const baseSys = messages[0] && messages[0].role === 'system' ? messages[0].content : '';
        messages[0] = { role: 'system', content: `${baseSys}\\n\\nCONTESTO:\\n${ctx}\\n\\nISTRUZIONI: Rispondi solo usando il CONTESTO. Se qualcosa non è nel CONTESTO, non improvvisare: rispondi in modo neutro (es. \'Non saprei rispondere con certezza su questo\') e proponi un tema del profilo pertinente. Formato: massimo 3 frasi o un elenco molto breve.`.trim() };
      }
    }
    messages.push({ role: 'user', content: userText });
    const out = pushLine('ai', '');
    try {
      const chunks = await eng.chat.completions.create({
        messages,
        stream: true,
        temperature: 0.1,
        top_p: 0.85,
        max_tokens: 200,
      });
      let full = '';
      for await (const part of chunks) {
        const delta = part?.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          out.textContent = sanitize(full);
          log.scrollTop = log.scrollHeight;
        }
      }
      function finalize(text, question){
        let t = sanitize(text).replace(/\bNon presente nel profilo\.?/gi,'');
        const ctx = window.__lastCtxStr || '';
        if (!/freelance/i.test(ctx)) {
          t = t.replace(/[^.!?]*freelance[^.!?]*[.!?]/gi,'');
        }
        // Evita frasi da "modello di linguaggio" o similari e "non so" ripetute
        t = t.replace(/[^.!?]*\b(modello di linguaggio|language model|modello|ai)\b[^.!?]*[.!?]/gi,'');
        t = t.replace(/[^.!?]*\bnon\s+so\b[^.!?]*[.!?]/gi,'');
        t = t.trim();
        const q = (question||'').toLowerCase();
        function firstSentences(s, n){ const a=(s||'').split(/(?<=[.!?])\s+/).filter(Boolean); return a.slice(0,n).join(' '); }
        function fallbackIntro(){
          const getSec = window.__ragGetSection ? window.__ragGetSection : ()=>'';
          const bio = getSec('bio') || getSec('missione e valori') || '';
          if (bio) return firstSentences(bio, 2);
          // usa baseline generico
          const base = (window.__ragBaseline ? window.__ragBaseline(2) : []) || [];
          return base.length ? firstSentences(base[0], 2) : 'Posso raccontarti di bio, competenze, progetti o contatti.';
        }
        if (t.length < 40) {
          // se la domanda riguarda origine/luogo e non c'è dato nel profilo
          if (/\b(dove|provieni|origine|origini|nato|provenienza)\b/i.test(q)) {
            return 'Preferisco non entrare nei dettagli sulla provenienza qui. ' + fallbackIntro();
          }
          return (t ? t + ' ' : '') + 'Non saprei rispondere con certezza su questo. ' + fallbackIntro();
        }
        return t;
      }
      const cleaned = finalize(full, userText);
      history.push({ role: 'user', content: userText });
      history.push({ role: 'assistant', content: cleaned });
    } catch (err) {
      out.textContent = 'Errore: ' + (err && err.message ? err.message : String(err));
    }
  }

  async function serverChat(userText, baseUrl) {
    const messages = [...history];
    if (window.__ragReady && typeof window.__ragSearch === 'function') {
      const hits = window.__ragSearch(userText);
      window.__lastCtx = hits;
      if (hits.length) {
        const ctx = hits.map((h,i)=>`[${i+1}] ${h.text}`).join('\n\n');
        const baseSys = messages[0] && messages[0].role === 'system' ? messages[0].content : '';
        messages[0] = { role: 'system', content: `${baseSys}\n\nCONTESTO:\n${ctx}`.trim() };
      }
    }
    messages.push({ role: 'user', content: userText });
    const out = pushLine('ai', '');
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat_stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature: 0.2, top_p: 0.9, max_tokens: 256 })
    });
    if (!res.ok || !res.body) throw new Error('server-error');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try { const obj = JSON.parse(line); if (obj.delta) { full += obj.delta; out.textContent = sanitize(full); } } catch {}
      }
    }
    history.push({ role: 'user', content: userText });
    history.push({ role: 'assistant', content: sanitize(full) });
  }

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const text = input.value.trim();
    if (!text) return;
    pushLine('user', text);
    input.value = '';
    if (text === 'help') return help();
    if (text === 'ingest') { window.__ragIngest && window.__ragIngest(); return; }
    if (text === 'ctx') { const hits = window.__lastCtx||[]; if(!hits.length){ pushLine('ai','Nessun contesto disponibile. Esegui una domanda o "ingest".'); } else { pushLine('ai', hits.map((h,i)=>`[${i+1}] ${h.text}`).join('\n\n')); } return; }
    if (text === 'diag') return diag();
    if (text === 'clear') { log.innerHTML = ''; return; }
    chat(text);
  });

  // Mostra aiuto al primo avvio
  help();
  // RAG: indicizza automaticamente se presente un profilo locale
  (function setupRAG(){
    const STOP = new Set(['e','ed','di','a','da','in','con','su','per','tra','fra','il','lo','la','i','gli','le','un','una','uno','che','chi','come','dove','quando','quale','quali','quello','questa','questo','non','si','no','ma','o','al','ai','allo','all','alla','alle','agli','dei','della','dello','delle','degli','del','mi','ti','ci','vi','ne']);
    const tok = s=> s.toLowerCase().normalize('NFKC').replace(/[^a-zàèéìòóù0-9]+/gi,' ').trim().split(/\s+/).filter(w=>w && !STOP.has(w));
    const split = md => md.split(/\n{2,}/).map(s=>s.trim()).filter(x=>x.length>30).map((text,i)=>({id:`p${i}`, text}));
    const rag = { ready:false };
    const LS_MD = 'rag_profile_md_v1';
    const LS_INDEX = 'rag_profile_idx_v1';
    function saveToLocal(md){ try{ const data={ docs:rag.docs, ids:rag.ids, idf:[...rag.idf.entries()], vecs: rag.vecs.map(v=>[...v.entries()]), norms: rag.norm, sections: rag.sections||{} }; localStorage.setItem(LS_INDEX, JSON.stringify(data)); localStorage.setItem(LS_MD, md); }catch(_){} }
    function loadFromLocal(){ try{ const json=localStorage.getItem(LS_INDEX); if(!json) return false; const data=JSON.parse(json); rag.docs=data.docs||[]; rag.ids=data.ids||[]; rag.idf=new Map(data.idf||[]); rag.vecs=(data.vecs||[]).map(e=>new Map(e)); rag.norm=data.norms||[]; rag.sections=data.sections||{}; rag.ready=true; window.__ragReady=true; return true; }catch(_){ return false; } }
    function build(chunks){
      const N=chunks.length; const df=new Map(); const tfs=[]; rag.docs=chunks.map(c=>c.text); rag.ids=chunks.map(c=>c.id);
      for(const c of chunks){ const tf=new Map(); for(const t of tok(c.text)){ tf.set(t,(tf.get(t)||0)+1) } tfs.push(tf); for(const t of tf.keys()){ df.set(t,(df.get(t)||0)+1) } }
      rag.idf=df; for(const [t,n] of df){ rag.idf.set(t, Math.log(1+N/(1+n))); }
      rag.vecs=[]; rag.norm=[]; for(const tf of tfs){ let norm=0; const v=new Map(); for(const [t,c] of tf){ const w=(1+Math.log(c))*(rag.idf.get(t)||0); if(w>0){ v.set(t,w); norm+=w*w } } rag.vecs.push(v); rag.norm.push(Math.sqrt(norm)||1) }
      rag.ready=true; window.__ragReady=true;
    }
    async function ingest(){ try{ const r=await fetch('data/profile.md',{cache:'no-store'}); if(!r.ok){ pushLine('ai','Nessun profilo in data/profile.md'); return;} const md=await r.text(); rag.sections = parseSections(md); build(split(md)); saveToLocal(md); pushLine('ai', `Profilo indicizzato (${rag.docs.length} frammenti).`);}catch(e){ pushLine('ai','Errore ingest: '+(e?.message||e)); } }
    function search(q){ if(!rag.ready) return []; const tf=new Map(); for(const t of tok(q)){ tf.set(t,(tf.get(t)||0)+1) } let norm=0; for(const [t,c] of tf){ const w=(1+Math.log(c))*(rag.idf.get(t)||0); tf.set(t,w); norm+=w*w } norm=Math.sqrt(norm)||1; const scores=[]; for(let i=0;i<rag.vecs.length;i++){ let dot=0; for(const [t,wq] of tf){ const wd=rag.vecs[i].get(t); if(wd) dot+=wd*wq } const s=dot/(rag.norm[i]*norm); if(s>0) scores.push([s,i]) } scores.sort((a,b)=>b[0]-a[0]); return scores.slice(0,6).map(([s,i])=>({score:s, id:rag.ids[i], text:rag.docs[i]})); }
    function baseline(k=4){ if(!rag.ready) return []; const out=[]; const pref=['bio','missione e valori','competenze tecniche','progetti principali']; for(const key of pref){ const t=rag.sections?.[key]; if(t && !out.includes(t)) out.push(t); if(out.length>=k) break; } for(let i=0;i<rag.docs.length && out.length<k;i++){ const t=rag.docs[i]; if(t && t.length>30 && !out.includes(t)) out.push(t); } return out; }
    function routeByKeyword(q){
      if(!rag.ready) return [];
      const norm = (x)=> (x||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/(.)\1{2,}/g,'$1$1');
      const s = norm(q);
      const pairs = [
        [[ 'bio','chi sei','chi sono','chi e','chi è','parlami di te','su di te','presentati','presentazione','about','who are you' ], 'bio'],
        [[ 'missione','valori','vision','obiettivi','principi' ], 'missione e valori'],
        [[ 'competenze','skills','linguaggi','stack','tecnologie','framework','tool','strumenti','hard skills' ], 'competenze tecniche'],
        [[ 'progetti','project','projects','portfolio','repo','repos','case study','demo','lavori','prodotti' ], 'progetti principali'],
        [[ 'esperienza','carriera','lavoro','ruoli','posizioni','timeline','esperienze lavorative' ], 'esperienza (selezione)'],
        [[ 'formazione','studio','studi','laurea','universita','università','master','corsi','certificazioni','education' ], 'formazione'],
        [[ 'contatti','contatto','email','mail','github','git hub','linkedin','social','profilo','profili','referenze','website','sito' ], 'contatti e link'],
      ];
      const picked = new Set();
      for(const [keys,sec] of pairs){
        for(const k of keys){ if(s.includes(norm(k))){ const t = rag.sections?.[sec]; if(t) picked.add(t); }
        }
      }
      return [...picked];
    }
    window.__ragIngest = ingest;
    window.__ragSearch = search;
    window.__ragBaseline = baseline;
    window.__ragRoute = routeByKeyword;
    // Ripristina dalla cache e controlla aggiornamenti del file
    const restored = (typeof localStorage!=='undefined') ? loadFromLocal() : false;
    if (restored) { pushLine('ai', `Profilo caricato dalla cache (${rag.docs.length} frammenti).`); }
    fetch('data/profile.md',{cache:'no-store'}).then(async r=>{ if(!r.ok) return; const md=await r.text(); const prev=(typeof localStorage!=='undefined') ? (localStorage.getItem(LS_MD)||'') : ''; if(md && md!==prev){ rag.sections = (typeof parseSections==='function') ? parseSections(md) : (rag.sections||{}); build(split(md)); if(typeof localStorage!=='undefined') saveToLocal(md); pushLine('ai', `Profilo aggiornato (${rag.docs.length} frammenti).`); } else if(!restored) { rag.sections = (typeof parseSections==='function') ? parseSections(md) : (rag.sections||{}); } });
  })();
  // Avvio automatico del modello all'apertura
  (async()=>{ try{ await ensureEngine(); }catch(_){} })();
});


