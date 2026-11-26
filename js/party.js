'use strict';
/* ================= PARTY / REFLEX GAMES ================= */

function tally(c, A, sc, N, y = 46) {
  D.text(c, sc[0], A.W / 2 - 74, y, 50, COL[0], 'center', 'middle', 900); D.text(c, sc[1], A.W / 2 + 74, y, 50, COL[1], 'center', 'middle', 900);
  D.rr(c, A.W / 2 - 40, y - 13, 80, 26, 13, BG2); D.text(c, `to ${N}`, A.W / 2, y + 1, 14, MUT);
}
function split(c, A) { D.rr(c, A.W / 2 - 3, 86, 6, A.H - 110, 3, LINE); }
/* react to a new event after a human-ish delay: returns true once, `delay` seconds after `key` changes */
function botReact(B, key, delay) {
  if (B.mem.rk !== key) { B.mem.rk = key; B.mem.rt = delay; B.mem.done = false; }
  if (B.mem.done) return false; B.mem.rt -= B.dt; if (B.mem.rt <= 0) { B.mem.done = true; return true; } return false;
}

/* ---------- Quick Draw ---------- */
reg({
  id: 'quickdraw', name: 'Quick Draw', cat: 'Party', icon: '🤠', type: 'real', pad: 'one', btn: { a: 'Draw' },
  desc: 'Wait for it… BANG!', help: 'Wait for the BANG, then tap first. Shoot early and the point goes to your opponent. First to 5.',
  make(A) {
    const N = 5, sc = [0, 0]; let st = 'wait', t = rand(1.5, 4), msg = 'Wait for it…', pause = 0, rt = 0, shot = -1, rnd = 0;
    const next = () => { st = 'wait'; t = rand(1.5, 4.5); msg = 'Wait for it…'; shot = -1; rnd++; };
    const point = (q, m) => { sc[q]++; msg = m; st = 'res'; pause = 1.6; A.sfx('score'); if (sc[q] >= N) A.end(q); };
    return {
      ai(dt, B) {
        if (st === 'go' && botReact(B, 'go' + rnd, B.k(.4, .29, .21) + gauss() * .05)) B.press('a');
        if (st === 'wait' && B.lvl === 0) { if (B.mem.jr !== rnd) { B.mem.jr = rnd; B.mem.jump = B.chance(.12) ? rand(.6, 2) : -1; } if (B.mem.jump > 0) { B.mem.jump -= dt; if (B.mem.jump <= 0) B.press('a'); } }
      },
      update(dt) {
        if (st === 'res') { pause -= dt; if (pause <= 0) next(); return; }
        for (let p = 0; p < 2; p++) if (A.hit(p, 'a')) {
          if (st === 'wait') { A.sfx('bad'); shot = p; return point(1 - p, `${A.names[p]} shot too early!`); }
          if (st === 'go') { shot = p; A.sfx('boom'); A.shake(6); return point(p, `${A.names[p]} in ${Math.round(rt * 1000)} ms`); }
        }
        if (st === 'wait') { t -= dt; if (t <= 0) { st = 'go'; rt = 0; msg = 'BANG!'; A.sfx('go'); } }
        else if (st === 'go') rt += dt;
      },
      draw(c) {
        tally(c, A, sc, N);
        if (st === 'go') { c.fillStyle = '#ffd16626'; c.fillRect(0, 0, A.W, A.H); }
        D.text(c, msg, A.W / 2, 150, st === 'go' ? 84 : 34, st === 'go' ? ACC : TXT, 'center', 'middle', 900);
        for (let p = 0; p < 2; p++) {
          const x = p ? 600 : 200, y = 340, f = p ? -1 : 1;
          D.rr(c, x - 24, y - 42, 48, 94, 20, COL[p]); D.circ(c, x, y - 64, 26, COL[p]);
          D.rr(c, x - 40, y - 96, 80, 12, 6, COLD[p]); D.rr(c, x - 20, y - 118, 40, 28, 10, COLD[p]);
          const up = shot === p || (st === 'res' && shot !== p && msg.startsWith(A.names[p]));
          D.rr(c, x + f * (up ? 22 : 8) - (f < 0 ? 44 : 0), y + (up ? -28 : 0), 44, 12, 6, '#ccc');
          D.text(c, A.names[p], x, y + 90, 22, COL[p]);
        }
      }
    };
  }
});

