'use strict';
/* ================= PARTY / REFLEX GAMES ================= */

function tally(c, A, sc, N, y = 44) {
  D.text(c, sc[0], A.W / 2 - 70, y, 44, COL[0]); D.text(c, sc[1], A.W / 2 + 70, y, 44, COL[1]);
  D.text(c, `first to ${N}`, A.W / 2, y, 13, MUT);
}
function split(c, A) { D.line(c, A.W / 2, 80, A.W / 2, A.H - 20, LINE, 2); }

/* ---------- Quick Draw ---------- */
reg({
  id: 'quickdraw', name: 'Quick Draw', cat: 'Party', icon: '🤠', type: 'real', pad: 'one', btn: { a: 'Draw' },
  desc: 'Wait for it… BANG!', help: 'Wait for the BANG, then hit your button first. Shoot early and the point goes to your opponent. First to 5.',
  make(A) {
    const N = 5, sc = [0, 0]; let st = 'wait', t = rand(1.5, 4), msg = 'Wait for it…', pause = 0, rt = 0, shot = -1;
    const next = () => { st = 'wait'; t = rand(1.5, 4.5); msg = 'Wait for it…'; shot = -1; };
    const point = (q, m) => { sc[q]++; msg = m; st = 'res'; pause = 1.6; A.sfx(q >= 0 ? 'score' : 'bad'); if (sc[q] >= N) A.end(q); };
    return {
      update(dt) {
        if (st === 'res') { pause -= dt; if (pause <= 0) next(); return; }
        for (let p = 0; p < 2; p++) if (A.hit(p, 'a')) {
          if (st === 'wait') { A.sfx('bad'); shot = p; return point(1 - p, `${A.names[p]} shot too early!`); }
          if (st === 'go') { shot = p; A.sfx('boom'); A.shake(6); return point(p, `${A.names[p]} wins in ${Math.round(rt * 1000)} ms`); }
        }
        if (st === 'wait') { t -= dt; if (t <= 0) { st = 'go'; rt = 0; msg = 'BANG!'; A.sfx('go'); } }
        else if (st === 'go') rt += dt;
      },
      draw(c) {
        tally(c, A, sc, N);
        if (st === 'go') { c.fillStyle = '#ffd16622'; c.fillRect(0, 0, A.W, A.H); }
        D.text(c, msg, A.W / 2, 140, st === 'go' ? 72 : 30, st === 'go' ? ACC : TXT);
        for (let p = 0; p < 2; p++) {
          const x = p ? 600 : 200, y = 340, f = p ? -1 : 1;
          D.rr(c, x - 22, y - 40, 44, 90, 14, COL[p]); D.circ(c, x, y - 62, 24, COL[p]);
          D.rr(c, x - 36, y - 92, 72, 10, 4, COLD[p]); D.rr(c, x - 18, y - 112, 36, 24, 6, COLD[p]);
          const up = shot === p || (st === 'res' && shot !== p && msg.startsWith(A.names[p]));
          D.rr(c, x + f * (up ? 20 : 6), y + (up ? -26 : 0), f * 40, 10, 3, '#ccc');
          D.text(c, A.names[p], x, y + 86, 18, COL[p]);
        }
      }
    };
  }
});

