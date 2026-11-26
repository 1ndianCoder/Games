'use strict';
/* ================= ARCADE ================= */

/* grid direction helper with no-reverse buffering */
function dirQueue() {
  return {
    q: [], push(d) { if (this.q.length < 2) this.q.push(d); },
    next(cur) { while (this.q.length) { const d = this.q.shift(); if (d[0] !== -cur[0] || d[1] !== -cur[1]) return d; } return cur; }
  };
}
const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
function readDirs(A, p, Q) { for (const k in DIRS) if (A.hit(p, k)) Q.push(DIRS[k]); }

/* ---------- Light Cycles ---------- */
reg({
  id: 'cycles', name: 'Light Cycles', cat: 'Arcade', icon: '🏍️', type: 'real', pad: 'dpad',
  desc: 'Leave a wall. Box them in.', help: 'You never stop moving and leave a solid trail. Turn to trap your opponent — crash into any wall or trail and you lose the round. First to 3.',
  make(A) {
    const CW = 80, CH = 50, S = 10, sc = [0, 0]; let g, P, t, msg = '', pause = 0;
    const reset = () => { g = grid2(CW, CH, -1); P = [{ x: 10, y: 25, d: [1, 0], Q: dirQueue() }, { x: 69, y: 24, d: [-1, 0], Q: dirQueue() }]; P.forEach((q, i) => g[q.y][q.x] = i); t = 0; };
    reset();
    return {
      update(dt) {
        if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) readDirs(A, p, P[p].Q);
        t += dt; const step = .045;
        while (t >= step) {
          t -= step;
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
        for (let x = 0; x <= 800; x += 40) D.line(c, x, 0, x, 500, '#1a1e33', 1);
        for (let y = 0; y <= 500; y += 40) D.line(c, 0, y, 800, y, '#1a1e33', 1);
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (g[y][x] >= 0) D.rect(c, x * S + 1, y * S + 1, S - 2, S - 2, COL[g[y][x]]);
        P.forEach((q, i) => { D.glow(c, COL[i], 20); D.rect(c, q.x * S - 2, q.y * S - 2, S + 4, S + 4, '#fff'); D.noglow(c); });
        D.text(c, `${sc[0]}  :  ${sc[1]}`, 400, 24, 22, MUT);
        if (pause > 0) D.text(c, msg, 400, 250, 44, ACC);
      }
    };
  }
});

/* ---------- Snake Duel ---------- */
reg({
  id: 'snake', name: 'Snake Duel', cat: 'Arcade', icon: '🐍', type: 'real', pad: 'dpad',
  desc: 'Eat, grow, don\'t crash.', help: 'Eat fruit to grow. Crash into a wall, yourself or the other snake and you lose. Head-on? Longer snake wins. Reach length 25 to win outright.',
  make(A) {
    const CW = 40, CH = 25, S = 20; const P = [{ b: [[8, 12], [7, 12], [6, 12], [5, 12]], d: [1, 0], Q: dirQueue(), grow: 0 }, { b: [[31, 12], [32, 12], [33, 12], [34, 12]], d: [-1, 0], Q: dirQueue(), grow: 0 }];
    const food = []; let t = 0, n = 0;
    const occ = (x, y) => P.some(s => s.b.some(([a, b]) => a === x && b === y)) || food.some(f => f[0] === x && f[1] === y);
    const addFood = () => { for (let k = 0; k < 100; k++) { const x = rint(1, CW - 2), y = rint(1, CH - 2); if (!occ(x, y)) { food.push([x, y]); return; } } };
    for (let i = 0; i < 3; i++) addFood();
    return {
      update(dt) {
        for (let p = 0; p < 2; p++) readDirs(A, p, P[p].Q);
        t += dt; const step = Math.max(.065, .11 - n * .0008);
        while (t >= step) {
          t -= step; n++;
          const heads = P.map(s => { s.d = s.Q.next(s.d); return [s.b[0][0] + s.d[0], s.b[0][1] + s.d[1]]; });
          P.forEach((s, i) => { const [x, y] = heads[i]; const fi = food.findIndex(f => f[0] === x && f[1] === y); if (fi >= 0) { food.splice(fi, 1); s.grow += 2; A.sfx('coin'); addFood(); } });
          P.forEach(s => { s.b.unshift(heads[P.indexOf(s)]); if (s.grow > 0) s.grow--; else s.b.pop(); });
          const dead = P.map((s, i) => { const [x, y] = s.b[0]; if (x < 0 || y < 0 || x >= CW || y >= CH) return true; return P.some((o, j) => o.b.some(([a, b], k) => (j !== i || k > 0) && a === x && b === y)); });
          if (heads[0][0] === heads[1][0] && heads[0][1] === heads[1][1]) { const l0 = P[0].b.length, l1 = P[1].b.length; dead[0] = l0 <= l1; dead[1] = l1 <= l0; }
          if (dead[0] || dead[1]) { A.sfx('boom'); A.shake(6); return A.end(dead[0] && dead[1] ? -1 : dead[0] ? 1 : 0, 'Crash!'); }
          for (let i = 0; i < 2; i++) if (P[i].b.length >= 25) return A.end(i, 'Longest snake!');
        }
      },
      draw(c) {
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if ((x + y) % 2) D.rect(c, x * S, y * S, S, S, '#12142a');
        food.forEach(([x, y]) => D.glyph(c, 'diamond', x * S + S / 2, y * S + S / 2, 8, ACC));
        P.forEach((s, i) => s.b.forEach(([x, y], k) => D.rr(c, x * S + 1, y * S + 1, S - 2, S - 2, k ? 5 : 8, k ? COL[i] + (k % 2 ? 'cc' : 'ff') : '#fff', k ? null : COL[i], 3)));
        D.text(c, `${P[0].b.length}`, 30, 20, 18, COL[0]); D.text(c, `${P[1].b.length}`, 770, 20, 18, COL[1]);
      }
    };
  }
});