/* ---------- Tug of War ---------- */
reg({
  id: 'tug', name: 'Tug of War', cat: 'Party', icon: '🪢', type: 'real', pad: 'one', btn: { a: 'Pull' },
  desc: 'Mash to pull. Pure fury.', help: 'Tap as fast as you can to drag the flag onto your side.',
  make(A) {
    let pos = 0, last = [0, 0], t = 0;
    return {
      ai(dt, B) {
        if (B.mem.ph === undefined) { B.mem.ph = rand(6); B.mem.f = rand(.6, 1.4); }
        const rate = B.k(5.2, 7.2, 9.2) * (1 + .3 * Math.sin(B.t * B.mem.f + B.mem.ph)) * (1 - Math.min(.25, B.t * .01));
        if (B.chance(rate * dt)) B.press('a');
      },
      update(dt) {
        t += dt;
        for (let p = 0; p < 2; p++) if (A.hit(p, 'a')) { pos += p ? .03 : -.03; last[p] = t; A.sfx('tick'); }
        if (Math.abs(pos) >= 1) A.end(pos < 0 ? 0 : 1);
      },
      draw(c) {
        const cx = A.W / 2 + pos * 300;
        D.rr(c, 98, 0, 6, A.H, 3, COL[0] + '66'); D.rr(c, 696, 0, 6, A.H, 3, COL[1] + '66');
        c.lineCap = 'round'; D.line(c, 0, 260, A.W, 260, '#c9a46a', 12); c.lineCap = 'butt';
        D.rr(c, cx - 4, 218, 8, 84, 4, ACC); D.poly(c, [[cx, 220], [cx + 32, 233], [cx, 246]], ACC, ACC, 3);
        for (let p = 0; p < 2; p++) {
          const x = p ? cx + 220 : cx - 220, jig = (t - last[p] < .08) ? (p ? 6 : -6) : 0;
          D.circ(c, x + jig, 198, 24, COL[p]); D.rr(c, x - 20 + jig, 222, 40, 72, 18, COL[p]);
          D.text(c, A.names[p], x, 334, 22, COL[p]);
        }
        D.text(c, 'MASH!', A.W / 2, 96, 56, TXT, 'center', 'middle', 900);
      }
    };
  }
});

