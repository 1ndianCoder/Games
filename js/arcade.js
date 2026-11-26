'use strict';
/* ================= ARCADE ================= */

function dirQueue() {
  return {
    q: [], push(d) { if (this.q.length < 2) this.q.push(d); },
    next(cur) { while (this.q.length) { const d = this.q.shift(); if (d[0] !== -cur[0] || d[1] !== -cur[1]) return d; } return cur; }
  };
}
const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
const dirKey = d => d[0] > 0 ? 'r' : d[0] < 0 ? 'l' : d[1] > 0 ? 'd' : 'u';
function readDirs(A, p, Q) { for (const k in DIRS) if (A.hit(p, k)) Q.push(DIRS[k]); }
/* capped flood fill on a grid: counts free cells reachable from (x,y) */
function flood(free, x, y, cap, W, H) {
  const seen = new Uint8Array(W * H), st = [x + y * W]; seen[x + y * W] = 1; let n = 0;
  while (st.length && n < cap) { const k = st.pop(), cx = k % W, cy = (k / W) | 0; n++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = cx + dx, b = cy + dy; if (a >= 0 && b >= 0 && a < W && b < H && !seen[a + b * W] && free(a, b)) { seen[a + b * W] = 1; st.push(a + b * W); } } }
  return n;
}

/* ---------- Light Cycles ---------- */
reg({
  id: 'cycles', rot: true, name: 'Light Cycles', cat: 'Arcade', icon: '🏍️', type: 'real', pad: 'dpad', touchHint: 'swipe to turn',
  desc: 'Leave a wall. Box them in.', help: 'You never stop moving and leave a solid trail. Turn to trap your opponent — crash into any wall or trail and you lose the round. First to 3.',
  make(A) {
    const CW = 80, CH = 50, S = 10, sc = [0, 0]; let g, P, t, msg = '', pause = 0, n = 0;
    const reset = () => { g = grid2(CW, CH, -1); P = [{ x: 10, y: 25, d: [1, 0], Q: dirQueue() }, { x: 69, y: 24, d: [-1, 0], Q: dirQueue() }]; P.forEach((q, i) => g[q.y][q.x] = i); t = 0; };
    reset();
    const free = (x, y) => x >= 0 && y >= 0 && x < CW && y < CH && g[y][x] < 0;
    return {
      ai(dt, B) {
        if (pause > 0 || B.mem.n === n) return; B.mem.n = n;
        if (B.lvl === 0 && B.chance(.25)) return;                // easy reacts late sometimes
        const p = B.p, q = P[p], o = P[1 - p], on = [o.x + o.d[0], o.y + o.d[1]];
        const opts = [q.d, [q.d[1], -q.d[0]], [-q.d[1], q.d[0]]];
        let best = q.d, bs = -Infinity;
        for (const d of opts) {
          const x = q.x + d[0], y = q.y + d[1]; if (!free(x, y)) continue;
          let s = B.lvl ? flood(free, x, y, B.k(0, 350, 1400), CW, CH) : (() => { let k = 0; while (k < 12 && free(x + d[0] * k, y + d[1] * k)) k++; return k * 30; })();
          if (x === on[0] && y === on[1]) s -= B.k(30, 500, 3000);
          if (B.lvl === 2) s -= dist(x, y, o.x, o.y) * .6;          // squeeze the opponent
          if (d === q.d) s += 4;
          s += rand(0, B.k(40, 6, 1));
          if (s > bs) { bs = s; best = d; }
        }
        if (best !== q.d) B.dir(dirKey(best)); else B.dir(null);
      },
      update(dt) {
        if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) readDirs(A, p, P[p].Q);
        t += dt; const step = .045;
        while (t >= step) {
          t -= step; n++;
          const dead = [false, false];
          P.forEach(q => { q.d = q.Q.next(q.d); q.x += q.d[0]; q.y += q.d[1]; });
          P.forEach((q, i) => { if (q.x < 0 || q.y < 0 || q.x >= CW || q.y >= CH || g[q.y][q.x] >= 0) dead[i] = true; });
          if (P[0].x === P[1].x && P[0].y === P[1].y) dead[0] = dead[1] = true;
          P.forEach((q, i) => { if (!dead[i]) g[q.y][q.x] = i; });
          if (dead[0] || dead[1]) {
            A.sfx('boom'); A.shake(6); pause = 1.4;
            if (dead[0] && dead[1]) { msg = 'Both crashed!'; return; }
            const w = dead[0] ? 1 : 0; sc[w]++; msg = `${A.names[w]} takes it`; if (sc[w] >= 3) A.end(w, `${sc[0]} – ${sc[1]}`); return;
          }
        }
      },
      draw(c) {
        for (let x = 0; x <= 800; x += 40) D.line(c, x, 0, x, 500, '#1d1d30', 1);
        for (let y = 0; y <= 500; y += 40) D.line(c, 0, y, 800, y, '#1d1d30', 1);
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (g[y][x] >= 0) D.rr(c, x * S + 1, y * S + 1, S - 2, S - 2, 3, COL[g[y][x]]);
        P.forEach((q, i) => { D.glow(c, COL[i], 22); D.rr(c, q.x * S - 3, q.y * S - 3, S + 6, S + 6, 5, '#fff'); D.noglow(c); });
        bigScore(c, A, sc, 26, 30);
        if (pause > 0) D.text(c, msg, 400, 250, 48, ACC, 'center', 'middle', 900);
      }
    };
  }
});

/* ---------- Snake Duel ---------- */
reg({
  id: 'snake', rot: true, name: 'Snake Duel', cat: 'Arcade', icon: '🐍', type: 'real', pad: 'dpad', touchHint: 'swipe to turn',
  desc: 'Eat, grow, don\'t crash.', help: 'Eat fruit to grow. Crash into a wall, yourself or the other snake and you lose. Head-on? Longer snake wins. Reach length 25 to win outright.',
  make(A) {
    const CW = 40, CH = 25, S = 20; const P = [{ b: [[8, 12], [7, 12], [6, 12], [5, 12]], d: [1, 0], Q: dirQueue(), grow: 0 }, { b: [[31, 12], [32, 12], [33, 12], [34, 12]], d: [-1, 0], Q: dirQueue(), grow: 0 }];
    const food = []; let t = 0, n = 0;
    const occ = (x, y) => P.some(s => s.b.some(([a, b]) => a === x && b === y)) || food.some(f => f[0] === x && f[1] === y);
    const addFood = () => { for (let k = 0; k < 100; k++) { const x = rint(1, CW - 2), y = rint(1, CH - 2); if (!occ(x, y)) { food.push([x, y]); return; } } };
    for (let i = 0; i < 3; i++) addFood();
    return {
      ai(dt, B) {
        if (B.mem.n === n) return; B.mem.n = n;
        if (B.lvl === 0 && B.chance(.2)) return;
        const p = B.p, s = P[p], o = P[1 - p], [hx, hy] = s.b[0];
        const body = new Set(); P.forEach(q => q.b.forEach(([a, b], k) => { if (k < q.b.length - 1) body.add(a + b * CW); }));
        const free = (x, y) => x >= 0 && y >= 0 && x < CW && y < CH && !body.has(x + y * CW);
        const foodDist = (x, y) => {
          if (B.lvl === 0) return Math.min(...food.map(([a, b]) => Math.abs(a - x) + Math.abs(b - y)));
          const seen = new Set([x + y * CW]), qu = [[x, y, 0]];
          while (qu.length) { const [a, b, d] = qu.shift(); if (food.some(f => f[0] === a && f[1] === b)) return d; if (d > 60) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = a + dx, v = b + dy; if (free(u, v) && !seen.has(u + v * CW)) { seen.add(u + v * CW); qu.push([u, v, d + 1]); } } }
          return 99;
        };
        const ohx = o.b[0][0] + o.d[0], ohy = o.b[0][1] + o.d[1];
        let best = s.d, bs = -Infinity;
        for (const d of [s.d, [s.d[1], -s.d[0]], [-s.d[1], s.d[0]]]) {
          const x = hx + d[0], y = hy + d[1]; if (!free(x, y)) continue;
          let v = -foodDist(x, y) * 10;
          if (B.lvl > 0) { const sp = flood(free, x, y, s.b.length * 3, CW, CH); if (sp < s.b.length + 2) v -= 5000 - sp * 10; }
          if (Math.abs(x - ohx) + Math.abs(y - ohy) <= 1 && s.b.length <= o.b.length) v -= B.k(20, 800, 3000);
          v += rand(0, B.k(18, 4, 1));
          if (v > bs) { bs = v; best = d; }
        }
        if (best !== s.d) B.dir(dirKey(best)); else B.dir(null);
      },
      update(dt) {
        for (let p = 0; p < 2; p++) readDirs(A, p, P[p].Q);
        t += dt; const step = Math.max(.065, .11 - n * .0008);
        while (t >= step) {
          t -= step; n++;
          const heads = P.map(s => { s.d = s.Q.next(s.d); return [s.b[0][0] + s.d[0], s.b[0][1] + s.d[1]]; });
          P.forEach((s, i) => { const [x, y] = heads[i]; const fi = food.findIndex(f => f[0] === x && f[1] === y); if (fi >= 0) { food.splice(fi, 1); s.grow += 2; A.sfx('coin'); addFood(); } });
          P.forEach((s, i) => { s.b.unshift(heads[i]); if (s.grow > 0) s.grow--; else s.b.pop(); });
          const dead = P.map((s, i) => { const [x, y] = s.b[0]; if (x < 0 || y < 0 || x >= CW || y >= CH) return true; return P.some((o, j) => o.b.some(([a, b], k) => (j !== i || k > 0) && a === x && b === y)); });
          if (heads[0][0] === heads[1][0] && heads[0][1] === heads[1][1]) { const l0 = P[0].b.length, l1 = P[1].b.length; dead[0] = l0 <= l1; dead[1] = l1 <= l0; }
          if (dead[0] || dead[1]) { A.sfx('boom'); A.shake(6); return A.end(dead[0] && dead[1] ? -1 : dead[0] ? 1 : 0, 'Crash!'); }
          for (let i = 0; i < 2; i++) if (P[i].b.length >= 25) return A.end(i, 'Longest snake!');
        }
      },
      draw(c) {
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if ((x + y) % 2) D.rect(c, x * S, y * S, S, S, '#191928');
        food.forEach(([x, y]) => D.glyph(c, 'diamond', x * S + S / 2, y * S + S / 2, 8, ACC));
        P.forEach((s, i) => s.b.forEach(([x, y], k) => D.rr(c, x * S + 1, y * S + 1, S - 2, S - 2, k ? 7 : 9, k ? COL[i] + (k % 2 ? 'cc' : 'ff') : '#fff', k ? null : COL[i], 3)));
        D.text(c, `${P[0].b.length}`, 30, 22, 22, COL[0]); D.text(c, `${P[1].b.length}`, 770, 22, 22, COL[1]);
      }
    };
  }
});

