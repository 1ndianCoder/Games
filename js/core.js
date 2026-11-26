'use strict';
/* ============================================================
   Duo engine: menu, input (keys / floating touch sticks / bots),
   render loop, rotation, scoring, sound, bots.
   Games call reg({...}) with make(A) returning
   { update(dt), draw(c), down/move/up(x,y), ai(...) }.
   Real-time ai(dt, B) steers bot B. Turn ai(B) makes one action and returns true.
   ============================================================ */

const COL = ['#ff4f6d', '#3ec5ff'];
const COLD = ['#7a2236', '#1d5c7a'];
const BG = '#14141f', BG2 = '#1e1e2d', LINE = '#30304a', TXT = '#f4f2ff', MUT = '#9c9ab8', ACC = '#ffd166';
const FONT = 'Nunito, "Varela Round", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
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
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;   // ~N(0, .33) bounded
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

/* ---------- drawing ---------- */
const D = {
  circ(c, x, y, r, f, s, lw = 2) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, 7); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw; c.stroke(); } },
  rect(c, x, y, w, h, f) { c.fillStyle = f; c.fillRect(x, y, w, h); },
  rr(c, x, y, w, h, r, f, s, lw = 2) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)) : c.rect(x, y, w, h); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw; c.stroke(); } },
  line(c, x1, y1, x2, y2, s, lw = 2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = s; c.lineWidth = lw; c.stroke(); },
  text(c, t, x, y, size = 20, f = TXT, al = 'center', bl = 'middle', wt = 800) {
    c.font = `${wt} ${size}px ${FONT}`; c.textAlign = al; c.textBaseline = bl; c.fillStyle = f; c.fillText(t, x, y);
  },
  poly(c, pts, f, s, lw = 2) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw; c.stroke(); } },
  glyph(c, k, x, y, r, f) {
    const P = (n, rot = -Math.PI / 2, rr = r) => Array.from({ length: n }, (_, i) => [x + Math.cos(rot + i * Math.PI * 2 / n) * rr, y + Math.sin(rot + i * Math.PI * 2 / n) * rr]);
    c.lineCap = 'round'; c.lineJoin = 'round';
    switch (k) {
      case 'circle': D.circ(c, x, y, r * .85, f); break;
      case 'square': D.rr(c, x - r * .75, y - r * .75, r * 1.5, r * 1.5, r * .3, f); break;
      case 'tri': D.poly(c, P(3, -Math.PI / 2, r * 1.05), f, f, r * .2); break;
      case 'diamond': D.poly(c, P(4, -Math.PI / 2, r), f, f, r * .15); break;
      case 'ring': D.circ(c, x, y, r * .7, null, f, r * .32); break;
      case 'hex': D.poly(c, P(6, 0, r * .9), f, f, r * .15); break;
      case 'star': D.poly(c, Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; return [x + Math.cos(a) * q, y + Math.sin(a) * q]; }), f, f, r * .12); break;
      case 'cross': D.line(c, x - r * .7, y - r * .7, x + r * .7, y + r * .7, f, r * .35); D.line(c, x + r * .7, y - r * .7, x - r * .7, y + r * .7, f, r * .35); break;
      case 'plus': D.line(c, x - r * .8, y, x + r * .8, y, f, r * .35); D.line(c, x, y - r * .8, x, y + r * .8, f, r * .35); break;
      case 'crown': D.poly(c, [[x - r, y + r * .6], [x - r, y - r * .4], [x - r * .5, y + r * .05], [x, y - r * .7], [x + r * .5, y + r * .05], [x + r, y - r * .4], [x + r, y + r * .6]], f, f, r * .15); break;
      case 'flame': c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x + r, y, x, y + r); c.quadraticCurveTo(x - r, y, x, y - r); c.fillStyle = f; c.fill(); break;
      case 'bomb': D.circ(c, x, y + r * .15, r * .75, f); D.line(c, x + r * .4, y - r * .45, x + r * .75, y - r * .85, f, r * .2); break;
    }
    c.lineCap = 'butt'; c.lineJoin = 'miter';
  },
  glow(c, col, b) { c.shadowColor = col; c.shadowBlur = b; },
  noglow(c) { c.shadowBlur = 0; },
};

/* ---------- physics ---------- */
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
function rectBounce(o, x, y, w, h, e = 1) {
  const cx = clamp(o.x, x, x + w), cy = clamp(o.y, y, y + h);
  let dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
  if (d >= o.r) return false;
  if (d === 0) {
    const l = o.x - x, r = x + w - o.x, t = o.y - y, b = y + h - o.y, m = Math.min(l, r, t, b);
    if (m === l) { dx = -1; dy = 0; } else if (m === r) { dx = 1; dy = 0; } else if (m === t) { dx = 0; dy = -1; } else { dx = 0; dy = 1; }
    d = 1; o.x = m === l ? x - o.r : m === r ? x + w + o.r : o.x; o.y = m === t ? y - o.r : m === b ? y + h + o.r : o.y;
  } else { o.x = cx + dx / d * o.r; o.y = cy + dy / d * o.r; }
  const nx = dx / d, ny = dy / d, vn = o.vx * nx + o.vy * ny;
  if (vn < 0) { o.vx -= (1 + e) * vn * nx; o.vy -= (1 + e) * vn * ny; }
  return true;
}
/* segment vs rect test (line of sight) */
function segHitsRect(x1, y1, x2, y2, rx, ry, rw, rh, pad = 0) {
  rx -= pad; ry -= pad; rw += pad * 2; rh += pad * 2;
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  for (const [p, q] of [[-dx, x1 - rx], [dx, rx + rw - x1], [-dy, y1 - ry], [dy, ry + rh - y1]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}

/* ---------- sound ---------- */
const Snd = {
  ac: null, muted: false, quiet: false,
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
      case 'hit': this.tone(520, .06, 'triangle', .08); break;
      case 'bounce': this.tone(300, .05, 'triangle', .07); break;
      case 'click': this.tone(880, .03, 'sine', .05); break;
      case 'place': this.tone(440, .07, 'triangle', .08, 220); break;
      case 'score': this.tone(660, .1, 'triangle', .08); this.tone(990, .14, 'triangle', .08, 0, .08); break;
      case 'bad': this.tone(200, .25, 'sawtooth', .04, -120); break;
      case 'boom': this.noise(.35, .18); this.tone(120, .3, 'sine', .15, -80); break;
      case 'shoot': this.tone(900, .08, 'square', .025, -600); break;
      case 'tick': this.tone(1200, .02, 'sine', .04); break;
      case 'go': this.tone(880, .2, 'triangle', .08); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .18, 'triangle', .08, 0, i * .1)); break;
      case 'coin': this.tone(990, .05, 'triangle', .06); this.tone(1320, .1, 'triangle', .06, 0, .05); break;
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
  press(p, b) { this.taps[p][b] = 1; },
  clearTaps() { for (const p of this.taps) for (const b of BTN) p[b] = 0; },
  reset() { this.k = [mkInp(), mkInp()]; this.t = [mkInp(), mkInp()]; this.clearTaps(); },
};
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
const ctrlMode = def => def.touch || (def.pad === 'one' ? 'one' : 'stick');