/* ---------- Tug of War ---------- */
reg({
  id: 'tug', name: 'Tug of War', cat: 'Party', icon: '🪢', type: 'real', pad: 'one', btn: { a: 'Pull' },
  desc: 'Mash to pull. Pure fury.', help: 'Hammer your button as fast as you can to drag the flag onto your side.',
  make(A) {
    let pos = 0, last = [0, 0], t = 0;
    return {
      update(dt) {
        t += dt;
        for (let p = 0; p < 2; p++) if (A.hit(p, 'a')) { pos += p ? .03 : -.03; last[p] = t; A.sfx('tick'); }
        if (Math.abs(pos) >= 1) A.end(pos < 0 ? 0 : 1);
      },
      draw(c) {
        const cx = A.W / 2 + pos * 300;
        D.rect(c, 100, 0, 3, A.H, COL[0] + '66'); D.rect(c, 697, 0, 3, A.H, COL[1] + '66');
        D.line(c, 0, 260, A.W, 260, '#c9a46a', 10);
        D.rect(c, cx - 3, 220, 6, 80, ACC); D.poly(c, [[cx, 220], [cx + 30, 232], [cx, 244]], ACC);
        for (let p = 0; p < 2; p++) {
          const x = p ? cx + 220 : cx - 220, jig = (t - last[p] < .08) ? (p ? 6 : -6) : 0;
          D.circ(c, x + jig, 200, 22, COL[p]); D.rr(c, x - 18 + jig, 222, 36, 70, 12, COL[p]);
          D.text(c, A.names[p], x, 330, 18, COL[p]);
        }
        D.text(c, 'MASH!', A.W / 2, 90, 48, TXT);
      }
    };
  }
});

/* ---------- Stack Race ---------- */
reg({
  id: 'stack', name: 'Stack Race', cat: 'Party', icon: '🧱', type: 'real', pad: 'one', btn: { a: 'Drop' },
  desc: 'Stack higher. Don\'t miss.', help: 'Drop the sliding block onto your tower. Overhang gets sliced off. Miss completely and you lose. First to 20 blocks wins.',
  make(A) {
    const T = [0, 1].map(p => ({ blocks: [{ x: 100, w: 200 }], cur: { x: 0, w: 200, d: 1 }, dead: false, cam: 0, cut: null }));
    const BH = 26, GOAL = 20;
    return {
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
          s.blocks.forEach((b, i) => D.rect(c, ox + b.x, by - (i + 1) * BH, b.w, BH - 2, i ? `hsl(${(p ? 200 : 350) + i * 6},80%,${50 + (i % 2) * 8}%)` : '#555a80'));
          if (!A.ended) D.rect(c, ox + s.cur.x, by - (s.blocks.length + 1) * BH, s.cur.w, BH - 2, COL[p]);
          if (s.cut) D.rect(c, ox + s.cut.x, by - (s.cut.h + 1) * BH + s.cut.y, s.cut.w, BH - 2, '#ffffff55');
          D.text(c, `${s.blocks.length - 1}/${GOAL}`, ox + 200, 40, 30, COL[p]);
          c.restore();
        }
        split(c, A);
      }
    };
  }
});

/* ---------- Rock Paper Scissors ---------- */
reg({
  id: 'rps', name: 'Rock Paper Scissors', cat: 'Party', icon: '✊', type: 'real', pad: 'dpad',
  keys: ['<kbd>A</kbd> rock · <kbd>S</kbd> paper · <kbd>D</kbd> scissors', '<kbd>←</kbd> rock · <kbd>↓</kbd> paper · <kbd>→</kbd> scissors'],
  desc: 'Secret picks, simultaneous reveal.', help: 'Both players secretly lock in a pick (left = rock, down = paper, right = scissors). When both are locked, they reveal. First to 5.',
  make(A) {
    const N = 5, sc = [0, 0], E = ['✊', '✋', '✌️'], K = { l: 0, d: 1, r: 2 }; let pick = [-1, -1], show = 0, res = '';
    return {
      update(dt) {
        if (show > 0) { show -= dt; if (show <= 0) { pick = [-1, -1]; res = ''; } return; }
        for (let p = 0; p < 2; p++) if (pick[p] < 0) for (const k in K) if (A.hit(p, k)) { pick[p] = K[k]; A.sfx('click'); }
        if (pick[0] >= 0 && pick[1] >= 0) {
          const d = (pick[0] - pick[1] + 3) % 3; show = 1.8;
          if (d === 0) { res = 'Tie!'; A.sfx('bounce'); } else { const w = d === 1 ? 0 : 1; sc[w]++; res = `${A.names[w]} scores`; A.sfx('score'); if (sc[w] >= N) A.end(w); }
        }
      },
      draw(c) {
        tally(c, A, sc, N);
        for (let p = 0; p < 2; p++) {
          const x = p ? 600 : 200;
          D.rr(c, x - 110, 130, 220, 220, 30, BG2, COL[p], 3);
          if (show > 0) D.text(c, E[pick[p]], x, 245, 110);
          else D.text(c, pick[p] >= 0 ? '✔ locked' : '…choosing', x, 240, 26, pick[p] >= 0 ? COL[p] : MUT);
          D.text(c, A.names[p], x, 380, 20, COL[p]);
        }
        D.text(c, res || 'VS', A.W / 2, 240, res ? 26 : 40, res ? ACC : MUT);
        D.text(c, '◀ rock   ▼ paper   ▶ scissors', A.W / 2, 450, 18, MUT, 'center', 'middle', 600);
      }
    };
  }
});