/* ---------- Tanks ---------- */
reg({
  id: 'tanks', rot: true, name: 'Tank Duel', cat: 'Arcade', icon: '🛡️', type: 'real', pad: 'dpad a', btn: { a: 'Fire' },
  desc: 'Ricochet shots in a maze.', help: 'Keys: up/down drive, left/right rotate, action fires. Touch: drag where you want to go, tap to fire. Shells bounce off walls — and can hit you too! First to 5.',
  make(A) {
    const W = [[150, 100, 20, 130], [630, 270, 20, 130], [300, 240, 200, 20], [390, 50, 20, 110], [390, 340, 20, 110], [130, 380, 140, 20], [530, 100, 140, 20]];
    const sc = [0, 0]; let T, bul = [], pause = 0, msg = '';
    const reset = () => { T = [{ x: 70, y: 250, a: 0, r: 17, cd: 0 }, { x: 730, y: 250, a: Math.PI, r: 17, cd: 0 }]; bul = []; };
    reset();
    const walls = o => { let h = false; for (const w of W) h = rectBounce(o, ...w, 1) || h; return h; };
    const los = (x1, y1, x2, y2) => !W.some(w => segHitsRect(x1, y1, x2, y2, ...w, 5));
    // coarse grid for pathing
    const GC = 20, GR = 13, GS = 40, blocked = new Uint8Array(GC * GR);
    for (let j = 0; j < GR; j++) for (let i = 0; i < GC; i++) { const cx = i * GS + 20, cy = j * GS + 20; blocked[i + j * GC] = (cy > 484 || W.some(([x, y, w, h]) => cx > x - 20 && cx < x + w + 20 && cy > y - 20 && cy < y + h + 20)) ? 1 : 0; }
    const cell = (x, y) => [clamp(Math.floor(x / GS), 0, GC - 1), clamp(Math.floor(y / GS), 0, GR - 1)];
    const field = (tx, ty) => {
      const d = new Int16Array(GC * GR).fill(-1), [a, b] = cell(tx, ty), q = [a + b * GC]; d[q[0]] = 0;
      while (q.length) { const k = q.shift(), x = k % GC, y = (k / GC) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = x + dx, v = y + dy, kk = u + v * GC; if (u >= 0 && v >= 0 && u < GC && v < GR && !blocked[kk] && d[kk] < 0) { d[kk] = d[k] + 1; q.push(kk); } } }
      return d;
    };
    return {
      ai(dt, B) {
        if (pause > 0) return B.stop();
        const p = B.p, me = T[p], E = T[1 - p];
        // dodge incoming shells
        if (B.lvl > 0) for (const b of bul) {
          const rx = me.x - b.x, ry = me.y - b.y, sp2 = b.vx * b.vx + b.vy * b.vy, tc = (rx * b.vx + ry * b.vy) / sp2;
          if (tc > 0 && tc < B.k(0, .35, .6) && (b.p !== p || b.age > .15)) {
            const cx = b.x + b.vx * tc - me.x, cy = b.y + b.vy * tc - me.y;
            if (Math.hypot(cx, cy) < 28) { const m = Math.hypot(cx, cy) || 1; B.go(-cx / m, -cy / m); return; }
          }
        }
        let aim = null;
        if (los(me.x, me.y, E.x, E.y)) { const tl = dist(me.x, me.y, E.x, E.y) / 320 * B.k(0, .3, .6); aim = Math.atan2(E.y - me.y, E.x - me.x) + gauss() * B.k(.12, .05, .015); B.mem.lead = tl; }
        else if (B.lvl === 2) {
          for (const [ax, val] of [['x', 4], ['x', 796], ['y', 4], ['y', 496]]) {
            const mx = ax === 'x' ? 2 * val - E.x : E.x, my = ax === 'y' ? 2 * val - E.y : E.y, k = ax === 'x' ? (val - me.x) / (mx - me.x) : (val - me.y) / (my - me.y);
            if (!(k > 0 && k < 1)) continue; const bx = me.x + (mx - me.x) * k, by = me.y + (my - me.y) * k;
            if (los(me.x, me.y, bx, by) && los(bx, by, E.x, E.y)) { aim = Math.atan2(my - me.y, mx - me.x); break; }
          }
        }
        if (aim !== null) {
          const da = angDiff(me.a, aim), far = dist(me.x, me.y, E.x, E.y) > 260;
          B.go(Math.cos(aim) * (far ? .7 : .14), Math.sin(aim) * (far ? .7 : .14));
          if (Math.abs(da) < B.k(.25, .1, .05) && B.every('fire', B.k(.9, .45, .28))) B.press('a');
          return;
        }
        if (B.every('path', .35)) B.mem.f = field(E.x, E.y);
        const f = B.mem.f; if (!f) return;
        const [ci, cj] = cell(me.x, me.y); let bk = null, bd = f[ci + cj * GC] < 0 ? 999 : f[ci + cj * GC];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const u = ci + dx, v = cj + dy; if (u < 0 || v < 0 || u >= GC || v >= GR) continue; const val = f[u + v * GC]; if (val >= 0 && val < bd && (!dx || !dy || (!blocked[ci + dx + cj * GC] && !blocked[ci + (cj + dy) * GC]))) { bd = val; bk = [u, v]; } }
        if (bk) B.toward(me.x, me.y, bk[0] * GS + 20, bk[1] * GS + 20, B.k(.7, .9, 1), 4); else B.toward(me.x, me.y, E.x, E.y, .6);
      },
      update(dt) {
        if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) {
          const t = T[p]; t.cd -= dt;
          let mv;
          if (A.analog(p)) {
            const [x, y] = A.axis(p), m = Math.hypot(x, y);
            if (m > .08) { const da = angDiff(t.a, Math.atan2(y, x)); t.a += clamp(da, -3.4 * dt, 3.4 * dt); mv = m * 160 * Math.max(0, Math.cos(da)) * dt; } else mv = 0;
          } else { t.a += (A.get(p, 'r') - A.get(p, 'l')) * 3 * dt; mv = (A.get(p, 'u') - A.get(p, 'd') * .7) * 155 * dt; }
          t.x = clamp(t.x + Math.cos(t.a) * mv, 17, 783); t.y = clamp(t.y + Math.sin(t.a) * mv, 17, 483);
          const o = { x: t.x, y: t.y, r: t.r, vx: 0, vy: 0 }; walls(o); t.x = o.x; t.y = o.y;
          if (A.hit(p, 'a') && t.cd <= 0 && bul.filter(b => b.p === p).length < 4) { bul.push({ p, x: t.x + Math.cos(t.a) * 26, y: t.y + Math.sin(t.a) * 26, vx: Math.cos(t.a) * 320, vy: Math.sin(t.a) * 320, r: 5, life: 6, age: 0 }); t.cd = .25; A.sfx('shoot'); }
        }
        for (let i = bul.length - 1; i >= 0; i--) {
          const b = bul[i]; b.life -= dt; b.age += dt;
          for (let s = 0; s < 3; s++) {
            b.x += b.vx * dt / 3; b.y += b.vy * dt / 3;
            if (b.x < 4 || b.x > 796) { b.vx *= -1; b.x = clamp(b.x, 4, 796); } if (b.y < 4 || b.y > 496) { b.vy *= -1; b.y = clamp(b.y, 4, 496); }
            if (walls(b)) A.sfx('tick');
          }
          if (b.life <= 0) { bul.splice(i, 1); continue; }
          for (let p = 0; p < 2; p++) {
            if (b.p === p && b.age < .15) continue;
            if (dist(b.x, b.y, T[p].x, T[p].y) < T[p].r + 4) {
              const w = 1 - p; sc[w]++; msg = b.p === p ? `${A.names[p]} hit themselves!` : `${A.names[w]} scores`; pause = 1.3; A.sfx('boom'); A.shake(8); bul = [];
              if (sc[w] >= 5) A.end(w, `${sc[0]} – ${sc[1]}`); return;
            }
          }
        }
      },
      draw(c) {
        for (const w of W) D.rr(c, ...w, 10, '#3b3d6a');
        bigScore(c, A, sc, 24, 28);
        T.forEach((t, p) => { c.save(); c.translate(t.x, t.y); c.rotate(t.a); D.rr(c, -18, -15, 36, 30, 10, COL[p]); D.rr(c, -18, -18, 36, 7, 4, COLD[p]); D.rr(c, -18, 11, 36, 7, 4, COLD[p]); D.circ(c, 0, 0, 9, COLD[p]); D.rr(c, 0, -4, 27, 8, 4, COLD[p]); c.restore(); });
        bul.forEach(b => { D.glow(c, COL[b.p], 12); D.circ(c, b.x, b.y, b.r, '#fff'); D.noglow(c); });
        if (pause > 0) D.text(c, msg, 400, 250, 40, ACC, 'center', 'middle', 900);
      }
    };
  }
});

