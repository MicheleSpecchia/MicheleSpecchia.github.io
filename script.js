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