/* ---------- Math Duel ---------- */
reg({
  id: 'math', name: 'Math Duel', cat: 'Party', icon: '➗', type: 'real', pad: 'dpad',
  keys: ['<kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> pick answer', '<kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> pick answer'],
  desc: 'Fastest brain wins.', help: 'Solve the sum and pick the right answer (◀ ▼ ▶) before your opponent. A wrong answer locks you out of that question. First to 7.',
  make(A) {
    const N = 7, sc = [0, 0], K = ['l', 'd', 'r']; let q, lock, pause = 0, msg = '';
    const gen = () => {
      const op = pick(['+', '−', '×']); let a, b, ans;
      if (op === '+') { a = rint(8, 60); b = rint(5, 45); ans = a + b; } else if (op === '−') { a = rint(20, 90); b = rint(3, a - 1); ans = a - b; } else { a = rint(3, 12); b = rint(3, 12); ans = a * b; }
      const opts = new Set([ans]); while (opts.size < 3) { const d = pick([1, 2, 10, -1, -2, -10, 3, -3]); if (ans + d >= 0) opts.add(ans + d); }
      q = { t: `${a} ${op} ${b}`, ans, opts: shuffle([...opts]) }; lock = [0, 0]; msg = '';
    };
    gen();
    return {
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
        D.text(c, q.t + ' = ?', A.W / 2, 170, 64);
        q.opts.forEach((o, i) => {
          const x = 180 + i * 220, good = pause > 0 && o === q.ans;
          D.rr(c, x - 90, 250, 180, 110, 20, good ? '#2f6b46' : BG2, good ? '#7bd389' : LINE, 3);
          D.text(c, o, x, 300, 40); D.text(c, ['◀', '▼', '▶'][i], x, 385, 18, MUT);
        });
        for (let p = 0; p < 2; p++) if (lock[p]) D.text(c, `${A.names[p]} ✗ locked`, p ? 700 : 100, 440, 18, COL[p]);
        D.text(c, msg, A.W / 2, 470, 22, ACC);
      }
    };
  }
});

/* ---------- Color Clash ---------- */
reg({
  id: 'stroop', name: 'Color Clash', cat: 'Party', icon: '🎨', type: 'real', pad: 'one', btn: { a: 'Match!' },
  desc: 'Does the word match its color?', help: 'Hit your button only when the WORD matches the INK color. Right = +1 for you. Wrong = +1 for your opponent. First to 5.',
  make(A) {
    const N = 5, sc = [0, 0], C = [['RED', '#ff4f6d'], ['BLUE', '#3ec5ff'], ['GREEN', '#7bd389'], ['YELLOW', '#ffd166'], ['PURPLE', '#c56cf0']];
    let w, ink, t = 0, claimed = false, msg = '', n = 0;
    const next = () => { n++; w = rint(0, 4); ink = rand() < .4 ? w : (w + rint(1, 4)) % 5; t = Math.max(.75, 1.6 - n * .03); claimed = false; };
    next();
    return {
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
        D.text(c, C[w][0], A.W / 2, 250, 110, C[ink][1]);
        D.rr(c, A.W / 2 - 150, 340, 300 * clamp(t / 1.6, 0, 1), 6, 3, MUT);
        D.text(c, msg, A.W / 2, 420, 24, ACC);
      }
    };
  }
});