/* ---------- Space Duel ---------- */
reg({
  id: 'space', rot: true, name: 'Star Duel', cat: 'Arcade', icon: '🚀', type: 'real', pad: 'dpad a', btn: { a: 'Fire' },
  desc: 'Dogfight around a deadly star.', help: 'Keys: left/right rotate, up thrusts, action fires. Touch: drag to point your ship (push far to thrust), tap to fire. The star pulls you in. Screen edges wrap. First to 5.',
  make(A) {
    const sc = [0, 0], SX = 400, SY = 250; let S, bul, pause = 0, msg = '', t = 0;
    const reset = () => { S = [{ x: 120, y: 250, a: -Math.PI / 2, vx: 0, vy: 90, cd: 0, th: 0 }, { x: 680, y: 250, a: Math.PI / 2, vx: 0, vy: -90, cd: 0, th: 0 }]; bul = []; };
    reset();
    const stars = Array.from({ length: 80 }, () => [rand(800), rand(500), rand(.3, 1)]);
    const kill = (p, m) => { const w = 1 - p; sc[w]++; msg = m; pause = 1.4; A.sfx('boom'); A.shake(8); if (sc[w] >= 5) A.end(w, `${sc[0]} – ${sc[1]}`); };
    const wrapD = (a, b, L) => { let d = b - a; if (d > L / 2) d -= L; if (d < -L / 2) d += L; return d; };
    return {
      ai(dt, B) {
        if (pause > 0) return B.stop();
        const p = B.p, s = S[p], E = S[1 - p];
        // look ahead for the star
        let fx = s.x, fy = s.y, vx = s.vx, vy = s.vy, danger = false;
        for (let i = 0; i < B.k(20, 40, 60); i++) { const h = 1 / 60, d = Math.max(30, dist(fx, fy, SX, SY)), g = Math.min(400, 1.5e6 / (d * d)); vx += (SX - fx) / d * g * h; vy += (SY - fy) / d * g * h; fx += vx * h; fy += vy * h; if (dist(fx, fy, SX, SY) < 70) { danger = true; break; } }
        if (danger || dist(s.x, s.y, SX, SY) < 110) {
          const ax = s.x - SX, ay = s.y - SY, m = Math.hypot(ax, ay) || 1, tx = -ay / m * (vx * -ay + vy * ax > 0 ? 1 : -1);
          const ex = ax / m * .8 + tx * .6, ey = ay / m * .8 + (ax / m) * (vx * -ay + vy * ax > 0 ? 1 : -1) * .6;
          B.go(ex, ey); return;
        }
        const dx = wrapD(s.x, E.x, 800), dy = wrapD(s.y, E.y, 500), d = Math.hypot(dx, dy), tl = d / 440 * B.k(0, .7, 1);
        const aim = Math.atan2(dy + (E.vy - s.vy) * tl, dx + (E.vx - s.vx) * tl) + gauss() * B.k(.18, .07, .02);
        const da = angDiff(s.a, aim), wantThrust = d > B.k(320, 280, 240) && Math.abs(da) < .5 && Math.hypot(s.vx, s.vy) < 260;
        const m = wantThrust ? .95 : .35; B.go(Math.cos(aim) * m, Math.sin(aim) * m);
        if (Math.abs(da) < B.k(.3, .14, .07) && d < 420 && B.every('fire', B.k(.8, .4, .3))) B.press('a');
      },
      update(dt) {
        t += dt; if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) {
          const s = S[p]; s.cd -= dt;
          if (A.analog(p)) {
            const [x, y] = A.axis(p), m = Math.hypot(x, y);
            if (m > .1) { const da = angDiff(s.a, Math.atan2(y, x)); s.a += clamp(da, -4.2 * dt, 4.2 * dt); }
            s.th = m > .6 ? 1 : 0;
          } else { s.a += (A.get(p, 'r') - A.get(p, 'l')) * 4 * dt; s.th = A.get(p, 'u'); }
          if (s.th) { s.vx += Math.cos(s.a) * 260 * dt; s.vy += Math.sin(s.a) * 260 * dt; }
          const d = Math.max(30, dist(s.x, s.y, SX, SY)), g = Math.min(400, 1.5e6 / (d * d));
          s.vx += (SX - s.x) / d * g * dt; s.vy += (SY - s.y) / d * g * dt;
          const sp = Math.hypot(s.vx, s.vy); if (sp > 380) { s.vx *= 380 / sp; s.vy *= 380 / sp; }
          s.x = (s.x + s.vx * dt + 800) % 800; s.y = (s.y + s.vy * dt + 500) % 500;
          if (A.hit(p, 'a') && s.cd <= 0) { bul.push({ p, x: s.x + Math.cos(s.a) * 18, y: s.y + Math.sin(s.a) * 18, vx: s.vx + Math.cos(s.a) * 420, vy: s.vy + Math.sin(s.a) * 420, life: 1.5 }); s.cd = .28; A.sfx('shoot'); }
          if (dist(s.x, s.y, SX, SY) < 30) return kill(p, `${A.names[p]} burned up!`);
        }
        if (dist(S[0].x, S[0].y, S[1].x, S[1].y) < 26) { pause = 1.4; msg = 'Collision!'; A.sfx('boom'); return; }
        for (let i = bul.length - 1; i >= 0; i--) {
          const b = bul[i]; b.life -= dt; b.x = (b.x + b.vx * dt + 800) % 800; b.y = (b.y + b.vy * dt + 500) % 500;
          if (b.life <= 0 || dist(b.x, b.y, SX, SY) < 24) { bul.splice(i, 1); continue; }
          const o = 1 - b.p; if (dist(b.x, b.y, S[o].x, S[o].y) < 16) return kill(o, `${A.names[b.p]} scores`);
        }
      },
      draw(c) {
        stars.forEach(([x, y, a]) => { c.globalAlpha = a; D.circ(c, x, y, 1.3, '#fff'); }); c.globalAlpha = 1;
        D.glow(c, '#ffb347', 44 + Math.sin(t * 4) * 8); D.circ(c, SX, SY, 25, '#ffd166'); D.noglow(c);
        bigScore(c, A, sc, 24, 28);
        S.forEach((s, p) => {
          c.save(); c.translate(s.x, s.y); c.rotate(s.a);
          if (s.th && pause <= 0) D.poly(c, [[-11, -6], [-11 - rand(10, 18), 0], [-11, 6]], ACC, ACC, 3);
          D.poly(c, [[19, 0], [-11, -12], [-5, 0], [-11, 12]], COL[p], COL[p], 4); c.restore();
        });
        bul.forEach(b => D.circ(c, b.x, b.y, 3.5, COL[b.p]));
        if (pause > 0) D.text(c, msg, 400, 150, 38, ACC, 'center', 'middle', 900);
      }
    };
  }
});

/* ---------- Flappy Duel ---------- */
reg({
  id: 'flappy', name: 'Flap Off', cat: 'Arcade', icon: '🐦', type: 'real', pad: 'one', btn: { a: 'Flap' },
  desc: 'Same pipes. Last bird flying.', help: 'Tap to flap. Fly through the gaps. Hit a pipe or the ground and you\'re out — last bird flying wins.',
  make(A) {
    const B_ = [{ x: 250, y: 200, vy: 0, dead: false }, { x: 250, y: 290, vy: 0, dead: false }], pipes = []; let t = 1, sp = 190, dist0 = 0;
    return {
      ai(dt, B) {
        const b = B_[B.p]; if (b.dead) return;
        const nx = pipes.find(pp => pp.x + 64 > b.x - 16);
        if (nx && nx !== B.mem.pipe) { B.mem.pipe = nx; B.mem.off = gauss() * B.k(50, 18, 6); }
        const target = (nx ? nx.gy + 14 : 260) + (B.mem.off || 0), r = B.k(.11, .06, .02), py = b.y + b.vy * r + 700 * r * r;
        B.mem.cd = (B.mem.cd || 0) - dt;
        if (py > target && b.vy > -60 && B.mem.cd <= 0 && b.y > 40 && !(B.lvl === 0 && B.chance(.04))) { B.press('a'); B.mem.cd = .12; }
      },
      update(dt) {
        sp += dt * 3; dist0 += sp * dt; t -= dt;
        if (t <= 0) { pipes.push({ x: 820, gy: rand(110, 370), gap: Math.max(130, 178 - dist0 / 400) }); t = 1.45; }
        pipes.forEach(p => p.x -= sp * dt); while (pipes.length && pipes[0].x < -80) pipes.shift();
        for (let p = 0; p < 2; p++) {
          const b = B_[p]; if (b.dead) { b.vy += 1400 * dt; b.y = Math.min(480, b.y + b.vy * dt); b.x -= sp * dt; continue; }
          if (A.hit(p, 'a')) { b.vy = -410; A.sfx('tick'); }
          b.vy += 1400 * dt; b.y += b.vy * dt; if (b.y < 14) { b.y = 14; b.vy = 0; }
          if (b.y > 466) b.dead = true;
          for (const pp of pipes) if (b.x + 13 > pp.x && b.x - 13 < pp.x + 64 && (b.y - 13 < pp.gy - pp.gap / 2 || b.y + 13 > pp.gy + pp.gap / 2)) b.dead = true;
          if (b.dead) { A.sfx('bad'); A.shake(4); }
        }
        if (B_[0].dead || B_[1].dead) A.end(B_[0].dead && B_[1].dead ? -1 : B_[0].dead ? 1 : 0, `${Math.floor(dist0 / 100)} m flown`);
      },
      draw(c) {
        D.rect(c, 0, 0, 800, 500, '#1a2d4a');
        pipes.forEach(p => { D.rr(c, p.x, -20, 64, p.gy - p.gap / 2 + 20, 14, '#4caf6e'); D.rr(c, p.x, p.gy + p.gap / 2, 64, 520, 14, '#4caf6e'); });
        D.rect(c, 0, 480, 800, 20, '#5a3b26');
        B_.forEach((b, p) => { c.save(); c.translate(b.x, b.y); c.rotate(clamp(b.vy / 700, -.5, 1.2)); D.circ(c, 0, 0, 16, COL[p]); D.circ(c, 7, -5, 5, '#fff'); D.circ(c, 8, -5, 2.5, '#111'); D.poly(c, [[13, 0], [24, 3], [13, 7]], ACC, ACC, 2); D.rr(c, -12, -2, 12, 8, 4, COLD[p]); c.restore(); });
        D.text(c, `${Math.floor(dist0 / 100)} m`, 400, 32, 28, '#fff');
      }
    };
  }
});