/* ---------- Stack Race ---------- */
reg({
  id: 'stack', name: 'Stack Race', cat: 'Party', icon: '🧱', type: 'real', pad: 'one', btn: { a: 'Drop' },
  desc: 'Stack higher. Don\'t miss.', help: 'Tap to drop the sliding block onto your tower. Overhang gets sliced off. Miss completely and you lose. First to 20 blocks wins.',
  make(A) {
    const T = [0, 1].map(() => ({ blocks: [{ x: 100, w: 200 }], cur: { x: 0, w: 200, d: 1 }, dead: false, cam: 0, cut: null }));
    const BH = 26, GOAL = 20;
    return {
      ai(dt, B) {
        const s = T[B.p], h = s.blocks.length, top = s.blocks[h - 1], sp = 160 + h * 14, lag = B.k(.09, .045, .015);
        if (B.mem.h !== h) { B.mem.h = h; B.mem.err = gauss() * B.k(16, 6, 2); }
        let x = s.cur.x + s.cur.d * sp * lag; if (x < 0) x = -x; if (x + s.cur.w > 400) x = 2 * (400 - s.cur.w) - x;
        if (Math.abs(x - (top.x + B.mem.err)) < B.k(9, 5, 3)) B.press('a');
      },
      update(dt) {
        for (let p = 0; p < 2; p++) {
          const s = T[p], h = s.blocks.length, sp = 160 + h * 14;
          s.cur.x += s.cur.d * sp * dt; if (s.cur.x < 0) { s.cur.x = 0; s.cur.d = 1; } if (s.cur.x + s.cur.w > 400) { s.cur.x = 400 - s.cur.w; s.cur.d = -1; }
          s.cam = lerp(s.cam, Math.max(0, h - 9) * BH, dt * 6);
          if (s.cut) { s.cut.y += s.cut.vy * dt; s.cut.vy += 900 * dt; }
          if (A.hit(p, 'a')) {
            const top = s.blocks[h - 1], l = Math.max(top.x, s.cur.x), r = Math.min(top.x + top.w, s.cur.x + s.cur.w);
            if (r - l <= 0) { s.dead = true; A.sfx('bad'); }
            else {
              let nx = l, nw = r - l;
              if (Math.abs(s.cur.x - top.x) < 6) { nx = top.x; nw = top.w; A.sfx('coin'); } else A.sfx('place');
              if (nw < s.cur.w) s.cut = { x: s.cur.x < top.x ? s.cur.x : r, w: s.cur.w - nw, y: 0, vy: 0, h };
              s.blocks.push({ x: nx, w: nw }); s.cur = { x: s.cur.d > 0 ? 0 : 400 - nw, w: nw, d: s.cur.d };
            }
          }
        }
        const d0 = T[0].dead, d1 = T[1].dead;
        if (d0 || d1) return A.end(d0 && d1 ? -1 : d0 ? 1 : 0, d0 && d1 ? 'Both missed!' : 'Missed the tower!');
        for (let p = 0; p < 2; p++) if (T[p].blocks.length > GOAL) return A.end(p, `${GOAL} blocks high!`);
      },
      draw(c) {
        for (let p = 0; p < 2; p++) {
          const s = T[p], ox = p * 400; c.save(); c.beginPath(); c.rect(ox, 0, 400, A.H); c.clip();
          const by = A.H - 30 + s.cam;
          s.blocks.forEach((b, i) => D.rr(c, ox + b.x, by - (i + 1) * BH, b.w, BH - 3, 7, i ? `hsl(${(p ? 200 : 350) + i * 6},80%,${52 + (i % 2) * 8}%)` : '#555a80'));
          if (!A.ended) D.rr(c, ox + s.cur.x, by - (s.blocks.length + 1) * BH, s.cur.w, BH - 3, 7, COL[p]);
          if (s.cut) D.rr(c, ox + s.cut.x, by - (s.cut.h + 1) * BH + s.cut.y, s.cut.w, BH - 3, 7, '#ffffff55');
          D.text(c, `${s.blocks.length - 1}/${GOAL}`, ox + 200, 42, 34, COL[p], 'center', 'middle', 900);
          c.restore();
        }
        split(c, A);
      }
    };
  }
});