/* ---------- Tanks ---------- */
reg({
  id: 'tanks', name: 'Tank Duel', cat: 'Arcade', icon: '🛡️', type: 'real', pad: 'dpad a', btn: { a: 'Fire' },
  desc: 'Ricochet shots in a maze.', help: 'Up/down drive, left/right rotate, action to fire. Shells bounce off walls — and can hit you too! First to 5.',
  make(A) {
    const W = [[150, 100, 20, 130], [630, 270, 20, 130], [300, 240, 200, 20], [390, 50, 20, 110], [390, 340, 20, 110], [130, 380, 140, 20], [530, 100, 140, 20]];
    const sc = [0, 0]; let T, bul = [], pause = 0, msg = '';
    const reset = () => { T = [{ x: 70, y: 250, a: 0, r: 16, cd: 0 }, { x: 730, y: 250, a: Math.PI, r: 16, cd: 0 }]; bul = []; };
    reset();
    const walls = o => { let h = false; for (const w of W) h = rectBounce(o, ...w, 1) || h; return h; };
    return {
      update(dt) {
        if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) {
          const t = T[p]; t.cd -= dt;
          t.a += (A.get(p, 'r') - A.get(p, 'l')) * 3 * dt;
          const mv = (A.get(p, 'u') - A.get(p, 'd') * .7) * 150 * dt; t.x = clamp(t.x + Math.cos(t.a) * mv, 16, 784); t.y = clamp(t.y + Math.sin(t.a) * mv, 16, 484);
          const o = { x: t.x, y: t.y, r: t.r, vx: 0, vy: 0 }; walls(o); t.x = o.x; t.y = o.y;
          if (A.hit(p, 'a') && t.cd <= 0 && bul.filter(b => b.p === p).length < 4) { bul.push({ p, x: t.x + Math.cos(t.a) * 24, y: t.y + Math.sin(t.a) * 24, vx: Math.cos(t.a) * 320, vy: Math.sin(t.a) * 320, r: 4, life: 6, age: 0 }); t.cd = .25; A.sfx('shoot'); }
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
            if (dist(b.x, b.y, T[p].x, T[p].y) < T[p].r + 3) {
              const w = 1 - p; sc[w]++; msg = b.p === p ? `${A.names[p]} hit themselves!` : `${A.names[w]} scores`; pause = 1.3; A.sfx('boom'); A.shake(8); bul = [];
              if (sc[w] >= 5) A.end(w, `${sc[0]} – ${sc[1]}`); return;
            }
          }
        }
      },
      draw(c) {
        for (const w of W) D.rr(c, ...w, 4, '#3a4070');
        bigScore(c, A, sc, 22, 24);
        T.forEach((t, p) => { c.save(); c.translate(t.x, t.y); c.rotate(t.a); D.rr(c, -16, -14, 32, 28, 6, COL[p]); D.rect(c, -16, -16, 32, 5, COLD[p]); D.rect(c, -16, 11, 32, 5, COLD[p]); D.circ(c, 0, 0, 8, COLD[p]); D.rect(c, 0, -3, 24, 6, COLD[p]); c.restore(); });
        bul.forEach(b => { D.glow(c, COL[b.p], 10); D.circ(c, b.x, b.y, b.r, '#fff'); D.noglow(c); });
        if (pause > 0) D.text(c, msg, 400, 250, 36, ACC);
      }
    };
  }
});

/* ---------- Space Duel ---------- */
reg({
  id: 'space', name: 'Star Duel', cat: 'Arcade', icon: '🚀', type: 'real', pad: 'dpad a', btn: { a: 'Fire' },
  desc: 'Dogfight around a deadly star.', help: 'Left/right rotate, up thrusts, action fires. The star pulls you in — touch it and you burn. Screen edges wrap. First to 5.',
  make(A) {
    const sc = [0, 0], SX = 400, SY = 250; let S, bul, pause = 0, msg = '', t = 0;
    const reset = () => { S = [{ x: 120, y: 250, a: -Math.PI / 2, vx: 0, vy: 90, cd: 0, th: 0 }, { x: 680, y: 250, a: Math.PI / 2, vx: 0, vy: -90, cd: 0, th: 0 }]; bul = []; };
    reset();
    const stars = Array.from({ length: 80 }, () => [rand(800), rand(500), rand(.3, 1)]);
    const kill = (p, m) => { const w = 1 - p; sc[w]++; msg = m; pause = 1.4; A.sfx('boom'); A.shake(8); if (sc[w] >= 5) A.end(w, `${sc[0]} – ${sc[1]}`); };
    return {
      update(dt) {
        t += dt; if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) {
          const s = S[p]; s.cd -= dt;
          s.a += (A.get(p, 'r') - A.get(p, 'l')) * 4 * dt; s.th = A.get(p, 'u');
          if (s.th) { s.vx += Math.cos(s.a) * 260 * dt; s.vy += Math.sin(s.a) * 260 * dt; }
          const d = Math.max(30, dist(s.x, s.y, SX, SY)), g = Math.min(400, 1.5e6 / (d * d));
          s.vx += (SX - s.x) / d * g * dt; s.vy += (SY - s.y) / d * g * dt;
          const sp = Math.hypot(s.vx, s.vy); if (sp > 380) { s.vx *= 380 / sp; s.vy *= 380 / sp; }
          s.x = (s.x + s.vx * dt + 800) % 800; s.y = (s.y + s.vy * dt + 500) % 500;
          if (A.hit(p, 'a') && s.cd <= 0) { bul.push({ p, x: s.x + Math.cos(s.a) * 16, y: s.y + Math.sin(s.a) * 16, vx: s.vx + Math.cos(s.a) * 420, vy: s.vy + Math.sin(s.a) * 420, life: 1.5 }); s.cd = .28; A.sfx('shoot'); }
          if (dist(s.x, s.y, SX, SY) < 30) return kill(p, `${A.names[p]} burned up!`);
        }
        if (dist(S[0].x, S[0].y, S[1].x, S[1].y) < 24) { pause = 1.4; msg = 'Collision!'; A.sfx('boom'); return; }
        for (let i = bul.length - 1; i >= 0; i--) {
          const b = bul[i]; b.life -= dt; b.x = (b.x + b.vx * dt + 800) % 800; b.y = (b.y + b.vy * dt + 500) % 500;
          if (b.life <= 0 || dist(b.x, b.y, SX, SY) < 24) { bul.splice(i, 1); continue; }
          const o = 1 - b.p; if (dist(b.x, b.y, S[o].x, S[o].y) < 14) return kill(o, `${A.names[b.p]} scores`);
        }
      },
      draw(c) {
        stars.forEach(([x, y, a]) => { c.globalAlpha = a; D.rect(c, x, y, 2, 2, '#fff'); }); c.globalAlpha = 1;
        D.glow(c, '#ffb347', 40 + Math.sin(t * 4) * 8); D.circ(c, SX, SY, 24, '#ffd166'); D.noglow(c);
        bigScore(c, A, sc, 22, 24);
        S.forEach((s, p) => {
          c.save(); c.translate(s.x, s.y); c.rotate(s.a);
          if (s.th && pause <= 0) D.poly(c, [[-10, -5], [-10 - rand(8, 16), 0], [-10, 5]], ACC);
          D.poly(c, [[16, 0], [-10, -10], [-5, 0], [-10, 10]], COL[p]); c.restore();
        });
        bul.forEach(b => D.circ(c, b.x, b.y, 3, COL[b.p]));
        if (pause > 0) D.text(c, msg, 400, 150, 34, ACC);
      }
    };
  }
});