/* ---------- bots ----------
   A bot drives one player through the same channels a human uses:
   held buttons, one-frame taps and an analog axis. Level 0 easy, 1 medium, 2 hard. */
const D4 = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
function makeBot(p, lvl) {
  const B = {
    p, lvl, held: mkInp(), taps: mkInp(), ax: [0, 0], analog: true, mem: {}, dt: 0, t: 0,
    k(e, m, h) { return [e, m, h][this.lvl]; },
    go(x, y) {
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      this.ax = [x, y]; this.analog = true; const t = .3;
      this.held.u = y < -t ? 1 : 0; this.held.d = y > t ? 1 : 0; this.held.l = x < -t ? 1 : 0; this.held.r = x > t ? 1 : 0;
    },
    toward(fx, fy, tx, ty, spd = 1, slow = 40) { const dx = tx - fx, dy = ty - fy, d = Math.hypot(dx, dy); if (d < 1.5) return this.go(0, 0); const s = Math.min(1, d / slow) * spd; this.go(dx / d * s, dy / d * s); },
    stop() { this.go(0, 0); },
    press(b) { this.taps[b] = 1; },
    hold(b, v = 1) { this.held[b] = v ? 1 : 0; },
    dir(k) { for (const d in D4) this.held[d] = 0; this.analog = false; if (k) { this.held[k] = 1; this.taps[k] = 1; this.ax = D4[k].slice(); } else this.ax = [0, 0]; },
    after(key, cond, sec) { if (!cond) { this.mem[key] = 0; return false; } this.mem[key] = (this.mem[key] || 0) + this.dt; return this.mem[key] >= sec; },
    every(key, sec) { this.mem[key] = (this.mem[key] ?? 0) - this.dt; if (this.mem[key] <= 0) { this.mem[key] = sec; return true; } return false; },
    chance(pr) { return Math.random() < pr; },
    clearTaps() { for (const b of BTN) this.taps[b] = 0; },
  };
  return B;
}
/* generic game-tree search used by board-game bots.
   o = { moves(s), play(s,m) -> new state (s.p = player to move), over(s) -> winner|-1 draw|null, score(s, me), order?(s, ms) } */
const Search = {
  nodes: 0,
  /* iterative deepening alpha-beta with a time limit (ms); keeps the best move of the deepest finished pass */
  best(s, depth, me, o, noise = 0, ms = 150) {
    const all = o.moves(s); if (!all.length) return null; if (all.length === 1) return all[0];
    const nz = new Map(all.map(m => [m, noise ? rand(-noise, noise) : 0]));
    let order = o.order ? o.order(s, all) : all.slice(), best = order[0];
    this.deadline = performance.now() + Math.min(ms, 260);
    for (let d = 1; d <= depth; d++) {
      this.nodes = 0; this.abort = false;
      let bv = -Infinity, bm = order[0]; const vals = [];
      for (const m of order) {
        const v = this.ab(o.play(s, m), d - 1, bv - 2 * noise - 1, Infinity, me, o) + nz.get(m);
        if (this.abort) break;
        vals.push([v, m]); if (v > bv) { bv = v; bm = m; }
      }
      if (this.abort) break;
      best = bm; order = vals.sort((a, b) => b[0] - a[0]).map(x => x[1]);
      if (Math.abs(bv) > 5e5) break;
    }
    return best;
  },
  ab(s, d, a, b, me, o) {
    if ((++this.nodes & 511) === 0 && performance.now() > this.deadline) this.abort = true;
    if (this.abort) return 0;
    const w = o.over(s);
    if (w !== null && w !== undefined) return w === me ? 1e6 + d : w === -1 ? 0 : -1e6 - d;
    if (d <= 0) return o.score(s, me);
    let ms = o.moves(s); if (!ms.length) return o.score(s, me);
    if (o.order) ms = o.order(s, ms);
    if (s.p === me) { let v = -Infinity; for (const m of ms) { v = Math.max(v, this.ab(o.play(s, m), d - 1, a, b, me, o)); a = Math.max(a, v); if (a >= b) break; } return v; }
    let v = Infinity; for (const m of ms) { v = Math.min(v, this.ab(o.play(s, m), d - 1, a, b, me, o)); b = Math.min(b, v); if (a >= b) break; } return v;
  },
  /* flat Monte-Carlo: o.rollout(s) plays random moves in place and returns the winner */
  mc(s, me, o, n) {
    const ms = o.moves(s); if (ms.length <= 1) return ms[0];
    const per = Math.max(6, Math.floor(n / ms.length)); let best = ms[0], bv = -1;
    for (const m of ms) {
      const s1 = o.play(s, m); let w = 0;
      for (let i = 0; i < per; i++) { const r = o.rollout(o.clone(s1)); w += r === me ? 1 : r === -1 ? .5 : 0; }
      if (w > bv) { bv = w; best = m; }
    }
    return best;
  },
};