/* ---------- Simon Duel ---------- */
reg({
  id: 'simon', name: 'Echo', cat: 'Party', icon: '🔆', type: 'turn', w: 600, h: 660,
  desc: 'Repeat the chain, add one.', help: 'Memory duel. On your turn, repeat the whole sequence so far (nothing is replayed!) and then add one new color. One mistake and you lose.',
  make(A) {
    const seq = [], CO = ['#7bd389', '#ffd166', '#c56cf0', '#ff9f43'], F = [392, 494, 587, 698]; let p = A.first, k = 0, lit = -1, lt = 0, bad = -1; A.turn(p);
    const pad = (x, y) => { const dx = x - 300, dy = y - 370; if (Math.hypot(dx, dy) > 250 || Math.hypot(dx, dy) < 50) return -1; return (dy < 0 ? 0 : 2) + (dx < 0 ? 0 : 1); };
    return {
      update(dt) { if (lt > 0) { lt -= dt; if (lt <= 0) lit = -1; } },
      down(x, y) {
        const i = pad(x, y); if (i < 0) return; lit = i; lt = .25; Snd.tone(F[i], .25, 'triangle', .1);
        if (k < seq.length) { if (seq[k] !== i) { bad = seq[k]; A.sfx('bad'); return A.end(1 - p, `Chain broke at step ${k + 1} of ${seq.length}`); } k++; return; }
        seq.push(i); k = 0; p = 1 - p; A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Broken chain!' : null);
        D.text(c, k < seq.length ? `Repeat: ${k} / ${seq.length}` : seq.length ? 'Now ADD one new color' : 'Start the chain: tap any color', A.W / 2, 75, 18, MUT);
        for (let i = 0; i < 4; i++) {
          const a0 = [Math.PI, -Math.PI / 2, Math.PI / 2, 0][i];
          c.beginPath(); c.arc(300, 370, 240, a0 + .04, a0 + Math.PI / 2 - .04); c.arc(300, 370, 60, a0 + Math.PI / 2 - .1, a0 + .1, true); c.closePath();
          c.fillStyle = CO[i]; c.globalAlpha = lit === i ? 1 : bad === i ? .9 : .35; c.fill(); c.globalAlpha = 1;
        }
        D.circ(c, 300, 370, 52, BG2); D.text(c, seq.length, 300, 372, 30);
      }
    };
  }
});

/* ---------- Pig ---------- */
reg({
  id: 'pig', name: 'Pig Dice', cat: 'Party', icon: '🎲', type: 'turn',
  desc: 'Push your luck.', help: 'Roll as often as you like to build your turn total, then HOLD to bank it. Roll a 1 and you lose the turn total. First to 50 wins.',
  make(A) {
    const G = 50, bank = [0, 0]; let p = A.first, tt = 0, die = 0, roll = 0, msg = ''; A.turn(p);
    const btn = [[250, 400, 'ROLL'], [550, 400, 'HOLD']];
    const pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
    return {
      update(dt) { if (roll > 0) { roll -= dt; die = rint(1, 6); if (roll <= 0) { die = rint(1, 6); if (die === 1) { msg = `Rolled a 1 — ${tt} lost!`; tt = 0; A.sfx('bad'); p = 1 - p; A.turn(p); } else { tt += die; msg = ''; A.sfx('click'); if (bank[p] + tt >= G) { bank[p] += tt; A.end(p); } } } } },
      down(x, y) {
        if (roll > 0) return; const b = btn.findIndex(([bx, by]) => Math.abs(x - bx) < 110 && Math.abs(y - by) < 40); if (b < 0) return;
        if (b === 0) { roll = .45; A.sfx('tick'); } else if (tt) { bank[p] += tt; msg = `${A.names[p]} banked ${tt}`; tt = 0; A.sfx('score'); p = 1 - p; A.turn(p); }
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Winner!' : null);
        for (let q = 0; q < 2; q++) {
          const x = q ? 650 : 150; D.text(c, A.names[q], x, 90, 18, COL[q]); D.text(c, bank[q], x, 140, 48, COL[q]);
          D.rr(c, x - 60, 180, 120, 10, 5, BG2); D.rr(c, x - 60, 180, 120 * Math.min(1, bank[q] / G), 10, 5, COL[q]);
        }
        D.rr(c, 340, 120, 120, 120, 22, '#f2f2f7');
        if (die) (pips[die] || []).forEach(([a, b]) => D.circ(c, 400 + a * 32, 180 + b * 32, 11, die === 1 ? '#d33' : '#222'));
        D.text(c, `Turn: ${tt}`, 400, 290, 28, ACC); D.text(c, msg, 400, 330, 18, MUT);
        btn.forEach(([x, y, t], i) => D.rr(c, x - 110, y - 36, 220, 72, 18, i ? BG2 : COL[p], i ? COL[p] : null, 3));
        btn.forEach(([x, y, t]) => D.text(c, t, x, y, 26));
      }
    };
  }
});

