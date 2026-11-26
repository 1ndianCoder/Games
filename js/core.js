'use strict';
/* ============================================================
   Duo Arcade engine: menu, input, render loop, scoring, sound.
   Games call reg({...}) with a make(A) factory returning
   { update(dt), draw(c), down(x,y), move(x,y), up(x,y) }.
   ============================================================ */

const COL = ['#ff4f6d', '#3ec5ff'];
const COLD = ['#7a2236', '#1d5c7a'];          // darker player shades
const BG = '#0c0c0e', BG2 = '#17171b', LINE = '#2a2a30', TXT = '#ecebe6', MUT = '#85837c', ACC = '#ffd166';
const GAMES = [];
function reg(g) { GAMES.push(g); }

/* ---------- math ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const lerp = (a, b, t) => a + (b - a) * t;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
const grid2 = (w, h, v) => Array.from({ length: h }, () => Array(w).fill(v));

/* ---------- drawing ---------- */
const D = {
  circ(c, x, y, r, f, s, lw = 2) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, 7); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw; c.stroke(); } },
  rect(c, x, y, w, h, f) { c.fillStyle = f; c.fillRect(x, y, w, h); },
  rr(c, x, y, w, h, r, f, s, lw = 2) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw; c.stroke(); } },
  line(c, x1, y1, x2, y2, s, lw = 2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = s; c.lineWidth = lw; c.stroke(); },
  text(c, t, x, y, size = 20, f = TXT, al = 'center', bl = 'middle', wt = 800) {
    c.font = `${wt} ${size}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`; c.textAlign = al; c.textBaseline = bl; c.fillStyle = f; c.fillText(t, x, y);
  },
  poly(c, pts, f, s, lw = 2) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw; c.stroke(); } },
  /* geometric glyphs used instead of emoji */
  glyph(c, k, x, y, r, f) {
    const P = (n, rot = -Math.PI / 2, rr = r) => Array.from({ length: n }, (_, i) => [x + Math.cos(rot + i * Math.PI * 2 / n) * rr, y + Math.sin(rot + i * Math.PI * 2 / n) * rr]);
    c.lineCap = 'round';
    switch (k) {
      case 'circle': D.circ(c, x, y, r * .85, f); break;
      case 'square': D.rr(c, x - r * .75, y - r * .75, r * 1.5, r * 1.5, r * .15, f); break;
      case 'tri': D.poly(c, P(3, -Math.PI / 2, r * 1.05), f); break;
      case 'diamond': D.poly(c, P(4, -Math.PI / 2, r), f); break;
      case 'ring': D.circ(c, x, y, r * .7, null, f, r * .32); break;
      case 'hex': D.poly(c, P(6, 0, r * .9), f); break;
      case 'star': D.poly(c, Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; return [x + Math.cos(a) * q, y + Math.sin(a) * q]; }), f); break;
      case 'cross': D.line(c, x - r * .7, y - r * .7, x + r * .7, y + r * .7, f, r * .35); D.line(c, x + r * .7, y - r * .7, x - r * .7, y + r * .7, f, r * .35); break;
      case 'plus': D.line(c, x - r * .8, y, x + r * .8, y, f, r * .35); D.line(c, x, y - r * .8, x, y + r * .8, f, r * .35); break;
      case 'crown': D.poly(c, [[x - r, y + r * .6], [x - r, y - r * .4], [x - r * .5, y + r * .05], [x, y - r * .7], [x + r * .5, y + r * .05], [x + r, y - r * .4], [x + r, y + r * .6]], f); break;
      case 'flame': c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x + r, y, x, y + r); c.quadraticCurveTo(x - r, y, x, y - r); c.fillStyle = f; c.fill(); break;
      case 'bomb': D.circ(c, x, y + r * .15, r * .75, f); D.line(c, x + r * .4, y - r * .45, x + r * .75, y - r * .85, f, r * .2); break;
    }
    c.lineCap = 'butt';
  },
  glow(c, col, b) { c.shadowColor = col; c.shadowBlur = b; },
  noglow(c) { c.shadowBlur = 0; },
};