/* ---------- Flappy Duel ---------- */
reg({
  id: 'flappy', name: 'Flap Off', cat: 'Arcade', icon: '🐦', type: 'real', pad: 'one', btn: { a: 'Flap' },
  desc: 'Same pipes. Last bird flying.', help: 'Tap your button to flap. Fly through the gaps. Hit a pipe or the ground and you\'re out — last bird flying wins.',
  make(A) {
    const B = [{ x: 250, y: 200, vy: 0, dead: false }, { x: 250, y: 290, vy: 0, dead: false }], pipes = []; let t = 1, sp = 190, dist0 = 0;
    return {
      update(dt) {
        sp += dt * 3; dist0 += sp * dt; t -= dt;
        if (t <= 0) { pipes.push({ x: 820, gy: rand(110, 370), gap: Math.max(125, 175 - dist0 / 400) }); t = 1.45; }
        pipes.forEach(p => p.x -= sp * dt); while (pipes.length && pipes[0].x < -80) pipes.shift();
        for (let p = 0; p < 2; p++) {
          const b = B[p]; if (b.dead) { b.vy += 1400 * dt; b.y = Math.min(480, b.y + b.vy * dt); b.x -= sp * dt; continue; }
          if (A.hit(p, 'a')) { b.vy = -410; A.sfx('tick'); }
          b.vy += 1400 * dt; b.y += b.vy * dt; if (b.y < 14) { b.y = 14; b.vy = 0; }
          if (b.y > 466) b.dead = true;
          for (const pp of pipes) if (b.x + 13 > pp.x && b.x - 13 < pp.x + 64 && (b.y - 13 < pp.gy - pp.gap / 2 || b.y + 13 > pp.gy + pp.gap / 2)) b.dead = true;
          if (b.dead) { A.sfx('bad'); A.shake(4); }
        }
        if (B[0].dead || B[1].dead) A.end(B[0].dead && B[1].dead ? -1 : B[0].dead ? 1 : 0, `${Math.floor(dist0 / 100)} m flown`);
      },
      draw(c) {
        D.rect(c, 0, 0, 800, 500, '#1a2d4a');
        pipes.forEach(p => { D.rr(c, p.x, -10, 64, p.gy - p.gap / 2 + 10, 8, '#4caf6e'); D.rr(c, p.x, p.gy + p.gap / 2, 64, 500, 8, '#4caf6e'); });
        D.rect(c, 0, 480, 800, 20, '#5a3b26');
        B.forEach((b, p) => { c.save(); c.translate(b.x, b.y); c.rotate(clamp(b.vy / 700, -.5, 1.2)); D.circ(c, 0, 0, 14, COL[p]); D.circ(c, 6, -4, 4, '#fff'); D.poly(c, [[12, 0], [22, 3], [12, 6]], ACC); D.rr(c, -10, -2, 10, 6, 3, COLD[p]); c.restore(); });
        D.text(c, `${Math.floor(dist0 / 100)} m`, 400, 30, 24, '#fff');
      }
    };
  }
});