/* ---------- scroll wheel picker (iOS-style drum) ---------- */
function Wheel(host, items, value, onChange) {
  const IH = 46;
  host.innerHTML = `<div class="wheel"><div class="wheel-sel"></div><div class="wheel-scroll"><div class="wheel-pad"></div>${items.map(it => `<div class="wheel-item" data-v="${it.v}"><span class="wheel-face"><b>${it.label}</b><small>${it.sub}</small></span></div>`).join('')}<div class="wheel-pad"></div></div></div>`;
  const sc = host.querySelector('.wheel-scroll'), els = [...sc.querySelectorAll('.wheel-item')], faces = els.map(e => e.firstChild);
  let cur = Math.max(0, items.findIndex(i => i.v === value)), raf = 0, settle = 0, ready = false;
  const paint = () => {
    raf = 0; const mid = sc.scrollTop / IH;
    els.forEach((el, i) => {
      const a = clamp(i - mid, -2.5, 2.5);
      faces[i].style.transform = `translateY(${-a * 4}px) rotateX(${-a * 34}deg) scale(${1 - Math.abs(a) * .1})`;
      faces[i].style.opacity = Math.max(0, 1 - Math.abs(a) * .5);
      el.classList.toggle('on', Math.round(mid) === i);
    });
    const idx = clamp(Math.round(mid), 0, items.length - 1);
    if (idx !== cur && ready) {
      cur = idx; Snd.init(); Snd.tone(1500, .012, 'sine', .035);
      try { navigator.vibrate && navigator.vibrate(5); } catch (e) { }
      onChange(items[cur].v, false);
    }
  };
  sc.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(paint);
    clearTimeout(settle); settle = setTimeout(() => { if (ready) onChange(items[cur].v, true); }, 160);
  }, { passive: true });
  els.forEach((el, i) => el.addEventListener('click', () => sc.scrollTo({ top: i * IH, behavior: 'smooth' })));
  host.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); const i = clamp(cur + (e.key === 'ArrowDown' ? 1 : -1), 0, items.length - 1); sc.scrollTo({ top: i * IH, behavior: 'smooth' }); } });
  sc.tabIndex = 0;
  requestAnimationFrame(() => { sc.scrollTop = cur * IH; paint(); setTimeout(() => { ready = true; }, 60); });
  return { set(v) { const i = items.findIndex(x => x.v === v); if (i >= 0 && i !== cur) { cur = i; sc.scrollTo({ top: i * IH, behavior: 'smooth' }); } } };
}
const OPP_ITEMS = [{ v: -1, label: 'Friend', sub: '2 players' }, { v: 0, label: 'Easy', sub: 'chill bot' }, { v: 1, label: 'Medium', sub: 'fair fight' }, { v: 2, label: 'Hard', sub: 'no mercy' }];