/* ---------- Rock Paper Scissors ---------- */
reg({
  id: 'rps', name: 'Rock Paper Scissors', cat: 'Party', icon: '✊', type: 'real', pad: 'dpad', touchHint: 'swipe ← rock · ↓ paper · → scissors',
  keys: ['<kbd>A</kbd> rock · <kbd>S</kbd> paper · <kbd>D</kbd> scissors', '<kbd>←</kbd> rock · <kbd>↓</kbd> paper · <kbd>→</kbd> scissors'],
  desc: 'Secret picks, simultaneous reveal.', help: 'Both players secretly lock in a pick (left = rock, down = paper, right = scissors). When both are locked, they reveal. First to 5.',
  make(A) {
    const N = 5, sc = [0, 0], E = ['Rock', 'Paper', 'Scissors'], EG = ['circle', 'square', 'cross'], K = { l: 0, d: 1, r: 2 }, KN = ['l', 'd', 'r'], hist = [[], []]; let pk = [-1, -1], show = 0, res = '', rnd = 0;
    return {
      ai(dt, B) {
        const p = B.p; if (show > 0 || pk[p] >= 0) return;
        if (!botReact(B, 'r' + rnd, rand(.4, 1.5))) return;
        let ch = rint(0, 2); const h = hist[1 - p];
        if (B.lvl === 2 && h.length >= 3 && B.chance(.6)) {
          const last = h[h.length - 1], cnt = [0, 0, 0], after = [0, 0, 0];
          h.forEach(v => cnt[v]++); for (let i = 1; i < h.length; i++) if (h[i - 1] === last) after[h[i]]++;
          const src = after.some(v => v > 1) ? after : cnt, guess = src.indexOf(Math.max(...src));
          ch = (guess + 1) % 3;
        }
        B.press(KN[ch]);
      },
      update(dt) {
        if (show > 0) { show -= dt; if (show <= 0) { pk = [-1, -1]; res = ''; rnd++; } return; }
        for (let p = 0; p < 2; p++) if (pk[p] < 0) for (const k in K) if (A.hit(p, k)) { pk[p] = K[k]; A.sfx('click'); }
        if (pk[0] >= 0 && pk[1] >= 0) {
          hist[0].push(pk[0]); hist[1].push(pk[1]);
          const d = (pk[0] - pk[1] + 3) % 3; show = 1.8;
          if (d === 0) { res = 'Tie!'; A.sfx('bounce'); } else { const w = d === 1 ? 0 : 1; sc[w]++; res = `${A.names[w]} scores`; A.sfx('score'); if (sc[w] >= N) A.end(w); }
        }
      },
      draw(c) {
        tally(c, A, sc, N);
        for (let p = 0; p < 2; p++) {
          const x = p ? 600 : 200;
          D.rr(c, x - 115, 125, 230, 230, 40, BG2, COL[p], 4);
          if (show > 0) { D.glyph(c, EG[pk[p]], x, 220, 50, COL[p]); D.text(c, E[pk[p]], x, 312, 28, TXT); }
          else D.text(c, pk[p] >= 0 ? 'locked in' : 'choosing…', x, 240, 28, pk[p] >= 0 ? COL[p] : MUT);
          D.text(c, A.names[p], x, 384, 24, COL[p]);
        }
        D.text(c, res || 'VS', A.W / 2, 240, res ? 28 : 44, res ? ACC : MUT, 'center', 'middle', 900);
        D.text(c, '← rock   ↓ paper   → scissors', A.W / 2, 452, 20, MUT, 'center', 'middle', 700);
      }
    };
  }
});

