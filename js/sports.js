'use strict';
/* ================= SPORTS ================= */

function dir(A, p) { let x = A.get(p, 'r') - A.get(p, 'l'), y = A.get(p, 'd') - A.get(p, 'u'); const m = Math.hypot(x, y) || 1; return [x / m, y / m]; }
function bigScore(c, A, sc, y = 40, sz = 40) { D.text(c, sc[0], A.W / 2 - 50, y, sz, COL[0]); D.text(c, sc[1], A.W / 2 + 50, y, sz, COL[1]); D.text(c, ':', A.W / 2, y - 3, sz * .7, MUT); }
function msgFade(c, A, msg, t) { if (t > 0 && msg) { c.globalAlpha = Math.min(1, t * 2); D.text(c, msg, A.W / 2, A.H / 2, 48, ACC); c.globalAlpha = 1; } }
/* ============================================================
   Sling: shared pull-back-and-release shot controller.
   Relative drag (grab anywhere), smoothed aim, power ring, elastic band,
   guide dots / arc preview, optional cue stick, release burst + trail.
   ============================================================ */
function Sling(max = 170) {
  const S = { on: false, sx: 0, sy: 0, x: 0, y: 0, dx: 0, dy: 0, lvl: 0, fx: [], trail: null, stick: null, last: performance.now() };
  const raw = () => { let vx = S.sx - S.x, vy = S.sy - S.y; const L = Math.hypot(vx, vy); if (L > max) { vx *= max / L; vy *= max / L; } return [vx, vy, Math.min(L, max)]; };
  S.power = () => raw()[2] / max;
  S.down = (x, y) => { S.on = true; S.sx = S.x = x; S.sy = S.y = y; S.dx = S.dy = 0; S.lvl = 0; };
  S.move = (x, y) => {
    if (!S.on) return; S.x = x; S.y = y;
    const l = Math.floor(S.power() * 10); if (l !== S.lvl) { if (l > S.lvl) Snd.tone(220 + l * 48, .03, 'sine', .035); S.lvl = l; }
  };
  S.cancel = () => { S.on = false; };
  /* returns {nx, ny, t} (unit direction + 0..1 power) or null if the pull was too small */
  S.up = () => {
    if (!S.on) return null; S.on = false;
    const [vx, vy, L] = raw(); if (L < 7) return null;
    const t = L / max;
    Snd.tone(140 + t * 260, .16, 'triangle', .09, 380 + t * 500); if (t > .6) Snd.noise(.08, .05 + t * .06);
    if (!Snd.quiet) try { navigator.vibrate && navigator.vibrate(8 + t * 22); } catch (e) { }
    return { nx: vx / L, ny: vy / L, t };
  };
  /* release effects: sparks at `from` flying forward, optional cue-stick strike */
  S.launch = (from, r, col, withStick) => {
    for (let i = 0; i < 10 + r.t * 16; i++) { const a = Math.atan2(r.ny, r.nx) + rand(-.7, .7), v = rand(60, 260) * (.4 + r.t); S.fx.push({ x: from.x, y: from.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.25, .5), m: rand(.25, .5), col }); }
    S.fx.push({ ring: true, x: from.x, y: from.y, life: .35, m: .35, col, R: 14 + r.t * 30 });
    if (withStick) S.stick = { x: from.x, y: from.y, nx: r.nx, ny: r.ny, d: 14 + r.t * 70, t: 0 };
  };
  S.follow = (o, col) => { S.trail = { o, col, pts: [] }; };
  /* call every frame from the game's draw(); `from` = object being aimed (null when not aiming) */
  S.draw = (c, from, col, opt = {}) => {
    const now = performance.now(), dt = Math.min(.05, (now - S.last) / 1000); S.last = now;
    // trail
    if (S.trail) {
      const T = S.trail, o = T.o, sp = Math.hypot(o.vx || 0, o.vy || 0);
      if (sp > 25 && !o.in && !o.out) T.pts.push([o.x, o.y]); else T.pts.splice(0, 2);
      if (T.pts.length > 22) T.pts.shift();
      c.lineCap = 'round';
      for (let i = 1; i < T.pts.length; i++) { const k = i / T.pts.length; c.globalAlpha = k * .45; D.line(c, ...T.pts[i - 1], ...T.pts[i], T.col, (o.r || 8) * 1.6 * k); }
      c.globalAlpha = 1; c.lineCap = 'butt';
      if (!T.pts.length && sp <= 25) S.trail = null;
    }
    // particles
    for (let i = S.fx.length - 1; i >= 0; i--) {
      const f = S.fx[i]; f.life -= dt; if (f.life <= 0) { S.fx.splice(i, 1); continue; }
      const k = f.life / f.m;
      if (f.ring) { D.circ(c, f.x, f.y, f.R * (1.6 - k), null, f.col, 3 * k); continue; }
      f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .9; f.vy *= .9; c.globalAlpha = k; D.circ(c, f.x, f.y, 2.5 * k + .5, f.col); c.globalAlpha = 1;
    }
    // cue stick strike animation
    if (S.stick) {
      const K = S.stick; K.t += dt; const a = Math.min(1, K.t / .07), off = K.d * (1 - a * a) + 13;
      c.globalAlpha = Math.max(0, 1 - Math.max(0, K.t - .12) / .25);
      cue(c, K.x, K.y, K.nx, K.ny, off); c.globalAlpha = 1; if (K.t > .4) S.stick = null;
    }
    // smoothed aim
    const [tx, ty] = S.on ? raw() : [0, 0], e = 1 - Math.exp(-dt * 30);
    S.dx += (tx - S.dx) * e; S.dy += (ty - S.dy) * e;
    if (!S.on || !from) return;
    const L = Math.hypot(S.dx, S.dy); if (L < 2) { D.circ(c, from.x, from.y, (from.r || 10) + 10, null, col + '66', 2); return; }
    const t = L / max, nx = S.dx / L, ny = S.dy / L, r0 = (from.r || 10), full = t > .97, pulse = full ? .5 + Math.sin(now / 60) * .5 : 0;
    const hot = full ? ACC : col;
    // elastic band back to the grab point
    const hx = from.x - S.dx, hy = from.y - S.dy, side = r0 * .9;
    c.lineCap = 'round'; c.globalAlpha = .75;
    D.line(c, from.x - ny * side, from.y + nx * side, hx, hy, col, lerp(4, 1.5, t)); D.line(c, from.x + ny * side, from.y - nx * side, hx, hy, col, lerp(4, 1.5, t));
    c.globalAlpha = 1; D.circ(c, hx, hy, 6, BG, col, 2);
    if (opt.stick) cue(c, from.x, from.y, nx, ny, 13 + L * .55);
    // guide
    if (opt.arc) {
      const v = opt.arc.speed * t, g = opt.arc.g, w = opt.arc.wind || 0;
      for (let k = 1; k <= 16; k++) { const s = k * .045, x = from.x + nx * v * s + .5 * w * s * s, y = from.y + ny * v * s + .5 * g * s * s; c.globalAlpha = (1 - k / 17) * .9; D.circ(c, x, y, 3.2 - k * .12, hot); }
      c.globalAlpha = 1;
    } else {
      const len = (opt.reach || 260) * t, n = Math.max(2, Math.floor(len / 16));
      for (let k = 1; k <= n; k++) { const d = r0 + 10 + k * 16; c.globalAlpha = (1 - k / (n + 1)) * .85; D.circ(c, from.x + nx * d, from.y + ny * d, 2.6, hot); }
      c.globalAlpha = 1;
      // arrowhead at the end of the guide
      const d = r0 + 14 + n * 16, ax = from.x + nx * d, ay = from.y + ny * d;
      D.poly(c, [[ax + nx * 10, ay + ny * 10], [ax - ny * 7, ay + nx * 7], [ax + ny * 7, ay - nx * 7]], hot);
    }
    // power ring
    const R = r0 + 9 + pulse * 2;
    D.circ(c, from.x, from.y, R, null, '#ffffff22', 4);
    c.beginPath(); c.arc(from.x, from.y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t); c.strokeStyle = hot; c.lineWidth = 4; c.stroke();
    c.lineCap = 'butt';
  };
  function cue(c, x, y, nx, ny, off) {
    const sx = x - nx * off, sy = y - ny * off, ex = sx - nx * 300, ey = sy - ny * 300;
    c.lineCap = 'round'; D.line(c, sx, sy, ex, ey, '#00000055', 9);
    D.line(c, sx, sy, ex, ey, '#c89b63', 7); D.line(c, sx - nx * 200, sy - ny * 200, ex, ey, '#5a3b26', 8); D.line(c, sx, sy, sx - nx * 8, sy - ny * 8, '#e9ecff', 7); c.lineCap = 'butt';
  }
  return S;
}
/* smooth rolling friction: proportional drag + constant rolling resistance */
function roll(o, h, k, c0) { const sp = Math.hypot(o.vx, o.vy); if (!sp) return; const ns = Math.max(0, sp - (sp * k + c0) * h); o.vx *= ns / sp; o.vy *= ns / sp; }