/* ---------- Bomber ---------- */
reg({
  id: 'bomber', name: 'Bomb Duel', cat: 'Arcade', icon: '💣', type: 'real', pad: 'dpad a', btn: { a: 'Bomb' },
  desc: 'Blast blocks, trap your rival.', help: 'Move through the maze and drop bombs. Explosions blow up crates and chain other bombs. Crates may hide power-ups (flame = range, bomb = more bombs). Catch your opponent in a blast!',
  make(A) {
    const C = 15, R = 11, S = 44, X0 = 70, Y0 = 8; const g = grid2(C, R, 0); // 0 empty 1 pillar 2 crate
    const items = grid2(C, R, 0), fire = grid2(C, R, 0), bombs = [];
    for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) { if (i % 2 && j % 2) g[j][i] = 1; else if (rand() < .6 && !((i + j < 3) || (C - 1 - i + R - 1 - j < 3))) g[j][i] = 2; }
    const P = [{ i: 0, j: 0, x: 0, y: 0, tx: 0, ty: 0, t: 1, max: 1, range: 2, dead: false }, { i: C - 1, j: R - 1, x: C - 1, y: R - 1, tx: C - 1, ty: R - 1, t: 1, max: 1, range: 2, dead: false }];
    const free = (i, j) => i >= 0 && j >= 0 && i < C && j < R && g[j][i] === 0 && !bombs.some(b => b.i === i && b.j === j);
    const explode = b => {
      b.done = true; A.sfx('boom'); A.shake(4); fire[b.j][b.i] = .45;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= b.r; k++) {
        const i = b.i + dx * k, j = b.j + dy * k; if (i < 0 || j < 0 || i >= C || j >= R || g[j][i] === 1) break;
        fire[j][i] = .45; const ob = bombs.find(o => o.i === i && o.j === j && !o.done); if (ob) ob.t = Math.min(ob.t, .05);
        if (g[j][i] === 2) { g[j][i] = 0; if (rand() < .3) items[j][i] = rand() < .5 ? 1 : 2; break; }
        items[j][i] = 0;
      }
    };
    return {
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
        bombs.forEach(b => { b.t -= dt; }); for (let k = 0; k < 4; k++) bombs.forEach(b => { if (b.t <= 0 && !b.done) explode(b); });
        for (let k = bombs.length - 1; k >= 0; k--) if (bombs[k].done) bombs.splice(k, 1);
        for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) if (fire[j][i] > 0) fire[j][i] -= dt;
        P.forEach(q => { const ci = Math.round(q.x), cj = Math.round(q.y); if (!q.dead && fire[cj][ci] > 0) q.dead = true; });
        if (P[0].dead || P[1].dead) A.end(P[0].dead && P[1].dead ? -1 : P[0].dead ? 1 : 0, 'Boom!');
      },
      draw(c) {
        D.rect(c, X0, Y0, C * S, R * S, '#1f3b2e');
        for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
          const x = X0 + i * S, y = Y0 + j * S;
          if (g[j][i] === 1) D.rr(c, x + 2, y + 2, S - 4, S - 4, 6, '#4a5080');
          else if (g[j][i] === 2) { D.rr(c, x + 3, y + 3, S - 6, S - 6, 4, '#a0703f'); D.line(c, x + 8, y + 8, x + S - 8, y + S - 8, '#7a522a', 3); }
          else if (items[j][i]) { D.circ(c, x + S / 2, y + S / 2, 15, '#0006'); D.glyph(c, items[j][i] === 1 ? 'flame' : 'bomb', x + S / 2, y + S / 2, 10, items[j][i] === 1 ? '#ff9f43' : '#ecebe6'); }
          if (fire[j][i] > 0) D.rr(c, x + 2, y + 2, S - 4, S - 4, 10, `rgba(255,${120 + fire[j][i] * 200 | 0},60,.9)`);
        }
        bombs.forEach(b => { const x = X0 + (b.i + .5) * S, y = Y0 + (b.j + .5) * S, pl = 1 + Math.sin(b.t * 14) * .08; D.circ(c, x, y + 2, 15 * pl, '#111', COL[b.p], 3); D.circ(c, x + 6, y - 12, 3, b.t % .3 < .15 ? ACC : '#f80'); });
        P.forEach((q, p) => { if (q.dead) return; const x = X0 + (q.x + .5) * S, y = Y0 + (q.y + .5) * S; D.circ(c, x, y, 16, COL[p], '#fff', 3); D.circ(c, x - 5, y - 3, 3, '#fff'); D.circ(c, x + 5, y - 3, 3, '#fff'); });
        for (let p = 0; p < 2; p++) { const x = p ? 765 : 35; D.glyph(c, 'flame', x, 220, 7, COL[p]); D.text(c, P[p].range, x, 238, 12, COL[p]); D.glyph(c, 'bomb', x, 262, 7, COL[p]); D.text(c, P[p].max, x, 280, 12, COL[p]); }
      }
    };
  }
});

/* ---------- Paint Wars ---------- */
reg({
  id: 'paint', name: 'Paint Wars', cat: 'Arcade', icon: '🖌️', type: 'real', pad: 'dpad a', btn: { a: 'Splat' },
  desc: 'Cover the most ground in 40s.', help: 'Run around to paint tiles your color. Action button throws a splat (big area, 4s cooldown). Whoever owns the most tiles when time runs out wins.',
  make(A) {
    const CW = 32, CH = 19, S = 25, Y0 = 25; const g = grid2(CW, CH, -1); let T = 40, t = 0;
    const P = [{ x: 3, y: 9, cd: 0 }, { x: 28, y: 9, cd: 0 }];
    const paint = (x, y, p) => { if (x >= 0 && y >= 0 && x < CW && y < CH) g[y][x] = p; };
    return {
      update(dt) {
        T -= dt; t += dt;
        for (let p = 0; p < 2; p++) { const q = P[p]; q.cd -= dt; if (A.hit(p, 'a') && q.cd <= 0) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) paint(q.x + dx, q.y + dy, p); q.cd = 4; A.sfx('boom'); } }
        while (t >= .085) {
          t -= .085;
          for (let p = 0; p < 2; p++) { const q = P[p]; const [dx, dy] = A.get(p, 'u') ? [0, -1] : A.get(p, 'd') ? [0, 1] : A.get(p, 'l') ? [-1, 0] : A.get(p, 'r') ? [1, 0] : [0, 0]; q.x = clamp(q.x + dx, 0, CW - 1); q.y = clamp(q.y + dy, 0, CH - 1); paint(q.x, q.y, p); }
        }
        if (T <= 0) { const n = [0, 1].map(p => g.flat().filter(v => v === p).length); A.end(n[0] === n[1] ? -1 : n[0] > n[1] ? 0 : 1, `${n[0]} vs ${n[1]} tiles`); }
      },
      draw(c) {
        const n = [0, 1].map(p => g.flat().filter(v => v === p).length), tot = CW * CH;
        D.rect(c, 0, 0, 800 * n[0] / tot, 18, COL[0]); D.rect(c, 800 - 800 * n[1] / tot, 0, 800 * n[1] / tot, 18, COL[1]);
        D.text(c, Math.max(0, Math.ceil(T)), 400, 10, 14, '#fff');
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) D.rr(c, x * S + 1, Y0 + y * S + 1, S - 2, S - 2, 4, g[y][x] < 0 ? BG2 : COL[g[y][x]] + 'bb');
        P.forEach((q, p) => { D.circ(c, q.x * S + S / 2, Y0 + q.y * S + S / 2, 11, '#fff', COL[p], 4); if (q.cd > 0) D.circ(c, q.x * S + S / 2, Y0 + q.y * S + S / 2, 16, null, '#fff4', 2); });
      }
    };
  }
});