/* ---------- Math Duel ---------- */
reg({
  id: 'math', name: 'Math Duel', cat: 'Party', icon: '➗', type: 'real', pad: 'dpad', touchHint: 'swipe ← ↓ → to answer',
  keys: ['<kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> pick answer', '<kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> pick answer'],
  desc: 'Fastest brain wins.', help: 'Solve the sum and pick the right answer (← ↓ →) before your opponent. A wrong answer locks you out of that question. First to 7.',
  make(A) {
    const N = 7, sc = [0, 0], K = ['l', 'd', 'r']; let q, lock, pause = 0, msg = '', qn = 0;
    const gen = () => {
      const op = pick(['+', '−', '×']); let a, b, ans;
      if (op === '+') { a = rint(8, 60); b = rint(5, 45); ans = a + b; } else if (op === '−') { a = rint(20, 90); b = rint(3, a - 1); ans = a - b; } else { a = rint(3, 12); b = rint(3, 12); ans = a * b; }
      const opts = new Set([ans]); while (opts.size < 3) { const d = pick([1, 2, 10, -1, -2, -10, 3, -3]); if (ans + d >= 0) opts.add(ans + d); }
      q = { t: `${a} ${op} ${b}`, ans, opts: shuffle([...opts]), hard: op === '×' || a + b > 70 }; lock = [0, 0]; msg = ''; qn++;
    };
    gen();
    return {
      ai(dt, B) {
        const p = B.p; if (pause > 0 || lock[p]) return;
        if (!botReact(B, 'q' + qn, B.k(3.6, 2.5, 1.5) * rand(.8, 1.25) * (q.hard ? 1.3 : 1))) return;
        const good = q.opts.indexOf(q.ans), ok = B.chance(B.k(.75, .88, .96));
        B.press(K[ok ? good : (good + rint(1, 2)) % 3]);
      },
      update(dt) {
        if (pause > 0) { pause -= dt; if (pause <= 0) gen(); return; }
        for (let p = 0; p < 2; p++) {
          if (lock[p]) continue;
          K.forEach((k, i) => {
            if (!A.hit(p, k) || lock[p] || pause > 0) return;
            if (q.opts[i] === q.ans) { sc[p]++; msg = `${A.names[p]} got it!`; A.sfx('score'); pause = 1; if (sc[p] >= N) A.end(p); }
            else { lock[p] = 1; A.sfx('bad'); if (lock[0] && lock[1]) { msg = `Answer: ${q.ans}`; pause = 1.2; } }
          });
        }
      },
      draw(c) {
        tally(c, A, sc, N);
        D.text(c, q.t + ' = ?', A.W / 2, 172, 72, TXT, 'center', 'middle', 900);
        q.opts.forEach((o, i) => {
          const x = 180 + i * 220, good = pause > 0 && o === q.ans;
          D.rr(c, x - 95, 245, 190, 120, 32, good ? '#2f6b46' : BG2, good ? '#7bd389' : LINE, 4);
          D.text(c, o, x, 300, 46, TXT, 'center', 'middle', 900); D.text(c, ['←', '↓', '→'][i], x, 392, 24, MUT);
        });
        for (let p = 0; p < 2; p++) if (lock[p]) D.text(c, `${A.names[p]} locked out`, p ? 680 : 120, 442, 20, COL[p]);
        D.text(c, msg, A.W / 2, 472, 24, ACC);
      }
    };
  }
});

/* ---------- Color Clash ---------- */
reg({
  id: 'stroop', name: 'Color Clash', cat: 'Party', icon: '🎨', type: 'real', pad: 'one', btn: { a: 'Match!' },
  desc: 'Does the word match its color?', help: 'Tap only when the WORD matches the INK color. Right = +1 for you. Wrong = +1 for your opponent. First to 5.',
  make(A) {
    const N = 5, sc = [0, 0], C = [['RED', '#ff4f6d'], ['BLUE', '#3ec5ff'], ['GREEN', '#7bd389'], ['YELLOW', '#ffd166'], ['PURPLE', '#c56cf0']];
    let w, ink, t = 0, claimed = false, msg = '', n = 0;
    const next = () => { n++; w = rint(0, 4); ink = rand() < .4 ? w : (w + rint(1, 4)) % 5; t = Math.max(.75, 1.6 - n * .03); claimed = false; };
    next();
    return {
      ai(dt, B) {
        if (claimed) return;
        if (B.mem.cn !== n) { B.mem.cn = n; B.mem.go = w === ink ? B.chance(B.k(.85, .95, 1)) : B.chance(B.k(.09, .03, .005)); }
        if (B.mem.go && botReact(B, 'c' + n, B.k(.8, .58, .42) * rand(.85, 1.2))) B.press('a');
      },
      update(dt) {
        t -= dt; if (t <= 0) { next(); msg = ''; }
        for (let p = 0; p < 2; p++) if (A.hit(p, 'a') && !claimed) {
          claimed = true;
          if (w === ink) { sc[p]++; msg = `${A.names[p]} +1`; A.sfx('score'); t = Math.min(t, .5); if (sc[p] >= N) return A.end(p); }
          else { sc[1 - p]++; msg = `${A.names[p]} slipped! +1 ${A.names[1 - p]}`; A.sfx('bad'); t = Math.min(t, .5); if (sc[1 - p] >= N) return A.end(1 - p); }
        }
      },
      draw(c) {
        tally(c, A, sc, N);
        D.text(c, C[w][0], A.W / 2, 250, 120, C[ink][1], 'center', 'middle', 900);
        D.rr(c, A.W / 2 - 150, 340, 300 * clamp(t / 1.6, 0, 1), 10, 5, MUT);
        D.text(c, msg, A.W / 2, 420, 26, ACC);
      }
    };
  }
});