/* ---------- Bomber ---------- */
reg({
  id: 'bomber', rot: true, name: 'Bomb Duel', cat: 'Arcade', icon: '💣', type: 'real', pad: 'dpad a', btn: { a: 'Bomb' },
  desc: 'Blast blocks, trap your rival.', help: 'Move through the maze and drop bombs. Explosions blow up crates and chain other bombs. Crates may hide power-ups (flame = range, bomb = more bombs). Catch your opponent in a blast! After 60 seconds the walls close in.',
  make(A) {
    const C = 15, R = 11, S = 44, X0 = 70, Y0 = 8; const g = grid2(C, R, 0);
    const items = grid2(C, R, 0), fire = grid2(C, R, 0), bombs = [], spiral = []; let el = 0, sd = 0;
    { let x0 = 0, y0 = 0, x1 = C - 1, y1 = R - 1; while (x0 <= x1 && y0 <= y1) { for (let i = x0; i <= x1; i++) spiral.push([i, y0]); for (let j = y0 + 1; j <= y1; j++) spiral.push([x1, j]); if (y0 < y1) for (let i = x1 - 1; i >= x0; i--) spiral.push([i, y1]); if (x0 < x1) for (let j = y1 - 1; j > y0; j--) spiral.push([x0, j]); x0++; y0++; x1--; y1--; } }
    for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) { if (i % 2 && j % 2) g[j][i] = 1; else if (rand() < .6 && !((i + j < 3) || (C - 1 - i + R - 1 - j < 3))) g[j][i] = 2; }
    const P = [{ i: 0, j: 0, x: 0, y: 0, tx: 0, ty: 0, t: 1, max: 1, range: 2, dead: false }, { i: C - 1, j: R - 1, x: C - 1, y: R - 1, tx: C - 1, ty: R - 1, t: 1, max: 1, range: 2, dead: false }];
    const inb = (i, j) => i >= 0 && j >= 0 && i < C && j < R;
    const free = (i, j) => inb(i, j) && g[j][i] === 0 && !bombs.some(b => b.i === i && b.j === j);
    const blast = b => { const out = [[b.i, b.j]]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= b.r; k++) { const i = b.i + dx * k, j = b.j + dy * k; if (!inb(i, j) || g[j][i] === 1) break; out.push([i, j]); if (g[j][i] === 2) break; } return out; };
    const explode = b => {
      b.done = true; A.sfx('boom'); A.shake(4);
      for (const [i, j] of blast(b)) {
        fire[j][i] = .45; const ob = bombs.find(o => o.i === i && o.j === j && !o.done); if (ob) ob.t = Math.min(ob.t, .05);
        if (g[j][i] === 2) { g[j][i] = 0; if (rand() < .3) items[j][i] = rand() < .5 ? 1 : 2; } else if (i !== b.i || j !== b.j) items[j][i] = 0;
      }
    };
    const dangerMap = (extra) => {
      const all = extra ? [...bombs, extra] : bombs, tm = all.map(b => b.t), dm = grid2(C, R, Infinity);
      for (let it = 0; it < 3; it++) all.forEach((b, k) => blast(b).forEach(([i, j]) => all.forEach((o, m) => { if (o.i === i && o.j === j && tm[k] < tm[m]) tm[m] = tm[k]; })));
      all.forEach((b, k) => blast(b).forEach(([i, j]) => { dm[j][i] = Math.min(dm[j][i], tm[k]); }));
      for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) if (fire[j][i] > 0) dm[j][i] = 0;
      if (el > 60) for (let k = 0; k < 8; k++) { const c2 = spiral[sd + k]; if (c2 && dm[c2[1]][c2[0]] > k * .45) dm[c2[1]][c2[0]] = k * .45; }
      return dm;
    };
    /* BFS over walkable cells honoring explosion timing; returns first step toward best cell by `score` */
    const plan = (q, dm, score) => {
      const start = [q.i, q.j], seen = grid2(C, R, false), qu = [[...start, 0, null]]; seen[q.j][q.i] = true; let best = null, bv = -Infinity;
      while (qu.length) {
        const [i, j, d, first] = qu.shift(), tArr = d * .16;
        const v = score(i, j, d, dm[j][i]); if (v > bv) { bv = v; best = { i, j, first, d }; }
        if (d > 14) continue;
        for (const k of ['u', 'd', 'l', 'r']) {
          const [dx, dy] = DIRS[k], u = i + dx, w = j + dy; if (!inb(u, w) || seen[w][u]) continue;
          if (g[w][u] !== 0 || bombs.some(b => b.i === u && b.j === w)) continue;
          const dz = dm[w][u], ta = tArr + .16; if (dz !== Infinity && dz > ta - .5 && dz < ta + .25) continue;
          seen[w][u] = true; qu.push([u, w, d + 1, first || k]);
        }
      }
      return best;
    };
    return {
      ai(dt, B) {
        const p = B.p, q = P[p], o = P[1 - p]; if (q.dead) return;
        if (q.t < 1) { if (q.t > .5) B.dir(null); return; }
        if (B.lvl === 0 && !B.every('slow', .18)) return;
        const dm = dangerMap();
        if (dm[q.j][q.i] !== Infinity) {
          const r = plan(q, dm, (i, j, d, dz) => (dz === Infinity ? 1000 : 0) - d * 10);
          B.dir(r && r.first ? r.first : null); return;
        }
        // bomb?
        const mine = bombs.filter(b => b.p === p).length;
        if (mine < q.max && !bombs.some(b => b.i === q.i && b.j === q.j)) {
          const cand = { i: q.i, j: q.j, t: 2.2, r: q.range }, cells = blast(cand);
          const crates = cells.filter(([i, j]) => g[j][i] === 2).length, hitsEnemy = B.lvl > 0 && cells.some(([i, j]) => i === o.i && j === o.j) && dist(q.i, q.j, o.i, o.j) <= 2;
          if ((crates || hitsEnemy) && (B.lvl > 0 || B.chance(.5))) {
            const dm2 = dangerMap(cand);
            const esc = plan(q, dm2, (i, j, d, dz) => (dz === Infinity && d * .16 < B.k(1.6, 1.6, 1.3) ? 1000 : 0) - d * 5);
            if ((esc && esc.first && dm2[esc.j][esc.i] === Infinity) || (B.lvl === 0 && B.chance(.1))) { B.press('a'); if (esc && esc.first) B.dir(esc.first); return; }
          }
        }
        // go somewhere useful
        const r = plan(q, dm, (i, j, d, dz) => {
          if (dz !== Infinity) return -1e4;
          let v = -d * 6;
          if (items[j][i]) v += 120;
          let cr = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inb(i + dx, j + dy) && g[j + dy][i + dx] === 2) cr++;
          v += cr * 28;
          if (B.lvl === 2 && el > 45) v -= (Math.abs(i - o.i) + Math.abs(j - o.j)) * .8;
          if (B.lvl > 0) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inb(i + dx, j + dy) && g[j + dy][i + dx] === 0) v += 4;   // keep escape routes open
          return v + rand(0, B.k(30, 8, 2));
        });
        B.dir(r && r.first ? r.first : null);
      },
      update(dt) {
        for (let p = 0; p < 2; p++) {
          const q = P[p]; if (q.dead) continue;
          if (q.t < 1) { q.t = Math.min(1, q.t + dt / .15); q.x = lerp(q.i, q.tx, q.t); q.y = lerp(q.j, q.ty, q.t); if (q.t >= 1) { q.i = q.tx; q.j = q.ty; } }
          if (q.t >= 1) {
            for (const k of ['u', 'd', 'l', 'r']) if (A.get(p, k)) { const [dx, dy] = DIRS[k]; if (free(q.i + dx, q.j + dy)) { q.tx = q.i + dx; q.ty = q.j + dy; q.t = 0; } break; }
            const it = items[q.j][q.i]; if (it) { if (it === 1) q.range++; else q.max++; items[q.j][q.i] = 0; A.sfx('coin'); }
          }
          if (A.hit(p, 'a')) { const ci = q.t < .5 ? q.i : q.tx, cj = q.t < .5 ? q.j : q.ty; if (bombs.filter(b => b.p === p).length < q.max && !bombs.some(b => b.i === ci && b.j === cj)) { bombs.push({ p, i: ci, j: cj, t: 2.2, r: q.range }); A.sfx('place'); } }
        }
        el += dt;
        if (el > 60 && sd < spiral.length && el - 60 > sd * .45) {
          const [i, j] = spiral[sd++]; g[j][i] = 1; items[j][i] = 0; for (let k = bombs.length - 1; k >= 0; k--) if (bombs[k].i === i && bombs[k].j === j) bombs.splice(k, 1);
          P.forEach(q => { if (!q.dead && Math.round(q.x) === i && Math.round(q.y) === j) q.dead = true; }); A.sfx('place');
        }
        bombs.forEach(b => { b.t -= dt; }); for (let k = 0; k < 4; k++) bombs.forEach(b => { if (b.t <= 0 && !b.done) explode(b); });
        for (let k = bombs.length - 1; k >= 0; k--) if (bombs[k].done) bombs.splice(k, 1);
        for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) if (fire[j][i] > 0) fire[j][i] -= dt;
        P.forEach(q => { const ci = Math.round(q.x), cj = Math.round(q.y); if (!q.dead && fire[cj][ci] > 0) q.dead = true; });
        if (P[0].dead || P[1].dead) A.end(P[0].dead && P[1].dead ? -1 : P[0].dead ? 1 : 0, 'Boom!');
      },
      draw(c) {
        D.rr(c, X0, Y0, C * S, R * S, 16, '#1f3b2e');
        for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
          const x = X0 + i * S, y = Y0 + j * S;
          if (g[j][i] === 1) D.rr(c, x + 3, y + 3, S - 6, S - 6, 10, '#4a5080');
          else if (g[j][i] === 2) { D.rr(c, x + 4, y + 4, S - 8, S - 8, 8, '#a0703f'); D.rr(c, x + 11, y + 11, S - 22, S - 22, 5, '#8a5d33'); }
          else if (items[j][i]) { D.circ(c, x + S / 2, y + S / 2, 16, '#0006'); D.glyph(c, items[j][i] === 1 ? 'flame' : 'bomb', x + S / 2, y + S / 2, 10, items[j][i] === 1 ? '#ff9f43' : '#ecebe6'); }
          if (fire[j][i] > 0) D.rr(c, x + 2, y + 2, S - 4, S - 4, 14, `rgba(255,${120 + fire[j][i] * 200 | 0},60,.9)`);
        }
        bombs.forEach(b => { const x = X0 + (b.i + .5) * S, y = Y0 + (b.j + .5) * S, pl = 1 + Math.sin(b.t * 14) * .08; D.circ(c, x, y + 2, 16 * pl, '#111', COL[b.p], 4); D.circ(c, x + 7, y - 13, 3.5, b.t % .3 < .15 ? ACC : '#f80'); });
        P.forEach((q, p) => { if (q.dead) return; const x = X0 + (q.x + .5) * S, y = Y0 + (q.y + .5) * S; D.circ(c, x, y, 17, COL[p], '#fff', 3); D.circ(c, x - 5, y - 3, 3.5, '#fff'); D.circ(c, x + 5, y - 3, 3.5, '#fff'); });
        if (el > 50 && sd < spiral.length) { const k = el > 60 ? 6 : 0; for (let m = 0; m < k; m++) { const c2 = spiral[sd + m]; if (c2) D.rr(c, X0 + c2[0] * S + 6, Y0 + c2[1] * S + 6, S - 12, S - 12, 10, null, '#ff4f6d' + (m < 2 ? 'cc' : '55'), 3); } D.text(c, el > 60 ? 'SUDDEN DEATH' : `Sudden death in ${Math.ceil(60 - el)}`, 400, 496, 14, '#ff4f6d', 'center', 'bottom', 900); }
        for (let p = 0; p < 2; p++) { const x = p ? 765 : 35; D.glyph(c, 'flame', x, 220, 8, COL[p]); D.text(c, P[p].range, x, 240, 15, COL[p]); D.glyph(c, 'bomb', x, 266, 8, COL[p]); D.text(c, P[p].max, x, 286, 15, COL[p]); }
      }
    };
  }
});

