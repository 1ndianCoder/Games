'use strict';
/* ================= SPORTS ================= */

const dir = (A, p) => A.axis(p);
function bigScore(c, A, sc, y = 40, sz = 40) { D.text(c, sc[0], A.W / 2 - 50, y, sz, COL[0], 'center', 'middle', 900); D.text(c, sc[1], A.W / 2 + 50, y, sz, COL[1], 'center', 'middle', 900); D.circ(c, A.W / 2, y - sz * .15, sz * .07, MUT); D.circ(c, A.W / 2, y + sz * .15, sz * .07, MUT); }
function msgFade(c, A, msg, t) { if (t > 0 && msg) { c.globalAlpha = Math.min(1, t * 2); D.text(c, msg, A.W / 2, A.H / 2, 52, ACC, 'center', 'middle', 900); c.globalAlpha = 1; } }
const reflectY = (y, lo, hi) => { const s = hi - lo; let t = (y - lo) % (2 * s); if (t < 0) t += 2 * s; return lo + (t > s ? 2 * s - t : t); };

/* ============================================================
   Sling: shared pull-back-and-release shot controller.
   ============================================================ */
function Sling(max = 170) {
  const S = { on: false, sx: 0, sy: 0, x: 0, y: 0, dx: 0, dy: 0, lvl: 0, fx: [], trail: null, stick: null, ap: null, last: performance.now() };
  const raw = () => { let vx = S.sx - S.x, vy = S.sy - S.y; const L = Math.hypot(vx, vy); if (L > max) { vx *= max / L; vy *= max / L; } return [vx, vy, Math.min(L, max)]; };
  S.power = () => raw()[2] / max;
  S.down = (x, y) => { S.on = true; S.sx = S.x = x; S.sy = S.y = y; S.dx = S.dy = 0; S.lvl = 0; };
  S.move = (x, y) => {
    if (!S.on) return; S.x = x; S.y = y;
    const l = Math.floor(S.power() * 10); if (l !== S.lvl) { if (l > S.lvl) Snd.tone(220 + l * 48, .03, 'sine', .035); S.lvl = l; }
  };
  S.cancel = () => { S.on = false; S.ap = null; };
  S.up = bot => {
    if (!S.on) return null; S.on = false;
    const [vx, vy, L] = raw(); if (L < 7) return null;
    const t = L / max;
    Snd.tone(140 + t * 260, .16, 'triangle', .09, 380 + t * 500); if (t > .6) Snd.noise(.08, .05 + t * .06);
    if (!bot && !Snd.quiet) try { navigator.vibrate && navigator.vibrate(8 + t * 22); } catch (e) { }
    return { nx: vx / L, ny: vy / L, t };
  };
  /* bot aiming: visibly pulls back over `dur` seconds then releases */
  S.auto = (nx, ny, t, dur = .75) => { S.down(0, 0); S.ap = { nx, ny, t: Math.max(.06, Math.min(1, t)), k: 0, dur }; };
  S.step = dt => {
    const P = S.ap; if (!P) return null;
    P.k += dt / P.dur; const e = Math.min(1, P.k), L = P.t * max * (1 - Math.pow(1 - e, 3));
    S.move(-P.nx * L, -P.ny * L);
    if (P.k >= 1.3) { S.ap = null; return S.up(true); }
    return null;
  };
  S.launch = (from, r, col, withStick) => {
    for (let i = 0; i < 10 + r.t * 16; i++) { const a = Math.atan2(r.ny, r.nx) + rand(-.7, .7), v = rand(60, 260) * (.4 + r.t); S.fx.push({ x: from.x, y: from.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.25, .5), m: rand(.25, .5), col }); }
    S.fx.push({ ring: true, x: from.x, y: from.y, life: .35, m: .35, col, R: 14 + r.t * 30 });
    if (withStick) S.stick = { x: from.x, y: from.y, nx: r.nx, ny: r.ny, d: 14 + r.t * 70, t: 0 };
  };
  S.follow = (o, col) => { S.trail = { o, col, pts: [] }; };
  S.draw = (c, from, col, opt = {}) => {
    const now = performance.now(), dt = Math.min(.05, (now - S.last) / 1000); S.last = now;
    if (S.trail) {
      const T = S.trail, o = T.o, sp = Math.hypot(o.vx || 0, o.vy || 0);
      if (sp > 25 && !o.in && !o.out) T.pts.push([o.x, o.y]); else T.pts.splice(0, 2);
      if (T.pts.length > 22) T.pts.shift();
      c.lineCap = 'round';
      for (let i = 1; i < T.pts.length; i++) { const k = i / T.pts.length; c.globalAlpha = k * .45; D.line(c, ...T.pts[i - 1], ...T.pts[i], T.col, (o.r || 8) * 1.6 * k); }
      c.globalAlpha = 1; c.lineCap = 'butt';
      if (!T.pts.length && sp <= 25) S.trail = null;
    }
    for (let i = S.fx.length - 1; i >= 0; i--) {
      const f = S.fx[i]; f.life -= dt; if (f.life <= 0) { S.fx.splice(i, 1); continue; }
      const k = f.life / f.m;
      if (f.ring) { D.circ(c, f.x, f.y, f.R * (1.6 - k), null, f.col, 3 * k); continue; }
      f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .9; f.vy *= .9; c.globalAlpha = k; D.circ(c, f.x, f.y, 2.5 * k + .5, f.col); c.globalAlpha = 1;
    }
    if (S.stick) {
      const K = S.stick; K.t += dt; const a = Math.min(1, K.t / .07), off = K.d * (1 - a * a) + 13;
      c.globalAlpha = Math.max(0, 1 - Math.max(0, K.t - .12) / .25);
      cue(c, K.x, K.y, K.nx, K.ny, off); c.globalAlpha = 1; if (K.t > .4) S.stick = null;
    }
    const [tx, ty] = S.on ? raw() : [0, 0], e = 1 - Math.exp(-dt * 30);
    S.dx += (tx - S.dx) * e; S.dy += (ty - S.dy) * e;
    if (!S.on || !from) return;
    const L = Math.hypot(S.dx, S.dy); if (L < 2) { D.circ(c, from.x, from.y, (from.r || 10) + 10, null, col + '66', 2); return; }
    const t = L / max, nx = S.dx / L, ny = S.dy / L, r0 = (from.r || 10), full = t > .97, pulse = full ? .5 + Math.sin(now / 60) * .5 : 0;
    const hot = full ? ACC : col;
    const hx = from.x - S.dx, hy = from.y - S.dy, side = r0 * .9;
    c.lineCap = 'round'; c.globalAlpha = .75;
    D.line(c, from.x - ny * side, from.y + nx * side, hx, hy, col, lerp(4, 1.5, t)); D.line(c, from.x + ny * side, from.y - nx * side, hx, hy, col, lerp(4, 1.5, t));
    c.globalAlpha = 1; D.circ(c, hx, hy, 6, BG, col, 2);
    if (opt.stick) cue(c, from.x, from.y, nx, ny, 13 + L * .55);
    if (opt.arc) {
      const v = opt.arc.speed * t, g = opt.arc.g, w = opt.arc.wind || 0;
      for (let k = 1; k <= 16; k++) { const s = k * .045, x = from.x + nx * v * s + .5 * w * s * s, y = from.y + ny * v * s + .5 * g * s * s; c.globalAlpha = (1 - k / 17) * .9; D.circ(c, x, y, 3.2 - k * .12, hot); }
      c.globalAlpha = 1;
    } else {
      const len = (opt.reach || 260) * t, n = Math.max(2, Math.floor(len / 16));
      for (let k = 1; k <= n; k++) { const d = r0 + 10 + k * 16; c.globalAlpha = (1 - k / (n + 1)) * .85; D.circ(c, from.x + nx * d, from.y + ny * d, 2.8, hot); }
      c.globalAlpha = 1;
      const d = r0 + 14 + n * 16, ax = from.x + nx * d, ay = from.y + ny * d;
      D.poly(c, [[ax + nx * 10, ay + ny * 10], [ax - ny * 7, ay + nx * 7], [ax + ny * 7, ay - nx * 7]], hot, hot, 3);
    }
    const R = r0 + 9 + pulse * 2;
    D.circ(c, from.x, from.y, R, null, '#ffffff22', 5);
    c.beginPath(); c.arc(from.x, from.y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t); c.strokeStyle = hot; c.lineWidth = 5; c.stroke();
    c.lineCap = 'butt';
  };
  function cue(c, x, y, nx, ny, off) {
    const sx = x - nx * off, sy = y - ny * off, ex = sx - nx * 300, ey = sy - ny * 300;
    c.lineCap = 'round'; D.line(c, sx, sy, ex, ey, '#00000055', 9);
    D.line(c, sx, sy, ex, ey, '#c89b63', 7); D.line(c, sx - nx * 200, sy - ny * 200, ex, ey, '#5a3b26', 8); D.line(c, sx, sy, sx - nx * 8, sy - ny * 8, '#e9ecff', 7); c.lineCap = 'butt';
  }
  return S;
}
function roll(o, h, k, c0) { const sp = Math.hypot(o.vx, o.vy); if (!sp) return; const ns = Math.max(0, sp - (sp * k + c0) * h); o.vx *= ns / sp; o.vy *= ns / sp; }