/* ---------- Pong ---------- */
reg({
  id: 'pong', name: 'Pong', cat: 'Sports', icon: '🏓', type: 'real', pad: 'ud',
  desc: 'The original paddle duel.', help: 'Move your paddle up and down. Hit near the paddle edge for sharper angles. The ball speeds up every hit. First to 7.',
  make(A) {
    const N = 7, sc = [0, 0], P = [{ y: 250 }, { y: 250 }], PH = 90; let b, wait = .8, msg = '', mt = 0;
    const serve = d => { b = { x: 400, y: 250, vx: 360 * d, vy: rand(-160, 160), r: 9 }; wait = .7; };
    serve(A.first ? 1 : -1);
    return {
      update(dt) {
        for (let p = 0; p < 2; p++) P[p].y = clamp(P[p].y + (A.get(p, 'd') - A.get(p, 'u')) * 460 * dt, PH / 2, 500 - PH / 2);
        mt -= dt; if (wait > 0) { wait -= dt; return; }
        for (let s = 0; s < 4; s++) {
          b.x += b.vx * dt / 4; b.y += b.vy * dt / 4;
          if (b.y < b.r || b.y > 500 - b.r) { b.vy *= -1; b.y = clamp(b.y, b.r, 500 - b.r); A.sfx('bounce'); }
          for (let p = 0; p < 2; p++) {
            const px = p ? 770 : 30;
            if (Math.abs(b.x - px) < 8 + b.r && Math.abs(b.y - P[p].y) < PH / 2 + b.r && (p ? b.vx > 0 : b.vx < 0)) {
              const off = (b.y - P[p].y) / (PH / 2), sp = Math.min(Math.hypot(b.vx, b.vy) * 1.06, 1100), a = off * 1.0;
              b.vx = Math.cos(a) * sp * (p ? -1 : 1); b.vy = Math.sin(a) * sp; A.sfx('hit');
            }
          }
        }
        if (b.x < -20 || b.x > 820) {
          const w = b.x < 0 ? 1 : 0; sc[w]++; A.sfx('score'); msg = `${A.names[w]} scores`; mt = 1;
          if (sc[w] >= N) return A.end(w, `${sc[0]} – ${sc[1]}`); serve(w ? -1 : 1);
        }
      },
      draw(c) {
        for (let y = 10; y < 500; y += 30) D.rect(c, 398, y, 4, 15, LINE);
        bigScore(c, A, sc, 50, 48);
        for (let p = 0; p < 2; p++) D.rr(c, (p ? 770 : 30) - 7, P[p].y - PH / 2, 14, PH, 7, COL[p]);
        D.glow(c, '#fff', 14); D.circ(c, b.x, b.y, b.r, '#fff'); D.noglow(c);
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Tennis ---------- */
reg({
  id: 'tennis', name: 'Tennis', cat: 'Sports', icon: '🎾', type: 'real', pad: 'dpad a', btn: { a: 'Smash' },
  desc: 'Top-down tennis with real bounces.', help: 'Run to the ball — you swing automatically when it is in reach. Hold up/down while hitting to aim. Hold the action button for a fast, flat smash. Ball must land in the court on the other side; two bounces on your side loses the point. First to 7 (win by 2).',
  make(A) {
    const CX0 = 70, CX1 = 730, CY0 = 110, CY1 = 410, NET = 400, G = 900;
    const sc = [0, 0], P = [{ x: 0, y: 0, sw: 0 }, { x: 0, y: 0, sw: 0 }];
    let b, server = A.first, st, last, bounces, side, msg = '', mt = 0, pause = 0;
    const reset = () => {
      P[0].x = 110; P[0].y = 260; P[1].x = 690; P[1].y = 260; st = 'serve'; last = -1; bounces = 0;
      b = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
    };
    reset();
    const point = (w, m) => { sc[w]++; msg = m; mt = 1.4; pause = 1.4; st = 'dead'; A.sfx('score'); server = 1 - server;
      if (sc[w] >= 7 && sc[w] - sc[1 - w] >= 2) A.end(w, `${sc[0]} – ${sc[1]}`); };
    const hit = (p, smash) => {
      const dirx = p ? -1 : 1, aim = A.get(p, 'd') - A.get(p, 'u');
      const off = dist(b.x, b.y, P[p].x + dirx * 14, P[p].y) / 40;
      const tx = NET + dirx * rand(140, 300), ty = clamp(260 + aim * 120 + rand(-60, 60) * (.3 + off), 60, 460);
      const d = dist(b.x, b.y, tx, ty), s = smash ? 640 : rand(380, 460), T = d / s, z0 = Math.max(b.z, 12);
      b.vx = (tx - b.x) / T; b.vy = (ty - b.y) / T; b.vz = (G * T * T / 2 - z0) / T; b.z = z0;
      if (smash) b.vz = Math.max(b.vz, 60);
      last = p; bounces = 0; side = -1; P[p].sw = .2; A.sfx(smash ? 'shoot' : 'hit');
    };
    return {
      update(dt) {
        mt -= dt;
        if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) {
          const [dx, dy] = dir(A, p), Q = P[p]; Q.sw -= dt;
          Q.x = clamp(Q.x + dx * 270 * dt, p ? NET + 20 : 15, p ? 785 : NET - 20); Q.y = clamp(Q.y + dy * 270 * dt, 30, 490);
        }
        if (st === 'serve') {
          const S = P[server]; b.x = S.x + (server ? -16 : 16); b.y = S.y; b.z = 30;
          if (A.hit(server, 'a')) { st = 'live'; hit(server, false); }
          return;
        }
        if (st !== 'live') return;
        const px = b.x;
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= G * dt;
        if ((px - NET) * (b.x - NET) <= 0 && b.z < 16) { return point(1 - last, `Into the net!`); }
        if (b.z <= 0) {
          b.z = 0; b.vz = -b.vz * .62; b.vx *= .85; b.vy *= .85; A.sfx('bounce');
          const s = b.x < NET ? 0 : 1, inside = b.x > CX0 && b.x < CX1 && b.y > CY0 && b.y < CY1;
          if (bounces === 0 && last >= 0) { if (s === last || !inside) return point(1 - last, 'Out!'); }
          bounces++; if (bounces >= 2) return point(1 - s, 'Double bounce!');
        }
        if (b.x < -30 || b.x > 830 || b.y < -30 || b.y > 530) return point(bounces ? last : 1 - last, bounces ? 'Unreturnable!' : 'Out!');
        for (let p = 0; p < 2; p++) {
          if (last === p) continue;
          if (dist(b.x, b.y, P[p].x, P[p].y) < 36 && b.z < 70) hit(p, A.get(p, 'a'));
        }
      },
      draw(c) {
        D.rr(c, 20, 60, 760, 400, 16, '#2a6b4f');
        c.strokeStyle = '#e9ecff'; c.lineWidth = 3; c.strokeRect(CX0, CY0, CX1 - CX0, CY1 - CY0);
        D.line(c, 235, CY0, 235, CY1, '#e9ecffaa', 2); D.line(c, 565, CY0, 565, CY1, '#e9ecffaa', 2); D.line(c, 235, 260, 565, 260, '#e9ecffaa', 2);
        D.rect(c, NET - 3, 90, 6, 340, '#ddd'); D.rect(c, NET - 1, 90, 2, 340, '#999');
        bigScore(c, A, sc, 30, 30);
        D.circ(c, b.x, b.y, 7, '#0006');
        for (let p = 0; p < 2; p++) { const Q = P[p]; D.circ(c, Q.x, Q.y + 4, 18, '#0005'); D.circ(c, Q.x, Q.y, 18, COL[p]); D.circ(c, Q.x + (p ? -20 : 20), Q.y - (Q.sw > 0 ? 14 : 0), 9, null, '#fff', 3); }
        D.circ(c, b.x, b.y - b.z * .6, 7, '#e4ff4d');
        if (st === 'serve') D.text(c, `${A.names[server]} to serve — press ${server ? 'Enter' : 'F'}`, 400, 485, 16, COL[server]);
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Blob Volley ---------- */
reg({
  id: 'volley', name: 'Blob Volley', cat: 'Sports', icon: '🏐', type: 'real', pad: 'lr a', btn: { a: 'Jump' },
  desc: 'Bouncy side-view volleyball.', help: 'Move left/right and jump (up or action button) to bop the ball over the net. If it lands on your side, the other player scores. First to 7.',
  make(A) {
    const GY = 450, sc = [0, 0], P = [{ x: 200, y: GY, vy: 0 }, { x: 600, y: GY, vy: 0 }]; let b, msg = '', mt = 0, pause = 0, server = A.first;
    const serve = () => { b = { x: server ? 600 : 200, y: 150, vx: 0, vy: 0, r: 16 }; P[0].x = 200; P[1].x = 600; };
    serve();
    return {
      update(dt) {
        mt -= dt;
        if (pause > 0) { pause -= dt; if (pause <= 0) serve(); return; }
        for (let p = 0; p < 2; p++) {
          const Q = P[p], mv = A.get(p, 'r') - A.get(p, 'l');
          Q.x = clamp(Q.x + mv * 330 * dt, p ? 444 : 40, p ? 760 : 356);
          if ((A.get(p, 'u') || A.get(p, 'a')) && Q.y >= GY) Q.vy = -620;
          Q.vy += 1600 * dt; Q.y += Q.vy * dt; if (Q.y > GY) { Q.y = GY; Q.vy = 0; }
          Q.mv = mv;
        }
        for (let s = 0; s < 3; s++) {
          const h = dt / 3; b.vy += 520 * h; b.x += b.vx * h; b.y += b.vy * h;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > 800 - b.r) { b.x = 800 - b.r; b.vx = -Math.abs(b.vx); }
          if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
          if (rectBounce(b, 396, 300, 8, 200, .8)) { b.vx += rand(-20, 20); A.sfx('bounce'); }
          for (let p = 0; p < 2; p++) {
            const Q = P[p], d = dist(b.x, b.y, Q.x, Q.y);
            if (d < 44 + b.r && b.y < Q.y + 4) {
              const nx = (b.x - Q.x) / d, ny = (b.y - Q.y) / d; b.x = Q.x + nx * (44 + b.r); b.y = Q.y + ny * (44 + b.r);
              const sp = 560; b.vx = nx * sp + Q.mv * 120; b.vy = Math.min(ny * sp + Q.vy * .3, -260); A.sfx('hit');
            }
          }
          if (b.y > GY - b.r + 10) { const w = b.x < 400 ? 1 : 0; sc[w]++; server = w; msg = `${A.names[w]} scores`; mt = 1; pause = 1; A.sfx('score'); if (sc[w] >= 7) A.end(w, `${sc[0]} – ${sc[1]}`); return; }
        }
      },
      draw(c) {
        D.rect(c, 0, GY, 800, 50, '#3a2f52'); D.rect(c, 396, 300, 8, 150, '#d8dbf0');
        bigScore(c, A, sc, 50, 44);
        for (let p = 0; p < 2; p++) {
          const Q = P[p]; c.beginPath(); c.arc(Q.x, Q.y, 44, Math.PI, 0); c.closePath(); c.fillStyle = COL[p]; c.fill();
          const ex = Q.x + (p ? -14 : 14); D.circ(c, ex, Q.y - 24, 8, '#fff'); D.circ(c, ex + clamp((b.x - ex) / 60, -3, 3), Q.y - 24 + clamp((b.y - Q.y) / 60, -3, 3), 4, '#111');
        }
        D.circ(c, b.x, GY + 4, 14 * clamp(1 - (GY - b.y) / 500, .3, 1), '#0004');
        D.circ(c, b.x, b.y, b.r, '#fff'); D.circ(c, b.x, b.y, b.r, null, '#ffd166', 3);
        if (b.y < 0) D.poly(c, [[b.x, 4], [b.x - 8, 18], [b.x + 8, 18]], '#fff');
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Soccer ---------- */
reg({
  id: 'soccer', name: 'Soccer', cat: 'Sports', icon: '⚽', type: 'real', pad: 'dpad a', btn: { a: 'Kick' },
  desc: 'Top-down 1v1 football.', help: 'Dribble by running into the ball, press the action button near it to blast a shot. Score in the opponent\'s goal. First to 5.',
  make(A) {
    const L = 40, R = 760, T = 40, B = 460, GT = 190, GB = 310, sc = [0, 0];
    let P, ball, msg = '', mt = 0, pause = 0;
    const posts = [[L, GT], [L, GB], [R, GT], [R, GB]].map(([x, y]) => ({ x, y, r: 6, im: 0, vx: 0, vy: 0 }));
    const reset = () => { P = [{ x: 200, y: 250, vx: 0, vy: 0, r: 20, im: .35, cd: 0 }, { x: 600, y: 250, vx: 0, vy: 0, r: 20, im: .35, cd: 0 }]; ball = { x: 400, y: 250, vx: 0, vy: 0, r: 11, im: 1 }; };
    reset();
    return {
      update(dt) {
        mt -= dt; if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        const n = 3, h = dt / n;
        for (let p = 0; p < 2; p++) {
          const Q = P[p], [dx, dy] = dir(A, p); Q.cd -= dt;
          Q.vx = lerp(Q.vx, dx * 250, Math.min(1, dt * 10)); Q.vy = lerp(Q.vy, dy * 250, Math.min(1, dt * 10));
          if (A.hit(p, 'a') && Q.cd <= 0 && dist(Q.x, Q.y, ball.x, ball.y) < Q.r + ball.r + 16) {
            const d = dist(Q.x, Q.y, ball.x, ball.y) || 1; ball.vx = (ball.x - Q.x) / d * 620 + Q.vx * .3; ball.vy = (ball.y - Q.y) / d * 620 + Q.vy * .3; Q.cd = .3; A.sfx('shoot');
          }
        }
        for (let s = 0; s < n; s++) {
          for (const Q of P) { Q.x = clamp(Q.x + Q.vx * h, L + Q.r - 20, R - Q.r + 20); Q.y = clamp(Q.y + Q.vy * h, T + Q.r, B - Q.r); }
          ball.x += ball.vx * h; ball.y += ball.vy * h;
          const f = Math.pow(.55, h); ball.vx *= f; ball.vy *= f;
          if (collide(P[0], P[1], .3)) { }
          for (const Q of P) if (collide(Q, ball, .5)) A.sfx('bounce');
          for (const po of posts) if (collide(po, ball, .8)) A.sfx('bounce');
          const inMouth = ball.y > GT && ball.y < GB;
          if (ball.y < T + ball.r) { ball.y = T + ball.r; ball.vy = Math.abs(ball.vy) * .8; }
          if (ball.y > B - ball.r) { ball.y = B - ball.r; ball.vy = -Math.abs(ball.vy) * .8; }
          if (!inMouth) { if (ball.x < L + ball.r) { ball.x = L + ball.r; ball.vx = Math.abs(ball.vx) * .8; } if (ball.x > R - ball.r) { ball.x = R - ball.r; ball.vx = -Math.abs(ball.vx) * .8; } }
          else { ball.y = clamp(ball.y, GT + ball.r, GB - ball.r); }
          if (ball.x < L - ball.r || ball.x > R + ball.r) {
            const w = ball.x < L ? 1 : 0; sc[w]++; msg = 'GOAL!'; mt = 1.3; pause = 1.3; A.sfx('score'); A.shake(6);
            if (sc[w] >= 5) A.end(w, `${sc[0]} – ${sc[1]}`); return;
          }
        }
      },
      draw(c) {
        for (let i = 0; i < 8; i++) D.rect(c, L + i * 90, T, 90, B - T, i % 2 ? '#2a7a4f' : '#2f8656');
        c.strokeStyle = '#ffffffaa'; c.lineWidth = 3; c.strokeRect(L, T, R - L, B - T); D.line(c, 400, T, 400, B, '#ffffffaa', 3); D.circ(c, 400, 250, 60, null, '#ffffffaa', 3);
        c.strokeRect(L, 150, 80, 200); c.strokeRect(R - 80, 150, 80, 200);
        D.rect(c, L - 30, GT, 30, GB - GT, COL[0] + '55'); D.rect(c, R, GT, 30, GB - GT, COL[1] + '55');
        posts.forEach(p => D.circ(c, p.x, p.y, 6, '#fff'));
        bigScore(c, A, sc, 20, 28);
        for (let p = 0; p < 2; p++) { D.circ(c, P[p].x, P[p].y + 3, P[p].r, '#0005'); D.circ(c, P[p].x, P[p].y, P[p].r, COL[p], '#fff', 3); }
        D.circ(c, ball.x, ball.y + 3, ball.r, '#0005'); D.circ(c, ball.x, ball.y, ball.r, '#fff', '#222', 2);
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Air Hockey ---------- */
reg({
  id: 'airhockey', name: 'Air Hockey', cat: 'Sports', icon: '🏒', type: 'real', pad: 'dpad',
  desc: 'Slam the puck, guard your goal.', help: 'Move your mallet in your half and smash the puck into the opposite goal. First to 7.',
  make(A) {
    const sc = [0, 0], GT = 175, GB = 325; let M, pk, msg = '', mt = 0, pause = 0;
    const reset = (to) => { M = [{ x: 90, y: 250, vx: 0, vy: 0, r: 30, im: 0 }, { x: 710, y: 250, vx: 0, vy: 0, r: 30, im: 0 }]; pk = { x: to === 0 ? 300 : to === 1 ? 500 : 400, y: 250, vx: 0, vy: 0, r: 18, im: 1 }; };
    reset(-1);
    return {
      update(dt) {
        mt -= dt; if (pause > 0) { pause -= dt; return; }
        const n = 4, h = dt / n;
        for (let s = 0; s < n; s++) {
          for (let p = 0; p < 2; p++) {
            const Q = M[p], [dx, dy] = dir(A, p); Q.vx = dx * 480; Q.vy = dy * 480;
            Q.x = clamp(Q.x + Q.vx * h, p ? 400 + Q.r : 20 + Q.r, p ? 780 - Q.r : 400 - Q.r); Q.y = clamp(Q.y + Q.vy * h, 20 + Q.r, 480 - Q.r);
            if (collide(Q, pk, .95)) A.sfx('hit');
          }
          pk.x += pk.vx * h; pk.y += pk.vy * h;
          const sp = Math.hypot(pk.vx, pk.vy); if (sp > 1300) { pk.vx *= 1300 / sp; pk.vy *= 1300 / sp; }
          pk.vx *= Math.pow(.8, h); pk.vy *= Math.pow(.8, h);
          if (pk.y < 20 + pk.r) { pk.y = 20 + pk.r; pk.vy = Math.abs(pk.vy); A.sfx('bounce'); }
          if (pk.y > 480 - pk.r) { pk.y = 480 - pk.r; pk.vy = -Math.abs(pk.vy); A.sfx('bounce'); }
          const mouth = pk.y > GT && pk.y < GB;
          if (!mouth) { if (pk.x < 20 + pk.r) { pk.x = 20 + pk.r; pk.vx = Math.abs(pk.vx); A.sfx('bounce'); } if (pk.x > 780 - pk.r) { pk.x = 780 - pk.r; pk.vx = -Math.abs(pk.vx); A.sfx('bounce'); } }
          if (pk.x < 0 || pk.x > 800) {
            const w = pk.x < 0 ? 1 : 0; sc[w]++; msg = 'GOAL!'; mt = 1; pause = .9; A.sfx('score'); A.shake(5);
            if (sc[w] >= 7) return A.end(w, `${sc[0]} – ${sc[1]}`); reset(1 - w); return;
          }
        }
      },
      draw(c) {
        D.rr(c, 10, 10, 780, 480, 30, '#14203a', '#3ec5ff44', 4);
        D.line(c, 400, 20, 400, 480, '#ffffff22', 4); D.circ(c, 400, 250, 70, null, '#ffffff22', 4);
        D.rect(c, 6, GT, 12, GB - GT, COL[0]); D.rect(c, 782, GT, 12, GB - GT, COL[1]);
        bigScore(c, A, sc, 50, 40);
        for (let p = 0; p < 2; p++) { D.glow(c, COL[p], 18); D.circ(c, M[p].x, M[p].y, 30, COL[p]); D.noglow(c); D.circ(c, M[p].x, M[p].y, 14, COLD[p]); }
        D.glow(c, '#fff', 16); D.circ(c, pk.x, pk.y, pk.r, '#e9ecff'); D.noglow(c);
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Mini Golf ---------- */
reg({
  id: 'golf', name: 'Mini Golf', cat: 'Sports', icon: '⛳', type: 'turn', long: true,
  desc: '5 holes. Fewest strokes wins.', help: 'Drag back from your ball and release to putt (like a slingshot). Players alternate shots. Lowest total over 5 holes wins. Max 8 strokes per hole.',
  make(A) {
    const HOLES = [
      { tee: [110, 250], hole: [690, 250], walls: [[380, 140, 40, 220]] },
      { tee: [110, 420], hole: [690, 90], walls: [[250, 60, 30, 290], [520, 150, 30, 290]] },
      { tee: [110, 100], hole: [690, 400], walls: [[200, 200, 420, 30]], bumps: [[400, 380, 30], [520, 330, 22]] },
      { tee: [400, 440], hole: [400, 70], walls: [[250, 260, 300, 26]], bumps: [[300, 160, 26], [500, 160, 26], [400, 200, 20]] },
      { tee: [100, 250], hole: [700, 250], walls: [[220, 30, 26, 300], [380, 170, 26, 300], [540, 30, 26, 300]] },
    ];
    let hi = 0, H, balls, total = [0, 0], strokes, p = A.first, moving = false; const sl = Sling(170);
    const load = () => { H = HOLES[hi]; balls = [0, 1].map(q => ({ x: H.tee[0] + (q ? 10 : -10), y: H.tee[1], vx: 0, vy: 0, r: 9, in: false })); strokes = [0, 0]; p = (A.first + hi) % 2; A.turn(p); };
    load();
    const nextTurn = () => {
      const o = 1 - p;
      if (!balls[o].in) p = o; else if (balls[p].in) {
        total[0] += strokes[0]; total[1] += strokes[1]; hi++;
        if (hi >= HOLES.length) return A.end(total[0] === total[1] ? -1 : total[0] < total[1] ? 0 : 1, `${total[0]} vs ${total[1]} strokes`);
        return load();
      }
      A.turn(p);
    };
    return {
      down(x, y) { if (!moving) sl.down(x, y); },
      move(x, y) { sl.move(x, y); }, cancel() { sl.cancel(); },
      up() {
        if (moving) return sl.cancel(); const r = sl.up(); if (!r) return; const b = balls[p], pw = 980 * Math.pow(r.t, 1.35);
        b.vx = r.nx * pw; b.vy = r.ny * pw; moving = true; strokes[p]++; sl.launch(b, r, COL[p]); sl.follow(b, '#ffffff'); A.sfx('hit');
      },
      update(dt) {
        if (!moving) return; const b = balls[p], n = 4, h = dt / n;
        for (let s = 0; s < n; s++) {
          b.x += b.vx * h; b.y += b.vy * h; roll(b, h, .85, 60);
          if (rectBounce(b, -100, -100, 1000, 120, .8) | rectBounce(b, -100, 480, 1000, 120, .8) | rectBounce(b, -100, -100, 120, 700, .8) | rectBounce(b, 780, -100, 120, 700, .8)) A.sfx('bounce');
          for (const w of H.walls) if (rectBounce(b, ...w, .8)) A.sfx('bounce');
          for (const [x, y, r] of H.bumps || []) if (collide({ x, y, r, im: 0, vx: 0, vy: 0 }, b, 1.1)) A.sfx('bounce');
          const sp = Math.hypot(b.vx, b.vy), dh = dist(b.x, b.y, ...H.hole);
          if (dh < 13 && sp < 520) { b.in = true; b.inAt = performance.now(); b.vx = b.vy = 0; A.sfx('coin'); break; }
          if (dh < 30 && sp < 520) { b.vx += (H.hole[0] - b.x) * 3 * h; b.vy += (H.hole[1] - b.y) * 3 * h; }
        }
        if (b.in || Math.hypot(b.vx, b.vy) < 3) {
          b.vx = b.vy = 0; moving = false;
          if (!b.in && strokes[p] >= 8) { b.in = true; strokes[p] = 8; }
          nextTurn();
        }
      },
      draw(c) {
        D.rr(c, 20, 20, 760, 460, 20, '#2f8656');
        for (const w of H.walls) D.rr(c, w[0], w[1], w[2], w[3], 6, '#8a5a3a', '#5b3a22', 2);
        for (const [x, y, r] of H.bumps || []) D.circ(c, x, y, r, '#c56cf0', '#fff4', 3);
        D.circ(c, ...H.hole, 13, '#111'); D.line(c, H.hole[0], H.hole[1], H.hole[0], H.hole[1] - 50, '#ddd', 3); D.poly(c, [[H.hole[0], H.hole[1] - 50], [H.hole[0] + 26, H.hole[1] - 42], [H.hole[0], H.hole[1] - 34]], ACC);
        D.text(c, `Hole ${hi + 1}/${HOLES.length}`, 400, 40, 18, '#fff');
        const aiming = !A.ended && !moving; sl.draw(c, aiming ? balls[p] : null, COL[p], { reach: 240 });
        for (let q = 0; q < 2; q++) {
          D.text(c, `${A.names[q]}: ${total[q] + strokes[q]} (${strokes[q]} this hole)`, q ? 760 : 40, 40, 15, COL[q], q ? 'right' : 'left');
          const b = balls[q]; if (b.in) { const k = 1 - (performance.now() - (b.inAt || 0)) / 350; if (k > 0) D.circ(c, lerp(H.hole[0], b.x, k), lerp(H.hole[1], b.y, k), b.r * k, '#fff'); continue; } c.globalAlpha = q === p ? 1 : .5; D.circ(c, b.x, b.y + 2, b.r, '#0005'); D.circ(c, b.x, b.y, b.r, '#fff', COL[q], 4); c.globalAlpha = 1;
        }
        if (aiming && !sl.on) D.circ(c, balls[p].x, balls[p].y, 20 + Math.sin(performance.now() / 200) * 3, null, COL[p], 2);
      }
    };
  }
});

/* ---------- Hoops ---------- */
reg({
  id: 'hoops', name: 'Hoops', cat: 'Sports', icon: '🏀', type: 'real', pad: 'one', btn: { a: 'Shoot' },
  desc: 'Timing shootout at a moving hoop.', help: 'Hold your button to charge — the power meter swings up and down — release at the right moment to sink it. The hoop moves! First to 7 baskets.',
  make(A) {
    const sc = [0, 0], S = [{ ch: -1, t: 0 }, { ch: -1, t: 0 }], balls = []; let t = 0, hx = 400, hy = 220, msg = '', mt = 0;
    const rims = () => [{ x: hx - 34, y: hy, r: 4, im: 0 }, { x: hx + 34, y: hy, r: 4, im: 0 }];
    return {
      update(dt) {
        t += dt; mt -= dt; hy = 210 + Math.sin(t * .9) * 80; hx = 400 + Math.sin(t * .37) * 40;
        for (let p = 0; p < 2; p++) {
          const s = S[p], has = balls.some(b => b.p === p);
          if (A.get(p, 'a') && !has) { if (s.ch < 0) s.t = 0; s.t += dt; s.ch = (1 - Math.cos(s.t * 3.2)) / 2; }
          else if (s.ch >= 0) {
            const pw = 430 + s.ch * 420, ang = 1.05, sx = p ? 700 : 100;
            balls.push({ p, x: sx, y: 380, vx: Math.cos(ang) * pw * (p ? -1 : 1), vy: -Math.sin(ang) * pw, r: 14, im: 1, scored: false });
            s.ch = -1; A.sfx('shoot');
          }
        }
        const R = rims();
        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i];
          for (let k = 0; k < 3; k++) {
            const h = dt / 3, py = b.y; b.vy += 900 * h; b.x += b.vx * h; b.y += b.vy * h;
            for (const r of R) if (collide(r, b, .6)) A.sfx('bounce');
            if (!b.scored && py < hy && b.y >= hy && Math.abs(b.x - hx) < 28 && b.vy > 0) {
              b.scored = true; sc[b.p]++; msg = `${A.names[b.p]} scores!`; mt = .8; A.sfx('score'); if (sc[b.p] >= 7) return A.end(b.p, `${sc[0]} – ${sc[1]}`);
            }
          }
          if (b.y > 560 || b.x < -60 || b.x > 860) balls.splice(i, 1);
        }
      },
      draw(c) {
        D.rect(c, 0, 440, 800, 60, '#5a3b26');
        bigScore(c, A, sc, 40, 40);
        D.rect(c, hx - 3, hy - 70, 6, 60, '#888'); D.rr(c, hx - 46, hy - 80, 92, 14, 4, '#ddd');
        for (let k = 0; k < 5; k++) D.line(c, hx - 34 + k * 17, hy, hx - 22 + k * 11, hy + 40, '#fff8', 2);
        D.line(c, hx - 34, hy, hx + 34, hy, '#ff6b35', 6);
        for (let p = 0; p < 2; p++) {
          const x = p ? 700 : 100;
          D.circ(c, x, 405, 18, COL[p]); D.rr(c, x - 16, 420, 32, 30, 8, COL[p]);
          D.rr(c, x + (p ? 30 : -42), 300, 12, 120, 6, BG2);
          const ch = S[p].ch; if (ch >= 0) D.rr(c, x + (p ? 30 : -42), 420 - 120 * ch, 12, 120 * ch, 6, `hsl(${120 - ch * 120},80%,55%)`);
          if (!balls.some(b => b.p === p)) D.circ(c, x + (p ? -20 : 20), 380, 14, '#ff8c42', COL[p], 3);
        }
        for (const b of balls) { D.circ(c, b.x, b.y, b.r, '#ff8c42', COL[b.p], 3); D.line(c, b.x - b.r, b.y, b.x + b.r, b.y, '#0005', 1.5); }
        D.line(c, hx - 34, hy, hx + 34, hy, '#ff6b35', 6);
        if (mt > 0) D.text(c, msg, 400, 110, 26, ACC);
      }
    };
  }
});

/* ---------- Archery ---------- */
reg({
  id: 'archery', name: 'Archery', cat: 'Sports', icon: '🎯', type: 'real', pad: 'one', btn: { a: 'Shoot' },
  desc: '5 arrows. Steady hands.', help: 'Your sight sways around the target — hit your button to release the arrow. Each player has 5 arrows and the sway gets wilder. Highest total wins.',
  make(A) {
    const S = [0, 1].map(p => ({ arrows: [], score: 0, cd: 0, ph: rand(10) })); let t = 0;
    const aim = (p) => { const s = S[p], n = s.arrows.length, a = 60 + n * 14, sp = 1 + n * .18, tt = t * sp + s.ph; return [(p ? 600 : 200) + Math.sin(tt * 1.7) * a * Math.cos(tt * .3), 270 + Math.sin(tt * 2.3 + 1) * a * .8]; };
    return {
      update(dt) {
        t += dt;
        for (let p = 0; p < 2; p++) {
          const s = S[p]; s.cd -= dt;
          if (s.arrows.length < 5 && s.cd <= 0 && A.hit(p, 'a')) {
            const [x, y] = aim(p), d = dist(x, y, p ? 600 : 200, 270), pts = Math.max(0, 10 - Math.floor(d / 13));
            s.arrows.push([x, y, pts]); s.score += pts; s.cd = .5; A.sfx(pts >= 9 ? 'coin' : 'hit');
          }
        }
        if (S[0].arrows.length === 5 && S[1].arrows.length === 5) A.end(S[0].score === S[1].score ? -1 : S[0].score > S[1].score ? 0 : 1, `${S[0].score} – ${S[1].score}`);
      },
      draw(c) {
        const RC = ['#f2f2f2', '#f2f2f2', '#222', '#222', '#3ec5ff', '#3ec5ff', '#ff4f6d', '#ff4f6d', '#ffd166', '#ffd166'];
        for (let p = 0; p < 2; p++) {
          const cx = p ? 600 : 200, s = S[p];
          for (let k = 0; k < 10; k++) D.circ(c, cx, 270, 130 - k * 13, RC[k], '#0003', 1);
          s.arrows.forEach(([x, y, pts]) => { D.circ(c, x, y, 5, COL[p], '#fff', 2); });
          D.text(c, `${A.names[p]}: ${s.score}`, cx, 50, 26, COL[p]);
          D.text(c, '➶ '.repeat(5 - s.arrows.length) || 'done', cx, 450, 22, MUT);
          if (s.arrows.length < 5 && !A.ended) { const [x, y] = aim(p); D.circ(c, x, y, 14, null, COL[p], 3); D.line(c, x - 22, y, x + 22, y, COL[p], 2); D.line(c, x, y - 22, x, y + 22, COL[p], 2); }
          const lp = s.arrows[s.arrows.length - 1]; if (lp && s.cd > 0) D.text(c, `+${lp[2]}`, cx, 95, 28, ACC);
        }
        split(c, A);
      }
    };
  }
});

/* ---------- Curling ---------- */
reg({
  id: 'curling', name: 'Curling', cat: 'Sports', icon: '🥌', type: 'turn',
  desc: 'Slide stones closest to the button.', help: 'Drag back from your stone and release to slide it. 4 stones each, alternating. Knock opponents out! After all 8, the player with the stone closest to the center scores a point for every stone closer than the opponent\'s best.',
  make(A) {
    const HX = 640, HY = 250, stones = []; let p = A.first, thrown = [0, 0], cur = null, moving = false, res = null; const sl = Sling(160); A.turn(p);
    const spawn = () => { cur = { x: 90, y: 250, vx: 0, vy: 0, r: 14, im: 1, p }; stones.push(cur); };
    spawn();
    return {
      down(x, y) { if (!moving && cur) sl.down(x, y); },
      move(x, y) { sl.move(x, y); }, cancel() { sl.cancel(); },
      up() {
        if (moving || !cur) return sl.cancel(); const r = sl.up(); if (!r) return;
        const pw = 400 * Math.pow(r.t, 1.1); cur.vx = r.nx * pw; cur.vy = r.ny * pw; moving = true; thrown[p]++; sl.launch(cur, r, COL[p]); sl.follow(cur, COL[p]); A.sfx('hit');
      },
      update(dt) {
        if (!moving) return; const n = 4, h = dt / n;
        for (let s = 0; s < n; s++) {
          for (const st of stones) { st.x += st.vx * h; st.y += st.vy * h; const sp = Math.hypot(st.vx, st.vy); if (sp > 0) { const ns = Math.max(0, sp - 95 * h); st.vx *= ns / sp; st.vy *= ns / sp; } }
          for (let i = 0; i < stones.length; i++) for (let j = i + 1; j < stones.length; j++) if (collide(stones[i], stones[j], .9)) A.sfx('hit');
          for (let i = stones.length - 1; i >= 0; i--) { const st = stones[i]; if (st.x > 790 || st.y < 30 || st.y > 470 || st.x < 10) stones.splice(i, 1); }
        }
        if (stones.every(st => Math.hypot(st.vx, st.vy) < 2)) {
          stones.forEach(st => st.vx = st.vy = 0); moving = false; cur = null;
          if (thrown[0] + thrown[1] >= 8) {
            const d = stones.map(st => ({ p: st.p, d: dist(st.x, st.y, HX, HY) })).filter(o => o.d < 95).sort((a, b) => a.d - b.d);
            if (!d.length) return A.end(-1, 'No stones in the house');
            const w = d[0].p, ob = d.find(o => o.p !== w), pts = d.filter(o => o.p === w && (!ob || o.d < ob.d)).length; res = w;
            return A.end(w, `Scores ${pts} point${pts > 1 ? 's' : ''}`);
          }
          p = 1 - p; A.turn(p); spawn();
        }
      },
      draw(c) {
        D.rr(c, 10, 30, 780, 440, 12, '#e6f0fb');
        [[95, '#3ec5ff55'], [65, '#fff'], [38, '#ff4f6d55'], [12, '#fff']].forEach(([r, f]) => D.circ(c, HX, HY, r, f, '#0002', 1));
        D.line(c, 160, 30, 160, 470, '#ff4f6d55', 3); D.line(c, HX, 30, HX, 470, '#0002', 1); D.line(c, 10, HY, 790, HY, '#0002', 1);
        sl.draw(c, cur && !moving && !A.ended ? cur : null, COL[p], { reach: 300 });
        for (const st of stones) { D.circ(c, st.x, st.y + 2, st.r, '#0003'); D.circ(c, st.x, st.y, st.r, '#9aa0b8'); D.circ(c, st.x, st.y, st.r * .62, COL[st.p]); }
        for (let q = 0; q < 2; q++) D.text(c, `${A.names[q]}: ${'●'.repeat(4 - thrown[q])}`, q ? 760 : 40, 16, 15, COL[q], q ? 'right' : 'left');
      }
    };
  }
});

/* ---------- Penalty Kicks ---------- */
reg({
  id: 'penalty', name: 'Penalty Kicks', cat: 'Sports', icon: '🥅', type: 'real', pad: 'dpad',
  keys: ['<kbd>A</kbd> left · <kbd>W</kbd> middle · <kbd>D</kbd> right', '<kbd>←</kbd> left · <kbd>↑</kbd> middle · <kbd>→</kbd> right'],
  desc: 'Mind games from 11 meters.', help: 'Roles swap every kick. The shooter secretly picks left / middle / right, the keeper secretly picks a dive. Different = GOAL, same = SAVE. 5 kicks each, then sudden death.',
  make(A) {
    const sc = [0, 0], taken = [0, 0], hist = [[], []], K = { l: 0, u: 1, r: 2 }; let k = 0, pk, tm, anim = 0, res = '';
    const shooter = () => (A.first + k) % 2;
    const next = () => { pk = [-1, -1]; tm = 3.5; anim = 0; res = ''; };
    next();
    const decided = () => {
      if (taken[0] <= 5 && taken[1] <= 5 && !(taken[0] === 5 && taken[1] === 5)) {
        for (let p = 0; p < 2; p++) if (sc[p] > sc[1 - p] + (5 - taken[1 - p])) return p;
        return -2;
      }
      if (taken[0] === taken[1] && sc[0] !== sc[1]) return sc[0] > sc[1] ? 0 : 1;
      return -2;
    };
    return {
      update(dt) {
        if (anim > 0) { anim -= dt; if (anim <= 0) { k++; const w = decided(); if (w >= 0) return A.end(w, `${sc[0]} – ${sc[1]}`); next(); } return; }
        tm -= dt;
        for (let p = 0; p < 2; p++) if (pk[p] < 0) for (const b in K) if (A.hit(p, b)) { pk[p] = K[b]; A.sfx('click'); }
        if ((pk[0] >= 0 && pk[1] >= 0) || tm <= 0) {
          for (let p = 0; p < 2; p++) if (pk[p] < 0) pk[p] = rint(0, 2);
          const s = shooter(), g = pk[s] !== pk[1 - s]; taken[s]++; if (g) sc[s]++; hist[s].push(g);
          res = g ? 'GOAL!' : 'SAVED!'; A.sfx(g ? 'score' : 'hit'); if (g) A.shake(4); anim = 1.6;
        }
      },
      draw(c) {
        const s = shooter(), kp = 1 - s;
        D.rect(c, 0, 300, 800, 200, '#2f8656'); D.rect(c, 0, 0, 800, 300, '#1b2540');
        D.rect(c, 170, 90, 460, 8, '#fff'); D.rect(c, 170, 90, 8, 210, '#fff'); D.rect(c, 622, 90, 8, 210, '#fff');
        for (let i = 0; i < 12; i++) D.line(c, 178 + i * 38, 98, 178 + i * 38, 300, '#ffffff22', 1);
        const t = anim > 0 ? clamp((1.6 - anim) / .5, 0, 1) : 0, tx = [250, 400, 550], kx = anim > 0 ? lerp(400, tx[pk[kp]], t) : 400;
        D.rr(c, kx - 22, 190, 44, 110, 14, COL[kp]); D.circ(c, kx, 170, 20, COL[kp]); D.rr(c, kx - 55 * (anim > 0 ? 1 : .6), 210, 110 * (anim > 0 ? 1 : .6), 14, 7, COL[kp]);
        const bx = anim > 0 ? lerp(400, tx[pk[s]], t) : 400, by = anim > 0 ? lerp(440, 190, t) : 440;
        D.circ(c, bx, by, 14 - t * 4, '#fff', '#222', 2);
        D.text(c, `${A.names[s]} shoots`, 30, 30, 18, COL[s], 'left'); D.text(c, `${A.names[kp]} keeps`, 770, 30, 18, COL[kp], 'right');
        for (let p = 0; p < 2; p++) {
          const x0 = p ? 470 : 30; D.text(c, `${A.names[p]} ${sc[p]}`, p ? 770 : 30, 470, 20, COL[p], p ? 'right' : 'left');
          for (let i = 0; i < Math.max(5, hist[p].length); i++) D.circ(c, (p ? 560 : 130) + i * 22 + (p ? 0 : 20), 470, 7, hist[p][i] === undefined ? LINE : hist[p][i] ? '#7bd389' : '#ff4f6d');
        }
        if (anim > 0) D.text(c, res, 400, 380, 56, ACC);
        else { D.text(c, `Pick! ${Math.ceil(tm)}`, 400, 380, 30, TXT); for (let p = 0; p < 2; p++) D.text(c, pk[p] >= 0 ? '✔ locked' : '…', p ? 600 : 200, 420, 18, pk[p] >= 0 ? COL[p] : MUT); }
      }
    };
  }
});

/* ---------- Pool ---------- */
reg({
  id: 'pool', name: 'Pool', cat: 'Sports', icon: '🎱', type: 'turn', long: true,
  desc: 'Pot your five before they do.', help: 'Drag back from the white ball and release to shoot. Red pots red balls, Blue pots blue. Pot your own color to shoot again. Potting the white passes the turn. First to pot all 5 of your color wins.',
  make(A) {
    const L = 60, R = 740, T = 60, B = 440, pockets = [[L, T], [400, T - 6], [R, T], [L, B], [400, B + 6], [R, B]];
    const cue = { x: 220, y: 250, vx: 0, vy: 0, r: 11, im: 1, c: -1 }, balls = [cue], pot = [0, 0];
    const order = [0, 1, 1, 0, 0, 1, 1, 0, 1, 0]; let n = 0;
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) balls.push({ x: 540 + row * 20, y: 250 + (i - row / 2) * 23, vx: 0, vy: 0, r: 11, im: 1, c: order[n++] });
    let p = A.first, moving = false, potted = [], msg = ''; const sl = Sling(170); A.turn(p);
    return {
      down(x, y) { if (!moving) sl.down(x, y); },
      move(x, y) { sl.move(x, y); }, cancel() { sl.cancel(); },
      up() { if (moving) return sl.cancel(); const r = sl.up(); if (!r) return; const pw = 1250 * Math.pow(r.t, 1.25); cue.vx = r.nx * pw; cue.vy = r.ny * pw; moving = true; potted = []; msg = ''; sl.launch(cue, r, '#ffffff', true); sl.follow(cue, '#ffffff'); A.sfx('hit'); },
      update(dt) {
        if (!moving) return; const n = 6, h = dt / n;
        for (let s = 0; s < n; s++) {
          for (const b of balls) { b.x += b.vx * h; b.y += b.vy * h; roll(b, h, .55, 38); }
          for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) if (collide(balls[i], balls[j], .95) && s === 0) A.sfx('tick');
          for (let i = balls.length - 1; i >= 0; i--) {
            const b = balls[i];
            if (pockets.some(([x, y]) => dist(b.x, b.y, x, y) < 22)) { potted.push(b.c); A.sfx('coin'); if (b === cue) { b.x = -999; b.vx = b.vy = 0; b.out = true; } else balls.splice(i, 1); continue; }
            if (b.out) continue;
            if (b.x < L + b.r) { b.x = L + b.r; b.vx = Math.abs(b.vx) * .8; } if (b.x > R - b.r) { b.x = R - b.r; b.vx = -Math.abs(b.vx) * .8; }
            if (b.y < T + b.r) { b.y = T + b.r; b.vy = Math.abs(b.vy) * .8; } if (b.y > B - b.r) { b.y = B - b.r; b.vy = -Math.abs(b.vy) * .8; }
          }
        }
        if (balls.every(b => Math.hypot(b.vx, b.vy) < 2)) {
          balls.forEach(b => b.vx = b.vy = 0); moving = false;
          potted.forEach(c => { if (c >= 0) pot[c]++; });
          if (pot[0] >= 5 || pot[1] >= 5) return A.end(pot[0] >= 5 ? 0 : 1, `${pot[0]} – ${pot[1]}`);
          if (cue.out) { cue.out = false; cue.x = 220; cue.y = 250; while (balls.some(b => b !== cue && dist(b.x, b.y, cue.x, cue.y) < 24)) cue.y += 24; msg = 'Scratch!'; p = 1 - p; }
          else if (potted.includes(p)) msg = 'Nice — shoot again'; else p = 1 - p;
          A.turn(p);
        }
      },
      draw(c) {
        D.rr(c, 30, 30, 740, 440, 30, '#5a3b26'); D.rect(c, L, T, R - L, B - T, '#1f6e4c');
        pockets.forEach(([x, y]) => D.circ(c, x, y, 20, '#0a0a0a'));
        D.line(c, 220, T, 220, B, '#ffffff22', 2);
        for (const b of balls) if (!b.out) { D.circ(c, b.x, b.y + 2, b.r, '#0005'); D.circ(c, b.x, b.y, b.r, b.c < 0 ? '#f5f5f5' : COL[b.c]); D.circ(c, b.x - 3, b.y - 3, 3, '#fff8'); }
        for (let q = 0; q < 2; q++) { D.text(c, `${A.names[q]}`, q ? 740 : 60, 15, 15, COL[q], q ? 'right' : 'left'); for (let i = 0; i < 5; i++) D.circ(c, (q ? 740 - 80 : 60 + 80) + (q ? -1 : 1) * i * 18, 15, 7, i < pot[q] ? COL[q] : LINE); }
        D.text(c, msg || (A.ended ? '' : `${A.names[p]}'s shot`), 400, 486, 16, msg ? ACC : COL[p]);
        sl.draw(c, !moving && !A.ended ? cue : null, COL[p], { reach: 420, stick: true });
      }
    };
  }
});

/* ---------- Sumo ---------- */
reg({
  id: 'sumo', name: 'Sumo', cat: 'Sports', icon: '🤼', type: 'real', pad: 'dpad a', btn: { a: 'Dash' },
  desc: 'Shove your rival out of the ring.', help: 'Push your opponent out of the ring. The action button does a dash (short cooldown) — use it to body-slam. First to 3 rounds.',
  make(A) {
    const sc = [0, 0], C = [400, 265], R = 200; let P, msg = '', mt = 0, pause = 0;
    const reset = () => { P = [{ x: 260, y: 265, vx: 0, vy: 0, r: 32, im: 1, cd: 0 }, { x: 540, y: 265, vx: 0, vy: 0, r: 32, im: 1, cd: 0 }]; };
    reset();
    return {
      update(dt) {
        mt -= dt; if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) {
          const Q = P[p], [dx, dy] = dir(A, p); Q.cd -= dt;
          Q.vx += dx * 900 * dt; Q.vy += dy * 900 * dt;
          if (A.hit(p, 'a') && Q.cd <= 0) { const m = Math.hypot(dx, dy) ? [dx, dy] : [p ? -1 : 1, 0]; Q.vx += m[0] * 520; Q.vy += m[1] * 520; Q.cd = 1; A.sfx('shoot'); }
          const f = Math.pow(.25, dt); Q.vx *= f; Q.vy *= f; Q.x += Q.vx * dt; Q.y += Q.vy * dt;
        }
        if (collide(P[0], P[1], 1.1)) { A.sfx('hit'); A.shake(3); }
        const out = P.map(Q => dist(Q.x, Q.y, ...C) > R);
        if (out[0] || out[1]) {
          const w = out[0] && out[1] ? -1 : out[0] ? 1 : 0; if (w >= 0) sc[w]++; msg = w < 0 ? 'Double out!' : `${A.names[w]} takes the round`; mt = 1.2; pause = 1.2; A.sfx('boom');
          if (w >= 0 && sc[w] >= 3) A.end(w, `${sc[0]} – ${sc[1]}`);
        }
      },
      draw(c) {
        D.circ(c, ...C, R + 24, '#c9a46a'); D.circ(c, ...C, R, '#e8cf9c', '#fff', 6);
        D.line(c, 360, 240, 360, 290, '#5a3b26', 6); D.line(c, 440, 240, 440, 290, '#5a3b26', 6);
        bigScore(c, A, sc, 30, 30);
        for (let p = 0; p < 2; p++) { const Q = P[p]; D.circ(c, Q.x, Q.y + 4, Q.r, '#0004'); D.circ(c, Q.x, Q.y, Q.r, COL[p], Q.cd > .7 ? '#fff' : null, 4); D.circ(c, Q.x, Q.y, Q.r * .45, COLD[p]); }
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Racer ---------- */
reg({
  id: 'racer', name: 'Racer', cat: 'Sports', icon: '🏎️', type: 'real', pad: 'dpad', w: 800, h: 520,
  desc: '3 laps. Grass is slow.', help: 'Up = gas, down = brake/reverse, left/right = steer. Stay on the track — the grass slows you down. First to finish 3 laps wins.',
  make(A) {
    const CX = 400, CY = 260, SEG = 160, RC = 165, HW = 62, LAPS = 3;
    const cars = [0, 1].map(p => ({ x: 380, y: CY - RC + (p ? 22 : -22), a: 0, v: 0, r: 11, im: 1, vx: 0, vy: 0, q: 3, cnt: 0 }));
    const dSeg = (x, y) => { const px = clamp(x, CX - SEG, CX + SEG); return dist(x, y, px, CY); };
    const quad = (x, y) => Math.floor(((Math.atan2(y - CY, x - CX) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2));
    return {
      update(dt) {
        for (let p = 0; p < 2; p++) {
          const C = cars[p], on = Math.abs(dSeg(C.x, C.y) - RC) < HW;
          const g = A.get(p, 'u') - A.get(p, 'd') * .8, steer = A.get(p, 'r') - A.get(p, 'l'), max = on ? 330 : 120;
          C.v += g * 420 * dt; C.v *= Math.pow(on ? .6 : .2, dt); C.v = clamp(C.v, -120, max);
          C.a += steer * dt * 3.2 * clamp(Math.abs(C.v) / 150, 0, 1) * Math.sign(C.v || 1);
          C.vx = Math.cos(C.a) * C.v; C.vy = Math.sin(C.a) * C.v; C.x = clamp(C.x + C.vx * dt, 10, 790); C.y = clamp(C.y + C.vy * dt, 10, 510);
          const q = quad(C.x, C.y); if (q === (C.q + 1) % 4) { C.q = q; C.cnt++; if (q === 0 && C.cnt > 1) A.sfx('score'); } else if (q === (C.q + 3) % 4 && C.cnt > 0) { C.q = q; C.cnt--; }
          if (C.cnt >= 1 + LAPS * 4) return A.end(p, 'Checkered flag!');
        }
        if (collide(cars[0], cars[1], .4)) { for (const C of cars) { C.v = (C.vx * Math.cos(C.a) + C.vy * Math.sin(C.a)); } A.sfx('bounce'); }
      },
      draw(c) {
        D.rect(c, 0, 0, 800, 520, '#2b6b3c');
        const cap = (r, f) => { c.beginPath(); c.arc(CX - SEG, CY, r, Math.PI / 2, Math.PI * 1.5); c.arc(CX + SEG, CY, r, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fillStyle = f; c.fill(); };
        cap(RC + HW + 6, '#e9ecff'); cap(RC + HW, '#3a3d52'); cap(RC - HW, '#e9ecff'); cap(RC - HW - 6, '#2b6b3c');
        for (let i = 0; i < 8; i++) D.rect(c, 396, CY - RC - HW + i * (HW * 2 / 8), 8, HW * 2 / 8, i % 2 ? '#fff' : '#111');
        for (let p = 0; p < 2; p++) {
          const C = cars[p], lap = Math.min(LAPS, Math.max(1, Math.floor((C.cnt - 1) / 4) + 1));
          D.text(c, `${A.names[p]} — lap ${C.cnt < 1 ? 1 : lap}/${LAPS}`, 400, CY - 20 + p * 40, 22, COL[p]);
          c.save(); c.translate(C.x, C.y); c.rotate(C.a); D.rr(c, -14, -8, 28, 16, 4, COL[p]); D.rect(c, 4, -6, 6, 12, '#0008'); c.restore();
        }
      }
    };
  }
});