/* ---------- Paint Wars ---------- */
reg({
  id: 'paint', rot: true, name: 'Paint Wars', cat: 'Arcade', icon: '🖌️', type: 'real', pad: 'dpad a', btn: { a: 'Splat' },
  desc: 'Cover the most ground in 40s.', help: 'Run around to paint tiles your color. Splat paints a big area (4s cooldown). Whoever owns the most tiles when time runs out wins.',
  make(A) {
    const CW = 32, CH = 19, S = 25, Y0 = 25; const g = grid2(CW, CH, -1); let T = 40, t = 0;
    const P = [{ x: 3, y: 9, cd: 0 }, { x: 28, y: 9, cd: 0 }];
    const paint = (x, y, p) => { if (x >= 0 && y >= 0 && x < CW && y < CH) g[y][x] = p; };
    return {
      ai(dt, B) {
        const p = B.p, q = P[p];
        if (B.every('plan', B.k(.6, .3, .12)) || !B.mem.tg || g[B.mem.tg[1]][B.mem.tg[0]] === p) {
          let best = null, bv = -Infinity;
          for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
            if (g[y][x] === p) continue;
            let v = (g[y][x] === 1 - p ? B.k(1, 1.6, 2.2) : 1) * 10 - (Math.abs(x - q.x) + Math.abs(y - q.y)) * B.k(1.5, 2, 2.5);
            if (B.lvl === 2) { let around = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && xx >= 0 && yy < CH && xx < CW && g[yy][xx] !== p) around++; } v += around * .6; }
            v += rand(0, B.k(12, 3, 1));
            if (v > bv) { bv = v; best = [x, y]; }
          }
          B.mem.tg = best;
        }
        const tg = B.mem.tg; if (!tg) return B.dir(null);
        const dx = tg[0] - q.x, dy = tg[1] - q.y;
        B.dir(dx === 0 && dy === 0 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'));
        if (q.cd <= 0) { let n = 0; for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= 5) { const a = q.x + xx, b = q.y + yy; if (a >= 0 && b >= 0 && a < CW && b < CH && g[b][a] !== p) n++; } if (n >= B.k(9, 11, 12) && B.chance(B.k(.05, .3, 1))) B.press('a'); }
      },
      update(dt) {
        T -= dt; t += dt;
        for (let p = 0; p < 2; p++) { const q = P[p]; q.cd -= dt; if (A.hit(p, 'a') && q.cd <= 0) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) paint(q.x + dx, q.y + dy, p); q.cd = 4; A.sfx('boom'); } }
        while (t >= .085) {
          t -= .085;
          for (let p = 0; p < 2; p++) {
            const q = P[p]; let dx = 0, dy = 0;
            if (A.analog(p)) { const [x, y] = A.axis(p); if (Math.hypot(x, y) > .4) { if (Math.abs(x) > Math.abs(y)) dx = Math.sign(x); else dy = Math.sign(y); } }
            else [dx, dy] = A.get(p, 'u') ? [0, -1] : A.get(p, 'd') ? [0, 1] : A.get(p, 'l') ? [-1, 0] : A.get(p, 'r') ? [1, 0] : [0, 0];
            q.x = clamp(q.x + dx, 0, CW - 1); q.y = clamp(q.y + dy, 0, CH - 1); paint(q.x, q.y, p);
          }
        }
        if (T <= 0) { const n = [0, 1].map(p => g.flat().filter(v => v === p).length); A.end(n[0] === n[1] ? -1 : n[0] > n[1] ? 0 : 1, `${n[0]} vs ${n[1]} tiles`); }
      },
      draw(c) {
        const n = [0, 1].map(p => g.flat().filter(v => v === p).length), tot = CW * CH;
        D.rr(c, 4, 3, 792 * n[0] / tot, 16, 8, COL[0]); D.rr(c, 796 - 792 * n[1] / tot, 3, 792 * n[1] / tot, 16, 8, COL[1]);
        D.text(c, Math.max(0, Math.ceil(T)), 400, 12, 16, '#fff', 'center', 'middle', 900);
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) D.rr(c, x * S + 1.5, Y0 + y * S + 1.5, S - 3, S - 3, 6, g[y][x] < 0 ? BG2 : COL[g[y][x]] + 'bb');
        P.forEach((q, p) => { D.circ(c, q.x * S + S / 2, Y0 + q.y * S + S / 2, 12, '#fff', COL[p], 5); if (q.cd > 0) D.circ(c, q.x * S + S / 2, Y0 + q.y * S + S / 2, 17, null, '#fff4', 3); });
      }
    };
  }
});

/* ---------- Coin Grab ---------- */
reg({
  id: 'coins', rot: true, name: 'Coin Rush', cat: 'Arcade', icon: '🪙', type: 'real', pad: 'dpad a', btn: { a: 'Dash' },
  desc: 'Grab more coins in 30 seconds.', help: 'Collect coins (gold = 1, gems = 3). Dash to get there first — or to shove your rival away. Most points after 30 seconds wins.',
  make(A) {
    const P = [{ x: 200, y: 250, vx: 0, vy: 0, r: 20, im: 1, cd: 0, s: 0 }, { x: 600, y: 250, vx: 0, vy: 0, r: 20, im: 1, cd: 0, s: 0 }], coins = []; let T = 30, sp = 0;
    const add = () => coins.push({ x: rand(40, 760), y: rand(60, 470), v: rand() < .12 ? 3 : 1, t: 0 });
    for (let i = 0; i < 5; i++) add();
    return {
      ai(dt, B) {
        const p = B.p, q = P[p], o = P[1 - p];
        if (B.every('pick', B.k(.5, .25, .1)) || !coins.includes(B.mem.c)) {
          let best = null, bv = -Infinity;
          for (const k of coins) { const dm = dist(q.x, q.y, k.x, k.y), dop = dist(o.x, o.y, k.x, k.y); let v = k.v / (dm + 40); if (B.lvl === 2 && dop < dm * .7) v *= .3; v *= 1 + rand(0, B.k(.8, .2, .05)); if (v > bv) { bv = v; best = k; } }
          B.mem.c = best;
        }
        const k = B.mem.c; if (!k) return B.stop();
        B.toward(q.x, q.y, k.x, k.y, B.k(.72, .9, 1), 8);
        const d = dist(q.x, q.y, k.x, k.y);
        if (q.cd <= 0 && d > 170 && d < 360 && B.chance(B.k(.01, .05, .25))) B.press('a');
      },
      update(dt) {
        T -= dt; sp -= dt; if (sp <= 0 && coins.length < 7) { add(); sp = .6; }
        for (let p = 0; p < 2; p++) {
          const q = P[p], [dx, dy] = dir(A, p), m = Math.hypot(dx, dy); q.cd -= dt;
          q.vx = lerp(q.vx, dx * 290, Math.min(1, dt * 9)); q.vy = lerp(q.vy, dy * 290, Math.min(1, dt * 9));
          if (A.hit(p, 'a') && q.cd <= 0 && m > .15) { q.vx = dx / m * 820; q.vy = dy / m * 820; q.cd = 1.2; A.sfx('shoot'); }
          q.x = clamp(q.x + q.vx * dt, 20, 780); q.y = clamp(q.y + q.vy * dt, 50, 480);
          for (let i = coins.length - 1; i >= 0; i--) if (dist(q.x, q.y, coins[i].x, coins[i].y) < 32) { q.s += coins[i].v; coins.splice(i, 1); A.sfx('coin'); }
        }
        if (collide(P[0], P[1], 1.2)) A.sfx('bounce');
        coins.forEach(c => c.t += dt);
        if (T <= 0) A.end(P[0].s === P[1].s ? -1 : P[0].s > P[1].s ? 0 : 1, `${P[0].s} – ${P[1].s}`);
      },
      draw(c) {
        D.text(c, P[0].s, 40, 24, 34, COL[0], 'center', 'middle', 900); D.text(c, P[1].s, 760, 24, 34, COL[1], 'center', 'middle', 900);
        D.rr(c, 300, 12, 200, 14, 7, BG2); D.rr(c, 300, 12, 200 * Math.max(0, T) / 30, 14, 7, T < 5 ? COL[0] : ACC);
        coins.forEach(k => { const s = 1 + Math.sin(k.t * 6) * .1; k.v > 1 ? D.glyph(c, 'diamond', k.x, k.y, 14 * s, '#7fe3ff') : D.circ(c, k.x, k.y, 11 * s, ACC, '#c99a2e', 4); });
        P.forEach((q, p) => { D.circ(c, q.x, q.y + 3, q.r, '#0005'); D.circ(c, q.x, q.y, q.r, COL[p], q.cd > .9 ? '#fff' : null, 4); });
      }
    };
  }
});

/* ---------- Hot Potato ---------- */
reg({
  id: 'potato', rot: true, name: 'Hot Potato', cat: 'Arcade', icon: '🥔', type: 'real', pad: 'dpad',
  desc: 'Pass the bomb before it blows.', help: 'One player holds the bomb. Touch your opponent to pass it on. Whoever holds it when the fuse runs out loses the round. The holder is a bit faster. First to 3.',
  make(A) {
    const sc = [0, 0], O = [[400, 250, 42], [200, 130, 28], [600, 370, 28], [200, 370, 28], [600, 130, 28]].map(([x, y, r]) => ({ x, y, r, im: 0, vx: 0, vy: 0 }));
    let P, it, fuse, F, imm, pause = 0, msg = '';
    const reset = () => { P = [{ x: 80, y: 250, vx: 0, vy: 0, r: 20, im: 1 }, { x: 720, y: 250, vx: 0, vy: 0, r: 20, im: 1 }]; it = rint(0, 1); F = fuse = rand(10, 16); imm = 1; };
    reset();
    return {
      ai(dt, B) {
        if (pause > 0) return B.stop();
        const p = B.p, q = P[p], o = P[1 - p], spd = B.k(.75, .9, 1);
        if (it === p) { const lead = B.k(0, .25, .4); B.toward(q.x, q.y, o.x + o.vx * lead, o.y + o.vy * lead, spd, 4); return; }
        if (!B.every('plan', B.k(.35, .18, .08))) return;
        let best = [0, 0], bv = -Infinity;
        for (let k = 0; k < 16; k++) {
          const a = k * Math.PI / 8, nx = q.x + Math.cos(a) * 90, ny = q.y + Math.sin(a) * 90;
          let v = dist(nx, ny, o.x, o.y) - Math.max(0, 70 - Math.min(nx, 800 - nx, ny, 500 - ny)) * 3;
          for (const ob of O) v -= Math.max(0, ob.r + 50 - dist(nx, ny, ob.x, ob.y)) * 2;
          v += rand(0, B.k(60, 15, 3));
          if (v > bv) { bv = v; best = [Math.cos(a), Math.sin(a)]; }
        }
        B.go(best[0] * spd, best[1] * spd);
      },
      update(dt) {
        if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        fuse -= dt; imm -= dt;
        for (let p = 0; p < 2; p++) {
          const q = P[p], [dx, dy] = dir(A, p), s = p === it ? 280 : 255; q.vx = dx * s; q.vy = dy * s;
          q.x = clamp(q.x + q.vx * dt, 20, 780); q.y = clamp(q.y + q.vy * dt, 20, 480); O.forEach(o => collide(o, q, 0));
        }
        if (dist(P[0].x, P[0].y, P[1].x, P[1].y) < 42) { if (imm <= 0) { it = 1 - it; imm = .7; A.sfx('hit'); } collide(P[0], P[1], 0); }
        if (Math.floor(fuse * 4) !== Math.floor((fuse + dt) * 4)) A.sfx('tick');
        if (fuse <= 0) { const w = 1 - it; sc[w]++; msg = `${A.names[it]} got toasted!`; pause = 1.6; A.sfx('boom'); A.shake(10); if (sc[w] >= 3) A.end(w, `${sc[0]} – ${sc[1]}`); }
      },
      draw(c) {
        O.forEach(o => D.circ(c, o.x, o.y, o.r, '#2b2d4a'));
        bigScore(c, A, sc, 24, 28);
        P.forEach((q, p) => { D.circ(c, q.x, q.y, q.r, COL[p]); if (p === it && pause <= 0) { D.circ(c, q.x, q.y - 32, 13, '#222', ACC, 3); D.line(c, q.x + 6, q.y - 43, q.x + 12, q.y - 51, '#c99a2e', 4); D.circ(c, q.x + 12, q.y - 52, 3 + rand(3), '#ff9f43'); } });
        D.rr(c, 250, 478, 300, 12, 6, BG2); D.rr(c, 250, 478, 300 * Math.max(0, fuse) / F, 12, 6, '#ff9f43');
        if (pause > 0) D.text(c, msg, 400, 250, 42, ACC, 'center', 'middle', 900);
      }
    };
  }
});