/* ---------- Coin Grab ---------- */
reg({
  id: 'coins', name: 'Coin Rush', cat: 'Arcade', icon: '🪙', type: 'real', pad: 'dpad a', btn: { a: 'Dash' },
  desc: 'Grab more coins in 30 seconds.', help: 'Collect coins (gold = 1, gems = 3). Dash with the action button to get there first — or to shove your rival away. Most points after 30 seconds wins.',
  make(A) {
    const P = [{ x: 200, y: 250, vx: 0, vy: 0, r: 18, im: 1, cd: 0, s: 0 }, { x: 600, y: 250, vx: 0, vy: 0, r: 18, im: 1, cd: 0, s: 0 }], coins = []; let T = 30, sp = 0;
    const add = () => coins.push({ x: rand(40, 760), y: rand(60, 470), v: rand() < .12 ? 3 : 1, t: 0 });
    for (let i = 0; i < 5; i++) add();
    return {
      update(dt) {
        T -= dt; sp -= dt; if (sp <= 0 && coins.length < 7) { add(); sp = .6; }
        for (let p = 0; p < 2; p++) {
          const q = P[p], [dx, dy] = dir(A, p); q.cd -= dt;
          q.vx = lerp(q.vx, dx * 280, Math.min(1, dt * 8)); q.vy = lerp(q.vy, dy * 280, Math.min(1, dt * 8));
          if (A.hit(p, 'a') && q.cd <= 0 && (dx || dy)) { q.vx = dx * 800; q.vy = dy * 800; q.cd = 1.2; A.sfx('shoot'); }
          q.x = clamp(q.x + q.vx * dt, 18, 782); q.y = clamp(q.y + q.vy * dt, 48, 482);
          for (let i = coins.length - 1; i >= 0; i--) if (dist(q.x, q.y, coins[i].x, coins[i].y) < 30) { q.s += coins[i].v; coins.splice(i, 1); A.sfx('coin'); }
        }
        if (collide(P[0], P[1], 1.2)) A.sfx('bounce');
        coins.forEach(c => c.t += dt);
        if (T <= 0) A.end(P[0].s === P[1].s ? -1 : P[0].s > P[1].s ? 0 : 1, `${P[0].s} – ${P[1].s}`);
      },
      draw(c) {
        D.text(c, P[0].s, 40, 20, 28, COL[0]); D.text(c, P[1].s, 760, 20, 28, COL[1]); D.text(c, `⏱ ${Math.max(0, Math.ceil(T))}`, 400, 20, 22, T < 5 ? COL[0] : TXT);
        coins.forEach(k => { const s = 1 + Math.sin(k.t * 6) * .1; k.v > 1 ? D.glyph(c, 'diamond', k.x, k.y, 13 * s, '#7fe3ff') : D.circ(c, k.x, k.y, 10 * s, ACC, '#c99a2e', 3); });
        P.forEach((q, p) => { D.circ(c, q.x, q.y + 3, q.r, '#0005'); D.circ(c, q.x, q.y, q.r, COL[p], q.cd > .9 ? '#fff' : null, 3); });
      }
    };
  }
});

/* ---------- Hot Potato ---------- */
reg({
  id: 'potato', name: 'Hot Potato', cat: 'Arcade', icon: '🥔', type: 'real', pad: 'dpad',
  desc: 'Pass the bomb before it blows.', help: 'One player holds the bomb. Touch your opponent to pass it on. Whoever holds it when the fuse runs out loses the round. The holder is a bit faster. First to 3.',
  make(A) {
    const sc = [0, 0], O = [[400, 250, 40], [200, 130, 26], [600, 370, 26], [200, 370, 26], [600, 130, 26]].map(([x, y, r]) => ({ x, y, r, im: 0, vx: 0, vy: 0 }));
    let P, it, fuse, F, imm, pause = 0, msg = '';
    const reset = () => { P = [{ x: 80, y: 250, vx: 0, vy: 0, r: 18, im: 1 }, { x: 720, y: 250, vx: 0, vy: 0, r: 18, im: 1 }]; it = rint(0, 1); F = fuse = rand(10, 16); imm = 1; };
    reset();
    return {
      update(dt) {
        if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        fuse -= dt; imm -= dt;
        for (let p = 0; p < 2; p++) {
          const q = P[p], [dx, dy] = dir(A, p), s = p === it ? 275 : 250; q.vx = dx * s; q.vy = dy * s;
          q.x = clamp(q.x + q.vx * dt, 18, 782); q.y = clamp(q.y + q.vy * dt, 18, 482); O.forEach(o => collide(o, q, 0));
        }
        if (dist(P[0].x, P[0].y, P[1].x, P[1].y) < 38) { if (imm <= 0) { it = 1 - it; imm = .7; A.sfx('hit'); } collide(P[0], P[1], 0); }
        if (Math.floor(fuse * 4) !== Math.floor((fuse + dt) * 4)) A.sfx('tick');
        if (fuse <= 0) { const w = 1 - it; sc[w]++; msg = `${A.names[it]} got toasted!`; pause = 1.6; A.sfx('boom'); A.shake(10); if (sc[w] >= 3) A.end(w, `${sc[0]} – ${sc[1]}`); }
      },
      draw(c) {
        O.forEach(o => D.circ(c, o.x, o.y, o.r, '#2b3050'));
        bigScore(c, A, sc, 22, 24);
        P.forEach((q, p) => { D.circ(c, q.x, q.y, q.r, COL[p]); if (p === it && pause <= 0) { D.circ(c, q.x, q.y - 30, 12, '#222', ACC, 2); D.line(c, q.x + 6, q.y - 40, q.x + 12, q.y - 48, '#c99a2e', 3); D.circ(c, q.x + 12, q.y - 49, 3 + rand(3), '#ff9f43'); } });
        D.rr(c, 250, 480, 300, 8, 4, BG2); D.rr(c, 250, 480, 300 * Math.max(0, fuse) / F, 8, 4, '#ff9f43');
        if (pause > 0) D.text(c, msg, 400, 250, 38, ACC);
      }
    };
  }
});