/* ---------- storage ---------- */
const Store = {
  get(k, d) { try { const v = localStorage.getItem('duo_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('duo_' + k, JSON.stringify(v)); } catch (e) { } },
};

/* ============================================================ */
const Duo = (() => {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage');
  let def = null, inst = null, A = null, phase = 'menu', countdown = 0, scale = 1, W = 800, H = 500, rot = false, baseT = [1, 0, 0, 1, 0, 0];
  let session = [0, 0], round = 0, cat = 'All', party = null, flash = 0, playT = 0;
  let names = Store.get('names', ['Red', 'Blue']);
  let opp = Store.get('opp', -1);               // -1 friend, 0..2 bot level
  let forceBots = null;                         // testing hook: [lvl|null, lvl|null]
  let bots = [null, null], turnP = -1, botWait = 0;
  let stats = {};
  const statsKey = () => opp < 0 ? 'stats' : 'stats_bot' + opp;
  const loadStats = () => { stats = Store.get(statsKey(), {}); };
  loadStats();
  Snd.muted = Store.get('muted', false);
  const LEVELS = ['Easy', 'Medium', 'Hard'];
  const dispNames = () => [bots[0] ? 'Bot' : names[0], bots[1] ? 'Bot' : names[1]];

  /* axis state */
  const ax = [[0, 0], [0, 0]], src = ['keys', 'keys'];
  const touchSt = [{ stick: null, point: null }, { stick: null, point: null }];
  const ptrs = new Map(); let primary = null; const ripples = [];
  const R_STICK = 54;

  /* ----- menu ----- */
  const CATS = ['All', 'Sports', 'Arcade', 'Party', 'Board'];
  const pad2 = n => String(n).padStart(2, '0');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SPEAKER = ['<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM16 10l5 5M21 10l-5 5"/></svg>'];
  function renderMenu() {
    previews.stopAll();
    $('gcount').textContent = GAMES.length;
    if (menuWheel) menuWheel.set(opp);
    $('n2').disabled = opp >= 0; $('n2').value = opp >= 0 ? 'Bot' : names[1];
    $('lab2').textContent = opp >= 0 ? `Bot · ${LEVELS[opp]}` : (isTouch ? 'Player two' : 'Player two · arrows');
    $('lab1').textContent = isTouch ? 'Player one' : 'Player one · WASD';
    $('cats').innerHTML = CATS.map(c => `<button class="${c === cat ? 'on' : ''}" data-c="${c}">${c}<sup>${c === 'All' ? GAMES.length : GAMES.filter(g => g.cat === c).length}</sup></button>`).join('');
    const q = $('search').value.trim().toLowerCase();
    const list = GAMES.filter(g => (cat === 'All' || g.cat === cat) && (!q || (g.name + ' ' + g.desc + ' ' + g.cat).toLowerCase().includes(q)));
    $('grid').innerHTML = list.length ? list.map(g => {
      const s = stats[g.id], i = GAMES.indexOf(g) + 1;
      const stat = s ? `<span class="mini"><i style="flex:${s.w[0] || .001};background:var(--p1)"></i><i style="flex:${s.w[1] || .001};background:var(--p2)"></i></span><span><b class="p1">${s.w[0]}</b> – <b class="p2">${s.w[1]}</b></span>`
        : `<span>${g.type === 'turn' ? 'Turns' : 'Real time'}</span>`;
      return `<button class="tile" data-id="${g.id}"><div class="thumb"><canvas></canvas><span class="live">Bots playing</span></div>
        <div class="meta"><span class="idx">${pad2(i)}</span><span class="nm">${g.name}</span></div>
        <p class="ds">${g.desc}</p><div class="stat">${stat}</div></button>`;
    }).join('') : `<div class="empty">Nothing called “${esc(q)}”. Yet.</div>`;
    document.querySelectorAll('#grid .tile').forEach(t => previews.mount(t));
    const all = Object.values(stats), w0 = all.reduce((a, s) => a + s.w[0], 0), w1 = all.reduce((a, s) => a + s.w[1], 0), tot = all.reduce((a, s) => a + s.n, 0);
    $('r1').textContent = w0; $('r2').textContent = w1;
    $('b1').style.flexGrow = w0 || (w1 ? 0 : 1); $('b2').style.flexGrow = w1 || (w0 ? 0 : 1);
    const n2 = opp >= 0 ? 'Bot' : names[1];
    $('nplayed').textContent = tot ? `${tot} played · ${w0 === w1 ? 'dead even' : (w0 > w1 ? names[0] : n2) + ' leads'}` : 'No matches yet';
    $('muteMenu').innerHTML = SPEAKER[Snd.muted ? 1 : 0];
    $('foot').innerHTML = isTouch ? '' : `<div><b class="p1">${esc(names[0])}</b>Move <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · Action <kbd>F</kbd>/<kbd>Space</kbd> · Alt <kbd>G</kbd></div>
      <div><b class="p2">${esc(n2)}</b>${opp >= 0 ? 'Playing a bot? Arrows and Enter also control you.' : 'Move <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> · Action <kbd>Enter</kbd>/<kbd>L</kbd> · Alt <kbd>K</kbd>'}</div>
      <div><b>Anywhere</b>Pause <kbd>Esc</kbd> · Rematch <kbd>Space</kbd></div>`;
  }
  function leaveGame() { if (history.state && history.state.duo) history.back(); else showMenu(); }
  function showMenu() {
    phase = 'menu'; inst = null; def = null; party = null; clearTouches(); wake(false);
    document.body.classList.remove('ingame');
    $('game').hidden = true; $('menu').hidden = false; renderMenu();
  }

  /* ----- live previews: real game + two easy bots ----- */
  const previews = (() => {
    const cache = {}, active = new Set(); let raf = 0, lastT = 0;
    function create(g, retry) {
      const P = { g, dead: 0, turn: 0, wait: .3, moves: 0, B: [makeBot(0, 0), makeBot(1, 0)], ax: [[0, 0], [0, 0]] };
      const A2 = {
        W: g.w || 800, H: g.h || 500, names: ['Red', 'Blue'], first: 0, round: 0, ended: false, preview: true,
        get: (p, b) => P.B[p].held[b], hit: (p, b) => !!P.B[p].taps[b], axis: p => P.ax[p], analog: p => P.B[p].analog, point: () => null,
        end: () => { A2.ended = true; }, turn: p => { P.turn = p; }, sfx() { }, shake() { },
      };
      P.A = A2;
      Snd.quiet = true;
      try {
        P.inst = g.make(A2);
        if (g.type === 'real') for (let i = 0; i < 40; i++) step(P, 1 / 60);
        else for (let i = 0; i < 400 && !A2.ended && P.moves < 10; i++) { P.wait = 0; step(P, 1 / 30); }
        if (A2.ended && !retry) { Snd.quiet = false; return create(g, true); }
      } catch (e) { P.inst = null; console.warn('preview', g.id, e); }
      Snd.quiet = false;
      return P;
    }
    function step(P, dt) {
      const { A: A2, inst: I, g } = P; if (!I) return;
      if (A2.ended) { P.dead += dt; if (P.dead > 1.4) Object.assign(P, create(g), { cv: P.cv }); return; }
      if (g.type === 'real') {
        for (const B of P.B) { B.dt = dt; B.t += dt; B.clearTaps(); try { I.ai && I.ai(dt, B); } catch (e) { } const e = 1 - Math.exp(-dt * 14); P.ax[B.p][0] += (B.ax[0] - P.ax[B.p][0]) * e; P.ax[B.p][1] += (B.ax[1] - P.ax[B.p][1]) * e; }
      } else {
        P.wait -= dt;
        if (P.wait <= 0 && I.ai) { const B = P.B[P.turn] || P.B[0]; B.dt = dt; let ok = false; try { ok = I.ai(B); } catch (e) { } P.wait = ok ? rand(.35, .6) : .1; if (ok) P.moves++; }
      }
      try { I.update && I.update(dt); } catch (e) { }
    }
    function paint(P) {
      const cv = P.cv; if (!cv || !cv.isConnected) return;
      const r = cv.getBoundingClientRect(); if (!r.width) return;
      const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const c = cv.getContext('2d'), W2 = P.A.W, H2 = P.A.H, sc = Math.min(w / W2, h / H2);
      c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = P.g.bg || BG; c.fillRect(0, 0, w, h);
      c.setTransform(sc, 0, 0, sc, (w - W2 * sc) / 2, (h - H2 * sc) / 2);
      try { P.inst && P.inst.draw(c); } catch (e) { }
    }
    function loop(t) {
      raf = active.size ? requestAnimationFrame(loop) : 0;
      if (isTouch && t - lastT < 30) return;                       // ~30 fps on phones to save battery
      const dt = Math.min(.05, (t - lastT) / 1000 || .016); lastT = t;
      Snd.quiet = true; active.forEach(P => { step(P, dt); paint(P); }); Snd.quiet = false;
    }
    function start(P, el) { el.classList.add('playing'); active.add(P); if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
    function stop(P, el) { el.classList.remove('playing'); active.delete(P); }
    const io = 'IntersectionObserver' in window && isTouch ? new IntersectionObserver(es => es.forEach(e => {
      const P = cache[e.target.dataset.id]; if (!P) return; e.isIntersecting && active.size < 2 && !document.hidden ? start(P, e.target) : stop(P, e.target);
    }), { threshold: .9 }) : null;
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
    $('menu').hidden = true; $('game').hidden = false; document.body.classList.add('ingame');
    if (!(history.state && history.state.duo)) history.pushState({ duo: 1 }, '');
    wake(true); newRound(); showIntro();
  }
  function setupBots() {
    const lv = forceBots || [null, opp >= 0 ? opp : null];
    bots = lv.map((l, p) => l === null || l === undefined ? null : makeBot(p, l));
  }
  function newRound() {
    W = def.w || 800; H = def.h || 500; fit();
    Inp.reset(); clearTouches(); setupBots(); turnP = -1; botWait = .8; playT = 0;
    ax[0] = [0, 0]; ax[1] = [0, 0];
    A = {
      W, H, names: dispNames(), first: round % 2, round, ended: false,
      get: (p, b) => bots[p] ? bots[p].held[b] : (Inp.k[p][b] || Inp.t[p][b]),
      hit: (p, b) => bots[p] ? !!bots[p].taps[b] : !!Inp.taps[p][b],
      axis: p => ax[p], analog: p => src[p] === 'stick' || (src[p] === 'bot' && bots[p].analog),
      point: p => touchSt[p].point, isBot: p => !!bots[p],
      end, turn, sfx: n => Snd.play(n), shake: v => { flash = Math.max(flash, v); },
    };
    inst = def.make(A);
    countdown = def.type === 'real' ? 1.6 : 0;
  }
  function turn(p) {
    if (p !== turnP && p >= 0 && bots[p]) botWait = bots[p].k(.75, .6, .5) + rand(.1, .35);
    turnP = p;
  }
  let lastW = null;
  function end(w, msg) {
    if (!A || A.ended) return; A.ended = true; lastW = w;
    if (w === 0 || w === 1) session[w]++;
    round++;
    if (!forceBots) { const s = stats[def.id] || (stats[def.id] = { n: 0, w: [0, 0] }); s.n++; if (w === 0 || w === 1) s.w[w]++; Store.set(statsKey(), stats); }
    if (party && (w === 0 || w === 1)) party.score[w]++;
    Snd.play(w === -1 ? 'bad' : (bots[w] && !bots[1 - w]) ? 'bad' : 'win'); turnP = -1; clearTouches();
    const tok = A; setTimeout(() => { if (A === tok && phase !== 'menu') showEnd(w, msg); }, 900);
  }

  /* ----- overlays ----- */
  function overlay(html) { const o = $('overlay'); o.innerHTML = `<div class="panel">${html}</div>`; o.hidden = false; phase = 'overlay'; clearTouches(); }
  function hideOverlay() { $('overlay').hidden = true; phase = 'play'; }
  function controlsHtml() {
    const N = dispNames(), mode = ctrlMode(def), b = def.btn || {};
    if (isTouch) {
      if (def.type === 'turn') return `<div class="how"><span>Tap the board on your turn${['golf', 'pool', 'curling', 'artillery'].includes(def.id) ? ' · pull back and release to shoot' : ''}.</span></div>`;
      const t = def.touchHint ? `${def.touchHint[0].toUpperCase() + def.touchHint.slice(1)} on your side.` : mode === 'one' ? `Tap your side of the screen to <b>${(b.a || 'go').toLowerCase()}</b>.`
        : mode === 'point' ? 'Put a finger on your side and slide — it follows you.'
          : `Drag anywhere on your side to move.${b.a ? ` Tap to <b>${b.a.toLowerCase()}</b>.` : ''}${b.b ? ` Flick to <b>${b.b.toLowerCase()}</b>.` : ''}`;
      return `<div class="how"><span>${t}</span>${bots[1] ? '<span class="dim">The whole screen is yours.</span>' : `<span class="dim">${N[0]} gets the ${rot ? 'bottom' : 'left'} half, ${N[1]} the ${rot ? 'top' : 'right'}.</span>`}</div>`;
    }
    if (def.type === 'turn' && !def.keys) return `<div class="how"><span>Click the board on your turn.</span></div>`;
    const pad = def.pad || 'dpad a';
    const mv = pad.includes('dpad') ? ['W A S D', 'Arrows'] : pad.includes('ud') ? ['W S', '↑ ↓'] : pad.includes('lr') ? ['A D', '← →'] : null, one = pad === 'one';
    const k = i => [mv ? `<kbd>${mv[i]}</kbd> move` : '', (b.a || one) ? `<kbd>${i ? 'Enter' : 'F'}</kbd> ${(b.a || 'go').toLowerCase()}` : '', b.b ? `<kbd>${i ? 'K' : 'G'}</kbd> ${b.b.toLowerCase()}` : ''].filter(Boolean).join(' &nbsp; ');
    if (bots[1]) return `<div class="how"><span>${def.keys ? def.keys[0] : k(0)}</span><span class="dim">Arrow keys and Enter work too.</span></div>`;
    return `<div class="how two"><span class="p1"><b>${N[0]}</b>${def.keys ? def.keys[0] : k(0)}</span><span class="p2"><b>${N[1]}</b>${def.keys ? def.keys[1] : k(1)}</span></div>`;
  }
  let menuWheel = null;
  function setOpp(v) {
    opp = v; Store.set('opp', v); loadStats();
    if (phase === 'menu') renderMenu();
    else if (def && A && !A.ended && phase === 'overlay' && $('introWheel')) { newRound(); const h = $('introHow'); if (h) h.innerHTML = controlsHtml(); }
  }
  const turnTip = () => isTouch && !rot && W / H > 1.25 && innerHeight > innerWidth ? `<div class="tip"><svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="3"/><path d="M20 14a8 8 0 0 1-6 6M17 20h-3v-3"/></svg>Turn your phone sideways for a bigger view</div>` : '';
  function showIntro() {
    overlay(`<div class="kick">${party ? `Party · ${party.i + 1} of ${party.list.length}` : def.cat}</div><h2>${def.name}</h2><p>${def.help}</p>${forceBots ? '' : '<div class="lab wheel-lab">Play against</div><div id="introWheel"></div>'}<div id="introHow">${controlsHtml()}</div>${turnTip()}
      <div class="row"><button class="btn" data-a="start">Play</button><button class="btn ghost" data-a="menu">Back</button></div>`);
    if (!forceBots) Wheel($('introWheel'), OPP_ITEMS, opp, (v, final) => { if (final && v !== opp) setOpp(v); });
  }
  function showPause() {
    if (phase !== 'play' || !def) return;
    const N = dispNames();
    overlay(`<div class="kick">Paused</div><h2>${def.name}</h2>
      <div class="tally"><span class="p1">${session[0]}</span><span class="dash"></span><span class="p2">${session[1]}</span></div><div class="kick">${esc(N[0])} vs ${esc(N[1])}</div>
      <p>${def.help}</p>${controlsHtml()}
      <div class="row"><button class="btn" data-a="resume">Resume</button><button class="btn ghost" data-a="restart">Restart</button><button class="btn ghost" data-a="menu">Menu</button></div>
      <button class="link" data-a="mute">${Snd.muted ? 'Sound is off — turn on' : 'Sound is on — turn off'}</button>`);
  }
  function showEnd(w, msg) {
    if (!def) return;
    const N = dispNames(), lost = bots[w] && !bots[1 - w];
    const who = `<div class="kick">${def.name}</div>` + (w === -1 ? `<h2>A draw.</h2>` : `<h2 class="win${w + 1}">${lost ? 'Bot wins.' : esc(N[w]) + ' wins!'}</h2>`);
    let extra = '', btns;
    if (party) {
      party.i++;
      const done = party.i >= party.list.length;
      extra = `<div class="tally"><span class="p1">${party.score[0]}</span><span class="dash"></span><span class="p2">${party.score[1]}</span></div><div class="kick">Party score</div>`;
      if (done) {
        const pw = party.score[0] === party.score[1] ? -1 : party.score[0] > party.score[1] ? 0 : 1;
        extra += pw === -1 ? `<p>The party ends level.</p>` : `<p>The party goes to <span class="p${pw + 1}">${esc(N[pw])}</span>.</p>`;
        btns = `<button class="btn" data-a="party">New party</button><button class="btn ghost" data-a="menu">Menu</button>`;
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
    else if (a === 'again' || a === 'restart') { newRound(); hideOverlay(); }
    else if (a === 'menu') leaveGame();
    else if (a === 'next') { open(party.list[party.i].id, true); }
    else if (a === 'party') startParty();
    else if (a === 'mute') { setMute(!Snd.muted); showPauseRefresh(); }
  }
  function showPauseRefresh() { phase = 'play'; showPause(); }
  function startParty() {
    const pool = shuffle(GAMES.filter(g => !g.long));
    party = { list: pool.slice(0, 5), i: 0, score: [0, 0] };
    open(party.list[0].id);
  }
  let lock = null;
  async function wake(on) {
    try {
      if (on && 'wakeLock' in navigator && !document.hidden) { if (!lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } }
      else if (!on && lock) { await lock.release(); lock = null; }
    } catch (e) { lock = null; }
  }
  function setMute(m) { Snd.muted = m; Store.set('muted', m); $('muteMenu').innerHTML = SPEAKER[m ? 1 : 0]; }

  /* ----- layout & coordinates ----- */
  function fit() {
    const r = stage.getBoundingClientRect(), pad = isTouch ? 0 : 14, st = getComputedStyle(stage);
    const px = (parseFloat(st.paddingLeft) || 0) + (parseFloat(st.paddingRight) || 0), py = (parseFloat(st.paddingTop) || 0) + (parseFloat(st.paddingBottom) || 0);
    const aw = Math.max(50, r.width - px - pad * 2), ah = Math.max(50, r.height - py - pad * 2);
    const sN = Math.min(aw / W, ah / H), sR = Math.min(aw / H, ah / W);
    rot = isTouch && !!def && !!def.rot && sR > sN * 1.12;
    scale = rot ? sR : sN;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = (rot ? H : W) * scale, ch = (rot ? W : H) * scale;
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const s = scale * dpr;
    baseT = rot ? [0, -s, s, 0, 0, W * s] : [s, 0, 0, s, 0, 0];
  }
  function toLocal(cx, cy) {
    const r = cv.getBoundingClientRect(), u = (cx - r.left) / r.width, v = (cy - r.top) / r.height;
    return rot ? [W * (1 - v), H * u] : [W * u, H * v];
  }
  const screenToWorldVec = (dx, dy) => rot ? [-dy, dx] : [dx, dy];

  /* ----- touch / pointer control ----- */
  function humans() { return [0, 1].filter(p => !bots[p]); }
  function zoneOf(wx) { const h = humans(); if (h.length === 1) return h[0]; if (!h.length) return -1; return wx < W / 2 ? 0 : 1; }
  function clearTouches() {
    ptrs.clear(); primary = null;
    for (let p = 0; p < 2; p++) { touchSt[p].stick = null; touchSt[p].point = null; Inp.t[p] = mkInp(); }
  }
  function stickDigital(p) {
    const st = touchSt[p].stick, T = Inp.t[p];
    if (!st) { T.u = T.d = T.l = T.r = 0; return; }
    const [x, y] = st.v, m = Math.hypot(x, y), th = .38;
    T.u = y < -th ? 1 : 0; T.d = y > th ? 1 : 0; T.l = x < -th ? 1 : 0; T.r = x > th ? 1 : 0;
    const dom = m > .45 ? (Math.abs(x) > Math.abs(y) ? (x > 0 ? 'r' : 'l') : (y > 0 ? 'd' : 'u')) : null;
    if (dom && dom !== st.dom) Inp.press(p, dom);
    st.dom = dom;
  }
  function onDown(e) {
    Snd.init();
    if (phase !== 'play' || !inst || A.ended) return;
    if (e.target.closest && e.target.closest('.fbtn')) return;
    try { stage.setPointerCapture(e.pointerId); } catch (er) { }
    const [wx, wy] = toLocal(e.clientX, e.clientY);
    if (def.type === 'turn') {
      if (countdown > 0 || (turnP >= 0 && bots[turnP]) || primary !== null) return;
      primary = e.pointerId; inst.down && inst.down(wx, wy); return;
    }
    const p = zoneOf(wx); if (p < 0) return;
    const mode = ctrlMode(def), S = touchSt[p];
    const rec = { p, sx: e.clientX, sy: e.clientY, t0: performance.now(), moved: 0, role: 'tap' };
    if (mode === 'point' && !S.point) { rec.role = 'point'; S.point = [wx, wy]; }
    else if (mode === 'stick' && !S.stick) { rec.role = 'stick'; S.stick = { bx: e.clientX, by: e.clientY, cx: e.clientX, cy: e.clientY, v: [0, 0], dom: null }; }
    else { Inp.press(p, 'a'); Inp.t[p].a = 1; ripples.push({ x: wx, y: wy, p, t: 0 }); }
    ptrs.set(e.pointerId, rec);
    e.preventDefault();
  }
  function onMove(e) {
    if (phase !== 'play' || !inst || A.ended) return;
    const [wx, wy] = toLocal(e.clientX, e.clientY);
    if (def.type === 'turn') { if (primary === null || primary === e.pointerId) { if (!(turnP >= 0 && bots[turnP])) inst.move && inst.move(wx, wy); } return; }
    const rec = ptrs.get(e.pointerId); if (!rec) return;
    rec.moved = Math.max(rec.moved, Math.hypot(e.clientX - rec.sx, e.clientY - rec.sy));
    const S = touchSt[rec.p];
    if (rec.role === 'point') S.point = [wx, wy];
    else if (rec.role === 'stick' && S.stick) {
      const st = S.stick; st.cx = e.clientX; st.cy = e.clientY;
      let dx = st.cx - st.bx, dy = st.cy - st.by; const m = Math.hypot(dx, dy);
      if (m > R_STICK) { st.bx = st.cx - dx / m * R_STICK; st.by = st.cy - dy / m * R_STICK; dx = dx / m * R_STICK; dy = dy / m * R_STICK; }
      const [vx, vy] = screenToWorldVec(dx / R_STICK, dy / R_STICK), mm = Math.hypot(vx, vy), dz = .12;
      st.v = mm < dz ? [0, 0] : [vx / mm * (mm - dz) / (1 - dz), vy / mm * (mm - dz) / (1 - dz)];
      stickDigital(rec.p);
    }
  }
  function onUp(e) {
    if (!inst || !def) return;
    const [wx, wy] = toLocal(e.clientX, e.clientY);
    if (def.type === 'turn') { if (primary === e.pointerId) { primary = null; if (phase === 'play' && !A.ended) { if (e.type === 'pointercancel') inst.cancel && inst.cancel(); else inst.up && inst.up(wx, wy); } } return; }
    const rec = ptrs.get(e.pointerId); if (!rec) return; ptrs.delete(e.pointerId);
    const S = touchSt[rec.p], dur = performance.now() - rec.t0;
    if (rec.role === 'stick') {
      if (dur < 240 && rec.moved < 14) { Inp.press(rec.p, 'a'); ripples.push({ x: wx, y: wy, p: rec.p, t: 0 }); }
      else if (def.btn && def.btn.b && dur < 320 && rec.moved > 36) Inp.press(rec.p, 'b');
      S.stick = null; stickDigital(rec.p);
    } else if (rec.role === 'point') S.point = null;
    else if (![...ptrs.values()].some(r => r.p === rec.p && r.role === 'tap')) Inp.t[rec.p].a = 0;
  }

  /* ----- main loop ----- */
  let last = performance.now();
  function computeAxes(dt) {
    for (let p = 0; p < 2; p++) {
      let tx, ty;
      if (bots[p]) { [tx, ty] = bots[p].ax; src[p] = 'bot'; }
      else if (touchSt[p].stick) { [tx, ty] = touchSt[p].stick.v; src[p] = 'stick'; }
      else {
        tx = (Inp.k[p].r || Inp.t[p].r) - (Inp.k[p].l || Inp.t[p].l); ty = (Inp.k[p].d || Inp.t[p].d) - (Inp.k[p].u || Inp.t[p].u);
        const m = Math.hypot(tx, ty); if (m > 1) { tx /= m; ty /= m; } src[p] = 'keys';
      }
      const e = 1 - Math.exp(-dt * (src[p] === 'stick' ? 45 : src[p] === 'bot' ? 14 : 22));
      ax[p][0] += (tx - ax[p][0]) * e; ax[p][1] += (ty - ax[p][1]) * e;
      if (Math.abs(ax[p][0]) < .002) ax[p][0] = 0; if (Math.abs(ax[p][1]) < .002) ax[p][1] = 0;
    }
  }
  function runBots(dt) {
    if (def.type === 'real') {
      for (const B of bots) if (B) { B.dt = dt; B.t += dt; B.clearTaps(); try { inst.ai && inst.ai(dt, B); } catch (err) { console.error(err); } }
    } else if (turnP >= 0 && bots[turnP] && inst.ai) {
      botWait -= dt;
      if (botWait <= 0) {
        const B = bots[turnP]; B.dt = dt; let ok = false;
        try { ok = inst.ai(B); } catch (err) { console.error(err); }
        botWait = ok ? B.k(.55, .45, .4) + rand(0, .3) : .1;
      }
    }
  }
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!inst) return;
    if (phase === 'play' && !A.ended) {
      if (countdown > 0) { const before = Math.ceil(countdown / 0.5); countdown -= dt; const after = Math.ceil(countdown / 0.5); if (before !== after) Snd.play(countdown <= 0 ? 'go' : 'tick'); }
      else {
        playT += dt; computeAxes(dt); runBots(dt);
        if (inst.update) { try { inst.update(dt); } catch (err) { console.error(err); } }
      }
    }
    Inp.clearTaps(); for (const B of bots) if (B) B.clearTaps();
    ctx.setTransform(...baseT);
    ctx.save();
    if (flash > 0) { ctx.translate(rand(-flash, flash), rand(-flash, flash)); flash = Math.max(0, flash - dt * 40); }
    ctx.fillStyle = def.bg || BG; ctx.fillRect(-20, -20, W + 40, H + 40);
    try { inst.draw(ctx); } catch (err) { console.error(err); }
    ctx.restore();
    drawTouchLayer(dt);
    if (phase === 'play' && countdown > 0 && !A.ended) {
      ctx.fillStyle = '#14141fa8'; ctx.fillRect(0, 0, W, H);
      const n = Math.ceil(countdown / 0.5), k = (countdown % .5) / .5;
      D.text(ctx, n > 2 ? '3' : n > 1 ? '2' : '1', W / 2, H / 2, 120 + k * 40, TXT, 'center', 'middle', 900);
    }
  }
  function drawTouchLayer(dt) {
    const c = ctx;
    // control hints at the start of real-time rounds on touch screens
    if (isTouch && def.type === 'real' && phase === 'play' && !A.ended && (countdown > 0 || playT < 2.2)) {
      const a = countdown > 0 ? .9 : clamp((2.2 - playT) / .8, 0, .9), mode = ctrlMode(def), b = def.btn || {}, hs = humans();
      const txt = def.touchHint || (mode === 'one' ? `tap to ${(b.a || 'go').toLowerCase()}` : mode === 'point' ? 'slide your finger' : `drag to move${b.a ? ` · tap to ${b.a.toLowerCase()}` : ''}${b.b ? ` · flick to ${b.b.toLowerCase()}` : ''}`);
      c.globalAlpha = a;
      if (hs.length === 2) { c.setLineDash([10, 12]); D.line(c, W / 2, 0, W / 2, H, '#ffffff44', 3); c.setLineDash([]); }
      for (const p of hs) {
        const cx = hs.length === 2 ? (p ? W * .75 : W * .25) : W / 2;
        D.rr(c, cx - 150, H - 74, 300, 46, 23, '#000000aa'); D.text(c, txt, cx, H - 51, 19, COL[p], 'center', 'middle', 800);
      }
      c.globalAlpha = 1;
    }
    // sticks
    for (let p = 0; p < 2; p++) {
      const st = touchSt[p].stick; if (!st) continue;
      const [bx, by] = toLocal(st.bx, st.by), [kx, ky] = toLocal(st.cx, st.cy), R = R_STICK / scale;
      const k2 = Math.hypot(kx - bx, ky - by) > R ? [bx + (kx - bx) / Math.hypot(kx - bx, ky - by) * R, by + (ky - by) / Math.hypot(kx - bx, ky - by) * R] : [kx, ky];
      D.circ(c, bx, by, R, '#ffffff12', COL[p] + '88', 3 / scale * 1.5);
      D.circ(c, k2[0], k2[1], R * .48, COL[p] + 'cc', '#ffffffaa', 2 / scale * 1.5);
    }
    for (let p = 0; p < 2; p++) { const pt = touchSt[p].point; if (pt) D.circ(c, pt[0], pt[1], 26 / scale, null, COL[p] + '99', 3 / scale); }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; r.t += dt; if (r.t > .35) { ripples.splice(i, 1); continue; }
      c.globalAlpha = 1 - r.t / .35; D.circ(c, r.x, r.y, (20 + r.t * 140) / scale, null, COL[r.p], 4 / scale); c.globalAlpha = 1;
    }
  }

  function boot() {
    $('n1').value = names[0]; $('n2').value = names[1];
    const saveNames = () => { names = [$('n1').value.trim() || 'Red', opp >= 0 ? names[1] : ($('n2').value.trim() || 'Blue')]; Store.set('names', names); renderMenu(); };
    $('n1').onchange = saveNames; $('n2').onchange = saveNames;
    menuWheel = Wheel($('opp'), OPP_ITEMS, opp, (v, final) => { if (final && v !== opp) setOpp(v); });
    $('cats').onclick = e => { const b = e.target.closest('button'); if (b) { cat = b.dataset.c; renderMenu(); } };
    $('search').oninput = renderMenu;
    $('grid').onclick = e => { const b = e.target.closest('.tile'); if (b) { Snd.init(); party = null; open(b.dataset.id); } };
    $('partyBtn').onclick = () => { Snd.init(); startParty(); };
    $('randomBtn').onclick = () => { Snd.init(); party = null; open(pick(GAMES).id); };
    $('pauseBtn').onclick = e => { e.stopPropagation(); showPause(); };
    $('muteMenu').onclick = () => { setMute(!Snd.muted); Snd.init(); };
    setMute(Snd.muted);
    $('overlay').onclick = e => { const b = e.target.closest('[data-a]'); if (b) action(b.dataset.a); };

    const keyTarget = m => { let [p, b] = m; if (bots[p] && !bots[1 - p]) p = 1 - p; return [p, b]; };
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      Snd.init();
      if (phase === 'overlay') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') { const b = document.querySelector('#overlay .btn'); if (b) { e.preventDefault(); b.click(); } }
        else if (e.code === 'Escape') { const b = document.querySelector('#overlay [data-a="resume"]') || document.querySelector('#overlay [data-a="menu"]'); if (b) b.click(); }
        return;
      }
      if (phase === 'play') {
        if (e.code === 'Escape' || e.code === 'KeyP') { showPause(); return; }
        const m = KEYS[e.code];
        if (m) { e.preventDefault(); if (!e.repeat) { const [p, b] = keyTarget(m); Inp.k[p][b] = 1; Inp.press(p, b); } }
      }
    });
    addEventListener('keyup', e => { const m = KEYS[e.code]; if (m) { const [p, b] = keyTarget(m); Inp.k[p][b] = 0; } });
    addEventListener('blur', () => { Inp.reset(); clearTouches(); });

    /* ---- phone-app behaviour ---- */
    addEventListener('popstate', () => { if (!$('game').hidden) showMenu(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { Inp.reset(); clearTouches(); if (phase === 'play' && def && def.type === 'real' && A && !A.ended) showPause(); previews.stopAll(); }
      else if (def) { wake(true); fit(); }
    });
    addEventListener('orientationchange', () => setTimeout(() => { if (def) fit(); }, 250));
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      const hadSW = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('sw.js').catch(() => { });
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && phase === 'menu') location.reload(); });
    }
    const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
    let deferred = null;
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('installBtn').hidden = false; });
    $('installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => { }); deferred = null; $('installBtn').hidden = true; };
    addEventListener('appinstalled', () => { $('installBtn').hidden = true; });
    if (!standalone && /iPhone|iPad|iPod/.test(navigator.userAgent) && !Store.get('iosHint', false)) {
      $('iosHint').hidden = false; $('iosHint').querySelector('button').onclick = () => { $('iosHint').hidden = true; Store.set('iosHint', true); };
    }
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('resize', () => { if (def) fit(); });

    const h = location.hash.slice(1);
    if (history.state && history.state.duo) history.replaceState(null, '');
    showMenu();
    if (h && GAMES.find(g => g.id === h)) open(h);
    requestAnimationFrame(frame);
  }
  return {
    boot, open, games: GAMES, _state: () => ({ phase, A, inst, def, bots, turnP, rot }), _action: action,
    _bots(l) { forceBots = l; }, _opp(v) { opp = v; Store.set('opp', v); loadStats(); },
    /* test hook: run game logic headlessly for up to `secs` of game time */
    _sim(secs, dt = 1 / 60) {
      const errs = []; let t = 0; lastW = null; countdown = 0; phase = 'play'; $('overlay').hidden = true;
      const ce = console.error; console.error = (...a) => errs.push(String(a[0] && a[0].stack || a[0]));
      try { while (!A.ended && t < secs) { t += dt; playT += dt; computeAxes(dt); runBots(dt); inst.update && inst.update(dt); Inp.clearTaps(); for (const B of bots) if (B) B.clearTaps(); } }
      catch (e) { errs.push(String(e.stack || e)); }
      console.error = ce;
      try { ctx.setTransform(...baseT); inst.draw(ctx); } catch (e) { errs.push('draw ' + e.message); }
      return { ended: A.ended, t, errs, w: lastW };
    },
  };
})();