/* ---------- King of the Hill ---------- */
reg({
  id: 'koth', rot: true, name: 'King of the Hill', cat: 'Arcade', icon: '👑', type: 'real', pad: 'dpad a', btn: { a: 'Dash' },
  desc: 'Hold the zone alone.', help: 'Stand in the glowing zone ALONE to earn time. Shove your rival out (dash!). The zone moves every few seconds. First to 10 seconds wins.',
  make(A) {
    const P = [{ x: 150, y: 250, vx: 0, vy: 0, r: 22, im: 1, cd: 0 }, { x: 650, y: 250, vx: 0, vy: 0, r: 22, im: 1, cd: 0 }], s = [0, 0]; let z = { x: 400, y: 250, r: 72 }, zt = 7, zx = 400, zy = 250;
    return {
      ai(dt, B) {
        const p = B.p, q = P[p], o = P[1 - p], spd = B.k(.72, .9, 1), inZ = dist(q.x, q.y, z.x, z.y) < z.r - 10, oIn = dist(o.x, o.y, z.x, z.y) < z.r + 10;
        const cx = lerp(z.x, zx, B.k(0, .3, .6)), cy = lerp(z.y, zy, B.k(0, .3, .6));
        if (inZ && oIn) {
          const ux = o.x - z.x, uy = o.y - z.y, m = Math.hypot(ux, uy) || 1;
          B.toward(q.x, q.y, o.x + ux / m * 30, o.y + uy / m * 30, spd, 4);
          if (q.cd <= 0 && dist(q.x, q.y, o.x, o.y) < 85 && B.chance(B.k(.03, .1, .3))) B.press('a');
        } else {
          B.toward(q.x, q.y, cx, cy, spd, 25);
          if (B.lvl === 2 && q.cd <= 0 && !inZ && dist(q.x, q.y, cx, cy) > 200) B.press('a');
        }
      },
      update(dt) {
        zt -= dt; if (zt <= 0) { zx = rand(120, 680); zy = rand(120, 400); zt = 7; A.sfx('go'); }
        z.x = lerp(z.x, zx, dt * 1.5); z.y = lerp(z.y, zy, dt * 1.5);
        for (let p = 0; p < 2; p++) {
          const q = P[p], [dx, dy] = dir(A, p), m = Math.hypot(dx, dy); q.cd -= dt;
          q.vx += dx * 1150 * dt; q.vy += dy * 1150 * dt;
          if (A.hit(p, 'a') && q.cd <= 0) { const u = m > .15 ? [dx / m, dy / m] : [Math.sign(q.vx) || 1, 0]; q.vx += u[0] * 600; q.vy += u[1] * 600; q.cd = 1.1; A.sfx('shoot'); }
          const f = Math.pow(.05, dt); q.vx *= f; q.vy *= f; q.x = clamp(q.x + q.vx * dt, 22, 778); q.y = clamp(q.y + q.vy * dt, 22, 478);
        }
        if (collide(P[0], P[1], 1.3)) A.sfx('hit');
        const inn = P.map(q => dist(q.x, q.y, z.x, z.y) < z.r);
        if (inn[0] !== inn[1]) { const p = inn[0] ? 0 : 1; s[p] += dt; if (s[p] >= 10) A.end(p, `${s[0].toFixed(1)} – ${s[1].toFixed(1)} s`); }
      },
      draw(c) {
        const inn = P.map(q => dist(q.x, q.y, z.x, z.y) < z.r), own = inn[0] !== inn[1] ? (inn[0] ? 0 : 1) : -1, col = own >= 0 ? COL[own] : ACC;
        D.circ(c, zx, zy, 72, null, '#ffffff18', 3);
        D.glow(c, col, 30); D.circ(c, z.x, z.y, z.r, col + '33', col, 5); D.noglow(c);
        D.glyph(c, 'crown', z.x, z.y, 16, col);
        for (let p = 0; p < 2; p++) { D.rr(c, p ? 450 : 50, 14, 300, 16, 8, BG2); D.rr(c, p ? 750 - 300 * s[p] / 10 : 50, 14, 300 * s[p] / 10, 16, 8, COL[p]); }
        P.forEach((q, p) => { D.circ(c, q.x, q.y + 3, q.r, '#0005'); D.circ(c, q.x, q.y, q.r, COL[p], q.cd > .8 ? '#fff' : null, 4); });
      }
    };
  }
});

/* ---------- Meteor Dodge ---------- */
reg({
  id: 'meteor', name: 'Meteor Dodge', cat: 'Arcade', icon: '☄️', type: 'real', pad: 'lr', touch: 'point',
  desc: 'Last one standing.', help: 'Meteors rain down — watch the warning marks on the ground. Move left/right to dodge (you can bump each other!). Get hit and you\'re out.',
  make(A) {
    const P = [{ x: 300, y: 450, vx: 0, vy: 0, r: 18, im: 1, dead: false }, { x: 500, y: 450, vx: 0, vy: 0, r: 18, im: 1, dead: false }], M = []; let t = 0, sp = .6, el = 0;
    return {
      ai(dt, B) {
        const p = B.p, q = P[p], o = P[1 - p]; if (q.dead) return;
        if (B.every('plan', B.k(.26, .1, .04))) {
          const look = B.k(.6, 1, 1.4), margin = B.k(2, 6, 9), spd = 340 * B.k(.75, .92, 1); let best = q.x, bv = -Infinity;
          for (let x = 20; x <= 780; x += 20) {
            let hit = Infinity, px = q.x;
            for (let tt = 0; tt <= look && hit === Infinity; tt += .04) {
              px += clamp(x - px, -spd * .04, spd * .04);
              for (const m of M) { const my = m.y + m.v * tt; if (Math.abs(my - 450) < m.r + q.r + margin && Math.abs(m.x - px) < m.r + q.r + margin) { hit = tt; break; } }
            }
            const v = (hit === Infinity ? 0 : -1000 + hit * 500) - Math.abs(x - q.x) * .15 - (Math.abs(x - o.x) < 40 ? 15 : 0) + rand(0, B.k(30, 5, 1));
            if (v > bv) { bv = v; best = x; }
          }
          B.mem.tx = best;
        }
        B.go(clamp((B.mem.tx - q.x) / 14, -1, 1) * B.k(.75, .92, 1), 0);
      },
      update(dt) {
        el += dt; t -= dt; if (t <= 0) { M.push({ x: rand(20, 780), y: -30, v: rand(250, 420) + el * 8, r: rand(14, 26) }); t = Math.max(.12, sp - el * .012); }
        for (let p = 0; p < 2; p++) {
          const q = P[p]; if (q.dead) continue; const pt = A.point(p);
          q.vx = pt ? clamp((pt[0] - q.x) * 14, -360, 360) : A.axis(p)[0] * 340; q.x = clamp(q.x + q.vx * dt, 18, 782);
        }
        if (!P[0].dead && !P[1].dead) { collide(P[0], P[1], .2); P.forEach(q => { q.y = 450; q.vy = 0; }); }
        for (let i = M.length - 1; i >= 0; i--) {
          const m = M[i]; m.y += m.v * dt; if (m.y > 520) { M.splice(i, 1); A.sfx('tick'); continue; }
          P.forEach(q => { if (!q.dead && dist(q.x, q.y, m.x, m.y) < q.r + m.r - 4) { q.dead = true; A.sfx('boom'); A.shake(6); } });
        }
        if (P[0].dead || P[1].dead) A.end(P[0].dead && P[1].dead ? -1 : P[0].dead ? 1 : 0, `Survived ${el.toFixed(1)} s`);
      },
      draw(c) {
        D.rr(c, -20, 468, 840, 60, 20, '#3a2f52');
        M.forEach(m => { c.globalAlpha = clamp(m.y / 400, .15, .6); D.rr(c, m.x - m.r, 470, m.r * 2, 7, 4, '#ff4f6d'); c.globalAlpha = 1; c.lineCap = 'round'; D.line(c, m.x, m.y - m.r * 3, m.x, m.y, '#ff9f4355', m.r); c.lineCap = 'butt'; D.circ(c, m.x, m.y, m.r, '#c0703f', '#ffb36b', 4); });
        P.forEach((q, p) => { if (q.dead) return; D.rr(c, q.x - 18, q.y - 20, 36, 38, 14, COL[p]); D.circ(c, q.x - 6, q.y - 7, 4, '#fff'); D.circ(c, q.x + 6, q.y - 7, 4, '#fff'); });
        D.text(c, `${el.toFixed(1)} s`, 400, 28, 26, MUT);
      }
    };
  }
});