/* ---------- King of the Hill ---------- */
reg({
  id: 'koth', name: 'King of the Hill', cat: 'Arcade', icon: '👑', type: 'real', pad: 'dpad a', btn: { a: 'Dash' },
  desc: 'Hold the zone alone.', help: 'Stand in the glowing zone ALONE to earn time. Shove your rival out (dash with the action button). The zone moves every few seconds. First to 10 seconds wins.',
  make(A) {
    const P = [{ x: 150, y: 250, vx: 0, vy: 0, r: 20, im: 1, cd: 0 }, { x: 650, y: 250, vx: 0, vy: 0, r: 20, im: 1, cd: 0 }], s = [0, 0]; let z = { x: 400, y: 250, r: 70 }, zt = 7, zx = 400, zy = 250;
    return {
      update(dt) {
        zt -= dt; if (zt <= 0) { zx = rand(120, 680); zy = rand(120, 400); zt = 7; A.sfx('go'); }
        z.x = lerp(z.x, zx, dt * 1.5); z.y = lerp(z.y, zy, dt * 1.5);
        for (let p = 0; p < 2; p++) {
          const q = P[p], [dx, dy] = dir(A, p); q.cd -= dt;
          q.vx += dx * 1100 * dt; q.vy += dy * 1100 * dt;
          if (A.hit(p, 'a') && q.cd <= 0) { const m = (dx || dy) ? [dx, dy] : [Math.sign(q.vx) || 1, 0]; q.vx += m[0] * 600; q.vy += m[1] * 600; q.cd = 1.1; A.sfx('shoot'); }
          const f = Math.pow(.05, dt); q.vx *= f; q.vy *= f; q.x = clamp(q.x + q.vx * dt, 20, 780); q.y = clamp(q.y + q.vy * dt, 20, 480);
        }
        if (collide(P[0], P[1], 1.3)) A.sfx('hit');
        const inn = P.map(q => dist(q.x, q.y, z.x, z.y) < z.r);
        if (inn[0] !== inn[1]) { const p = inn[0] ? 0 : 1; s[p] += dt; if (s[p] >= 10) A.end(p, `${s[0].toFixed(1)} – ${s[1].toFixed(1)} s`); }
      },
      draw(c) {
        const inn = P.map(q => dist(q.x, q.y, z.x, z.y) < z.r), own = inn[0] !== inn[1] ? (inn[0] ? 0 : 1) : -1;
        D.circ(c, zx, zy, 70, null, '#ffffff18', 2);
        D.glow(c, own >= 0 ? COL[own] : ACC, 30); D.circ(c, z.x, z.y, z.r, (own >= 0 ? COL[own] : ACC) + '33', own >= 0 ? COL[own] : ACC, 4); D.noglow(c);
        D.glyph(c, 'crown', z.x, z.y, 14, own >= 0 ? COL[own] : ACC);
        for (let p = 0; p < 2; p++) { D.rr(c, p ? 450 : 50, 15, 300, 14, 7, BG2); D.rr(c, p ? 750 - 300 * s[p] / 10 : 50, 15, 300 * s[p] / 10, 14, 7, COL[p]); }
        P.forEach((q, p) => { D.circ(c, q.x, q.y + 3, q.r, '#0005'); D.circ(c, q.x, q.y, q.r, COL[p], q.cd > .8 ? '#fff' : null, 3); });
      }
    };
  }
});

/* ---------- Meteor Dodge ---------- */
reg({
  id: 'meteor', name: 'Meteor Dodge', cat: 'Arcade', icon: '☄️', type: 'real', pad: 'lr',
  desc: 'Last one standing.', help: 'Meteors rain down — watch the warning marks on the ground. Move left/right to dodge (you can bump each other!). Get hit and you\'re out.',
  make(A) {
    const P = [{ x: 300, y: 450, vx: 0, vy: 0, r: 16, im: 1, dead: false }, { x: 500, y: 450, vx: 0, vy: 0, r: 16, im: 1, dead: false }], M = []; let t = 0, sp = .6, el = 0;
    return {
      update(dt) {
        el += dt; t -= dt; if (t <= 0) { M.push({ x: rand(20, 780), y: -30, v: rand(250, 420) + el * 8, r: rand(14, 26) }); t = Math.max(.12, sp - el * .012); }
        for (let p = 0; p < 2; p++) { const q = P[p]; if (q.dead) continue; q.vx = (A.get(p, 'r') - A.get(p, 'l')) * 330; q.x = clamp(q.x + q.vx * dt, 16, 784); }
        if (!P[0].dead && !P[1].dead) { collide(P[0], P[1], .2); P.forEach(q => { q.y = 450; q.vy = 0; }); }
        for (let i = M.length - 1; i >= 0; i--) {
          const m = M[i]; m.y += m.v * dt; if (m.y > 520) { M.splice(i, 1); A.sfx('tick'); continue; }
          P.forEach(q => { if (!q.dead && dist(q.x, q.y, m.x, m.y) < q.r + m.r - 4) { q.dead = true; A.sfx('boom'); A.shake(6); } });
        }
        if (P[0].dead || P[1].dead) A.end(P[0].dead && P[1].dead ? -1 : P[0].dead ? 1 : 0, `Survived ${el.toFixed(1)} s`);
      },
      draw(c) {
        D.rect(c, 0, 466, 800, 34, '#3a2f52');
        M.forEach(m => { c.globalAlpha = clamp(m.y / 400, .15, .6); D.rr(c, m.x - m.r, 468, m.r * 2, 5, 2, '#ff4f6d'); c.globalAlpha = 1; D.line(c, m.x, m.y - m.r * 3, m.x, m.y, '#ff9f4355', m.r); D.circ(c, m.x, m.y, m.r, '#c0703f', '#ffb36b', 3); });
        P.forEach((q, p) => { if (q.dead) return; D.rr(c, q.x - 16, q.y - 18, 32, 34, 10, COL[p]); D.circ(c, q.x - 5, q.y - 6, 3, '#fff'); D.circ(c, q.x + 5, q.y - 6, 3, '#fff'); });
        D.text(c, `${el.toFixed(1)} s`, 400, 26, 22, MUT);
      }
    };
  }
});