/* ---------- Time It ---------- */
reg({
  id: 'timeit', name: 'Time It', cat: 'Party', icon: '⏱️', type: 'real', pad: 'one', btn: { a: 'Stop' },
  desc: 'Stop the hidden clock.', help: 'A target time is shown. The clock disappears after a moment — hit your button when you think the target time has passed. Closest wins the round. First to 3.',
  make(A) {
    const N = 3, sc = [0, 0]; let T, t, st, pressed, pause = 0, msg = '';
    const next = () => { T = rint(3, 8); t = 0; st = 'run'; pressed = [null, null]; msg = ''; };
    next();
    return {
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
        D.text(c, `Stop at ${T}.00 s`, A.W / 2, 130, 40, ACC);
        D.text(c, st === 'res' || t < 1.2 ? t.toFixed(2) : '?.??', A.W / 2, 240, 90, st === 'res' ? TXT : t < 1.2 ? TXT : MUT);
        for (let p = 0; p < 2; p++) {
          const x = p ? 600 : 200, v = pressed[p];
          D.text(c, A.names[p], x, 350, 20, COL[p]);
          D.text(c, v === null ? (st === 'res' ? '—' : 'running…') : st === 'res' ? `${v.toFixed(2)} s (${(v - T >= 0 ? '+' : '') + (v - T).toFixed(2)})` : 'stopped ✔', x, 390, 22, v === null ? MUT : COL[p]);
        }
        D.text(c, msg, A.W / 2, 450, 24, ACC);
      }
    };
  }
});

/* ---------- Snap ---------- */
reg({
  id: 'snap', name: 'Snap!', cat: 'Party', icon: '🫰', type: 'real', pad: 'one', btn: { a: 'Snap' },
  desc: 'Slap when two match.', help: 'Cards flip one after another. Hit your button the moment a card matches the one before it. A false snap gives your opponent the point. First to 5.',
  make(A) {
    const N = 5, sc = [0, 0], S = ['🍒', '🍋', '🍇', '🥝', '🍑', '🍌']; let prev = null, cur = pick(S), t = 1, claimed = false, msg = '', n = 0;
    const next = () => { n++; prev = cur; cur = rand() < .3 ? prev : pick(S); t = Math.max(.6, 1.2 - n * .02); claimed = false; };
    return {
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
        if (prev) { D.rr(c, 230, 160, 140, 190, 18, BG2, LINE, 2); c.globalAlpha = .5; D.text(c, prev, 300, 258, 70); c.globalAlpha = 1; }
        D.rr(c, 420, 150, 160, 210, 20, '#f2f2f7'); D.text(c, cur, 500, 258, 90);
        D.text(c, msg, A.W / 2, 430, 26, ACC);
      }
    };
  }
});