/* ---------- Brick Battle ---------- */
reg({
  id: 'bricks', rot: true, name: 'Brick Battle', cat: 'Arcade', icon: '🧱', type: 'real', pad: 'ud', touch: 'point',
  desc: 'Pong meets breakout.', help: 'Defend your wall of bricks with your paddle. The ball smashes bricks — once it breaks through your wall and hits the edge, you lose.',
  make(A) {
    const br = []; for (let s = 0; s < 2; s++) for (let col = 0; col < 2; col++) for (let k = 0; k < 10; k++) br.push({ s, x: s ? 760 - col * 26 : 14 + col * 26, y: k * 50 + 2, w: 22, h: 46 });
    const P = [{ y: 250, vy: 0 }, { y: 250, vy: 0 }], PH = 86;
    const balls = [{ x: 400, y: 250, vx: (A.first ? 1 : -1) * 320, vy: rand(-200, 200), r: 9 }];
    return {
      ai(dt, B) {
        const p = B.p, Q = P[p], b = balls[0], px = p ? 708 : 92, toward = p ? b.vx > 0 : b.vx < 0;
        if (toward !== B.mem.tw) { B.mem.tw = toward; B.mem.eo = rand(-1, 1) * B.k(55, 28, 9) + (B.chance(B.k(.2, .1, .05)) ? (rand() < .5 ? -1 : 1) * rand(60, 100) : 0); }
        if (B.every('think', B.k(.3, .15, .06))) B.mem.ty = toward ? reflectY(b.y + b.vy * (px - b.x) / b.vx, b.r, 500 - b.r) + B.mem.eo : lerp(250, b.y, .3);
        B.go(0, clamp(((B.mem.ty ?? 250) - Q.y) / 26, -1, 1) * B.k(.6, .85, 1));
      },
      update(dt) {
        for (let p = 0; p < 2; p++) { const Q = P[p], pt = A.point(p); Q.vy = pt ? clamp((pt[1] - Q.y) * 16, -1100, 1100) : A.axis(p)[1] * 480; Q.y = clamp(Q.y + Q.vy * dt, PH / 2, 500 - PH / 2); }
        for (const b of balls) for (let s = 0; s < 4; s++) {
          b.x += b.vx * dt / 4; b.y += b.vy * dt / 4;
          if (b.y < b.r || b.y > 500 - b.r) { b.vy *= -1; b.y = clamp(b.y, b.r, 500 - b.r); }
          for (let p = 0; p < 2; p++) {
            const px = p ? 715 : 85;
            if (Math.abs(b.x - px) < 8 + b.r && Math.abs(b.y - P[p].y) < PH / 2 + b.r && (p ? b.vx > 0 : b.vx < 0)) { const off = clamp((b.y - P[p].y) / (PH / 2), -1, 1), sp = Math.min(Math.hypot(b.vx, b.vy) * 1.04, 900); b.vx = Math.cos(off) * sp * (p ? -1 : 1); b.vy = Math.sin(off) * sp; A.sfx('hit'); }
          }
          for (let i = br.length - 1; i >= 0; i--) { const k = br[i]; if (rectBounce(b, k.x, k.y, k.w, k.h, 1)) { br.splice(i, 1); A.sfx('bounce'); A.shake(2); break; } }
          if (b.x < 0 || b.x > 800) return A.end(b.x < 0 ? 1 : 0, 'Wall breached!');
        }
      },
      draw(c) {
        br.forEach(k => D.rr(c, k.x, k.y, k.w, k.h, 8, COL[k.s] + 'aa'));
        for (let p = 0; p < 2; p++) D.rr(c, (p ? 715 : 85) - 8, P[p].y - PH / 2, 16, PH, 8, COL[p]);
        balls.forEach(b => { D.glow(c, '#fff', 14); D.circ(c, b.x, b.y, b.r, '#fff'); D.noglow(c); });
        D.line(c, 400, 0, 400, 500, '#ffffff10', 3);
      }
    };
  }
});

/* ---------- Gravity Run ---------- */
reg({
  id: 'gravity', name: 'Gravity Flip', cat: 'Arcade', icon: '🔃', type: 'real', pad: 'one', btn: { a: 'Flip' },
  desc: 'Flip gravity, dodge blocks.', help: 'Your runner auto-runs. Tap to flip gravity between floor and ceiling. Both lanes get the same obstacles. Crash and you lose!',
  make(A) {
    const LN = [{ top: 30, bot: 240 }, { top: 260, bot: 470 }], R = [0, 1].map(p => ({ y: LN[p].bot - 14, g: 1, vy: 0, dead: false, on: true })), obs = []; let sp = 260, t = .5, el = 0, d = 0;
    return {
      ai(dt, B) {
        const p = B.p, r = R[p], L = LN[p]; if (r.dead || !r.on) return;
        // roll the runner forward: returns survival time, flipping greedily later when needed
        const live = (flipNow, horizon) => {
          let y = r.y, g = r.g * (flipNow ? -1 : 1), vy = 0, on = !flipNow, tt = 0, cd = flipNow ? .5 : B.k(.22, .17, .13);
          const h = 1 / 60;
          for (; tt < horizon; tt += h) {
            vy += g * 2600 * h; y += vy * h;
            if (y > L.bot - 14) { y = L.bot - 14; vy = 0; on = true; } if (y < L.top + 14) { y = L.top + 14; vy = 0; on = true; }
            cd -= h;
            for (const o of obs) { const ox = o.x - sp * tt, oy = o.side > 0 ? L.bot - o.h : L.top; if (162 > ox && 138 < ox + o.w && y + 12 > oy && y - 12 < oy + o.h) return tt; }
            if (on && cd <= 0) { const sd = g > 0 ? 1 : -1; if (obs.some(o => o.side === sd && o.x - sp * tt - 162 < sp * .42 && o.x - sp * tt + o.w > 138)) { g = -g; on = false; cd = .5; } }
          }
          return horizon;
        };
        if (B.mem.blink > 0) { B.mem.blink -= dt; return; }
        if (B.chance(dt * B.k(.35, .14, .05))) { B.mem.blink = rand(.35, .7); return; }
        if (B.every('think', B.k(.12, .05, .016))) {
          const H = B.k(.7, 1.1, 1.6), wait = live(false, H), flip = live(true, H);
          B.mem.flip = flip > wait + .02;
        }
        if (B.mem.flip) { B.mem.lagT = (B.mem.lagT || 0) + dt; if (B.mem.lagT >= B.k(.1, .04, 0)) { B.press('a'); B.mem.flip = false; B.mem.lagT = 0; } } else B.mem.lagT = 0;
      },
      update(dt) {
        el += dt; sp += dt * 6; d += sp * dt; t -= dt;
        if (t <= 0) { const side = rand() < .5 ? 1 : -1, h = rand(40, 110); obs.push({ x: 820, w: rand(24, 44), side, h }); t = Math.max(.42, rand(.6, 1.1) - el * .01); }
        obs.forEach(o => o.x -= sp * dt); while (obs.length && obs[0].x < -60) obs.shift();
        for (let p = 0; p < 2; p++) {
          const r = R[p], L = LN[p]; if (r.dead) continue;
          if (A.hit(p, 'a') && r.on) { r.g *= -1; r.on = false; A.sfx('tick'); }
          r.vy += r.g * 2600 * dt; r.y += r.vy * dt;
          if (r.y > L.bot - 14) { r.y = L.bot - 14; r.vy = 0; r.on = true; } if (r.y < L.top + 14) { r.y = L.top + 14; r.vy = 0; r.on = true; }
          for (const o of obs) { const oy = o.side > 0 ? L.bot - o.h : L.top; if (150 + 12 > o.x && 150 - 12 < o.x + o.w && r.y + 12 > oy && r.y - 12 < oy + o.h) { r.dead = true; A.sfx('boom'); A.shake(5); } }
        }
        if (R[0].dead || R[1].dead) A.end(R[0].dead && R[1].dead ? -1 : R[0].dead ? 1 : 0, `${Math.floor(d / 50)} m`);
      },
      draw(c) {
        for (let p = 0; p < 2; p++) {
          const L = LN[p]; D.rr(c, 0, L.top, 800, L.bot - L.top, 14, BG2); D.rr(c, 0, L.top - 5, 800, 5, 3, COL[p]); D.rr(c, 0, L.bot, 800, 5, 3, COL[p]);
          obs.forEach(o => { const oy = o.side > 0 ? L.bot - o.h : L.top; D.rr(c, o.x, oy, o.w, o.h, 8, '#ffd166'); });
          const r = R[p]; if (!r.dead) { c.save(); c.translate(150, r.y); c.rotate(d / 30 * r.g); D.rr(c, -13, -13, 26, 26, 8, COL[p]); c.restore(); }
          D.text(c, A.names[p], 20, L.top + 20, 17, COL[p], 'left');
        }
        D.text(c, `${Math.floor(d / 50)} m`, 780, 15, 16, MUT, 'right');
      }
    };
  }
});