/* ---------- Brick Battle ---------- */
reg({
  id: 'bricks', name: 'Brick Battle', cat: 'Arcade', icon: '🧱', type: 'real', pad: 'ud',
  desc: 'Pong meets breakout.', help: 'Defend your wall of bricks with your paddle. The ball smashes bricks — once it breaks through your wall and hits the edge, you lose.',
  make(A) {
    const br = []; for (let s = 0; s < 2; s++) for (let col = 0; col < 2; col++) for (let k = 0; k < 10; k++) br.push({ s, x: s ? 760 - col * 26 : 14 + col * 26, y: k * 50 + 2, w: 22, h: 46 });
    const P = [{ y: 250 }, { y: 250 }], PH = 80;
    const balls = [{ x: 400, y: 250, vx: (A.first ? 1 : -1) * 320, vy: rand(-200, 200), r: 8 }];
    return {
      update(dt) {
        for (let p = 0; p < 2; p++) P[p].y = clamp(P[p].y + (A.get(p, 'd') - A.get(p, 'u')) * 460 * dt, PH / 2, 500 - PH / 2);
        for (const b of balls) for (let s = 0; s < 4; s++) {
          b.x += b.vx * dt / 4; b.y += b.vy * dt / 4;
          if (b.y < b.r || b.y > 500 - b.r) { b.vy *= -1; b.y = clamp(b.y, b.r, 500 - b.r); }
          for (let p = 0; p < 2; p++) {
            const px = p ? 715 : 85;
            if (Math.abs(b.x - px) < 7 + b.r && Math.abs(b.y - P[p].y) < PH / 2 + b.r && (p ? b.vx > 0 : b.vx < 0)) { const off = (b.y - P[p].y) / (PH / 2), sp = Math.min(Math.hypot(b.vx, b.vy) * 1.04, 900); b.vx = Math.cos(off) * sp * (p ? -1 : 1); b.vy = Math.sin(off) * sp; A.sfx('hit'); }
          }
          for (let i = br.length - 1; i >= 0; i--) { const k = br[i]; if (rectBounce(b, k.x, k.y, k.w, k.h, 1)) { br.splice(i, 1); A.sfx('bounce'); A.shake(2); break; } }
          if (b.x < 0 || b.x > 800) { return A.end(b.x < 0 ? 1 : 0, 'Wall breached!'); }
        }
      },
      draw(c) {
        br.forEach(k => D.rr(c, k.x, k.y, k.w, k.h, 4, COL[k.s] + 'aa'));
        for (let p = 0; p < 2; p++) D.rr(c, (p ? 715 : 85) - 7, P[p].y - PH / 2, 14, PH, 7, COL[p]);
        balls.forEach(b => { D.glow(c, '#fff', 12); D.circ(c, b.x, b.y, b.r, '#fff'); D.noglow(c); });
        D.line(c, 400, 0, 400, 500, '#ffffff10', 2);
      }
    };
  }
});

/* ---------- Gravity Run ---------- */
reg({
  id: 'gravity', name: 'Gravity Flip', cat: 'Arcade', icon: '🔃', type: 'real', pad: 'one', btn: { a: 'Flip' },
  desc: 'Flip gravity, dodge spikes.', help: 'Your runner auto-runs. Press your button to flip gravity between floor and ceiling. Both lanes get the same obstacles. Crash and you lose!',
  make(A) {
    const LN = [{ top: 30, bot: 240 }, { top: 260, bot: 470 }], R = [0, 1].map(p => ({ y: LN[p].bot - 14, g: 1, vy: 0, dead: false, on: true })), obs = []; let sp = 260, t = .5, el = 0, d = 0;
    return {
      update(dt) {
        el += dt; sp += dt * 6; d += sp * dt; t -= dt;
        if (t <= 0) { const side = rand() < .5 ? 1 : -1, h = rand(40, 110); obs.push({ x: 820, w: rand(24, 44), side, h }); t = Math.max(.42, rand(.6, 1.1) - el * .01); }
        obs.forEach(o => o.x -= sp * dt); while (obs.length && obs[0].x < -60) obs.shift();
        for (let p = 0; p < 2; p++) {
          const r = R[p], L = LN[p]; if (r.dead) continue;
          if (A.hit(p, 'a') && r.on) { r.g *= -1; r.on = false; A.sfx('tick'); }
          r.vy += r.g * 2600 * dt; r.y += r.vy * dt;
          if (r.y > L.bot - 14) { r.y = L.bot - 14; r.vy = 0; r.on = true; } if (r.y < L.top + 14) { r.y = L.top + 14; r.vy = 0; r.on = true; }
          for (const o of obs) { const oy = o.side > 0 ? L.bot - o.h : L.top, oh = o.h; if (150 + 12 > o.x && 150 - 12 < o.x + o.w && r.y + 12 > oy && r.y - 12 < oy + oh) { r.dead = true; A.sfx('boom'); A.shake(5); } }
        }
        if (R[0].dead || R[1].dead) A.end(R[0].dead && R[1].dead ? -1 : R[0].dead ? 1 : 0, `${Math.floor(d / 50)} m`);
      },
      draw(c) {
        for (let p = 0; p < 2; p++) {
          const L = LN[p]; D.rect(c, 0, L.top, 800, L.bot - L.top, BG2); D.rect(c, 0, L.top - 4, 800, 4, COL[p]); D.rect(c, 0, L.bot, 800, 4, COL[p]);
          obs.forEach(o => { const oy = o.side > 0 ? L.bot - o.h : L.top; D.rr(c, o.x, oy, o.w, o.h, 4, '#ffd166'); });
          const r = R[p]; if (!r.dead) { c.save(); c.translate(150, r.y); c.rotate(d / 30 * r.g); D.rr(c, -12, -12, 24, 24, 5, COL[p]); c.restore(); }
          D.text(c, A.names[p], 20, L.top + 18, 14, COL[p], 'left');
        }
        D.text(c, `${Math.floor(d / 50)} m`, 780, 15, 14, MUT, 'right');
      }
    };
  }
});