/* ---------- Pong ---------- */
reg({
  id: 'pong', rot: true, name: 'Pong', cat: 'Sports', icon: '🏓', type: 'real', pad: 'ud', touch: 'point',
  desc: 'The original paddle duel.', help: 'Move your paddle up and down. Hit near the paddle edge for sharper angles. The ball speeds up every hit. First to 7.',
  make(A) {
    const N = 7, sc = [0, 0], P = [{ y: 250, vy: 0 }, { y: 250, vy: 0 }], PH = 96; let b, wait = .8, msg = '', mt = 0;
    const serve = d => { b = { x: 400, y: 250, vx: 360 * d, vy: rand(-160, 160), r: 10 }; wait = .7; };
    serve(A.first ? 1 : -1);
    return {
      ai(dt, B) {
        const p = B.p, Q = P[p], px = p ? 762 : 38, toward = p ? b.vx > 0 : b.vx < 0;
        if (toward !== B.mem.tw) { B.mem.tw = toward; B.mem.eo = rand(-1, 1) * B.k(60, 30, 9) + (B.chance(B.k(.2, .1, .045)) ? (rand() < .5 ? -1 : 1) * rand(65, 110) : 0); }
        if (B.every('think', B.k(.3, .15, .06))) {
          let ty = 250;
          if (toward) {
            const T = (px - b.x) / b.vx; ty = reflectY(b.y + b.vy * T, b.r, 500 - b.r) + B.mem.eo;
            if (B.lvl === 2) ty += P[1 - p].y < 250 ? -22 : 22;      // angle it away from the opponent
          } else ty = lerp(250, b.y, B.k(.15, .3, .45));
          B.mem.ty = ty;
        }
        B.go(0, clamp(((B.mem.ty ?? 250) - Q.y) / 28, -1, 1) * B.k(.6, .8, .95));
      },
      update(dt) {
        for (let p = 0; p < 2; p++) {
          const Q = P[p], pt = A.point(p);
          Q.vy = pt ? clamp((pt[1] - Q.y) * 16, -1200, 1200) : A.axis(p)[1] * 500;
          Q.y = clamp(Q.y + Q.vy * dt, PH / 2, 500 - PH / 2);
        }
        mt -= dt; if (wait > 0) { wait -= dt; return; }
        for (let s = 0; s < 4; s++) {
          b.x += b.vx * dt / 4; b.y += b.vy * dt / 4;
          if (b.y < b.r || b.y > 500 - b.r) { b.vy *= -1; b.y = clamp(b.y, b.r, 500 - b.r); A.sfx('bounce'); }
          for (let p = 0; p < 2; p++) {
            const px = p ? 770 : 30;
            if (Math.abs(b.x - px) < 9 + b.r && Math.abs(b.y - P[p].y) < PH / 2 + b.r && (p ? b.vx > 0 : b.vx < 0)) {
              const off = clamp((b.y - P[p].y) / (PH / 2), -1, 1), sp = Math.min(Math.hypot(b.vx, b.vy) * 1.06, 1100), a = off * 1.0 + P[p].vy / 6000;
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
        for (let y = 14; y < 500; y += 34) D.rr(c, 396, y, 8, 16, 4, LINE);
        bigScore(c, A, sc, 56, 56);
        for (let p = 0; p < 2; p++) D.rr(c, (p ? 770 : 30) - 9, P[p].y - PH / 2, 18, PH, 9, COL[p]);
        D.glow(c, '#fff', 16); D.circ(c, b.x, b.y, b.r, '#fff'); D.noglow(c);
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Tennis ---------- */
reg({
  id: 'tennis', rot: true, name: 'Tennis', cat: 'Sports', icon: '🎾', type: 'real', pad: 'dpad a', btn: { a: 'Smash' },
  desc: 'Top-down tennis with real bounces.', help: 'Run to the ball — you swing automatically when it is in reach. Push up/down while hitting to aim. Hold the action (or a second finger) for a fast smash. The ball must land in the court on the other side. First to 7, win by 2.',
  make(A) {
    const CX0 = 70, CX1 = 730, CY0 = 110, CY1 = 410, NET = 400, G = 900;
    const sc = [0, 0], P = [{ x: 0, y: 0, sw: 0 }, { x: 0, y: 0, sw: 0 }];
    let b, server = A.first, st, last, bounces, msg = '', mt = 0, pause = 0;
    const reset = () => { P[0].x = 110; P[0].y = 260; P[1].x = 690; P[1].y = 260; st = 'serve'; last = -1; bounces = 0; b = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }; };
    reset();
    const point = (w, m) => { sc[w]++; msg = m; mt = 1.4; pause = 1.4; st = 'dead'; A.sfx('score'); server = 1 - server; if (sc[w] >= 7 && sc[w] - sc[1 - w] >= 2) A.end(w, `${sc[0]} – ${sc[1]}`); };
    const hit = (p, smash) => {
      const dirx = p ? -1 : 1, aim = A.get(p, 'd') - A.get(p, 'u');
      const off = dist(b.x, b.y, P[p].x + dirx * 14, P[p].y) / 40;
      const tx = NET + dirx * rand(140, 300), ty = clamp(260 + aim * 120 + rand(-60, 60) * (.3 + off), 60, 460);
      const d = dist(b.x, b.y, tx, ty), s = smash ? 640 : rand(380, 460), T = d / s, z0 = Math.max(b.z, 12);
      b.vx = (tx - b.x) / T; b.vy = (ty - b.y) / T; b.vz = (G * T * T / 2 - z0) / T; b.z = z0;
      if (smash) b.vz = Math.max(b.vz, 60);
      last = p; bounces = 0; P[p].sw = .2; A.sfx(smash ? 'shoot' : 'hit');
    };
    const inside = (x, y) => x > CX0 && x < CX1 && y > CY0 && y < CY1;
    const sim = () => {
      let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz, bn = bounces; const out = [];
      for (let i = 1; i <= 150; i++) {
        const h = 1 / 60; x += vx * h; y += vy * h; z += vz * h; vz -= G * h;
        let land = null; if (z <= 0) { z = 0; vz = -vz * .62; vx *= .85; vy *= .85; bn++; land = { x, y }; }
        out.push({ x, y, z, t: i * h, bn, land }); if (bn >= 2) break;
      }
      return out;
    };
    return {
      ai(dt, B) {
        const p = B.p, Q = P[p], spd = B.k(.72, .9, 1), home = [p ? 680 : 120, 260];
        if (st === 'serve') {
          B.toward(Q.x, Q.y, home[0], Q.y, .5);
          if (server === p && B.after('serve', true, B.k(1.2, .9, .7))) { const a = pick(['u', 'd', null]); B.hold('u', a === 'u'); B.hold('d', a === 'd'); B.press('a'); }
          return;
        }
        if (st !== 'live' || last === p || last < 0) { B.toward(Q.x, Q.y, home[0], lerp(260, b.y, .4), spd * .8, 30); return; }
        if (B.every('plan', B.k(.3, .14, .05))) {
          const path = sim(), firstLand = path.find(s => s.land);
          const willBeOut = bounces === 0 && firstLand && (!inside(firstLand.x, firstLand.y) || (p ? firstLand.x < NET : firstLand.x > NET));
          let tgt = null;
          if (willBeOut && B.lvl > 0 && B.chance(B.k(0, .7, .95))) tgt = { x: Q.x + (p ? 60 : -60), y: Q.y + (Q.y > b.y ? 60 : -60), skip: true };
          else for (const s of path) {
            if ((p ? s.x < NET + 12 : s.x > NET - 12) || s.z > 62) continue;
            if (dist(Q.x, Q.y, s.x, s.y) / (270 * spd) <= s.t + .04) { tgt = s; break; }
            if (!tgt || dist(Q.x, Q.y, s.x, s.y) < dist(Q.x, Q.y, tgt.x, tgt.y)) tgt = s;
          }
          if (tgt) { const e = B.k(26, 12, 3); B.mem.tx = tgt.x + rand(-e, e); B.mem.ty = tgt.y + rand(-e, e); B.mem.smash = !tgt.skip && tgt.z > 30 && B.chance(B.k(.1, .3, .5)); }
          B.mem.aim = B.lvl === 2 ? (P[1 - p].y < 260 ? 'd' : 'u') : pick(['u', 'd', null, null]);
        }
        if (B.mem.tx !== undefined) B.toward(Q.x, Q.y, B.mem.tx, B.mem.ty, spd, 16);
        if (dist(b.x, b.y, Q.x, Q.y) < 70) { B.hold('u', B.mem.aim === 'u'); B.hold('d', B.mem.aim === 'd'); B.hold('a', B.mem.smash); }
      },
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
        if ((px - NET) * (b.x - NET) <= 0 && b.z < 16) return point(1 - last, 'Into the net!');
        if (b.z <= 0) {
          b.z = 0; b.vz = -b.vz * .62; b.vx *= .85; b.vy *= .85; A.sfx('bounce');
          const s = b.x < NET ? 0 : 1;
          if (bounces === 0 && last >= 0) { if (s === last || !inside(b.x, b.y)) return point(1 - last, 'Out!'); }
          bounces++; if (bounces >= 2) return point(1 - s, 'Double bounce!');
        }
        if (b.x < -30 || b.x > 830 || b.y < -30 || b.y > 530) return point(bounces ? last : 1 - last, bounces ? 'Unreturnable!' : 'Out!');
        for (let p = 0; p < 2; p++) { if (last === p) continue; if (dist(b.x, b.y, P[p].x, P[p].y) < 38 && b.z < 70) hit(p, A.get(p, 'a')); }
      },
      draw(c) {
        D.rr(c, 20, 60, 760, 400, 26, '#2a6b4f');
        c.strokeStyle = '#e9ecff'; c.lineWidth = 4; c.strokeRect(CX0, CY0, CX1 - CX0, CY1 - CY0);
        D.line(c, 235, CY0, 235, CY1, '#e9ecffaa', 3); D.line(c, 565, CY0, 565, CY1, '#e9ecffaa', 3); D.line(c, 235, 260, 565, 260, '#e9ecffaa', 3);
        D.rr(c, NET - 4, 86, 8, 348, 4, '#ddd');
        bigScore(c, A, sc, 30, 34);
        D.circ(c, b.x, b.y, 8, '#0006');
        for (let p = 0; p < 2; p++) { const Q = P[p]; D.circ(c, Q.x, Q.y + 4, 21, '#0005'); D.circ(c, Q.x, Q.y, 21, COL[p]); D.circ(c, Q.x + (p ? -23 : 23), Q.y - (Q.sw > 0 ? 15 : 0), 10, null, '#fff', 4); }
        D.circ(c, b.x, b.y - b.z * .6, 8, '#e4ff4d');
        if (st === 'serve') D.text(c, `${A.names[server]} to serve`, 400, 482, 18, COL[server]);
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Blob Volley ---------- */
reg({
  id: 'volley', name: 'Blob Volley', cat: 'Sports', icon: '🏐', type: 'real', pad: 'lr a', btn: { a: 'Jump' },
  desc: 'Bouncy side-view volleyball.', help: 'Move left/right and jump (push up, or tap) to bop the ball over the net. If it lands on your side, the other player scores. First to 7.',
  make(A) {
    const GY = 450, sc = [0, 0], P = [{ x: 200, y: GY, vy: 0, mv: 0 }, { x: 600, y: GY, vy: 0, mv: 0 }]; let b, msg = '', mt = 0, pause = 0, server = A.first;
    const serve = () => { b = { x: server ? 600 : 200, y: 150, vx: 0, vy: 0, r: 17 }; P[0].x = 200; P[1].x = 600; };
    serve();
    return {
      ai(dt, B) {
        const p = B.p, Q = P[p];
        if (B.every('plan', B.k(.24, .11, .04))) {
          let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
          for (let i = 0; i < 240; i++) { const h = 1 / 60; vy += 520 * h; x += vx * h; y += vy * h; if (x < 17) { x = 17; vx = Math.abs(vx); } if (x > 783) { x = 783; vx = -Math.abs(vx); } if (y > GY - 62 && vy > 0) break; }
          const mine = p ? x > 400 : x < 400;
          if (mine !== B.mem.mine) { B.mem.mine = mine; B.mem.eo = rand(-1, 1) * B.k(48, 22, 6) + (B.chance(B.k(.3, .16, .08)) ? (rand() < .5 ? -1 : 1) * rand(75, 115) : 0); }
          B.mem.tx = mine ? x + (p ? 1 : -1) * B.k(8, 14, 18) + B.mem.eo : (p ? 600 : 200);
        }
        B.go(clamp((B.mem.tx - Q.x) / 22, -1, 1) * B.k(.62, .85, 1), 0);
        const close = Math.abs(b.x - Q.x) < 58 && b.y < Q.y - 70 && b.y > Q.y - B.k(190, 220, 240) && b.vy > 0 && (p ? b.x > 400 : b.x < 400);
        B.hold('a', close && B.chance(B.k(.35, .7, 1)));
      },
      update(dt) {
        mt -= dt;
        if (pause > 0) { pause -= dt; if (pause <= 0) serve(); return; }
        for (let p = 0; p < 2; p++) {
          const Q = P[p], mv = A.axis(p)[0];
          Q.x = clamp(Q.x + mv * 340 * dt, p ? 444 : 40, p ? 760 : 356);
          if ((A.get(p, 'u') || A.get(p, 'a')) && Q.y >= GY) Q.vy = -620;
          Q.vy += 1600 * dt; Q.y += Q.vy * dt; if (Q.y > GY) { Q.y = GY; Q.vy = 0; }
          Q.mv = mv;
        }
        for (let s = 0; s < 3; s++) {
          const h = dt / 3; b.vy += 520 * h; b.x += b.vx * h; b.y += b.vy * h;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > 800 - b.r) { b.x = 800 - b.r; b.vx = -Math.abs(b.vx); }
          if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
          if (rectBounce(b, 395, 300, 10, 200, .8)) { b.vx += rand(-20, 20); A.sfx('bounce'); }
          for (let p = 0; p < 2; p++) {
            const Q = P[p], d = dist(b.x, b.y, Q.x, Q.y);
            if (d < 46 + b.r && b.y < Q.y + 4) {
              const nx = (b.x - Q.x) / d, ny = (b.y - Q.y) / d; b.x = Q.x + nx * (46 + b.r); b.y = Q.y + ny * (46 + b.r);
              b.vx = nx * 560 + Q.mv * 120; b.vy = Math.min(ny * 560 + Q.vy * .3, -260); A.sfx('hit');
            }
          }
          if (b.y > GY - b.r + 10) { const w = b.x < 400 ? 1 : 0; sc[w]++; server = w; msg = `${A.names[w]} scores`; mt = 1; pause = 1; A.sfx('score'); if (sc[w] >= 7) A.end(w, `${sc[0]} – ${sc[1]}`); return; }
        }
      },
      draw(c) {
        D.rr(c, -20, GY, 840, 80, 20, '#3a2f52'); D.rr(c, 395, 300, 10, 160, 5, '#d8dbf0');
        bigScore(c, A, sc, 56, 52);
        for (let p = 0; p < 2; p++) {
          const Q = P[p]; c.beginPath(); c.arc(Q.x, Q.y, 46, Math.PI, 0); c.closePath(); c.fillStyle = COL[p]; c.fill();
          const ex = Q.x + (p ? -15 : 15); D.circ(c, ex, Q.y - 25, 9, '#fff'); D.circ(c, ex + clamp((b.x - ex) / 60, -3, 3), Q.y - 25 + clamp((b.y - Q.y) / 60, -3, 3), 4.5, '#111');
        }
        D.circ(c, b.x, GY + 4, 15 * clamp(1 - (GY - b.y) / 500, .3, 1), '#0004');
        D.circ(c, b.x, b.y, b.r, '#fff'); D.circ(c, b.x, b.y, b.r, null, '#ffd166', 4);
        if (b.y < 0) D.poly(c, [[b.x, 4], [b.x - 9, 20], [b.x + 9, 20]], '#fff');
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Soccer ---------- */
reg({
  id: 'soccer', rot: true, name: 'Soccer', cat: 'Sports', icon: '⚽', type: 'real', pad: 'dpad a', btn: { a: 'Kick' },
  desc: 'Top-down 1v1 football.', help: 'Dribble by running into the ball, kick when you are next to it. Score in the opponent\'s goal. First to 5.',
  make(A) {
    const L = 40, R = 760, T = 40, B = 460, GT = 185, GB = 315, sc = [0, 0];
    let P, ball, msg = '', mt = 0, pause = 0;
    const posts = [[L, GT], [L, GB], [R, GT], [R, GB]].map(([x, y]) => ({ x, y, r: 6, im: 0, vx: 0, vy: 0 }));
    const reset = () => { P = [{ x: 200, y: 250, vx: 0, vy: 0, r: 22, im: .35, cd: 0 }, { x: 600, y: 250, vx: 0, vy: 0, r: 22, im: .35, cd: 0 }]; ball = { x: 400, y: 250, vx: 0, vy: 0, r: 12, im: 1 }; };
    reset();
    return {
      ai(dt, B) {
        const p = B.p, Q = P[p], gx = p ? L - 10 : R + 10, own = p ? R : L, spd = B.k(.66, .85, .95);
        if (B.every('aimy', 1.2)) B.mem.gy = 250 + (B.lvl === 2 ? (P[1 - p].y < 250 ? 38 : -38) : rand(-30, 30));
        const lead = B.k(.05, .15, .18), bx = ball.x + ball.vx * lead, by = ball.y + ball.vy * lead;
        const ux0 = gx - bx, uy0 = (B.mem.gy || 250) - by, ud = Math.hypot(ux0, uy0), ux = ux0 / ud, uy = uy0 / ud;
        const wrong = p ? Q.x < ball.x + 4 : Q.x > ball.x - 4, side0 = Q.y < by ? -1 : 1, side = (by + side0 * 72 < T + 26 || by + side0 * 72 > B - 26) ? -side0 : side0, clear = Math.abs(Q.y - by) > Q.r + ball.r + 18;
        let tx, ty;
        if (wrong && !clear) { tx = Q.x + (p ? 12 : -12); ty = by + side * 72; }          // step off the ball line first
        else if (wrong) { tx = bx + (p ? 50 : -50); ty = by + side * 72; }               // then go around it
        else { tx = bx - ux * (Q.r + ball.r + 2); ty = by - uy * (Q.r + ball.r + 2); }
        const danger = Math.abs(ball.x - own) < 260 && (p ? ball.vx > 140 : ball.vx < -140);
        if (B.lvl > 0 && danger && wrong) { tx = own + (p ? -48 : 48); ty = clamp(by, GT, GB); }
        B.toward(Q.x, Q.y, tx, ty, spd, 18);
        const d = dist(Q.x, Q.y, ball.x, ball.y);
        if (d < Q.r + ball.r + 14 && Q.cd <= 0) {
          const kx = (ball.x - Q.x) / d, ky = (ball.y - Q.y) / d, al = kx * ux + ky * uy;
          if ((al > B.k(.55, .82, .86) || (ud < 240 && al > .6)) && B.chance(B.k(.15, .5, .8))) B.press('a');
        }
      },
      update(dt) {
        mt -= dt; if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        const n = 3, h = dt / n;
        for (let p = 0; p < 2; p++) {
          const Q = P[p], [dx, dy] = dir(A, p); Q.cd -= dt;
          Q.vx = lerp(Q.vx, dx * 260, Math.min(1, dt * 12)); Q.vy = lerp(Q.vy, dy * 260, Math.min(1, dt * 12));
          if (A.hit(p, 'a') && Q.cd <= 0 && dist(Q.x, Q.y, ball.x, ball.y) < Q.r + ball.r + 18) {
            const d = dist(Q.x, Q.y, ball.x, ball.y) || 1; ball.vx = (ball.x - Q.x) / d * 640 + Q.vx * .3; ball.vy = (ball.y - Q.y) / d * 640 + Q.vy * .3; Q.cd = .3; A.sfx('shoot');
          }
        }
        for (let s = 0; s < n; s++) {
          for (const Q of P) { Q.x = clamp(Q.x + Q.vx * h, L + Q.r - 20, R - Q.r + 20); Q.y = clamp(Q.y + Q.vy * h, T + Q.r, B - Q.r); }
          ball.x += ball.vx * h; ball.y += ball.vy * h;
          const f = Math.pow(.55, h); ball.vx *= f; ball.vy *= f;
          collide(P[0], P[1], .3);
          for (const Q of P) if (collide(Q, ball, .5)) A.sfx('bounce');
          for (const po of posts) if (collide(po, ball, .8)) A.sfx('bounce');
          const inMouth = ball.y > GT && ball.y < GB;
          if (ball.y < T + ball.r) { ball.y = T + ball.r; ball.vy = Math.abs(ball.vy) * .8; }
          if (ball.y > B - ball.r) { ball.y = B - ball.r; ball.vy = -Math.abs(ball.vy) * .8; }
          if (!inMouth) { if (ball.x < L + ball.r) { ball.x = L + ball.r; ball.vx = Math.abs(ball.vx) * .8; } if (ball.x > R - ball.r) { ball.x = R - ball.r; ball.vx = -Math.abs(ball.vx) * .8; } }
          else ball.y = clamp(ball.y, GT + ball.r, GB - ball.r);
          if (ball.x < L - ball.r || ball.x > R + ball.r) {
            const w = ball.x < L ? 1 : 0; sc[w]++; msg = 'GOAL!'; mt = 1.3; pause = 1.3; A.sfx('score'); A.shake(6);
            if (sc[w] >= 5) A.end(w, `${sc[0]} – ${sc[1]}`); return;
          }
        }
      },
      draw(c) {
        D.rr(c, L, T, R - L, B - T, 18, '#2f8656');
        for (let i = 1; i < 8; i += 2) D.rect(c, L + i * 90, T, 90, B - T, '#2a7a4f');
        c.strokeStyle = '#ffffffaa'; c.lineWidth = 4; D.rr(c, L, T, R - L, B - T, 18, null, '#ffffffaa', 4); D.line(c, 400, T, 400, B, '#ffffffaa', 4); D.circ(c, 400, 250, 60, null, '#ffffffaa', 4);
        D.rr(c, L, 150, 80, 200, 12, null, '#ffffffaa', 4); D.rr(c, R - 80, 150, 80, 200, 12, null, '#ffffffaa', 4);
        D.rr(c, L - 30, GT, 30, GB - GT, 8, COL[0] + '55'); D.rr(c, R, GT, 30, GB - GT, 8, COL[1] + '55');
        posts.forEach(p => D.circ(c, p.x, p.y, 7, '#fff'));
        bigScore(c, A, sc, 20, 30);
        for (let p = 0; p < 2; p++) { D.circ(c, P[p].x, P[p].y + 3, P[p].r, '#0005'); D.circ(c, P[p].x, P[p].y, P[p].r, COL[p], '#fff', 4); }
        D.circ(c, ball.x, ball.y + 3, ball.r, '#0005'); D.circ(c, ball.x, ball.y, ball.r, '#fff', '#222', 3);
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Air Hockey ---------- */
reg({
  id: 'airhockey', rot: true, name: 'Air Hockey', cat: 'Sports', icon: '🏒', type: 'real', pad: 'dpad', touch: 'point',
  desc: 'Slam the puck, guard your goal.', help: 'Move your mallet in your half and smash the puck into the opposite goal. First to 7.',
  make(A) {
    const sc = [0, 0], GT = 170, GB = 330; let M, pk, msg = '', mt = 0, pause = 0, stall = 0;
    const reset = to => { M = [{ x: 90, y: 250, vx: 0, vy: 0, r: 32, im: 0 }, { x: 710, y: 250, vx: 0, vy: 0, r: 32, im: 0 }]; pk = { x: to === 0 ? 300 : to === 1 ? 500 : 400, y: 250, vx: 0, vy: 0, r: 19, im: 1 }; };
    reset(-1);
    return {
      ai(dt, B) {
        const p = B.p, Q = M[p], home = p ? 724 : 76, mine = p ? pk.x > 400 : pk.x < 400, spd = B.k(.55, .8, 1);
        if (B.every('plan', B.k(.18, .08, .03))) {
          let tx, ty;
          const coming = p ? pk.vx > 60 : pk.vx < -60;
          if (mine && !(coming && Math.abs(pk.vx) > 650)) {
            if (B.every('aim', .8)) B.mem.gy = 250 + (B.lvl === 2 ? (M[1 - p].y < 250 ? 55 : -55) : rand(-40, 40));
            const gx = p ? 0 : 800, dx = gx - pk.x, dy = (B.mem.gy || 250) - pk.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
            const bx = pk.x - ux * (Q.r + pk.r + 4), by = pk.y - uy * (Q.r + pk.r + 4), behind = p ? Q.x > pk.x + 6 : Q.x < pk.x - 6;
            const nearWall = pk.y < 70 || pk.y > 430;
            if (behind && dist(Q.x, Q.y, bx, by) < 26) { tx = pk.x + ux * 60; ty = pk.y + uy * 60; }
            else if (behind && !nearWall) { tx = bx; ty = by; }
            else if (behind) { tx = pk.x + (p ? 40 : -40); ty = pk.y + (pk.y < 250 ? 34 : -34); }
            else { tx = home; ty = pk.y + (Q.y < pk.y ? -70 : 70); }
            if (B.chance(B.k(.05, .02, .008))) { tx += rand(-80, 80); ty += rand(-80, 80); }
          } else {
            let py = pk.y; if (coming && B.lvl > 0) { const T = (home - pk.x) / pk.vx; if (T > 0) py = reflectY(pk.y + pk.vy * T, 39, 461); }
            tx = home + (p ? -1 : 1) * B.k(0, 14, 30); ty = clamp(lerp(250, py, B.k(.5, .75, .95)), GT - 10, GB + 10);
          }
          B.mem.tx = tx; B.mem.ty = ty;
        }
        B.toward(Q.x, Q.y, B.mem.tx ?? home, B.mem.ty ?? 250, spd, 20);
      },
      update(dt) {
        mt -= dt; if (pause > 0) { pause -= dt; return; }
        stall = Math.hypot(pk.vx, pk.vy) < 40 ? stall + dt : 0;
        if (stall > 3.5) { stall = 0; pk.x = 400; pk.y = 250; pk.vx = rand(-1, 1) * 60; pk.vy = rand(-1, 1) * 200; msg = 'Face-off'; mt = .8; A.sfx('go'); }
        for (let p = 0; p < 2; p++) {
          const Q = M[p], pt = A.point(p);
          if (pt) { const dx = pt[0] - Q.x, dy = pt[1] - Q.y, d = Math.hypot(dx, dy), sp = Math.min(d * 20, 1100); Q.vx = d ? dx / d * sp : 0; Q.vy = d ? dy / d * sp : 0; }
          else { const [ax, ay] = dir(A, p); Q.vx = ax * 520; Q.vy = ay * 520; }
        }
        const n = 4, h = dt / n;
        for (let s = 0; s < n; s++) {
          for (let p = 0; p < 2; p++) {
            const Q = M[p];
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
        D.rr(c, 10, 10, 780, 480, 40, '#16203d', '#3ec5ff55', 5);
        D.line(c, 400, 20, 400, 480, '#ffffff22', 5); D.circ(c, 400, 250, 70, null, '#ffffff22', 5);
        D.rr(c, 4, GT, 14, GB - GT, 7, COL[0]); D.rr(c, 782, GT, 14, GB - GT, 7, COL[1]);
        bigScore(c, A, sc, 56, 48);
        for (let p = 0; p < 2; p++) { D.glow(c, COL[p], 20); D.circ(c, M[p].x, M[p].y, M[p].r, COL[p]); D.noglow(c); D.circ(c, M[p].x, M[p].y, 15, COLD[p]); }
        D.glow(c, '#fff', 18); D.circ(c, pk.x, pk.y, pk.r, '#f4f2ff'); D.noglow(c);
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Mini Golf ---------- */
reg({
  id: 'golf', rot: true, name: 'Mini Golf', cat: 'Sports', icon: '⛳', type: 'turn', long: true,
  desc: '5 holes. Fewest strokes wins.', help: 'Pull back anywhere and release to putt, like a slingshot. Players alternate shots. Lowest total over 5 holes wins. Max 8 strokes per hole.',
  make(A) {
    const HOLES = [
      { tee: [110, 250], hole: [690, 250], walls: [[380, 140, 40, 220]] },
      { tee: [110, 420], hole: [690, 90], walls: [[250, 60, 30, 290], [520, 150, 30, 290]] },
      { tee: [110, 100], hole: [690, 400], walls: [[200, 200, 420, 30]], bumps: [[400, 380, 30], [520, 330, 22]] },
      { tee: [400, 440], hole: [400, 70], walls: [[250, 260, 300, 26]], bumps: [[300, 160, 26], [500, 160, 26], [400, 200, 20]] },
      { tee: [100, 250], hole: [700, 250], walls: [[220, 30, 26, 300], [380, 170, 26, 300], [540, 30, 26, 300]] },
    ];
    const BORDER = [[-100, -100, 1000, 120], [-100, 480, 1000, 120], [-100, -100, 120, 700], [780, -100, 120, 700]];
    let hi = 0, H, bumps, balls, total = [0, 0], strokes, p = A.first, moving = false; const sl = Sling(170);
    const load = () => { H = HOLES[hi]; bumps = (H.bumps || []).map(([x, y, r]) => ({ x, y, r, im: 0, vx: 0, vy: 0 })); balls = [0, 1].map(q => ({ x: H.tee[0] + (q ? 10 : -10), y: H.tee[1], vx: 0, vy: 0, r: 9, in: false })); strokes = [0, 0]; p = (A.first + hi) % 2; A.turn(p); };
    load();
    const phys = (b, h, snd) => {
      b.x += b.vx * h; b.y += b.vy * h; roll(b, h, .85, 60);
      let hit = false;
      for (const w of BORDER) if (rectBounce(b, ...w, .8)) hit = true;
      for (const w of H.walls) if (rectBounce(b, ...w, .8)) hit = true;
      for (const o of bumps) if (collide(o, b, 1.1)) hit = true;
      if (hit && snd) A.sfx('bounce');
      const sp = Math.hypot(b.vx, b.vy), dh = dist(b.x, b.y, ...H.hole);
      if (dh < 13 && sp < 520) return 'in';
      if (dh < 30 && sp < 520) { b.vx += (H.hole[0] - b.x) * 3 * h; b.vy += (H.hole[1] - b.y) * 3 * h; }
      return null;
    };
    const simulate = (x, y, a, t) => {
      const pw = 980 * Math.pow(t, 1.35), b = { x, y, vx: Math.cos(a) * pw, vy: Math.sin(a) * pw, r: 9 };
      for (let i = 0; i < 2400; i++) { if (phys(b, 1 / 240) === 'in') return { x: H.hole[0], y: H.hole[1], in: true }; if (Math.hypot(b.vx, b.vy) < 3) break; }
      return { x: b.x, y: b.y, in: false };
    };
    const shoot = r => { const b = balls[p], pw = 980 * Math.pow(r.t, 1.35); b.vx = r.nx * pw; b.vy = r.ny * pw; moving = true; strokes[p]++; sl.launch(b, r, COL[p]); sl.follow(b, '#ffffff'); A.sfx('hit'); };
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
      ai(B) {
        if (moving || sl.ap || B.p !== p) return false;
        const b = balls[p], base = Math.atan2(H.hole[1] - b.y, H.hole[0] - b.x), n = B.k(20, 70, 150);
        let best = { a: base, t: .5 }, bs = Infinity;
        const score = (a, t) => { const r = simulate(b.x, b.y, a, t); return r.in ? -1000 - (1 - t) * 50 : dist(r.x, r.y, ...H.hole); };
        for (let i = 0; i < n; i++) { const a = i % 3 ? base + gauss() * 1.4 : rand(Math.PI * 2), t = rand(.12, 1), s = score(a, t); if (s < bs) { bs = s; best = { a, t }; } }
        for (let i = 0; i < B.k(0, 30, 90); i++) { const a = best.a + gauss() * .09, t = clamp(best.t + gauss() * .07, .08, 1), s = score(a, t); if (s < bs) { bs = s; best = { a, t }; } }
        const a = best.a + gauss() * B.k(.1, .035, .008), t = clamp(best.t * (1 + gauss() * B.k(.14, .05, .012)), .07, 1);
        sl.auto(Math.cos(a), Math.sin(a), t);
        return true;
      },
      down(x, y) { if (!moving && !sl.ap) sl.down(x, y); },
      move(x, y) { if (!sl.ap) sl.move(x, y); }, cancel() { if (!sl.ap) sl.cancel(); },
      up() { if (moving || sl.ap) return; const r = sl.up(); if (r) shoot(r); },
      update(dt) {
        if (sl.ap) { const r = sl.step(dt); if (r) shoot(r); return; }
        if (!moving) return; const b = balls[p], n = 4, h = dt / n;
        for (let s = 0; s < n; s++) if (phys(b, h, true) === 'in') { b.in = true; b.inAt = performance.now(); b.vx = b.vy = 0; A.sfx('coin'); break; }
        if (b.in || Math.hypot(b.vx, b.vy) < 3) {
          b.vx = b.vy = 0; moving = false;
          if (!b.in && strokes[p] >= 8) { b.in = true; strokes[p] = 8; }
          nextTurn();
        }
      },
      draw(c) {
        D.rr(c, 20, 20, 760, 460, 34, '#2f8656');
        for (const w of H.walls) D.rr(c, w[0], w[1], w[2], w[3], 12, '#8a5a3a', '#5b3a22', 3);
        for (const o of bumps) D.circ(c, o.x, o.y, o.r, '#c56cf0', '#fff4', 4);
        D.circ(c, ...H.hole, 14, '#111'); D.line(c, H.hole[0], H.hole[1], H.hole[0], H.hole[1] - 50, '#ddd', 4); D.poly(c, [[H.hole[0], H.hole[1] - 50], [H.hole[0] + 26, H.hole[1] - 42], [H.hole[0], H.hole[1] - 34]], ACC, ACC, 3);
        D.text(c, `Hole ${hi + 1}/${HOLES.length}`, 400, 44, 22, '#fff');
        const aiming = !A.ended && !moving; sl.draw(c, aiming ? balls[p] : null, COL[p], { reach: 240 });
        for (let q = 0; q < 2; q++) {
          D.text(c, `${A.names[q]} ${total[q] + strokes[q]}`, q ? 750 : 50, 44, 20, COL[q], q ? 'right' : 'left');
          const b = balls[q]; if (b.in) { const k = 1 - (performance.now() - (b.inAt || 0)) / 350; if (k > 0) D.circ(c, lerp(H.hole[0], b.x, k), lerp(H.hole[1], b.y, k), b.r * k, '#fff'); continue; }
          c.globalAlpha = q === p ? 1 : .5; D.circ(c, b.x, b.y + 2, b.r + 1, '#0005'); D.circ(c, b.x, b.y, b.r + 1, '#fff', COL[q], 4); c.globalAlpha = 1;
        }
        if (aiming && !sl.on) D.circ(c, balls[p].x, balls[p].y, 22 + Math.sin(performance.now() / 200) * 3, null, COL[p], 3);
      }
    };
  }
});

/* ---------- Hoops ---------- */
reg({
  id: 'hoops', name: 'Hoops', cat: 'Sports', icon: '🏀', type: 'real', pad: 'one', btn: { a: 'Shoot' },
  desc: 'Timing shootout at a moving hoop.', help: 'Hold to charge — the power meter swings up and down — release at the right moment to sink it. The hoop moves! First to 7 baskets.',
  make(A) {
    const sc = [0, 0], S = [{ ch: -1, t: 0 }, { ch: -1, t: 0 }], balls = []; let t = 0, hx = 400, hy = 220, msg = '', mt = 0;
    const hoopAt = tt => [400 + Math.sin(tt * .37) * 40, 210 + Math.sin(tt * .9) * 80];
    const rims = () => [{ x: hx - 34, y: hy, r: 4, im: 0 }, { x: hx + 34, y: hy, r: 4, im: 0 }];
    const need = (p, tArr) => {
      const [x, y] = hoopAt(tArr), dx = Math.abs((p ? 700 : 100) - x), dy = 380 - y, c = Math.cos(1.05), s = Math.sin(1.05);
      const den = c * c * (dx * s / c - dy); if (den <= 0) return null;
      const pw = Math.sqrt(450 * dx * dx / den); return { pw, T: dx / (c * pw) };
    };
    return {
      ai(dt, B) {
        const p = B.p, s = S[p], has = balls.some(b => b.p === p);
        if (has) { B.hold('a', 0); return; }
        if (s.ch < 0) { if (B.after('ready', true, B.k(.9, .5, .3) + rand(0, .4))) { B.hold('a', 1); B.mem.bias = gauss() * B.k(.09, .035, .008); } else B.hold('a', 0); return; }
        let T = .6, sol = null; for (let i = 0; i < 3; i++) { sol = need(p, t + T); if (!sol) break; T = sol.T; }
        if (!sol) return;
        const want = (sol.pw - 430) / 420 + B.mem.bias, tol = B.k(.045, .02, .008);
        if (want > 0 && want < 1 && Math.abs(s.ch - want) < tol) { B.hold('a', 0); B.mem.ready = 0; } else B.hold('a', 1);
      },
      update(dt) {
        t += dt; mt -= dt;[hx, hy] = hoopAt(t);
        for (let p = 0; p < 2; p++) {
          const s = S[p], has = balls.some(b => b.p === p);
          if (A.get(p, 'a') && !has) { if (s.ch < 0) s.t = 0; s.t += dt; s.ch = (1 - Math.cos(s.t * 3.2)) / 2; }
          else if (s.ch >= 0) {
            const pw = 430 + s.ch * 420, ang = 1.05, sx = p ? 700 : 100;
            balls.push({ p, x: sx, y: 380, vx: Math.cos(ang) * pw * (p ? -1 : 1), vy: -Math.sin(ang) * pw, r: 15, im: 1, scored: false });
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
        D.rr(c, -20, 440, 840, 80, 20, '#5a3b26');
        bigScore(c, A, sc, 46, 48);
        D.rr(c, hx - 4, hy - 72, 8, 62, 4, '#888'); D.rr(c, hx - 48, hy - 84, 96, 16, 8, '#ddd');
        for (let k = 0; k < 5; k++) D.line(c, hx - 34 + k * 17, hy, hx - 22 + k * 11, hy + 40, '#fff8', 3);
        for (let p = 0; p < 2; p++) {
          const x = p ? 700 : 100;
          D.circ(c, x, 403, 20, COL[p]); D.rr(c, x - 18, 420, 36, 32, 12, COL[p]);
          D.rr(c, x + (p ? 34 : -48), 296, 14, 124, 7, BG2);
          const ch = S[p].ch; if (ch >= 0) D.rr(c, x + (p ? 34 : -48), 420 - 124 * ch, 14, 124 * ch, 7, `hsl(${120 - ch * 120},80%,58%)`);
          if (!balls.some(b => b.p === p)) D.circ(c, x + (p ? -22 : 22), 378, 15, '#ff8c42', COL[p], 4);
        }
        for (const b of balls) { D.circ(c, b.x, b.y, b.r, '#ff8c42', COL[b.p], 4); D.line(c, b.x - b.r, b.y, b.x + b.r, b.y, '#0005', 2); }
        c.lineCap = 'round'; D.line(c, hx - 34, hy, hx + 34, hy, '#ff6b35', 7); c.lineCap = 'butt';
        if (mt > 0) D.text(c, msg, 400, 110, 30, ACC);
      }
    };
  }
});

/* ---------- Archery ---------- */
reg({
  id: 'archery', name: 'Archery', cat: 'Sports', icon: '🎯', type: 'real', pad: 'one', btn: { a: 'Shoot' },
  desc: '5 arrows. Steady hands.', help: 'Your sight sways around the target — tap to release the arrow. Each player has 5 arrows and the sway gets wilder. Highest total wins.',
  make(A) {
    const S = [0, 1].map(p => ({ arrows: [], score: 0, cd: 0, ph: rand(10) })); let t = 0;
    const aim = (p, tt = t) => { const s = S[p], n = s.arrows.length, a = 60 + n * 14, sp = 1 + n * .18, k = tt * sp + s.ph; return [(p ? 600 : 200) + Math.sin(k * 1.7) * a * Math.cos(k * .3), 270 + Math.sin(k * 2.3 + 1) * a * .8]; };
    return {
      ai(dt, B) {
        const p = B.p, s = S[p]; if (s.arrows.length >= 5 || s.cd > 0) return;
        const lag = B.k(.22, .15, .07), [x, y] = aim(p, B.lvl === 2 ? t + lag : t), d = dist(x, y, p ? 600 : 200, 270);
        if (B.mem.fire > 0) { B.mem.fire -= dt; if (B.mem.fire <= 0) B.press('a'); return; }
        B.mem.wait = (B.mem.wait || 0) + dt;
        if (d < B.k(36, 20, 8) || B.mem.wait > 7) { B.mem.fire = B.lvl === 2 ? lag : lag * rand(.6, 1.3); B.mem.wait = 0; }
      },
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
        const RC = ['#f2f2f2', '#f2f2f2', '#2a2a3a', '#2a2a3a', '#3ec5ff', '#3ec5ff', '#ff4f6d', '#ff4f6d', '#ffd166', '#ffd166'];
        for (let p = 0; p < 2; p++) {
          const cx = p ? 600 : 200, s = S[p];
          for (let k = 0; k < 10; k++) D.circ(c, cx, 270, 130 - k * 13, RC[k], '#0003', 1);
          s.arrows.forEach(([x, y]) => D.circ(c, x, y, 6, COL[p], '#fff', 3));
          D.text(c, `${A.names[p]} ${s.score}`, cx, 52, 32, COL[p]);
          for (let i = 0; i < 5; i++) D.circ(c, cx - 48 + i * 24, 452, 8, i < 5 - s.arrows.length ? COL[p] : LINE);
          if (s.arrows.length < 5 && !A.ended) { const [x, y] = aim(p); D.circ(c, x, y, 16, null, COL[p], 4); c.lineCap = 'round'; D.line(c, x - 24, y, x + 24, y, COL[p], 3); D.line(c, x, y - 24, x, y + 24, COL[p], 3); c.lineCap = 'butt'; }
          const lp = s.arrows[s.arrows.length - 1]; if (lp && s.cd > 0) D.text(c, `+${lp[2]}`, cx, 100, 32, ACC);
        }
        D.rr(c, 397, 90, 6, 330, 3, LINE);
      }
    };
  }
});

/* ---------- Curling ---------- */
reg({
  id: 'curling', rot: true, name: 'Curling', cat: 'Sports', icon: '🥌', type: 'turn',
  desc: 'Slide stones closest to the button.', help: 'Pull back and release to slide your stone. 4 stones each, alternating. Knock opponents out! After all 8, whoever has the stone closest to the center wins the end.',
  make(A) {
    const HX = 640, HY = 250, stones = []; let p = A.first, thrown = [0, 0], cur = null, moving = false; const sl = Sling(160); A.turn(p);
    const spawn = () => { cur = { x: 90, y: 250, vx: 0, vy: 0, r: 15, im: 1, p }; stones.push(cur); };
    spawn();
    const physAll = (list, h, snd) => {
      for (const st of list) { if (st.out) continue; st.x += st.vx * h; st.y += st.vy * h; const sp = Math.hypot(st.vx, st.vy); if (sp > 0) { const ns = Math.max(0, sp - 95 * h); st.vx *= ns / sp; st.vy *= ns / sp; } }
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (!list[i].out && !list[j].out && collide(list[i], list[j], .9) && snd) A.sfx('hit');
      for (const st of list) if (!st.out && (st.x > 790 || st.y < 30 || st.y > 470 || st.x < 10)) st.out = true;
    };
    const evalPos = (list, me) => {
      const d = q => Math.min(400, ...list.filter(s => !s.out && s.p === q).map(s => dist(s.x, s.y, HX, HY)));
      const mine = d(me), theirs = d(1 - me), cnt = list.filter(s => !s.out && s.p === me && dist(s.x, s.y, HX, HY) < Math.min(theirs, 95)).length;
      return (theirs - mine) + cnt * 40;
    };
    const shoot = r => { const pw = 400 * Math.pow(r.t, 1.1); cur.vx = r.nx * pw; cur.vy = r.ny * pw; moving = true; thrown[p]++; sl.launch(cur, r, COL[p]); sl.follow(cur, COL[p]); A.sfx('hit'); };
    return {
      ai(B) {
        if (moving || !cur || sl.ap || B.p !== p) return false;
        const n = B.k(12, 40, 100), targets = [[HX, HY], ...stones.filter(s => s.p !== p && s !== cur).map(s => [s.x, s.y])];
        let best = { a: 0, t: .82 }, bv = -Infinity;
        for (let i = 0; i < n; i++) {
          const k0 = rint(0, targets.length - 1), [tx, ty] = targets[k0], a = Math.atan2(ty - cur.y, tx - cur.x) + rand(-.03, .03), t = k0 ? rand(.72, 1) : rand(.74, .9);
          const sim = stones.map(s => ({ x: s.x, y: s.y, vx: 0, vy: 0, r: s.r, im: 1, p: s.p }));
          const me = sim[stones.indexOf(cur)], pw = 400 * Math.pow(t, 1.1); me.vx = Math.cos(a) * pw; me.vy = Math.sin(a) * pw;
          for (let k = 0; k < 1500; k++) { physAll(sim, 1 / 120); if (sim.every(s => s.out || Math.hypot(s.vx, s.vy) < 2)) break; }
          const v = evalPos(sim, p); if (v > bv) { bv = v; best = { a, t }; }
        }
        const a = best.a + gauss() * B.k(.03, .012, .004), t = clamp(best.t * (1 + gauss() * B.k(.07, .025, .008)), .2, 1);
        sl.auto(Math.cos(a), Math.sin(a), t);
        return true;
      },
      down(x, y) { if (!moving && cur && !sl.ap) sl.down(x, y); },
      move(x, y) { if (!sl.ap) sl.move(x, y); }, cancel() { if (!sl.ap) sl.cancel(); },
      up() { if (moving || !cur || sl.ap) return; const r = sl.up(); if (r) shoot(r); },
      update(dt) {
        if (sl.ap) { const r = sl.step(dt); if (r) shoot(r); return; }
        if (!moving) return;
        for (let s = 0; s < 4; s++) physAll(stones, dt / 4, true);
        for (let i = stones.length - 1; i >= 0; i--) if (stones[i].out) stones.splice(i, 1);
        if (stones.every(st => Math.hypot(st.vx, st.vy) < 2)) {
          stones.forEach(st => st.vx = st.vy = 0); moving = false; cur = null;
          if (thrown[0] + thrown[1] >= 8) {
            const d = stones.map(st => ({ p: st.p, d: dist(st.x, st.y, HX, HY) })).sort((a, b) => a.d - b.d);
            if (!d.length) return A.end(-1, 'Every stone was knocked out');
            const w = d[0].p, ob = d.find(o => o.p !== w), pts = d.filter(o => o.p === w && (!ob || o.d < ob.d)).length;
            return A.end(w, `Scores ${pts} point${pts > 1 ? 's' : ''}`);
          }
          p = 1 - p; A.turn(p); spawn();
        }
      },
      draw(c) {
        D.rr(c, 10, 30, 780, 440, 30, '#e6f0fb');
        [[95, '#3ec5ff55'], [65, '#fff'], [38, '#ff4f6d55'], [12, '#fff']].forEach(([r, f]) => D.circ(c, HX, HY, r, f, '#0002', 1));
        D.line(c, 160, 30, 160, 470, '#ff4f6d55', 4); D.line(c, HX, 30, HX, 470, '#0002', 1); D.line(c, 10, HY, 790, HY, '#0002', 1);
        sl.draw(c, cur && !moving && !A.ended ? cur : null, COL[p], { reach: 300 });
        for (const st of stones) { D.circ(c, st.x, st.y + 2, st.r, '#0003'); D.circ(c, st.x, st.y, st.r, '#9aa0b8'); D.circ(c, st.x, st.y, st.r * .62, COL[st.p]); }
        for (let q = 0; q < 2; q++) for (let i = 0; i < 4; i++) D.circ(c, (q ? 760 - i * 22 : 40 + i * 22), 16, 7, i < 4 - thrown[q] ? COL[q] : '#ffffff22');
      }
    };
  }
});

/* ---------- Penalty Kicks ---------- */
reg({
  id: 'penalty', name: 'Penalty Kicks', cat: 'Sports', icon: '🥅', type: 'real', pad: 'dpad',
  keys: ['<kbd>A</kbd> left · <kbd>W</kbd> middle · <kbd>D</kbd> right', '<kbd>←</kbd> left · <kbd>↑</kbd> middle · <kbd>→</kbd> right'],
  touchHint: 'swipe left · up · right',
  desc: 'Mind games from 11 meters.', help: 'Roles swap every kick. The shooter secretly picks left / middle / right, the keeper picks a dive. Different = GOAL, same = SAVE. 5 kicks each, then sudden death.',
  make(A) {
    const sc = [0, 0], taken = [0, 0], hist = [[], []], picks = [[], []], K = { l: 0, u: 1, r: 2 }, KN = ['l', 'u', 'r']; let k = 0, pk, tm, anim = 0, res = '';
    const shooter = () => (A.first + k) % 2;
    const next = () => { pk = [-1, -1]; tm = 3.5; anim = 0; res = ''; };
    next();
    const decided = () => {
      if (taken[0] <= 5 && taken[1] <= 5 && !(taken[0] === 5 && taken[1] === 5)) { for (let p = 0; p < 2; p++) if (sc[p] > sc[1 - p] + (5 - taken[1 - p])) return p; return -2; }
      if (taken[0] === taken[1] && sc[0] !== sc[1]) return sc[0] > sc[1] ? 0 : 1;
      return -2;
    };
    return {
      ai(dt, B) {
        const p = B.p; if (anim > 0 || pk[p] >= 0) { B.mem.wait = 0; return; }
        if (!B.mem.wait) B.mem.wait = rand(.5, 2.2);
        B.mem.waited = (B.mem.waited || 0) + dt; if (B.mem.waited < B.mem.wait) return; B.mem.waited = 0;
        const role = shooter() === p ? 's' : 'k', theirs = picks[1 - p].filter(x => x.role !== role).map(x => x.v);
        let ch = rint(0, 2);
        if (B.lvl === 2 && theirs.length >= 2 && B.chance(.6)) {
          const cnt = [0, 0, 0]; theirs.slice(-6).forEach(v => cnt[v]++);
          ch = role === 'k' ? cnt.indexOf(Math.max(...cnt)) : cnt.indexOf(Math.min(...cnt));
        }
        B.press(KN[ch]);
      },
      update(dt) {
        if (anim > 0) { anim -= dt; if (anim <= 0) { k++; const w = decided(); if (w >= 0) return A.end(w, `${sc[0]} – ${sc[1]}`); next(); } return; }
        tm -= dt;
        for (let p = 0; p < 2; p++) if (pk[p] < 0) for (const b in K) if (A.hit(p, b)) { pk[p] = K[b]; A.sfx('click'); }
        if ((pk[0] >= 0 && pk[1] >= 0) || tm <= 0) {
          for (let p = 0; p < 2; p++) if (pk[p] < 0) pk[p] = rint(0, 2);
          const s = shooter(), g = pk[s] !== pk[1 - s]; taken[s]++; if (g) sc[s]++; hist[s].push(g);
          picks[s].push({ role: 's', v: pk[s] }); picks[1 - s].push({ role: 'k', v: pk[1 - s] });
          res = g ? 'GOAL!' : 'SAVED!'; A.sfx(g ? 'score' : 'hit'); if (g) A.shake(4); anim = 1.6;
        }
      },
      draw(c) {
        const s = shooter(), kp = 1 - s;
        D.rect(c, 0, 300, 800, 200, '#2f8656'); D.rect(c, 0, 0, 800, 300, '#1b2540');
        D.rr(c, 170, 86, 460, 12, 6, '#fff'); D.rr(c, 170, 86, 12, 214, 6, '#fff'); D.rr(c, 618, 86, 12, 214, 6, '#fff');
        for (let i = 0; i < 12; i++) D.line(c, 182 + i * 37, 98, 182 + i * 37, 300, '#ffffff22', 2);
        const t = anim > 0 ? clamp((1.6 - anim) / .5, 0, 1) : 0, tx = [250, 400, 550], kx = anim > 0 ? lerp(400, tx[pk[kp]], t) : 400;
        D.rr(c, kx - 24, 188, 48, 112, 20, COL[kp]); D.circ(c, kx, 166, 22, COL[kp]); D.rr(c, kx - 58 * (anim > 0 ? 1 : .6), 208, 116 * (anim > 0 ? 1 : .6), 16, 8, COL[kp]);
        const bx = anim > 0 ? lerp(400, tx[pk[s]], t) : 400, by = anim > 0 ? lerp(440, 190, t) : 440;
        D.circ(c, bx, by, 15 - t * 4, '#fff', '#222', 3);
        D.text(c, `${A.names[s]} shoots`, 30, 32, 22, COL[s], 'left'); D.text(c, `${A.names[kp]} keeps`, 770, 32, 22, COL[kp], 'right');
        for (let p = 0; p < 2; p++) {
          D.text(c, `${sc[p]}`, p ? 770 : 30, 470, 30, COL[p], p ? 'right' : 'left');
          for (let i = 0; i < Math.max(5, hist[p].length); i++) D.circ(c, (p ? 560 : 70) + i * 26, 470, 9, hist[p][i] === undefined ? '#ffffff22' : hist[p][i] ? '#7bd389' : '#ff4f6d');
        }
        if (anim > 0) D.text(c, res, 400, 380, 64, ACC, 'center', 'middle', 900);
        else { D.text(c, `Pick! ${Math.ceil(tm)}`, 400, 375, 34, TXT); for (let p = 0; p < 2; p++) D.text(c, pk[p] >= 0 ? 'locked in' : '…', p ? 600 : 200, 420, 20, pk[p] >= 0 ? COL[p] : MUT); }
      }
    };
  }
});

/* ---------- Pool ---------- */
reg({
  id: 'pool', rot: true, name: 'Pool', cat: 'Sports', icon: '🎱', type: 'turn', long: true,
  desc: 'Pot your five before they do.', help: 'Pull back and release to strike the white ball. Red pots red balls, Blue pots blue. Pot your own color to shoot again. Potting the white passes the turn. First to pot all 5 wins.',
  make(A) {
    const L = 60, R = 740, T = 60, B = 440, pockets = [[L, T], [400, T - 6], [R, T], [L, B], [400, B + 6], [R, B]];
    const cue = { x: 220, y: 250, vx: 0, vy: 0, r: 11, im: 1, c: -1 }, balls = [cue], pot = [0, 0];
    const order = [0, 1, 1, 0, 0, 1, 1, 0, 1, 0]; let n = 0;
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) balls.push({ x: 540 + row * 20, y: 250 + (i - row / 2) * 23, vx: 0, vy: 0, r: 11, im: 1, c: order[n++] });
    let p = A.first, moving = false, potted = [], msg = ''; const sl = Sling(170); A.turn(p);
    const step = (list, h, snd, pot) => {
      for (const b of list) { if (b.gone) continue; b.x += b.vx * h; b.y += b.vy * h; roll(b, h, .55, 38); }
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (!list[i].gone && !list[j].gone && collide(list[i], list[j], .95) && snd) A.sfx('tick');
      for (const b of list) {
        if (b.gone) continue;
        if (pockets.some(([x, y]) => dist(b.x, b.y, x, y) < 22)) { b.gone = true; b.vx = b.vy = 0; pot.push(b.c); if (snd) A.sfx('coin'); continue; }
        if (b.x < L + b.r) { b.x = L + b.r; b.vx = Math.abs(b.vx) * .8; } if (b.x > R - b.r) { b.x = R - b.r; b.vx = -Math.abs(b.vx) * .8; }
        if (b.y < T + b.r) { b.y = T + b.r; b.vy = Math.abs(b.vy) * .8; } if (b.y > B - b.r) { b.y = B - b.r; b.vy = -Math.abs(b.vy) * .8; }
      }
    };
    const pw = t => 1250 * Math.pow(t, 1.25);
    const simShot = (a, t, me) => {
      const list = balls.map(b => ({ x: b.x, y: b.y, vx: 0, vy: 0, r: b.r, im: 1, c: b.c })), got = [];
      list[0].vx = Math.cos(a) * pw(t); list[0].vy = Math.sin(a) * pw(t);
      for (let k = 0; k < 2000; k++) { step(list, 1 / 300, false, got); if (k % 10 === 0 && list.every(b => b.gone || Math.hypot(b.vx, b.vy) < 2)) break; }
      const mine = got.filter(c => c === me).length, theirs = got.filter(c => c === 1 - me).length, scratch = got.includes(-1);
      const cb = list[0]; let pos = 0;
      if (!scratch && mine) { const own = list.filter(b => !b.gone && b.c === me); pos = own.length ? -Math.min(...own.map(b => dist(cb.x, cb.y, b.x, b.y))) / 20 : 0; }
      return mine * 100 - theirs * 70 - (scratch ? 150 : 0) + pos;
    };
    const candidates = me => {
      const out = [];
      for (const b of balls) {
        if (b.c !== me) continue;
        for (const [px, py] of pockets) {
          const ux = px - b.x, uy = py - b.y, ud = Math.hypot(ux, uy), gx = b.x - ux / ud * 22, gy = b.y - uy / ud * 22;
          const cx = gx - cue.x, cy = gy - cue.y, cd = Math.hypot(cx, cy), cut = Math.acos(clamp((cx * ux + cy * uy) / (cd * ud), -1, 1));
          if (cut > 1.25) continue;
          const t = clamp(.35 + (cd + ud) / 1400 + cut * .2, .3, 1);
          out.push({ a: Math.atan2(cy, cx), t, geo: cut * 2 + (cd + ud) / 400 });
        }
      }
      return out.sort((x, y) => x.geo - y.geo);
    };
    const shoot = r => { const v = pw(r.t); cue.vx = r.nx * v; cue.vy = r.ny * v; moving = true; potted = []; msg = ''; sl.launch(cue, r, '#ffffff', true); sl.follow(cue, '#ffffff'); A.sfx('hit'); };
    return {
      ai(B) {
        if (moving || sl.ap || B.p !== p) return false;
        let cs = candidates(p); let best = null;
        if (!cs.length) { const own = balls.filter(b => b.c === p); const tgt = own.length ? own.reduce((m, b) => dist(cue.x, cue.y, b.x, b.y) < dist(cue.x, cue.y, m.x, m.y) ? b : m) : balls[1]; cs = [{ a: Math.atan2(tgt.y - cue.y, tgt.x - cue.x), t: .6 }]; }
        if (B.lvl === 0) best = cs[Math.min(cs.length - 1, rint(0, 2))];
        else {
          let bv = -Infinity; const pool = cs.slice(0, B.k(0, 8, 14));
          for (const c of pool) for (const dt of B.lvl === 2 ? [-.012, 0, .012] : [0]) for (const tt of [c.t, Math.min(1, c.t + .15)]) { const v = simShot(c.a + dt, tt, p); if (v > bv) { bv = v; best = { a: c.a + dt, t: tt }; } }
          if (bv < 50 && B.lvl === 2) for (let i = 0; i < 25; i++) { const a = rand(Math.PI * 2), t = rand(.4, 1), v = simShot(a, t, p); if (v > bv) { bv = v; best = { a, t }; } }
        }
        const a = best.a + gauss() * B.k(.05, .012, .003), t = clamp(best.t * (1 + gauss() * B.k(.12, .04, .01)), .15, 1);
        sl.auto(Math.cos(a), Math.sin(a), t, .8);
        return true;
      },
      down(x, y) { if (!moving && !sl.ap) sl.down(x, y); },
      move(x, y) { if (!sl.ap) sl.move(x, y); }, cancel() { if (!sl.ap) sl.cancel(); },
      up() { if (moving || sl.ap) return; const r = sl.up(); if (r) shoot(r); },
      update(dt) {
        if (sl.ap) { const r = sl.step(dt); if (r) shoot(r); return; }
        if (!moving) return;
        for (let s = 0; s < 6; s++) step(balls, dt / 6, s === 0, potted);
        if (cue.gone) { cue.out = true; cue.x = -999; }
        for (let i = balls.length - 1; i > 0; i--) if (balls[i].gone) balls.splice(i, 1);
        if (balls.every(b => b.gone || Math.hypot(b.vx, b.vy) < 2)) {
          balls.forEach(b => b.vx = b.vy = 0); moving = false;
          potted.forEach(c => { if (c >= 0) pot[c]++; });
          if (pot[0] >= 5 || pot[1] >= 5) return A.end(pot[0] >= 5 ? 0 : 1, `${pot[0]} – ${pot[1]}`);
          if (cue.out) { cue.out = cue.gone = false; cue.x = 220; cue.y = 250; while (balls.some(b => b !== cue && dist(b.x, b.y, cue.x, cue.y) < 24)) cue.y += 24; msg = 'Scratch!'; p = 1 - p; }
          else if (potted.includes(p)) msg = 'Nice — shoot again'; else p = 1 - p;
          A.turn(p);
        }
      },
      draw(c) {
        D.rr(c, 30, 30, 740, 440, 40, '#5a3b26'); D.rr(c, L, T, R - L, B - T, 8, '#1f6e4c');
        pockets.forEach(([x, y]) => D.circ(c, x, y, 21, '#0a0a0a'));
        D.line(c, 220, T, 220, B, '#ffffff22', 2);
        for (const b of balls) if (!b.out) { D.circ(c, b.x, b.y + 2, b.r, '#0005'); D.circ(c, b.x, b.y, b.r, b.c < 0 ? '#f5f5f5' : COL[b.c]); D.circ(c, b.x - 3, b.y - 3, 3, '#fff8'); }
        for (let q = 0; q < 2; q++) { D.text(c, `${A.names[q]}`, q ? 740 : 60, 15, 17, COL[q], q ? 'right' : 'left'); for (let i = 0; i < 5; i++) D.circ(c, (q ? 740 - 84 : 60 + 84) + (q ? -1 : 1) * i * 19, 15, 7, i < pot[q] ? COL[q] : LINE); }
        D.text(c, msg || (A.ended ? '' : `${A.names[p]}'s shot`), 400, 486, 18, msg ? ACC : COL[p]);
        sl.draw(c, !moving && !A.ended ? cue : null, COL[p], { reach: 420, stick: true });
      }
    };
  }
});

/* ---------- Sumo ---------- */
reg({
  id: 'sumo', rot: true, name: 'Sumo', cat: 'Sports', icon: '🤼', type: 'real', pad: 'dpad a', btn: { a: 'Dash' },
  desc: 'Shove your rival out of the ring.', help: 'Push your opponent out of the ring. Dash (short cooldown) to body-slam. First to 3 rounds.',
  make(A) {
    const sc = [0, 0], C = [400, 265], R = 200; let P, msg = '', mt = 0, pause = 0;
    const reset = () => { P = [{ x: 260, y: 265, vx: 0, vy: 0, r: 34, im: 1, cd: 0 }, { x: 540, y: 265, vx: 0, vy: 0, r: 34, im: 1, cd: 0 }]; };
    reset();
    return {
      ai(dt, B) {
        const p = B.p, Q = P[p], O = P[1 - p], dC = dist(Q.x, Q.y, ...C), oC = dist(O.x, O.y, ...C) || 1;
        let tx, ty;
        if (dC > R - B.k(45, 62, 78)) { tx = C[0]; ty = C[1]; }
        else { const ux = (O.x - C[0]) / oC, uy = (O.y - C[1]) / oC; tx = O.x - ux * B.k(0, 14, 24); ty = O.y - uy * B.k(0, 14, 24); }
        const ov = Math.hypot(O.vx, O.vy);
        if (B.lvl > 0 && ov > 380 && dC > R - 110) { const sx = -(O.vy) / ov, sy = O.vx / ov; tx = Q.x + sx * 80; ty = Q.y + sy * 80; if (dist(tx, ty, ...C) > dist(Q.x - sx * 80, Q.y - sy * 80, ...C)) { tx = Q.x - sx * 80; ty = Q.y - sy * 80; } }
        B.toward(Q.x, Q.y, tx, ty, B.k(.7, .88, 1), 8);
        const d = dist(Q.x, Q.y, O.x, O.y);
        if (Q.cd <= 0 && d < B.k(85, 105, 118) && dC < R - 40 && B.chance(B.k(.03, .09, .25))) B.press('a');
      },
      update(dt) {
        mt -= dt; if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) {
          const Q = P[p], [dx, dy] = dir(A, p), O = P[1 - p]; Q.cd -= dt;
          Q.vx += dx * 950 * dt; Q.vy += dy * 950 * dt;
          if (A.hit(p, 'a') && Q.cd <= 0) {
            const m = Math.hypot(dx, dy); let ux = dx / m, uy = dy / m;
            if (m < .2) { const d = dist(Q.x, Q.y, O.x, O.y) || 1; ux = (O.x - Q.x) / d; uy = (O.y - Q.y) / d; }
            Q.vx += ux * 520; Q.vy += uy * 520; Q.cd = 1; A.sfx('shoot');
          }
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
        D.circ(c, ...C, R + 26, '#c9a46a'); D.circ(c, ...C, R, '#e8cf9c', '#fff', 7);
        c.lineCap = 'round'; D.line(c, 360, 240, 360, 290, '#5a3b26', 8); D.line(c, 440, 240, 440, 290, '#5a3b26', 8); c.lineCap = 'butt';
        bigScore(c, A, sc, 32, 36);
        for (let p = 0; p < 2; p++) { const Q = P[p]; D.circ(c, Q.x, Q.y + 4, Q.r, '#0004'); D.circ(c, Q.x, Q.y, Q.r, COL[p], Q.cd > .7 ? '#fff' : null, 5); D.circ(c, Q.x, Q.y, Q.r * .45, COLD[p]); }
        msgFade(c, A, msg, mt);
      }
    };
  }
});

/* ---------- Racer ---------- */
reg({
  id: 'racer', rot: true, name: 'Racer', cat: 'Sports', icon: '🏎️', type: 'real', pad: 'dpad', w: 800, h: 520,
  touchHint: 'point where you want to drive',
  desc: '3 laps. Grass is slow.', help: 'Keys: up = gas, down = brake, left/right = steer. Touch: drag in the direction you want to drive. Stay on the track — grass is slow. First to finish 3 laps wins.',
  make(A) {
    const CX = 400, CY = 260, SEG = 160, RC = 165, HW = 62, LAPS = 3;
    const cars = [0, 1].map(p => ({ x: 380, y: CY - RC + (p ? 22 : -22), a: 0, v: 0, r: 12, im: 1, vx: 0, vy: 0, q: 3, cnt: 0 }));
    const dSeg = (x, y) => { const px = clamp(x, CX - SEG, CX + SEG); return dist(x, y, px, CY); };
    const quad = (x, y) => Math.floor(((Math.atan2(y - CY, x - CX) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2));
    // racing line: centerline samples, clockwise
    const WP = [];
    for (let i = 0; i < 40; i++) WP.push([CX - SEG + i * SEG * 2 / 40, CY - RC]);
    for (let i = 0; i < 40; i++) { const a = -Math.PI / 2 + i * Math.PI / 40; WP.push([CX + SEG + Math.cos(a) * RC, CY + Math.sin(a) * RC]); }
    for (let i = 0; i < 40; i++) WP.push([CX + SEG - i * SEG * 2 / 40, CY + RC]);
    for (let i = 0; i < 40; i++) { const a = Math.PI / 2 + i * Math.PI / 40; WP.push([CX - SEG + Math.cos(a) * RC, CY + Math.sin(a) * RC]); }
    return {
      ai(dt, B) {
        const p = B.p, C = cars[p]; let bi = 0, bd = Infinity;
        WP.forEach(([x, y], i) => { const d = dist(x, y, C.x, C.y); if (d < bd) { bd = d; bi = i; } });
        const look = B.k(9, 11, 13), [wx, wy] = WP[(bi + look) % WP.length], curve = (bi % 80) >= 40;
        // cut toward the inside on curves (hard)
        const inX = wx + (CX + (wx > CX ? SEG : -SEG) - wx) * (curve ? B.k(0, .12, .22) : 0), inY = wy + (CY - wy) * (curve ? B.k(0, .12, .22) : 0);
        const tgt = Math.atan2(inY - C.y, inX - C.x), da = Math.abs(angDiff(C.a, tgt));
        const sp = B.k(.8, .92, 1) * (da > .9 ? .55 : 1);
        B.go(Math.cos(tgt) * sp, Math.sin(tgt) * sp);
      },
      update(dt) {
        for (let p = 0; p < 2; p++) {
          const C = cars[p], on = Math.abs(dSeg(C.x, C.y) - RC) < HW, max = on ? 330 : 120;
          let g, steer;
          if (A.analog(p)) {
            const [x, y] = A.axis(p), m = Math.hypot(x, y);
            if (m > .15) { const da = angDiff(C.a, Math.atan2(y, x)); steer = clamp(da * 2.4, -1, 1); g = Math.abs(da) > 2.3 ? -.5 : m * (Math.abs(da) > 1.4 ? .5 : 1); }
            else { steer = 0; g = 0; }
          } else { g = A.get(p, 'u') - A.get(p, 'd') * .8; steer = A.get(p, 'r') - A.get(p, 'l'); }
          C.v += g * 440 * dt; C.v *= Math.pow(on ? .6 : .2, dt); C.v = clamp(C.v, -120, max);
          C.a += steer * dt * 3.3 * clamp(Math.abs(C.v) / 140, 0, 1) * Math.sign(C.v || 1);
          C.vx = Math.cos(C.a) * C.v; C.vy = Math.sin(C.a) * C.v; C.x = clamp(C.x + C.vx * dt, 10, 790); C.y = clamp(C.y + C.vy * dt, 10, 510);
          const q = quad(C.x, C.y); if (q === (C.q + 1) % 4) { C.q = q; C.cnt++; if (q === 0 && C.cnt > 1) A.sfx('score'); } else if (q === (C.q + 3) % 4 && C.cnt > 0) { C.q = q; C.cnt--; }
          if (C.cnt >= 1 + LAPS * 4) return A.end(p, 'Checkered flag!');
        }
        if (collide(cars[0], cars[1], .4)) { for (const C of cars) C.v = (C.vx * Math.cos(C.a) + C.vy * Math.sin(C.a)); A.sfx('bounce'); }
      },
      draw(c) {
        D.rect(c, 0, 0, 800, 520, '#2b6b3c');
        const cap = (r, f) => { c.beginPath(); c.arc(CX - SEG, CY, r, Math.PI / 2, Math.PI * 1.5); c.arc(CX + SEG, CY, r, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fillStyle = f; c.fill(); };
        cap(RC + HW + 7, '#e9ecff'); cap(RC + HW, '#3a3d52'); cap(RC - HW, '#e9ecff'); cap(RC - HW - 7, '#2b6b3c');
        for (let i = 0; i < 8; i++) D.rect(c, 396, CY - RC - HW + i * (HW * 2 / 8), 8, HW * 2 / 8, i % 2 ? '#fff' : '#111');
        for (let p = 0; p < 2; p++) {
          const C = cars[p], lap = Math.min(LAPS, Math.max(1, Math.floor((C.cnt - 1) / 4) + 1));
          D.text(c, `${A.names[p]} · lap ${C.cnt < 1 ? 1 : lap}/${LAPS}`, 400, CY - 22 + p * 44, 26, COL[p]);
          c.save(); c.translate(C.x, C.y); c.rotate(C.a); D.rr(c, -16, -9, 32, 18, 7, COL[p]); D.rr(c, 4, -7, 7, 14, 3, '#0008'); c.restore();
        }
      }
    };
  }
});