/* ---------- Artillery ---------- */
reg({
  id: 'artillery', name: 'Artillery', cat: 'Arcade', icon: '💥', type: 'turn',
  desc: 'Mind the wind. Blow up the hill.', help: 'Pull back and release to fire, like a slingshot. Watch the wind arrow! Shells carve the terrain. Land a shell near the other cannon to win.',
  make(A) {
    const hgt = new Float32Array(801), a1 = rand(6), a2 = rand(6);
    for (let x = 0; x <= 800; x++) hgt[x] = 340 + Math.sin(x / 130 + a1) * 50 + Math.sin(x / 47 + a2) * 18 - Math.exp(-((x - 400) ** 2) / 12000) * 120;
    const T = [{ x: 90 }, { x: 710 }], sl = Sling(180); let p = A.first, shell = null, wind = rand(-70, 70), boom = null, trail = []; A.turn(p);
    const ty = q => hgt[Math.round(T[q].x)] - 10;
    const impact = (a, t) => {
      let x = T[p].x, y = ty(p) - 8, vx = Math.cos(a) * 620 * t, vy = Math.sin(a) * 620 * t;
      for (let i = 0; i < 1600; i++) { const h = 1 / 120; vx += wind * h; vy += 320 * h; x += vx * h; y += vy * h; const xi = Math.round(x); if (x < -50 || x > 850 || y > 520) return [x, y]; if (i > 30 && xi >= 0 && xi <= 800 && y >= hgt[xi]) return [x, y]; if (i > 30 && dist(x, y, T[1 - p].x, ty(1 - p)) < 16) return [x, y]; }
      return [x, y];
    };
    const shoot = r => { const ox = T[p].x, oy = ty(p) - 8, pw = 620 * r.t; shell = { x: ox, y: oy, vx: r.nx * pw, vy: r.ny * pw, age: 0, r: 5 }; trail = []; sl.launch(shell, r, COL[p]); A.sfx('shoot'); A.shake(3); };
    return {
      ai(B) {
        if (shell || boom || sl.ap || B.p !== p) return false;
        const E = T[1 - p], side = E.x > T[p].x ? 1 : -1, sc = (a, t) => { const [x, y] = impact(a, t); return dist(x, y, E.x, ty(1 - p)) + (dist(x, y, T[p].x, ty(p)) < 50 ? 400 : 0); };
        let best = { a: -Math.PI / 4, t: .8 }, bv = Infinity;
        for (let i = 0; i < B.k(40, 150, 360); i++) { const e = rand(.2, 1.4), a = side > 0 ? -e : -(Math.PI - e), t = rand(.35, 1), v = sc(a, t); if (v < bv) { bv = v; best = { a, t }; } }
        for (let i = 0; i < B.k(0, 40, 120); i++) { const a = best.a + gauss() * .05, t = clamp(best.t + gauss() * .04, .2, 1), v = sc(a, t); if (v < bv) { bv = v; best = { a, t }; } }
        const a = best.a + gauss() * B.k(.07, .028, .007), t = clamp(best.t * (1 + gauss() * B.k(.09, .035, .009)), .2, 1);
        sl.auto(Math.cos(a), Math.sin(a), t, .85);
        return true;
      },
      down(x, y) { if (!shell && !sl.ap) sl.down(x, y); },
      move(x, y) { if (!sl.ap) sl.move(x, y); }, cancel() { if (!sl.ap) sl.cancel(); },
      up() { if (shell || sl.ap) return; const r = sl.up(); if (r) shoot(r); },
      update(dt) {
        if (boom) { boom.t -= dt; if (boom.t <= 0) boom = null; }
        if (sl.ap) { const r = sl.step(dt); if (r) shoot(r); return; }
        if (!shell) return;
        for (let s = 0; s < 4; s++) {
          const h = dt / 4; shell.age += h; shell.vx += wind * h; shell.vy += 320 * h; shell.x += shell.vx * h; shell.y += shell.vy * h; trail.push([shell.x, shell.y]);
          const xi = Math.round(shell.x);
          const hitT = T.findIndex((t, q) => (q !== p || shell.age > .3) && dist(shell.x, shell.y, t.x, ty(q)) < 16);
          if (shell.x < -50 || shell.x > 850 || shell.y > 520 || (xi >= 0 && xi <= 800 && shell.y >= hgt[xi]) || hitT >= 0) {
            const bx = shell.x, by = shell.y, R = 36; shell = null; boom = { x: bx, y: by, t: .5 }; A.sfx('boom'); A.shake(6);
            for (let x = Math.max(0, Math.floor(bx - R)); x <= Math.min(800, Math.ceil(bx + R)); x++) { const dd = Math.sqrt(R * R - (x - bx) ** 2); if (by + dd > hgt[x]) hgt[x] = Math.min(500, Math.max(hgt[x], by + dd)); }
            const hit = [0, 1].map(q => dist(bx, by, T[q].x, ty(q)) < 40);
            if (hit[0] || hit[1]) { const w = hit[0] && hit[1] ? -1 : hit[0] ? 1 : 0; return A.end(w, w === p ? 'Direct hit!' : w === -1 ? 'Mutual destruction' : 'Oops — self hit!'); }
            p = 1 - p; wind = clamp(wind + rand(-40, 40), -90, 90); A.turn(p); return;
          }
        }
      },
      draw(c) {
        D.rect(c, 0, 0, 800, 500, '#151a33');
        c.beginPath(); c.moveTo(0, 500); for (let x = 0; x <= 800; x += 4) c.lineTo(x, hgt[x]); c.lineTo(800, 500); c.closePath(); c.fillStyle = '#3d5a3a'; c.fill();
        c.strokeStyle = '#6fa86a'; c.lineWidth = 4; c.lineJoin = 'round'; c.beginPath(); for (let x = 0; x <= 800; x += 4) x ? c.lineTo(x, hgt[x]) : c.moveTo(x, hgt[x]); c.stroke(); c.lineJoin = 'miter';
        T.forEach((t, q) => { const y = ty(q); D.rr(c, t.x - 18, y - 7, 36, 18, 9, COL[q]); D.circ(c, t.x, y - 7, 10, COL[q]); });
        D.text(c, `Wind ${Math.abs(Math.round(wind))}`, 400, 26, 20, MUT);
        c.lineCap = 'round'; D.line(c, 400, 50, 400 + wind, 50, ACC, 6); c.lineCap = 'butt';
        if (Math.abs(wind) > 4) D.poly(c, [[400 + wind + Math.sign(wind) * 8, 50], [400 + wind, 43], [400 + wind, 57]], ACC);
        if (trail.length) { c.globalAlpha = .4; trail.forEach(([x, y], i) => i % 3 || D.circ(c, x, y, 1.8, '#fff')); c.globalAlpha = 1; }
        if (shell) D.circ(c, shell.x, shell.y, 6, '#fff');
        if (boom) D.circ(c, boom.x, boom.y, 42 * (1 - boom.t), '#ffb34799');
        if (!shell && !A.ended) D.text(c, `${A.names[p]}'s shot`, T[p].x, ty(p) - 42, 17, COL[p]);
        sl.draw(c, !shell && !A.ended ? { x: T[p].x, y: ty(p) - 8, r: 10 } : null, COL[p], { arc: { speed: 620, g: 320 } });
      }
    };
  }
});

/* ---------- Fencing ---------- */
reg({
  id: 'fencing', name: 'Fencing', cat: 'Arcade', icon: '🤺', type: 'real', pad: 'lr a b', btn: { a: 'Lunge', b: 'Parry' },
  desc: 'Lunge, parry, riposte.', help: 'Move left/right. Lunge to stab (it has reach but a short wind-up). Parry right as an attack arrives to stun the attacker. First touch scores; first to 5.',
  make(A) {
    const sc = [0, 0], FY = 400; let P, pause = 0, msg = '';
    const reset = () => { P = [{ x: 280, st: 'idle', t: 0, f: 1 }, { x: 520, st: 'idle', t: 0, f: -1 }]; };
    reset();
    const tip = q => q.x + q.f * (q.st === 'ext' ? 110 : q.st === 'wind' ? 30 : 55);
    return {
      ai(dt, B) {
        if (pause > 0) return B.stop();
        const p = B.p, q = P[p], o = P[1 - p], d = Math.abs(o.x - q.x);
        if (o.st === 'idle' || o.st === 'rec') B.mem.seen = false;
        if (q.st !== 'idle') { B.stop(); return; }
        if (o.st === 'wind' && d < 160 && !B.mem.seen) { B.mem.seen = true; if (B.chance(B.k(.2, .5, .85))) { B.press('b'); return; } }
        const vuln = o.st === 'rec' || o.st === 'stun';
        if (d < 146 && (vuln ? B.chance(B.k(.3, .7, 1)) : B.chance(dt * B.k(.9, 1.3, 1.7)))) { B.press('a'); return; }
        if (B.every('pace', B.k(.5, .35, .25))) B.mem.want = vuln ? 110 : pick([125, 140, 160, 185]);
        const toward = Math.sign(o.x - q.x), delta = d - (B.mem.want || 170);
        B.go(Math.abs(delta) < 10 ? 0 : clamp(delta / 40, -1, 1) * toward * B.k(.7, .9, 1), 0);
      },
      update(dt) {
        if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) {
          const q = P[p]; q.t -= dt;
          if (q.st === 'idle') {
            q.x += A.axis(p)[0] * 210 * dt;
            if (A.hit(p, 'a')) { q.st = 'wind'; q.t = .12; } else if (A.hit(p, 'b')) { q.st = 'parry'; q.t = .22; A.sfx('tick'); }
          } else if (q.t <= 0) {
            if (q.st === 'wind') { q.st = 'ext'; q.t = .16; q.x += q.f * 30; A.sfx('shoot'); }
            else if (q.st === 'ext') { q.st = 'rec'; q.t = .3; }
            else if (q.st === 'parry') { q.st = 'rec'; q.t = .35; }
            else q.st = 'idle';
          }
          q.x = clamp(q.x, 40, 760);
        }
        if (P[1].x - P[0].x < 50) { const m = (P[0].x + P[1].x) / 2; P[0].x = m - 25; P[1].x = m + 25; }
        const hits = [0, 1].map(p => { const q = P[p], o = P[1 - p]; return q.st === 'ext' && (p ? tip(q) < o.x + 12 : tip(q) > o.x - 12); });
        for (let p = 0; p < 2; p++) if (hits[p] && P[1 - p].st === 'parry') { P[p].st = 'stun'; P[p].t = .8; P[p].x -= P[p].f * 40; hits[p] = false; A.sfx('hit'); msg = 'Parried!'; }
        if (hits[0] && hits[1]) { msg = 'Double touch — no point'; pause = 1; A.sfx('bad'); return; }
        for (let p = 0; p < 2; p++) if (hits[p]) { sc[p]++; msg = `Touché — ${A.names[p]}`; pause = 1.1; A.sfx('score'); A.shake(4); if (sc[p] >= 5) A.end(p, `${sc[0]} – ${sc[1]}`); return; }
      },
      draw(c) {
        D.rr(c, -20, FY + 40, 840, 80, 20, '#2b2d4a'); D.rr(c, 60, FY + 36, 680, 6, 3, '#e9ecff55');
        bigScore(c, A, sc, 56, 52);
        P.forEach((q, p) => {
          const x = q.x, y = FY;
          c.globalAlpha = q.st === 'stun' ? .55 : 1; c.lineCap = 'round';
          D.circ(c, x, y - 92, 18, '#e9ecff'); D.rr(c, x - 6 * q.f - 7, y - 108, 14, 24, 6, '#333');
          D.rr(c, x - 16, y - 72, 32, 62, 14, '#e9ecff'); D.rr(c, x - 16, y - 50, 32, 8, 4, COL[p]);
          D.line(c, x - 8, y - 14, x - 8 - q.f * 14, y + 38, '#e9ecff', 10); D.line(c, x + 8, y - 14, x + 8 + q.f * 14, y + 38, '#e9ecff', 10);
          const hy = q.st === 'parry' ? y - 85 : y - 58, hx = x + q.f * 24;
          D.line(c, hx, hy, tip(q), q.st === 'parry' ? y - 122 : y - 62, '#cfd3f0', 4); D.circ(c, hx, hy, 6, COL[p]);
          c.globalAlpha = 1; c.lineCap = 'butt';
        });
        if (pause > 0) D.text(c, msg, 400, 200, 38, ACC, 'center', 'middle', 900);
      }
    };
  }
});