/* ---------- Simon Duel ---------- */
reg({
  id: 'simon', name: 'Echo', cat: 'Party', icon: '🔆', type: 'turn', w: 600, h: 660,
  desc: 'Repeat the chain, add one.', help: 'Memory duel. On your turn, repeat the whole sequence so far (nothing is replayed!) and then add one new color. One mistake and you lose.',
  make(A) {
    const seq = [], CO = ['#7bd389', '#ffd166', '#c56cf0', '#ff9f43'], F = [392, 494, 587, 698], CEN = [[190, 260], [410, 260], [190, 480], [410, 480]]; let p = A.first, k = 0, lit = -1, lt = 0, bad = -1; A.turn(p);
    const pad = (x, y) => { const dx = x - 300, dy = y - 370; if (Math.hypot(dx, dy) > 250 || Math.hypot(dx, dy) < 50) return -1; return (dy < 0 ? 0 : 2) + (dx < 0 ? 0 : 1); };
    const self = {
      ai(B) {
        if (B.p !== p || lt > 0) return false;
        let i;
        if (k < seq.length) { const err = B.k(.02, .008, 0) + B.k(.012, .006, .0025) * seq.length; i = B.chance(err) ? (seq[k] + rint(1, 3)) % 4 : seq[k]; }
        else i = rint(0, 3);
        self.down(...CEN[i]); return true;
      },
      update(dt) { if (lt > 0) { lt -= dt; if (lt <= 0) lit = -1; } },
      down(x, y) {
        const i = pad(x, y); if (i < 0) return; lit = i; lt = .25; Snd.tone(F[i], .25, 'triangle', .1);
        if (k < seq.length) { if (seq[k] !== i) { bad = seq[k]; A.sfx('bad'); return A.end(1 - p, `Chain broke at step ${k + 1} of ${seq.length}`); } k++; return; }
        seq.push(i); k = 0; p = 1 - p; A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Broken chain!' : null);
        D.text(c, k < seq.length ? `Repeat: ${k} / ${seq.length}` : seq.length ? 'Now ADD one new color' : 'Start the chain: tap any color', A.W / 2, 78, 20, MUT);
        for (let i = 0; i < 4; i++) {
          const a0 = [Math.PI, -Math.PI / 2, Math.PI / 2, 0][i];
          c.beginPath(); c.arc(300, 370, 240, a0 + .05, a0 + Math.PI / 2 - .05); c.arc(300, 370, 64, a0 + Math.PI / 2 - .14, a0 + .14, true); c.closePath();
          c.fillStyle = CO[i]; c.globalAlpha = lit === i ? 1 : bad === i ? .9 : .35; c.fill(); c.lineJoin = 'round'; c.strokeStyle = BG; c.lineWidth = 8; c.stroke(); c.lineJoin = 'miter'; c.globalAlpha = 1;
        }
        D.circ(c, 300, 370, 54, BG2); D.text(c, seq.length, 300, 372, 34, TXT, 'center', 'middle', 900);
      }
    };
    return self;
  }
});

