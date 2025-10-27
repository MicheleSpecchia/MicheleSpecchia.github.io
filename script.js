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
    pushLine('ai', "Comandi: help, clear. Per chattare, scrivi e premi Invio. Il modello viene eseguito nel browser (puo' richiedere qualche minuto al primo avvio).");
  }

  let engine = null;
  const history = [{ role: 'system', content: 'Sei un assistente utile. Rispondi in italiano in modo conciso.' }];

  async function loadWebLLMIfNeeded() {
    if (window.webllm) return true;
    // niente WebGPU? passo a fallback testuale
    if (!('gpu' in navigator)) {
      pushLine('ai', 'Questo browser non espone WebGPU. Prova Chrome/Edge aggiornati (digita chrome://gpu) o attiva la flag WebGPU.');
      return false;
    }
    const cdns = [
      // Optional local copy (put file at libs/webllm/webllm.min.js)
      './libs/webllm/webllm.min.js',
      'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.49/dist/webllm.min.js',
      'https://unpkg.com/@mlc-ai/web-llm@0.2.49/dist/webllm.min.js'
    ];
    for (const url of cdns) {
      const status = pushLine('ai', 'Caricamento libreria WebLLM...');
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = url; s.async = true; s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
        if (window.webllm) { status.textContent = 'Libreria caricata.'; return true; }
      } catch { /* tenta prossimo CDN */ }
    }
    pushLine('ai', 'Impossibile caricare WebLLM (forse offline). La chat funzionerà in modalità semplificata.');
    return false;
  }

  async function ensureEngine() {
    if (engine) return engine;
    const ready = await loadWebLLMIfNeeded();
    if (!ready || !window.webllm) return null;
    const { CreateWebWorkerMLCEngine } = window.webllm;
    const model = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
    const status = pushLine('ai', 'Caricamento modello...');
    engine = await CreateWebWorkerMLCEngine(model, {
      initProgressCallback: (r) => { status.textContent = r.text || 'Inizializzazione...'; log.scrollTop = log.scrollHeight; },
    });
    pushLine('ai', 'Modello pronto.');
    return engine;
  }

  async function chat(userText) {
    const eng = await ensureEngine();
    if (!eng) {
      // fallback locale: messaggio statico
      pushLine('ai', 'Sono in modalità offline: non posso usare il modello nel browser. Riprova con connessione o WebGPU attivo.');
      return;
    }
    history.push({ role: 'user', content: userText });
    const out = pushLine('ai', '');
    try {
      const chunks = await eng.chat.completions.create({
        messages: history,
        stream: true,
        temperature: 0.7,
        max_tokens: 256,
      });
      let full = '';
      for await (const part of chunks) {
        const delta = part?.choices?.[0]?.delta?.content || '';
        if (delta) { full += delta; out.textContent = full; log.scrollTop = log.scrollHeight; }
      }
      history.push({ role: 'assistant', content: full });
    } catch (err) {
      out.textContent = 'Errore: ' + (err && err.message ? err.message : String(err));
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const text = input.value.trim();
    if (!text) return;
    pushLine('user', text);
    input.value = '';
    if (text === 'help') return help();
    if (text === 'clear') { log.innerHTML = ''; return; }
    chat(text);
  });
});