/* ---------- physics: circle vs circle impulse (im = inverse mass, 0 = fixed) ---------- */
function collide(a, b, e = 0.9) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), r = a.r + b.r;
  if (d >= r || d === 0) return false;
  const nx = dx / d, ny = dy / d, ia = a.im ?? 1, ib = b.im ?? 1, tot = ia + ib;
  if (!tot) return false;
  const pen = r - d;
  a.x -= nx * pen * ia / tot; a.y -= ny * pen * ia / tot;
  b.x += nx * pen * ib / tot; b.y += ny * pen * ib / tot;
  const rv = ((b.vx || 0) - (a.vx || 0)) * nx + ((b.vy || 0) - (a.vy || 0)) * ny;
  if (rv > 0) return true;
  const j = -(1 + e) * rv / tot;
  a.vx = (a.vx || 0) - j * ia * nx; a.vy = (a.vy || 0) - j * ia * ny;
  b.vx = (b.vx || 0) + j * ib * nx; b.vy = (b.vy || 0) + j * ib * ny;
  return true;
}
/* circle vs axis-aligned rect, reflect velocity. returns true on hit */
function rectBounce(o, x, y, w, h, e = 1) {
  const cx = clamp(o.x, x, x + w), cy = clamp(o.y, y, y + h);
  let dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
  if (d >= o.r) return false;
  if (d === 0) { // center inside: push out along smallest axis
    const l = o.x - x, r = x + w - o.x, t = o.y - y, b = y + h - o.y, m = Math.min(l, r, t, b);
    if (m === l) { dx = -1; dy = 0; } else if (m === r) { dx = 1; dy = 0; } else if (m === t) { dx = 0; dy = -1; } else { dx = 0; dy = 1; }
    d = 1; o.x = m === l ? x - o.r : m === r ? x + w + o.r : o.x; o.y = m === t ? y - o.r : m === b ? y + h + o.r : o.y;
  } else { o.x = cx + dx / d * o.r; o.y = cy + dy / d * o.r; }
  const nx = dx / d, ny = dy / d, vn = o.vx * nx + o.vy * ny;
  if (vn < 0) { o.vx -= (1 + e) * vn * nx; o.vy -= (1 + e) * vn * ny; }
  return true;
}

/* ---------- sound ---------- */
const Snd = {
  ac: null, muted: false,
  init() { if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (this.ac && this.ac.state === 'suspended') this.ac.resume(); },
  tone(f, d = .08, type = 'square', v = .06, slide = 0, delay = 0) {
    if (this.muted || this.quiet || !this.ac) return;
    const a = this.ac, t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .02);
  },
  noise(d = .2, v = .12) {
    if (this.muted || this.quiet || !this.ac) return;
    const a = this.ac, n = a.sampleRate * d, b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), g = a.createGain(); g.gain.value = v; s.buffer = b; s.connect(g); g.connect(a.destination); s.start();
  },
  play(n) {
    switch (n) {
      case 'hit': this.tone(520, .06, 'square', .05); break;
      case 'bounce': this.tone(300, .05, 'triangle', .07); break;
      case 'click': this.tone(880, .03, 'square', .03); break;
      case 'place': this.tone(440, .07, 'triangle', .08, 220); break;
      case 'score': this.tone(660, .1, 'square', .05); this.tone(990, .14, 'square', .05, 0, .08); break;
      case 'bad': this.tone(200, .25, 'sawtooth', .05, -120); break;
      case 'boom': this.noise(.35, .18); this.tone(120, .3, 'sine', .15, -80); break;
      case 'shoot': this.tone(900, .08, 'square', .03, -600); break;
      case 'tick': this.tone(1200, .02, 'sine', .04); break;
      case 'go': this.tone(880, .2, 'square', .06); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .18, 'square', .05, 0, i * .1)); break;
      case 'coin': this.tone(990, .05, 'square', .04); this.tone(1320, .1, 'square', .04, 0, .05); break;
    }
  }
};