/* ---------- Pig ---------- */
reg({
  id: 'pig', name: 'Pig Dice', cat: 'Party', icon: '🎲', type: 'turn',
  desc: 'Push your luck.', help: 'Roll as often as you like to build your turn total, then HOLD to bank it. Roll a 1 and you lose the turn total. First to 50 wins.',
  make(A) {
    const G = 50, bank = [0, 0]; let p = A.first, tt = 0, die = 0, roll = 0, msg = ''; A.turn(p);
    const btn = [[250, 405, 'ROLL'], [550, 405, 'HOLD']];
    const pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
    const self = {
      ai(B) {
        if (B.p !== p || roll > 0) return false;
        const me = bank[p], op = bank[1 - p];
        let hold = B.k(10 + rint(0, 8), 18, clamp(21 + Math.round((op - me) / 6), 14, 30));
        if (B.lvl === 2 && op >= 42) hold = G - me;
        const doHold = tt > 0 && (me + tt >= G || tt >= hold);
        self.down(...btn[doHold ? 1 : 0]); return true;
      },
      update(dt) { if (roll > 0) { roll -= dt; die = rint(1, 6); if (roll <= 0) { die = rint(1, 6); if (die === 1) { msg = `Rolled a 1 — ${tt} lost!`; tt = 0; A.sfx('bad'); p = 1 - p; A.turn(p); } else { tt += die; msg = ''; A.sfx('click'); if (bank[p] + tt >= G) { bank[p] += tt; A.end(p); } } } } },
      down(x, y) {
        if (roll > 0) return; const b = btn.findIndex(([bx, by]) => Math.abs(x - bx) < 115 && Math.abs(y - by) < 44); if (b < 0) return;
        if (b === 0) { roll = .45; A.sfx('tick'); } else if (tt) { bank[p] += tt; msg = `${A.names[p]} banked ${tt}`; tt = 0; A.sfx('score'); p = 1 - p; A.turn(p); }
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Winner!' : null);
        for (let q = 0; q < 2; q++) {
          const x = q ? 650 : 150; D.text(c, A.names[q], x, 92, 22, COL[q]); D.text(c, bank[q], x, 144, 56, COL[q], 'center', 'middle', 900);
          D.rr(c, x - 64, 184, 128, 12, 6, BG2); D.rr(c, x - 64, 184, 128 * Math.min(1, bank[q] / G), 12, 6, COL[q]);
        }
        D.rr(c, 336, 116, 128, 128, 30, '#f2f2f7');
        if (die) (pips[die] || []).forEach(([a, b]) => D.circ(c, 400 + a * 33, 180 + b * 33, 12, die === 1 ? '#d33' : '#222'));
        D.text(c, `Turn: ${tt}`, 400, 290, 32, ACC, 'center', 'middle', 900); D.text(c, msg, 400, 332, 20, MUT);
        btn.forEach(([x, y], i) => D.rr(c, x - 115, y - 40, 230, 80, 40, i ? BG2 : COL[p], i ? COL[p] : null, 4));
        btn.forEach(([x, y, t]) => D.text(c, t, x, y, 30, TXT, 'center', 'middle', 900));
      }
    };
    return self;
  }
});

