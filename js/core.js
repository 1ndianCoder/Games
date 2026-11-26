'use strict';
/* ============================================================
   Duo Arcade engine: menu, input, render loop, scoring, sound.
   Games call reg({...}) with a make(A) factory returning
   { update(dt), draw(c), down(x,y), move(x,y), up(x,y) }.
   ============================================================ */

const COL = ['#ff4f6d', '#3ec5ff'];
const COLD = ['#7a2236', '#1d5c7a'];          // darker player shades
const BG = '#0e0f1a', BG2 = '#171a2b', LINE = '#2b3050', TXT = '#e9ecff', MUT = '#8a90b8', ACC = '#ffd166';
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
    if (this.muted || !this.ac) return;
    const a = this.ac, t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .02);
  },
  noise(d = .2, v = .12) {
    if (this.muted || !this.ac) return;
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
  function renderMenu() {
    $('cats').innerHTML = CATS.map(c => `<button class="${c === cat ? 'on' : ''}" data-c="${c}">${c}${c === 'All' ? ` · ${GAMES.length}` : ''}</button>`).join('');
    const q = $('search').value.trim().toLowerCase();
    const list = GAMES.filter(g => (cat === 'All' || g.cat === cat) && (!q || (g.name + ' ' + g.desc).toLowerCase().includes(q)));
    $('grid').innerHTML = list.map(g => {
      const s = stats[g.id];
      return `<button class="card" data-id="${g.id}"><span class="tg">${g.cat}</span><span class="ic">${g.icon}</span>
      <span class="nm">${g.name}</span><span class="ds">${g.desc}</span>
      <span class="pl">${s ? `${s.n} played · <b>${s.w[0]}</b>–<i>${s.w[1]}</i>` : (g.type === 'turn' ? 'Tap to play · turns' : 'Real-time')}</span></button>`;
    }).join('');
    const tot = Object.values(stats).reduce((a, s) => a + s.n, 0);
    $('foot').innerHTML = `${tot} matches played<br>Keyboard: <span class="p1">${names[0]}</span> <kbd>W A S D</kbd> + <kbd>F</kbd>/<kbd>Space</kbd> · <kbd>G</kbd> &nbsp;|&nbsp; <span class="p2">${names[1]}</span> <kbd>Arrows</kbd> + <kbd>Enter</kbd>/<kbd>L</kbd> · <kbd>K</kbd>/<kbd>Shift</kbd><br>Touch: on-screen pads appear for each player. Board games: just tap.`;
  }
  function showMenu() {
    phase = 'menu'; inst = null; def = null; party = null;
    $('game').hidden = true; $('menu').hidden = false; renderMenu();
  }

  /* ----- game lifecycle ----- */
  function open(id, keepSession) {
    def = GAMES.find(g => g.id === id); if (!def) return;
    if (!keepSession) { session = [0, 0]; round = 0; }
    $('menu').hidden = true; $('game').hidden = false;
    $('gTitle').innerHTML = `${def.icon} ${def.name}${party ? `<small>Party ${party.i + 1}/${party.list.length}</small>` : ''}`;
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
    if (def.type === 'turn' && !def.keys) return `<div class="keys"><div>Tap / click to play</div></div>`;
    const b = def.btn || {}, pad = def.pad || 'dpad a';
    const mv = pad.includes('dpad') ? ['W A S D', 'Arrows'] : pad.includes('ud') ? ['W / S', '↑ / ↓'] : pad.includes('lr') ? ['A / D', '← / →'] : null;
    const one = pad === 'one';
    const k = (i) => [mv ? `<kbd>${mv[i]}</kbd> move` : '', (b.a || one) ? `<kbd>${i ? 'Enter' : 'F'}</kbd> ${b.a || 'go'}` : '', b.b ? `<kbd>${i ? 'K' : 'G'}</kbd> ${b.b}` : ''].filter(Boolean).join('<br>');
    return `<div class="keys"><div class="p1"><b>${names[0]}</b><br>${def.keys ? def.keys[0] : k(0)}</div><div class="p2"><b>${names[1]}</b><br>${def.keys ? def.keys[1] : k(1)}</div></div>${isTouch && def.type === 'real' ? '<p>Touch: use the pads on your side of the screen.</p>' : ''}`;
  }
  function showIntro() {
    overlay(`<div class="big-ic">${def.icon}</div><h2>${def.name}</h2><p>${def.help}</p>${keysHtml()}
      <div class="row"><button class="btn" data-a="start">Play ▶</button></div>`);
  }
  function showHelp() {
    if (phase !== 'play') return;
    overlay(`<h2>${def.name}</h2><p>${def.help}</p>${keysHtml()}<div class="row"><button class="btn" data-a="resume">Resume</button><button class="btn ghost" data-a="menu">Menu</button></div>`);
  }
  function showEnd(w, msg) {
    if (!def) return;
    const who = w === -1 ? `<h2>Draw!</h2>` : `<h2 class="win${w + 1}">${names[w]} wins!</h2>`;
    let extra = '', btns;
    if (party) {
      party.i++;
      const done = party.i >= party.list.length;
      extra = `<p>Party score</p><div class="tally"><span class="p1">${party.score[0]}</span> : <span class="p2">${party.score[1]}</span></div>`;
      if (done) {
        const pw = party.score[0] === party.score[1] ? -1 : party.score[0] > party.score[1] ? 0 : 1;
        extra += pw === -1 ? `<h2>Party tied! 🤝</h2>` : `<h2 class="win${pw + 1}">🏆 ${names[pw]} wins the party!</h2>`;
        btns = `<button class="btn" data-a="party">New Party</button><button class="btn ghost" data-a="menu">Menu</button>`;
      } else btns = `<button class="btn" data-a="next">Next game ▶ <small>${party.list[party.i].icon}</small></button><button class="btn ghost" data-a="menu">Quit</button>`;
    } else {
      extra = `<div class="tally"><span class="p1">${session[0]}</span> : <span class="p2">${session[1]}</span></div>`;
      btns = `<button class="btn" data-a="again">Rematch ↻</button><button class="btn ghost" data-a="menu">Menu</button>`;
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
      ctx.fillStyle = '#0e0f1a88'; ctx.fillRect(0, 0, W, H);
      const n = Math.ceil(countdown / 0.5);
      D.text(ctx, n > 2 ? '3' : n > 1 ? '2' : '1', W / 2, H / 2, 120, ACC);
    }
  }

  function boot() {
    $('n1').value = names[0]; $('n2').value = names[1];
    const saveNames = () => { names = [$('n1').value.trim() || 'Red', $('n2').value.trim() || 'Blue']; Store.set('names', names); renderMenu(); };
    $('n1').onchange = saveNames; $('n2').onchange = saveNames;
    $('cats').onclick = e => { const b = e.target.closest('button'); if (b) { cat = b.dataset.c; renderMenu(); } };
    $('search').oninput = renderMenu;
    $('grid').onclick = e => { const b = e.target.closest('.card'); if (b) { Snd.init(); party = null; open(b.dataset.id); } };
    $('partyBtn').onclick = () => { Snd.init(); startParty(); };
    $('randomBtn').onclick = () => { Snd.init(); party = null; open(pick(GAMES).id); };
    $('backBtn').onclick = showMenu;
    $('restartBtn').onclick = () => { if (!def) return; newRound(); hideOverlay(); };
    $('helpBtn').onclick = showHelp;
    $('muteBtn').textContent = Snd.muted ? '🔇' : '🔊';
    $('muteBtn').onclick = () => { Snd.muted = !Snd.muted; Store.set('muted', Snd.muted); $('muteBtn').textContent = Snd.muted ? '🔇' : '🔊'; };
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
    addEventListener('resize', () => { if (def) fit(); });

    const h = location.hash.slice(1);
    showMenu();
    if (h && GAMES.find(g => g.id === h)) open(h);
    requestAnimationFrame(frame);
  }
  return { boot, open, games: GAMES, _state: () => ({ phase, A, inst, def }), _action: action };
})();