/* ---------- input ---------- */
const KEYS = {
  KeyW: [0, 'u'], KeyS: [0, 'd'], KeyA: [0, 'l'], KeyD: [0, 'r'], KeyF: [0, 'a'], Space: [0, 'a'], KeyG: [0, 'b'], KeyQ: [0, 'b'],
  ArrowUp: [1, 'u'], ArrowDown: [1, 'd'], ArrowLeft: [1, 'l'], ArrowRight: [1, 'r'],
  Enter: [1, 'a'], NumpadEnter: [1, 'a'], Slash: [1, 'a'], KeyL: [1, 'a'], Numpad0: [1, 'a'],
  ShiftRight: [1, 'b'], Period: [1, 'b'], KeyK: [1, 'b'], NumpadDecimal: [1, 'b'],
};
const BTN = ['u', 'd', 'l', 'r', 'a', 'b'];
const mkInp = () => ({ u: 0, d: 0, l: 0, r: 0, a: 0, b: 0 });
const Inp = {
  k: [mkInp(), mkInp()], t: [mkInp(), mkInp()], taps: [mkInp(), mkInp()],
  get(p, b) { return this.k[p][b] || this.t[p][b]; },
  press(p, b) { this.taps[p][b] = 1; },
  clearTaps() { for (const p of this.taps) for (const b of BTN) p[b] = 0; },
  reset() { this.k = [mkInp(), mkInp()]; this.t = [mkInp(), mkInp()]; this.clearTaps(); },
};
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;