/* ---------- Time It ---------- */
reg({
  id: 'timeit', name: 'Time It', cat: 'Party', icon: '⏱️', type: 'real', pad: 'one', btn: { a: 'Stop' },
  desc: 'Stop the hidden clock.', help: 'A target time is shown. The clock disappears after a moment — tap when you think the target time has passed. Closest wins the round. First to 3.',
  make(A) {
    const N = 3, sc = [0, 0]; let T, t, st, pressed, pause = 0, msg = '', rnd = 0;
    const next = () => { T = rint(3, 8); t = 0; st = 'run'; pressed = [null, null]; msg = ''; rnd++; };
    next();
    return {
      ai(dt, B) {
        if (st !== 'run' || pressed[B.p] !== null) return;
        if (B.mem.r !== rnd) { B.mem.r = rnd; B.mem.at = T + gauss() * B.k(1.3, .6, .25); }
        if (t >= B.mem.at) B.press('a');
      },
      update(dt) {
        if (st === 'res') { pause -= dt; if (pause <= 0) next(); return; }
        t += dt;
        for (let p = 0; p < 2; p++) if (pressed[p] === null && A.hit(p, 'a')) { pressed[p] = t; A.sfx('click'); }
        if ((pressed[0] !== null && pressed[1] !== null) || t > T + 4) {
          const e = pressed.map(v => v === null ? 99 : Math.abs(v - T));
          st = 'res'; pause = 2.4;
          if (Math.abs(e[0] - e[1]) < 0.005) { msg = 'Dead heat!'; return; }
          const w = e[0] < e[1] ? 0 : 1; sc[w]++; msg = `${A.names[w]} was closer`; A.sfx('score'); if (sc[w] >= N) A.end(w);
        }
      },
      draw(c) {
        tally(c, A, sc, N);
        D.text(c, `Stop at ${T}.00 s`, A.W / 2, 132, 44, ACC, 'center', 'middle', 900);
        D.text(c, st === 'res' || t < 1.2 ? t.toFixed(2) : '?.??', A.W / 2, 240, 100, st === 'res' || t < 1.2 ? TXT : MUT, 'center', 'middle', 900);
        for (let p = 0; p < 2; p++) {
          const x = p ? 600 : 200, v = pressed[p];
          D.text(c, A.names[p], x, 350, 24, COL[p]);
          D.text(c, v === null ? (st === 'res' ? '—' : 'running…') : st === 'res' ? `${v.toFixed(2)} s (${(v - T >= 0 ? '+' : '') + (v - T).toFixed(2)})` : 'stopped', x, 392, 24, v === null ? MUT : COL[p]);
        }
        D.text(c, msg, A.W / 2, 452, 26, ACC);
      }
    };
  }
});

/* ---------- Snap ---------- */
reg({
  id: 'snap', name: 'Snap!', cat: 'Party', icon: '🫰', type: 'real', pad: 'one', btn: { a: 'Snap' },
  desc: 'Slap when two match.', help: 'Cards flip one after another. Tap the moment a card matches the one before it. A false snap gives your opponent the point. First to 5.',
  make(A) {
    const N = 5, sc = [0, 0], S = ['circle|#ff4f6d', 'square|#ffd166', 'tri|#7bd389', 'diamond|#3ec5ff', 'star|#c56cf0', 'hex|#ff9f43']; let prev = null, cur = pick(S), t = 1, claimed = false, msg = '', n = 0;
    const next = () => { n++; prev = cur; cur = rand() < .3 ? prev : pick(S); t = Math.max(.6, 1.2 - n * .02); claimed = false; };
    return {
      ai(dt, B) {
        if (claimed) return;
        if (B.mem.cn !== n) { B.mem.cn = n; B.mem.go = prev === cur ? B.chance(B.k(.85, .96, 1)) : B.chance(B.k(.07, .02, .004)); }
        if (B.mem.go && botReact(B, 's' + n, B.k(.68, .48, .33) * rand(.85, 1.2))) B.press('a');
      },
      update(dt) {
        t -= dt; if (t <= 0) { next(); msg = ''; }
        for (let p = 0; p < 2; p++) if (A.hit(p, 'a') && !claimed) {
          claimed = true; const ok = prev === cur, w = ok ? p : 1 - p; sc[w]++;
          msg = ok ? `SNAP! ${A.names[p]} +1` : `False snap! +1 ${A.names[1 - p]}`; A.sfx(ok ? 'score' : 'bad'); A.shake(3);
          if (sc[w] >= N) return A.end(w);
        }
      },
      draw(c) {
        tally(c, A, sc, N);
        const gl = (v, x, y, r) => { const [k, col] = v.split('|'); D.glyph(c, k, x, y, r, col); };
        if (prev) { D.rr(c, 226, 160, 148, 196, 26, BG2, LINE, 2); c.globalAlpha = .45; gl(prev, 300, 258, 38); c.globalAlpha = 1; }
        D.rr(c, 416, 148, 168, 220, 30, '#262639', TXT, 3); gl(cur, 500, 258, 52);
        D.text(c, msg, A.W / 2, 432, 28, ACC, 'center', 'middle', 900);
      }
    };
  }
});