/* ---------- Artillery ---------- */
reg({
  id: 'artillery', name: 'Artillery', cat: 'Arcade', icon: '💥', type: 'turn',
  desc: 'Mind the wind. Blow up the hill.', help: 'Drag back from your cannon and release to fire (like a slingshot). Watch the wind arrow! Shells carve the terrain. Score a direct-ish hit to win.',
  make(A) {
    const hgt = new Float32Array(801), a1 = rand(6), a2 = rand(6);
    for (let x = 0; x <= 800; x++) hgt[x] = 340 + Math.sin(x / 130 + a1) * 50 + Math.sin(x / 47 + a2) * 18 - Math.exp(-((x - 400) ** 2) / 12000) * 120;
    const T = [{ x: 90 }, { x: 710 }], sl = Sling(180); let p = A.first, shell = null, wind = rand(-70, 70), boom = null, trail = []; A.turn(p);
    const ty = q => hgt[Math.round(T[q].x)] - 10;
    return {
      down(x, y) { if (!shell) sl.down(x, y); },
      move(x, y) { sl.move(x, y); }, cancel() { sl.cancel(); },
      up() {
        if (shell) return sl.cancel(); const r = sl.up(); if (!r) return; const ox = T[p].x, oy = ty(p) - 8, pw = 620 * r.t;
        shell = { x: ox, y: oy, vx: r.nx * pw, vy: r.ny * pw, age: 0, r: 5 }; trail = []; sl.launch(shell, r, COL[p]); A.sfx('shoot'); A.shake(3);
      },
      update(dt) {
        if (boom) { boom.t -= dt; if (boom.t <= 0) boom = null; }
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
        c.strokeStyle = '#6fa86a'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= 800; x += 4) x ? c.lineTo(x, hgt[x]) : c.moveTo(x, hgt[x]); c.stroke();
        T.forEach((t, q) => { const y = ty(q); D.rr(c, t.x - 16, y - 6, 32, 16, 6, COL[q]); D.circ(c, t.x, y - 6, 9, COL[q]); });
        D.text(c, `Wind ${wind > 0 ? '→' : '←'} ${Math.abs(Math.round(wind))}`, 400, 24, 18, MUT);
        D.line(c, 400, 46, 400 + wind, 46, ACC, 4);
        if (trail.length) { c.globalAlpha = .4; trail.forEach(([x, y], i) => i % 3 || D.circ(c, x, y, 1.5, '#fff')); c.globalAlpha = 1; }
        if (shell) D.circ(c, shell.x, shell.y, 5, '#fff');
        if (boom) D.circ(c, boom.x, boom.y, 40 * (1 - boom.t), '#ffb34799');
        if (!shell && !A.ended) { D.text(c, `${A.names[p]}'s shot`, T[p].x, ty(p) - 40, 14, COL[p]); } sl.draw(c, !shell && !A.ended ? { x: T[p].x, y: ty(p) - 8, r: 10 } : null, COL[p], { arc: { speed: 620, g: 320 } });
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
      update(dt) {
        if (pause > 0) { pause -= dt; if (pause <= 0) reset(); return; }
        for (let p = 0; p < 2; p++) {
          const q = P[p]; q.t -= dt;
          if (q.st === 'idle') {
            q.x += (A.get(p, 'r') - A.get(p, 'l')) * 200 * dt;
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
        D.rect(c, 0, FY + 40, 800, 60, '#2b3050'); D.rect(c, 60, FY + 38, 680, 4, '#e9ecff55');
        bigScore(c, A, sc, 50, 44);
        P.forEach((q, p) => {
          const x = q.x, y = FY, stun = q.st === 'stun';
          c.globalAlpha = stun ? .6 : 1;
          D.circ(c, x, y - 90, 16, '#e9ecff'); D.rr(c, x - 6 * q.f - 6, y - 104, 12, 22, 4, '#333');
          D.rr(c, x - 14, y - 72, 28, 60, 10, '#e9ecff'); D.rect(c, x - 14, y - 50, 28, 6, COL[p]);
          D.line(c, x - 8, y - 14, x - 8 - q.f * 14, y + 38, '#e9ecff', 8); D.line(c, x + 8, y - 14, x + 8 + q.f * 14, y + 38, '#e9ecff', 8);
          const hy = q.st === 'parry' ? y - 85 : y - 58, hx = x + q.f * 22;
          D.line(c, hx, hy, tip(q), q.st === 'parry' ? y - 120 : y - 62, '#cfd3f0', 3); D.circ(c, hx, hy, 5, COL[p]);
          c.globalAlpha = 1;
        });
        if (pause > 0) D.text(c, msg, 400, 200, 34, ACC);
      }
    };
  }
});