/* ---------- storage ---------- */
const Store = {
  get(k, d) { try { const v = localStorage.getItem('duo_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('duo_' + k, JSON.stringify(v)); } catch (e) { } },
};

/* ============================================================ */
const Duo = (() => {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  let def = null, inst = null, A = null, phase = 'menu', countdown = 0, scale = 1, W = 800, H = 500;
  let session = [0, 0], round = 0, cat = 'All', party = null, flash = 0, endTimer = 0;
  let names = Store.get('names', ['Red', 'Blue']);
  let stats = Store.get('stats', {});
  Snd.muted = Store.get('muted', false);

  /* ----- menu ----- */
  const CATS = ['All', 'Sports', 'Arcade', 'Party', 'Board'];
  const pad2 = n => String(n).padStart(2, '0');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SPEAKER = ['<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM16 10l5 5M21 10l-5 5"/></svg>'];
  function renderMenu() {
    previews.stopAll();
    $('gcount').textContent = GAMES.length;
    $('cats').innerHTML = CATS.map(c => `<button class="${c === cat ? 'on' : ''}" data-c="${c}">${c}<sup>${c === 'All' ? GAMES.length : GAMES.filter(g => g.cat === c).length}</sup></button>`).join('');
    const q = $('search').value.trim().toLowerCase();
    const list = GAMES.filter(g => (cat === 'All' || g.cat === cat) && (!q || (g.name + ' ' + g.desc + ' ' + g.cat).toLowerCase().includes(q)));
    $('grid').innerHTML = list.length ? list.map(g => {
      const s = stats[g.id], i = GAMES.indexOf(g) + 1;
      const stat = s ? `<span>${s.n} played</span><span class="mini"><i style="flex:${s.w[0] || .001};background:var(--p1)"></i><i style="flex:${s.w[1] || .001};background:var(--p2)"></i></span><span><span class="p1">${s.w[0]}</span>–<span class="p2">${s.w[1]}</span></span>`
        : `<span>${g.type === 'turn' ? 'Turn based · tap' : 'Real time · ' + (g.pad === 'one' ? 'one button' : 'keys / pads')}</span>`;
      return `<button class="tile" data-id="${g.id}"><div class="thumb"><canvas></canvas><span class="live">Bot play</span></div>
        <div class="meta"><span class="idx mono">${pad2(i)}</span><span class="nm">${g.name}</span><span class="kind mono">${g.cat}</span></div>
        <p class="ds">${g.desc}</p><div class="stat mono">${stat}</div></button>`;
    }).join('') : `<div class="empty">Nothing called “${esc(q)}”. Yet.</div>`;
    document.querySelectorAll('#grid .tile').forEach(t => previews.mount(t));
    // head to head
    const all = Object.values(stats), w0 = all.reduce((a, s) => a + s.w[0], 0), w1 = all.reduce((a, s) => a + s.w[1], 0), tot = all.reduce((a, s) => a + s.n, 0);
    $('r1').textContent = w0; $('r2').textContent = w1;
    $('b1').style.flexGrow = w0 || (w1 ? 0 : 1); $('b2').style.flexGrow = w1 || (w0 ? 0 : 1);
    $('nplayed').textContent = tot ? `${tot} match${tot > 1 ? 'es' : ''} · ${w0 === w1 ? 'dead even' : (w0 > w1 ? names[0] : names[1]) + ' leads'}` : 'No matches yet';
    $('muteMenu').textContent = Snd.muted ? 'Sound off' : 'Sound on';
    $('foot').innerHTML = `<div><b class="p1">${esc(names[0])}</b>Move <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><br>Action <kbd>F</kbd> or <kbd>Space</kbd> · Alt <kbd>G</kbd></div>
      <div><b class="p2">${esc(names[1])}</b>Move <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd><br>Action <kbd>Enter</kbd> or <kbd>L</kbd> · Alt <kbd>K</kbd></div>
      <div><b>Anywhere</b>Pause <kbd>Esc</kbd> · Rematch <kbd>Space</kbd><br>On touch screens each player gets a pad on their side.</div>`;
  }
  function showMenu() {
    phase = 'menu'; inst = null; def = null; party = null;
    $('game').hidden = true; $('menu').hidden = false; renderMenu();
  }

  /* ----- live previews: each tile renders the real game, a bot plays it on hover ----- */
  const previews = (() => {
    const cache = {}, active = new Set(); let raf = 0, lastT = 0;
    function create(g, retry) {
      const P = { g, held: [mkInp(), mkInp()], roll: 0, tap: 0, dead: 0, moves: 0 };
      const A2 = { W: g.w || 800, H: g.h || 500, names, first: 0, round: 0, ended: false,
        in: p => P.held[p], get: (p, b) => P.held[p][b], hit: (p, b) => Math.random() < (b === 'a' ? .06 : .04),
        end: () => { A2.ended = true; }, turn() { }, sfx() { }, shake() { } };
      P.A = A2;
      Snd.quiet = true;
      try {
        P.inst = g.make(A2);
        if (g.type === 'real') for (let i = 0; i < 40; i++) step(P, 1 / 60);
        else for (let i = 0; i < 300 && !A2.ended; i++) { if (P.moves < 14) P.tap = 0; step(P, 1 / 30); }
        if (A2.ended && !retry) { Snd.quiet = false; return create(g, true); }
      } catch (e) { P.inst = null; }
      Snd.quiet = false;
      return P;
    }
    function step(P, dt) {
      const { A: A2, inst: I, g } = P; if (!I) return;
      if (A2.ended) { P.dead += dt; if (P.dead > 1.4) Object.assign(P, create(g), { cv: P.cv }); return; }
      P.roll -= dt;
      if (P.roll <= 0) {
        P.roll = rand(.25, .6);
        for (const h of P.held) { for (const b of BTN) h[b] = 0; const d = pick(['u', 'd', 'l', 'r', 'u', 'r', null]); if (d) h[d] = 1; if (rand() < .35) h[pick(['u', 'd', 'l', 'r'])] = 1; h.a = rand() < .3 ? 1 : 0; }
      }
      if (g.type === 'turn') { P.tap -= dt; if (P.tap <= 0) { P.tap = rand(.35, .7); const x = rand(A2.W), y = rand(A2.H * .12, A2.H); P.moves++; const x2 = x + rand(-160, 160), y2 = y + rand(-160, 160); try { I.move && I.move(x, y); I.down && I.down(x, y); I.move && I.move(x2, y2); I.up && I.up(x2, y2); } catch (e) { } } }
      try { I.update && I.update(dt); } catch (e) { }
    }
    function paint(P) {
      const cv = P.cv; if (!cv || !cv.isConnected) return;
      const r = cv.getBoundingClientRect(); if (!r.width) return;
      const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const c = cv.getContext('2d'), W2 = P.A.W, H2 = P.A.H, sc = Math.min(w / W2, h / H2) * (W2 / H2 > 1.3 ? 1.04 : 1.0);
      c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.g.bg || BG; c.fillRect(0, 0, w, h);
      c.setTransform(sc, 0, 0, sc, (w - W2 * sc) / 2, (h - H2 * sc) / 2);
      try { P.inst && P.inst.draw(c); } catch (e) { }
    }
    function loop(t) {
      raf = active.size ? requestAnimationFrame(loop) : 0;
      const dt = Math.min(.05, (t - lastT) / 1000 || .016); lastT = t;
      Snd.quiet = true; active.forEach(P => { step(P, dt); paint(P); }); Snd.quiet = false;
    }
    function start(P, el) { el.classList.add('playing'); active.add(P); if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
    function stop(P, el) { el.classList.remove('playing'); active.delete(P); }
    const io = 'IntersectionObserver' in window && isTouch ? new IntersectionObserver(es => es.forEach(e => {
      const P = cache[e.target.dataset.id]; if (!P) return; e.isIntersecting && active.size < 4 ? start(P, e.target) : stop(P, e.target);
    }), { threshold: .95 }) : null;
    return {
      mount(el) {
        const g = GAMES.find(x => x.id === el.dataset.id); const P = cache[g.id] || (cache[g.id] = create(g));
        P.cv = el.querySelector('canvas'); requestAnimationFrame(() => paint(P));
        if (io) io.observe(el);
        else { el.addEventListener('pointerenter', () => start(P, el)); el.addEventListener('pointerleave', () => stop(P, el)); }
      },
      stopAll() { active.clear(); if (io) io.disconnect(); document.querySelectorAll('.tile.playing').forEach(t => t.classList.remove('playing')); },
    };
  })();

  /* ----- game lifecycle ----- */
  function open(id, keepSession) {
    def = GAMES.find(g => g.id === id); if (!def) return;
    if (!keepSession) { session = [0, 0]; round = 0; }
    $('menu').hidden = true; $('game').hidden = false;
    $('gTitle').innerHTML = `<span class="n">${def.name}</span><span class="k">${party ? `<em>Party ${party.i + 1} / ${party.list.length}</em>` : def.cat}</span>`;
    $('sn1').textContent = names[0]; $('sn2').textContent = names[1];
    updScore(); buildPads(); fit();
    newRound(); showIntro();
  }
  function newRound() {
    W = def.w || 800; H = def.h || 500; fit();
    Inp.reset(); turn(-1);
    A = {
      W, H, names, first: round % 2, round, ended: false,
      in: p => Inp.k[p], get: (p, b) => Inp.get(p, b), hit: (p, b) => !!Inp.taps[p][b],
      end, turn, sfx: n => Snd.play(n), shake: v => { flash = Math.max(flash, v); },
    };
    inst = def.make(A);
    countdown = def.type === 'real' ? 1.6 : 0;
  }
  function turn(p) { $('score').className = p === 0 ? 't0' : p === 1 ? 't1' : ''; }
  function end(w, msg) {
    if (!A || A.ended) return; A.ended = true;
    if (w === 0 || w === 1) session[w]++;
    round++;
    const s = stats[def.id] || (stats[def.id] = { n: 0, w: [0, 0] }); s.n++; if (w === 0 || w === 1) s.w[w]++; Store.set('stats', stats);
    if (party && (w === 0 || w === 1)) party.score[w]++;
    Snd.play(w === -1 ? 'bad' : 'win'); updScore(); turn(-1);
    endTimer = 0.9; // brief pause so the final moment is visible
    const tok = A; setTimeout(() => { if (A === tok && phase !== 'menu') showEnd(w, msg); }, 900);
  }
  function updScore() { $('ss1').textContent = session[0]; $('ss2').textContent = session[1]; }

  /* ----- overlays ----- */
  function overlay(html) { const o = $('overlay'); o.innerHTML = `<div class="panel">${html}</div>`; o.hidden = false; phase = 'overlay'; }
  function hideOverlay() { $('overlay').hidden = true; phase = 'play'; }
  function keysHtml() {
    if (def.type === 'turn' && !def.keys) return `<div class="keys"><div class="solo">Take turns. Tap or click the board.</div></div>`;
    const b = def.btn || {}, pad = def.pad || 'dpad a';
    const mv = pad.includes('dpad') ? ['W A S D', 'Arrows'] : pad.includes('ud') ? ['W / S', '↑ / ↓'] : pad.includes('lr') ? ['A / D', '← / →'] : null;
    const one = pad === 'one';
    const k = (i) => [mv ? `<kbd>${mv[i]}</kbd> move` : '', (b.a || one) ? `<kbd>${i ? 'Enter' : 'F'}</kbd> ${b.a || 'go'}` : '', b.b ? `<kbd>${i ? 'K' : 'G'}</kbd> ${b.b}` : ''].filter(Boolean).join('<br>');
    return `<div class="keys"><div class="p1"><b>${names[0]}</b><br>${def.keys ? def.keys[0] : k(0)}</div><div class="p2"><b>${names[1]}</b><br>${def.keys ? def.keys[1] : k(1)}</div></div>${isTouch && def.type === 'real' ? '<p>Touch: use the pads on your side of the screen.</p>' : ''}`;
  }
  function showIntro() {
    overlay(`<div class="kick">${party ? `Party · game ${party.i + 1} of ${party.list.length}` : `${pad2(GAMES.indexOf(def) + 1)} · ${def.cat}`}</div><h2>${def.name}</h2><p>${def.help}</p>${keysHtml()}
      <div class="row"><button class="btn" data-a="start">Play</button><button class="btn ghost" data-a="menu">Back</button></div>`);
  }
  function showHelp() {
    if (phase !== 'play') return;
    overlay(`<div class="kick">Paused</div><h2>${def.name}</h2><p>${def.help}</p>${keysHtml()}<div class="row"><button class="btn" data-a="resume">Resume</button><button class="btn ghost" data-a="menu">Menu</button></div>`);
  }
  function showEnd(w, msg) {
    if (!def) return;
    const who = `<div class="kick">${def.name}</div>` + (w === -1 ? `<h2>A draw.</h2>` : `<h2 class="win${w + 1}">${esc(names[w])} wins.</h2>`);
    let extra = '', btns;
    if (party) {
      party.i++;
      const done = party.i >= party.list.length;
      extra = `<div class="tally"><span class="p1">${party.score[0]}</span><span class="dash"></span><span class="p2">${party.score[1]}</span></div><div class="kick">Party score</div>`;
      if (done) {
        const pw = party.score[0] === party.score[1] ? -1 : party.score[0] > party.score[1] ? 0 : 1;
        extra += pw === -1 ? `<p>The party ends level.</p>` : `<p>The party goes to <span class="p${pw + 1}">${esc(names[pw])}</span>.</p>`;
        btns = `<button class="btn" data-a="party">New Party</button><button class="btn ghost" data-a="menu">Menu</button>`;
      } else btns = `<button class="btn" data-a="next">Next: ${party.list[party.i].name}</button><button class="btn ghost" data-a="menu">Quit</button>`;
    } else {
      extra = `<div class="tally"><span class="p1">${session[0]}</span><span class="dash"></span><span class="p2">${session[1]}</span></div><div class="kick">This session</div>`;
      btns = `<button class="btn" data-a="again">Rematch</button><button class="btn ghost" data-a="menu">Menu</button>`;
    }
    overlay(`${who}${msg ? `<p>${msg}</p>` : ''}${extra}<div class="row">${btns}</div>`);
  }
  function action(a) {
    Snd.init();
    if (a === 'start' || a === 'resume') { hideOverlay(); if (a === 'start' && def.type === 'real') countdown = 1.6; }
    else if (a === 'again') { newRound(); hideOverlay(); }
    else if (a === 'menu') showMenu();
    else if (a === 'next') { open(party.list[party.i].id); }
    else if (a === 'party') startParty();
  }
  function startParty() {
    const pool = shuffle(GAMES.filter(g => !g.long));
    party = { list: pool.slice(0, 5), i: 0, score: [0, 0] };
    open(party.list[0].id);
  }

  /* ----- touch pads ----- */
  function buildPads() {
    const el = $('pads'); el.innerHTML = '';
    if (!isTouch || def.type !== 'real') return;
    const pad = def.pad || 'dpad a', b = def.btn || {};
    if (pad === 'one') {
      el.innerHTML = `<div class="half l" data-p="0" data-b="a">${names[0].toUpperCase()}</div><div class="half r" data-p="1" data-b="a">${names[1].toUpperCase()}</div>`;
      return;
    }
    for (let p = 0; p < 2; p++) {
      let dp = '';
      const cell = (bt, s, col, row) => `<div class="tb" data-p="${p}" data-b="${bt}" style="grid-column:${col};grid-row:${row}">${s}</div>`;
      if (pad.includes('dpad')) dp = cell('u', '▲', 2, 1) + cell('l', '◀', 1, 2) + cell('r', '▶', 3, 2) + cell('d', '▼', 2, 3);
      else if (pad.includes('ud')) dp = cell('u', '▲', 2, 1) + cell('d', '▼', 2, 3);
      else if (pad.includes('lr')) dp = cell('l', '◀', 1, 3) + cell('r', '▶', 3, 3);
      const ab = (pad.includes(' a') || pad.startsWith('a') ? `<div class="tb act" data-p="${p}" data-b="a">${b.a || 'A'}</div>` : '') +
        (pad.includes(' b') ? `<div class="tb act" data-p="${p}" data-b="b">${b.b || 'B'}</div>` : '');
      el.innerHTML += `<div class="pad ${p ? 'r' : 'l'}">${dp ? `<div class="dp">${dp}</div>` : ''}<div class="ab">${ab}</div></div>`;
    }
  }
  function touchUpdate(e) {
    if (!e.target.closest || !e.target.closest('#pads')) { if (e.type !== 'touchend' && e.type !== 'touchcancel') return; }
    const prev = Inp.t.map(o => ({ ...o }));
    Inp.t = [mkInp(), mkInp()];
    document.querySelectorAll('#pads .on').forEach(n => n.classList.remove('on'));
    for (const t of e.touches) {
      const n = document.elementFromPoint(t.clientX, t.clientY);
      if (n && n.dataset && n.dataset.b) { const p = +n.dataset.p; Inp.t[p][n.dataset.b] = 1; n.classList.add('on'); }
    }
    for (let p = 0; p < 2; p++) for (const b of BTN) if (Inp.t[p][b] && !prev[p][b]) Inp.press(p, b);
    if (e.cancelable && e.target.closest && e.target.closest('#pads')) e.preventDefault();
  }

  /* ----- layout ----- */
  function fit() {
    const st = $('stage'), r = st.getBoundingClientRect(), pad = 8;
    const aw = Math.max(50, r.width - pad * 2), ah = Math.max(50, r.height - pad * 2);
    scale = Math.min(aw / W, ah / H);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = W * scale + 'px'; cv.style.height = H * scale + 'px';
    cv.width = Math.round(W * scale * dpr); cv.height = Math.round(H * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }
  function toLocal(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }

  /* ----- main loop ----- */
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!inst) return;
    if (phase === 'play' && !A.ended) {
      if (countdown > 0) { const before = Math.ceil(countdown / 0.5); countdown -= dt; const after = Math.ceil(countdown / 0.5); if (before !== after) Snd.play(countdown <= 0 ? 'go' : 'tick'); }
      else if (inst.update) { try { inst.update(dt); } catch (err) { console.error(err); } }
    } else if (phase === 'play' && A.ended && inst.after) inst.after(dt);
    Inp.clearTaps();
    ctx.save();
    if (flash > 0) { ctx.translate(rand(-flash, flash), rand(-flash, flash)); flash = Math.max(0, flash - dt * 40); }
    ctx.fillStyle = def.bg || BG; ctx.fillRect(-20, -20, W + 40, H + 40);
    try { inst.draw(ctx); } catch (err) { console.error(err); }
    ctx.restore();
    if (phase === 'play' && countdown > 0 && !A.ended) {
      ctx.fillStyle = '#0c0c0e99'; ctx.fillRect(0, 0, W, H);
      const n = Math.ceil(countdown / 0.5);
      ctx.font = `italic 160px "Instrument Serif", Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = TXT; ctx.fillText(n > 2 ? '3' : n > 1 ? '2' : '1', W / 2, H / 2);
    }
  }

  function boot() {
    $('n1').value = names[0]; $('n2').value = names[1];
    const saveNames = () => { names = [$('n1').value.trim() || 'Red', $('n2').value.trim() || 'Blue']; Store.set('names', names); renderMenu(); };
    $('n1').onchange = saveNames; $('n2').onchange = saveNames;
    $('cats').onclick = e => { const b = e.target.closest('button'); if (b) { cat = b.dataset.c; renderMenu(); } };
    $('search').oninput = renderMenu;
    $('grid').onclick = e => { const b = e.target.closest('.tile'); if (b) { Snd.init(); party = null; open(b.dataset.id); } };
    $('partyBtn').onclick = () => { Snd.init(); startParty(); };
    $('randomBtn').onclick = () => { Snd.init(); party = null; open(pick(GAMES).id); };
    $('backBtn').onclick = showMenu;
    $('restartBtn').onclick = () => { if (!def) return; newRound(); hideOverlay(); };
    $('helpBtn').onclick = showHelp;
    const setMute = m => { Snd.muted = m; Store.set('muted', m); $('muteBtn').innerHTML = SPEAKER[m ? 1 : 0]; $('muteMenu').textContent = m ? 'Sound off' : 'Sound on'; };
    setMute(Snd.muted);
    $('muteBtn').onclick = () => setMute(!Snd.muted); $('muteMenu').onclick = () => { setMute(!Snd.muted); Snd.init(); };
    $('overlay').onclick = e => { const b = e.target.closest('[data-a]'); if (b) action(b.dataset.a); };

    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      Snd.init();
      if (phase === 'overlay') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') { const b = document.querySelector('#overlay .btn'); if (b) { e.preventDefault(); b.click(); } }
        else if (e.code === 'Escape') { const b = document.querySelector('#overlay [data-a="menu"]'); if (b) b.click(); }
        return;
      }
      if (phase === 'play') {
        if (e.code === 'Escape' || e.code === 'KeyP') { showHelp(); return; }
        const m = KEYS[e.code];
        if (m) { e.preventDefault(); if (!e.repeat) { Inp.k[m[0]][m[1]] = 1; Inp.press(m[0], m[1]); } }
        if (inst && inst.key && !e.repeat) inst.key(e.code);
      }
    });
    addEventListener('keyup', e => { const m = KEYS[e.code]; if (m) Inp.k[m[0]][m[1]] = 0; });
    addEventListener('blur', () => Inp.reset());
    for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) document.addEventListener(ev, touchUpdate, { passive: false });

    cv.addEventListener('pointerdown', e => { Snd.init(); if (phase !== 'play' || !inst || A.ended || countdown > 0) return; cv.setPointerCapture(e.pointerId); const [x, y] = toLocal(e); inst.down && inst.down(x, y); });
    cv.addEventListener('pointermove', e => { if (phase !== 'play' || !inst || A.ended) return; const [x, y] = toLocal(e); inst.move && inst.move(x, y); });
    cv.addEventListener('pointerup', e => { if (phase !== 'play' || !inst || A.ended) return; const [x, y] = toLocal(e); inst.up && inst.up(x, y); });
    cv.addEventListener('pointercancel', () => { if (inst && inst.cancel) inst.cancel(); });
    addEventListener('resize', () => { if (def) fit(); });

    const h = location.hash.slice(1);
    showMenu();
    if (h && GAMES.find(g => g.id === h)) open(h);
    requestAnimationFrame(frame);
  }
  return { boot, open, games: GAMES, _state: () => ({ phase, A, inst, def }), _action: action };
})();
