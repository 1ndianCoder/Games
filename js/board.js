'use strict';
/* ================= BOARD / TURN-BASED GAMES ================= */

function mkBoard(A, cols, rows, top = 64, pad = 24) {
  const cs = Math.min((A.W - pad * 2) / cols, (A.H - top - pad) / rows);
  const x0 = (A.W - cs * cols) / 2, y0 = top + (A.H - top - pad - cs * rows) / 2;
  return {
    cs, x0, y0, cols, rows,
    at(x, y) { const i = Math.floor((x - x0) / cs), j = Math.floor((y - y0) / cs); return i >= 0 && j >= 0 && i < cols && j < rows ? [i, j] : null; },
    cx: i => x0 + (i + .5) * cs, cy: j => y0 + (j + .5) * cs,
  };
}
function banner(c, A, p, msg) { D.text(c, msg || `${A.names[p]}'s turn`, A.W / 2, 32, 24, p >= 0 ? COL[p] : TXT); }
function drawX(c, x, y, r, col, lw = 10) { c.lineCap = 'round'; D.line(c, x - r, y - r, x + r, y + r, col, lw); D.line(c, x + r, y - r, x - r, y + r, col, lw); c.lineCap = 'butt'; }
function drawO(c, x, y, r, col, lw = 10) { D.circ(c, x, y, r, null, col, lw); }
function findLine(get, w, h, n) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = get(x, y); if (v < 0) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      let k = 1; while (k < n && get(x + dx * k, y + dy * k) === v) k++;
      if (k === n) return { p: v, cells: Array.from({ length: n }, (_, i) => [x + dx * i, y + dy * i]) };
    }
  }
  return null;
}

/* ---------- Tic Tac Toe ---------- */
reg({
  id: 'ttt', name: 'Tic Tac Toe', cat: 'Board', icon: '❌', type: 'turn', w: 600, h: 660,
  desc: 'Three in a row. Fast & classic.', help: 'Take turns placing your mark. First to line up three wins.',
  make(A) {
    const B = mkBoard(A, 3, 3, 80, 40), g = Array(9).fill(-1); let p = A.first, win = null, hov = -1; A.turn(p);
    const get = (x, y) => x < 0 || y < 0 || x > 2 || y > 2 ? -1 : g[y * 3 + x];
    return {
      move(x, y) { const k = B.at(x, y); hov = k ? k[1] * 3 + k[0] : -1; },
      down(x, y) {
        const k = B.at(x, y); if (!k) return; const i = k[1] * 3 + k[0]; if (g[i] >= 0) return;
        g[i] = p; A.sfx('place'); win = findLine(get, 3, 3, 3);
        if (win) return A.end(p); if (g.every(v => v >= 0)) return A.end(-1);
        p = 1 - p; A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? (win ? `${A.names[win.p]} wins` : 'Draw') : null);
        for (let i = 1; i < 3; i++) { D.line(c, B.x0 + B.cs * i, B.y0 + 10, B.x0 + B.cs * i, B.y0 + B.cs * 3 - 10, LINE, 6); D.line(c, B.x0 + 10, B.y0 + B.cs * i, B.x0 + B.cs * 3 - 10, B.y0 + B.cs * i, LINE, 6); }
        g.forEach((v, i) => {
          const x = B.cx(i % 3), y = B.cy(Math.floor(i / 3)), r = B.cs * .28;
          if (v === 0) drawX(c, x, y, r, COL[0], 14); else if (v === 1) drawO(c, x, y, r * 1.1, COL[1], 14);
          else if (i === hov && !A.ended) { c.globalAlpha = .2; p ? drawO(c, x, y, r * 1.1, COL[1], 14) : drawX(c, x, y, r, COL[0], 14); c.globalAlpha = 1; }
        });
        if (win) { const [a, , b] = win.cells; D.line(c, B.cx(a[0]), B.cy(a[1]), B.cx(b[0]), B.cy(b[1]), ACC, 8); }
      }
    };
  }
});

/* ---------- Ultimate Tic Tac Toe ---------- */
reg({
  id: 'uttt', name: 'Ultimate TTT', cat: 'Board', icon: '#️⃣', type: 'turn', w: 600, h: 660, long: true,
  desc: 'Tic tac toe inside tic tac toe.', help: 'Win small boards to claim them; three claimed boards in a row wins. The cell you pick decides which board your opponent must play in next (any board if that one is finished).',
  make(A) {
    const B = mkBoard(A, 9, 9, 70, 24), g = Array(81).fill(-1), big = Array(9).fill(-1); let p = A.first, force = -1, win = null; A.turn(p);
    const full = b => { for (let k = 0; k < 9; k++) if (g[b * 9 + k] < 0) return false; return true; };
    const done = b => big[b] !== -1 || full(b);
    const getBig = (x, y) => x < 0 || y < 0 || x > 2 || y > 2 ? -1 : big[y * 3 + x] >= 0 ? big[y * 3 + x] : -1;
    return {
      down(x, y) {
        const k = B.at(x, y); if (!k) return;
        const b = Math.floor(k[1] / 3) * 3 + Math.floor(k[0] / 3), cell = (k[1] % 3) * 3 + k[0] % 3;
        if (done(b) || (force >= 0 && force !== b) || g[b * 9 + cell] >= 0) return;
        g[b * 9 + cell] = p; A.sfx('place');
        const sl = findLine((x, y) => x < 0 || y < 0 || x > 2 || y > 2 ? -1 : g[b * 9 + y * 3 + x], 3, 3, 3);
        if (sl) { big[b] = p; A.sfx('score'); }
        win = findLine(getBig, 3, 3, 3); if (win) return A.end(p);
        if ([...Array(9).keys()].every(done)) return A.end(-1);
        force = done(cell) ? -1 : cell; p = 1 - p; A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? (win ? `${A.names[win.p]} wins` : 'Draw') : null);
        const s = B.cs * 3;
        for (let b = 0; b < 9; b++) {
          const bx = B.x0 + (b % 3) * s, by = B.y0 + Math.floor(b / 3) * s;
          const active = !A.ended && !done(b) && (force < 0 || force === b);
          D.rr(c, bx + 4, by + 4, s - 8, s - 8, 10, active ? (p ? '#3ec5ff18' : '#ff4f6d18') : BG2, active ? COL[p] : null, 2);
          for (let i = 1; i < 3; i++) { D.line(c, bx + i * B.cs, by + 10, bx + i * B.cs, by + s - 10, LINE, 2); D.line(c, bx + 10, by + i * B.cs, bx + s - 10, by + i * B.cs, LINE, 2); }
          for (let k = 0; k < 9; k++) {
            const v = g[b * 9 + k], x = bx + (k % 3 + .5) * B.cs, y = by + (Math.floor(k / 3) + .5) * B.cs;
            if (v === 0) drawX(c, x, y, B.cs * .25, COL[0], 4); else if (v === 1) drawO(c, x, y, B.cs * .28, COL[1], 4);
          }
          if (big[b] >= 0) { c.fillStyle = '#0e0f1acc'; c.fillRect(bx + 4, by + 4, s - 8, s - 8); big[b] ? drawO(c, bx + s / 2, by + s / 2, s * .3, COL[1], 12) : drawX(c, bx + s / 2, by + s / 2, s * .28, COL[0], 12); }
        }
      }
    };
  }
});

/* ---------- Connect Four ---------- */
reg({
  id: 'c4', name: 'Four in a Row', cat: 'Board', icon: '🔴', type: 'turn', w: 700, h: 660,
  desc: 'Drop discs, connect four.', help: 'Tap a column to drop a disc. First to connect four in any direction wins.',
  make(A) {
    const B = mkBoard(A, 7, 6, 110, 24), g = grid2(7, 6, -1); let p = A.first, hov = 3, win = null, drop = null; A.turn(p);
    const get = (x, y) => x < 0 || y < 0 || x > 6 || y > 5 ? -1 : g[y][x];
    return {
      move(x) { hov = clamp(Math.floor((x - B.x0) / B.cs), 0, 6); },
      down(x) {
        if (drop) return; const col = clamp(Math.floor((x - B.x0) / B.cs), 0, 6); hov = col;
        let row = -1; for (let r = 5; r >= 0; r--) if (g[r][col] < 0) { row = r; break; }
        if (row < 0) return;
        drop = { col, row, y: B.y0 - B.cs, vy: 0, p };
      },
      update(dt) {
        if (!drop) return;
        drop.vy += 4000 * dt; drop.y += drop.vy * dt;
        if (drop.y >= B.cy(drop.row)) {
          g[drop.row][drop.col] = drop.p; drop = null; A.sfx('place');
          win = findLine(get, 7, 6, 4); if (win) return A.end(p);
          if (g[0].every(v => v >= 0)) return A.end(-1);
          p = 1 - p; A.turn(p);
        }
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? (win ? `${A.names[win.p]} wins` : 'Draw') : null);
        const r = B.cs * .4;
        if (!A.ended && !drop) D.circ(c, B.cx(hov), B.y0 - B.cs * .55, r, COL[p]);
        if (drop) D.circ(c, B.cx(drop.col), drop.y, r, COL[drop.p]);
        D.rr(c, B.x0 - 8, B.y0 - 8, B.cs * 7 + 16, B.cs * 6 + 16, 18, '#23284a');
        for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) D.circ(c, B.cx(x), B.cy(y), r, g[y][x] < 0 ? BG : COL[g[y][x]]);
        if (win) win.cells.forEach(([x, y]) => D.circ(c, B.cx(x), B.cy(y), r * .4, ACC));
      }
    };
  }
});

/* ---------- Gomoku ---------- */
reg({
  id: 'gomoku', name: 'Five in a Row', cat: 'Board', icon: '⚫', type: 'turn', w: 620, h: 680, long: true,
  desc: 'Gomoku on a 15×15 grid.', help: 'Place stones on the intersections. First to make an unbroken line of five wins.',
  make(A) {
    const N = 15, B = mkBoard(A, N, N, 70, 20), g = grid2(N, N, -1); let p = A.first, hov = null, win = null, last = null; A.turn(p);
    const get = (x, y) => x < 0 || y < 0 || x >= N || y >= N ? -1 : g[y][x];
    return {
      move(x, y) { hov = B.at(x, y); },
      down(x, y) {
        const k = B.at(x, y); if (!k || g[k[1]][k[0]] >= 0) return;
        g[k[1]][k[0]] = p; last = k; A.sfx('place'); win = findLine(get, N, N, 5);
        if (win) return A.end(p); if (g.every(r => r.every(v => v >= 0))) return A.end(-1);
        p = 1 - p; A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? (win ? `${A.names[win.p]} wins` : 'Draw') : null);
        D.rr(c, B.x0 - 6, B.y0 - 6, B.cs * N + 12, B.cs * N + 12, 10, BG2);
        for (let i = 0; i < N; i++) { D.line(c, B.cx(i), B.cy(0), B.cx(i), B.cy(N - 1), LINE, 1.5); D.line(c, B.cx(0), B.cy(i), B.cx(N - 1), B.cy(i), LINE, 1.5); }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] >= 0) D.circ(c, B.cx(x), B.cy(y), B.cs * .42, COL[g[y][x]]);
        if (last) D.circ(c, B.cx(last[0]), B.cy(last[1]), 3, '#fff');
        if (hov && !A.ended && g[hov[1]][hov[0]] < 0) { c.globalAlpha = .35; D.circ(c, B.cx(hov[0]), B.cy(hov[1]), B.cs * .42, COL[p]); c.globalAlpha = 1; }
        if (win) { const a = win.cells[0], b = win.cells[4]; D.line(c, B.cx(a[0]), B.cy(a[1]), B.cx(b[0]), B.cy(b[1]), ACC, 5); }
      }
    };
  }
});

/* ---------- Reversi ---------- */
reg({
  id: 'reversi', name: 'Reversi', cat: 'Board', icon: '⚪', type: 'turn', w: 600, h: 680, long: true,
  desc: 'Outflank and flip discs.', help: 'Place a disc so that it sandwiches enemy discs in a straight line; they flip to your color. If you cannot move you pass. Most discs at the end wins.',
  make(A) {
    const B = mkBoard(A, 8, 8, 90, 20), g = grid2(8, 8, -1); let p = A.first, msg = '';
    g[3][3] = g[4][4] = 1; g[3][4] = g[4][3] = 0; A.turn(p);
    const flips = (x, y, q) => {
      if (g[y][x] >= 0) return [];
      const out = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const run = []; let i = x + dx, j = y + dy;
        while (i >= 0 && j >= 0 && i < 8 && j < 8 && g[j][i] === 1 - q) { run.push([i, j]); i += dx; j += dy; }
        if (run.length && i >= 0 && j >= 0 && i < 8 && j < 8 && g[j][i] === q) out.push(...run);
      }
      return out;
    };
    const moves = q => { const m = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (flips(x, y, q).length) m.push([x, y]); return m; };
    const count = q => g.flat().filter(v => v === q).length;
    return {
      down(x, y) {
        const k = B.at(x, y); if (!k) return; const f = flips(k[0], k[1], p); if (!f.length) return;
        g[k[1]][k[0]] = p; f.forEach(([i, j]) => g[j][i] = p); A.sfx('place'); msg = '';
        if (moves(1 - p).length) { p = 1 - p; }
        else if (moves(p).length) { msg = `${A.names[1 - p]} has no move – passes`; }
        else { const a = count(0), b = count(1); return A.end(a === b ? -1 : a > b ? 0 : 1, `${a} – ${b}`); }
        A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Game over' : null);
        D.text(c, msg || `${count(0)}  ·  ${count(1)}`, A.W / 2, 66, 16, MUT);
        D.rr(c, B.x0, B.y0, B.cs * 8, B.cs * 8, 10, '#16352a');
        for (let i = 1; i < 8; i++) { D.line(c, B.x0 + i * B.cs, B.y0, B.x0 + i * B.cs, B.y0 + B.cs * 8, '#0e2a20', 2); D.line(c, B.x0, B.y0 + i * B.cs, B.x0 + B.cs * 8, B.y0 + i * B.cs, '#0e2a20', 2); }
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (g[y][x] >= 0) D.circ(c, B.cx(x), B.cy(y), B.cs * .4, COL[g[y][x]]);
        if (!A.ended) moves(p).forEach(([x, y]) => D.circ(c, B.cx(x), B.cy(y), B.cs * .1, COL[p] + '88'));
      }
    };
  }
});

/* ---------- Checkers ---------- */
reg({
  id: 'checkers', name: 'Checkers', cat: 'Board', icon: '🏁', type: 'turn', w: 600, h: 660, long: true,
  desc: 'Jump, capture, get crowned.', help: 'Move diagonally forward. Captures are mandatory and can chain. Reach the far side to become a king (moves both ways). Take all pieces or block your opponent to win.',
  make(A) {
    const B = mkBoard(A, 8, 8, 70, 20), b = grid2(8, 8, null); let p = A.first, sel = null, chain = null; A.turn(p);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) { if (y < 3) b[y][x] = { p: 1, k: 0 }; if (y > 4) b[y][x] = { p: 0, k: 0 }; }
    const dirs = pc => pc.k ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : pc.p ? [[1, 1], [-1, 1]] : [[1, -1], [-1, -1]];
    const inb = (x, y) => x >= 0 && y >= 0 && x < 8 && y < 8;
    const caps = (x, y) => { const pc = b[y][x], o = []; for (const [dx, dy] of dirs(pc)) { const m = [x + dx, y + dy], t = [x + 2 * dx, y + 2 * dy]; if (inb(...t) && b[m[1]][m[0]] && b[m[1]][m[0]].p !== pc.p && !b[t[1]][t[0]]) o.push({ x: t[0], y: t[1], c: m }); } return o; };
    const steps = (x, y) => dirs(b[y][x]).map(([dx, dy]) => ({ x: x + dx, y: y + dy })).filter(t => inb(t.x, t.y) && !b[t.y][t.x]);
    const mustCap = q => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (b[y][x] && b[y][x].p === q && caps(x, y).length) return true; return false; };
    const legal = (x, y) => { if (chain) return chain[0] === x && chain[1] === y ? caps(x, y) : []; return mustCap(p) ? caps(x, y) : steps(x, y); };
    const anyMove = q => { const sv = p; p = q; let r = false; for (let y = 0; y < 8 && !r; y++) for (let x = 0; x < 8; x++) if (b[y][x] && b[y][x].p === q && legal(x, y).length) { r = true; break; } p = sv; return r; };
    return {
      down(x, y) {
        const k = B.at(x, y); if (!k) return; const [i, j] = k;
        if (b[j][i] && b[j][i].p === p && !chain) { sel = legal(i, j).length ? [i, j] : null; if (sel) A.sfx('click'); return; }
        if (!sel) return;
        const mv = legal(sel[0], sel[1]).find(m => m.x === i && m.y === j); if (!mv) return;
        const pc = b[sel[1]][sel[0]]; b[j][i] = pc; b[sel[1]][sel[0]] = null; A.sfx('place');
        let crowned = false;
        if (!pc.k && ((pc.p === 0 && j === 0) || (pc.p === 1 && j === 7))) { pc.k = 1; crowned = true; A.sfx('score'); }
        if (mv.c) { b[mv.c[1]][mv.c[0]] = null; A.sfx('hit'); if (!crowned && caps(i, j).length) { chain = [i, j]; sel = [i, j]; return; } }
        chain = null; sel = null; p = 1 - p; A.turn(p);
        if (!anyMove(p)) A.end(1 - p, `${A.names[p]} has no moves left`);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Game over' : chain ? 'Keep jumping!' : null);
        const hl = sel ? legal(sel[0], sel[1]) : [];
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          D.rect(c, B.x0 + x * B.cs, B.y0 + y * B.cs, B.cs, B.cs, (x + y) % 2 ? '#2a2f52' : '#cfd3f0');
          const pc = b[y][x]; if (!pc) continue;
          const cx = B.cx(x), cy = B.cy(y), on = sel && sel[0] === x && sel[1] === y;
          D.circ(c, cx, cy + 3, B.cs * .38, COLD[pc.p]); D.circ(c, cx, cy, B.cs * .38, COL[pc.p], on ? '#fff' : null, 4);
          if (pc.k) D.text(c, '♛', cx, cy + 1, B.cs * .4, '#fff');
        }
        hl.forEach(m => D.circ(c, B.cx(m.x), B.cy(m.y), B.cs * .15, ACC));
        if (!sel && !A.ended) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (b[y][x] && b[y][x].p === p && legal(x, y).length) D.circ(c, B.cx(x), B.cy(y), B.cs * .42, null, '#fff6', 2);
      }
    };
  }
});

/* ---------- Dots and Boxes ---------- */
reg({
  id: 'dots', name: 'Dots & Boxes', cat: 'Board', icon: '⬛', type: 'turn', w: 600, h: 660,
  desc: 'Close boxes, steal the board.', help: 'Take turns drawing a line between two dots. Complete the fourth side of a box to claim it and go again. Most boxes wins.',
  make(A) {
    const N = 5, B = mkBoard(A, N, N, 90, 50), h = grid2(N, N + 1, -1), v = grid2(N + 1, N, -1), box = grid2(N, N, -1);
    let p = A.first, hov = null, sc = [0, 0]; A.turn(p);
    const near = (x, y) => {
      let best = null, bd = B.cs * .3;
      for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++) { const d = dist(x, y, B.x0 + (i + .5) * B.cs, B.y0 + j * B.cs); if (d < bd && h[j][i] < 0) { bd = d; best = ['h', i, j]; } }
      for (let j = 0; j < N; j++) for (let i = 0; i <= N; i++) { const d = dist(x, y, B.x0 + i * B.cs, B.y0 + (j + .5) * B.cs); if (d < bd && v[j][i] < 0) { bd = d; best = ['v', i, j]; } }
      return best;
    };
    const closed = (i, j) => h[j][i] >= 0 && h[j + 1][i] >= 0 && v[j][i] >= 0 && v[j][i + 1] >= 0;
    return {
      move(x, y) { hov = near(x, y); },
      down(x, y) {
        const e = near(x, y); if (!e) return; const [t, i, j] = e;
        (t === 'h' ? h : v)[j][i] = p; let got = 0;
        for (let y2 = 0; y2 < N; y2++) for (let x2 = 0; x2 < N; x2++) if (box[y2][x2] < 0 && closed(x2, y2)) { box[y2][x2] = p; got++; }
        sc[p] += got; A.sfx(got ? 'score' : 'click'); hov = null;
        if (sc[0] + sc[1] === N * N) return A.end(sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1, `${sc[0]} – ${sc[1]}`);
        if (!got) { p = 1 - p; A.turn(p); }
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Game over' : null);
        D.text(c, sc[0], A.W / 2 - 40, 70, 22, COL[0]); D.text(c, sc[1], A.W / 2 + 40, 70, 22, COL[1]);
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (box[j][i] >= 0) D.rr(c, B.x0 + i * B.cs + 6, B.y0 + j * B.cs + 6, B.cs - 12, B.cs - 12, 8, COL[box[j][i]] + '55');
        const seg = (x1, y1, x2, y2, col) => { c.lineCap = 'round'; D.line(c, x1, y1, x2, y2, col, 7); c.lineCap = 'butt'; };
        for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++) if (h[j][i] >= 0) seg(B.x0 + i * B.cs, B.y0 + j * B.cs, B.x0 + (i + 1) * B.cs, B.y0 + j * B.cs, COL[h[j][i]]);
        for (let j = 0; j < N; j++) for (let i = 0; i <= N; i++) if (v[j][i] >= 0) seg(B.x0 + i * B.cs, B.y0 + j * B.cs, B.x0 + i * B.cs, B.y0 + (j + 1) * B.cs, COL[v[j][i]]);
        if (hov && !A.ended) { const [t, i, j] = hov; c.globalAlpha = .4; t === 'h' ? seg(B.x0 + i * B.cs, B.y0 + j * B.cs, B.x0 + (i + 1) * B.cs, B.y0 + j * B.cs, COL[p]) : seg(B.x0 + i * B.cs, B.y0 + j * B.cs, B.x0 + i * B.cs, B.y0 + (j + 1) * B.cs, COL[p]); c.globalAlpha = 1; }
        for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) D.circ(c, B.x0 + i * B.cs, B.y0 + j * B.cs, 7, TXT);
      }
    };
  }
});

/* ---------- Nim ---------- */
reg({
  id: 'nim', name: 'Nim', cat: 'Board', icon: '🥢', type: 'turn',
  desc: "Don't take the last stick.", help: 'Tap a stick to take it and every stick to its right in that row. You can only take from one row per turn. Whoever takes the LAST stick loses.',
  make(A) {
    const rows = [1, 3, 5, 7]; let p = A.first, hov = null; A.turn(p);
    const pos = (r, k) => [A.W / 2 + (k - r) * 56, 110 + r * 100];
    const hit = (x, y) => { for (let r = 0; r < 4; r++) for (let k = 0; k < rows[r]; k++) { const [sx, sy] = pos(r, k); if (Math.abs(x - sx) < 24 && Math.abs(y - sy) < 40) return [r, k]; } return null; };
    return {
      move(x, y) { hov = hit(x, y); },
      down(x, y) {
        const h = hit(x, y); if (!h) return; rows[h[0]] = h[1]; A.sfx('click'); hov = null;
        if (rows.every(n => !n)) return A.end(1 - p, `${A.names[p]} took the last stick`);
        p = 1 - p; A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Game over' : null);
        for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) {
          if (k >= r * 2 + 1) continue; const [x, y] = pos(r, k);
          if (k >= rows[r]) { D.rr(c, x - 6, y - 36, 12, 72, 6, null, LINE, 2); continue; }
          const sel = hov && hov[0] === r && k >= hov[1] && !A.ended;
          D.rr(c, x - 7, y - 36, 14, 72, 7, sel ? COL[p] : '#e8c88a'); D.circ(c, x, y - 32, 8, sel ? '#fff' : '#d0553a');
        }
      }
    };
  }
});

/* ---------- Hex ---------- */
reg({
  id: 'hex', name: 'Hex', cat: 'Board', icon: '⬢', type: 'turn', w: 820, h: 560, long: true,
  desc: 'Connect your two sides.', help: `Red connects top and bottom; Blue connects left and right. Cells can't be removed, and there are no draws.`,
  make(A) {
    const N = 9, s = 26, w = Math.sqrt(3) * s, x0 = (A.W - (N + (N - 1) / 2) * w) / 2 + w / 2, y0 = 80;
    const g = grid2(N, N, -1); let p = A.first, hov = null, path = null; A.turn(p);
    const cx = (i, j) => x0 + i * w + j * w / 2, cy = j => y0 + j * s * 1.5;
    const at = (x, y) => { let best = null, bd = s * .95; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const d = dist(x, y, cx(i, j), cy(j)); if (d < bd) { bd = d; best = [i, j]; } } return best; };
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
    const won = q => {
      const seen = grid2(N, N, null), st = [];
      for (let k = 0; k < N; k++) { const [i, j] = q ? [0, k] : [k, 0]; if (g[j][i] === q) { seen[j][i] = true; st.push([i, j]); } }
      while (st.length) { const [i, j] = st.pop(); if ((q ? i : j) === N - 1) return true; for (const [dx, dy] of NB) { const a = i + dx, b = j + dy; if (a >= 0 && b >= 0 && a < N && b < N && !seen[b][a] && g[b][a] === q) { seen[b][a] = true; st.push([a, b]); } } }
      return false;
    };
    const hexPath = (x, y, r) => Array.from({ length: 6 }, (_, k) => [x + r * Math.cos(Math.PI / 6 + k * Math.PI / 3), y + r * Math.sin(Math.PI / 6 + k * Math.PI / 3)]);
    return {
      move(x, y) { hov = at(x, y); },
      down(x, y) { const k = at(x, y); if (!k || g[k[1]][k[0]] >= 0) return; g[k[1]][k[0]] = p; A.sfx('place'); if (won(p)) return A.end(p); p = 1 - p; A.turn(p); },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Connected!' : `${A.names[p]}'s turn — connect ${p ? 'left ↔ right' : 'top ↕ bottom'}`);
        // edges
        c.lineWidth = 8; c.lineCap = 'round';
        D.line(c, cx(0, 0) - w / 2, cy(0) - s, cx(N - 1, 0) + w / 2, cy(0) - s, COL[0], 8);
        D.line(c, cx(0, N - 1) - w / 2, cy(N - 1) + s, cx(N - 1, N - 1) + w / 2, cy(N - 1) + s, COL[0], 8);
        D.line(c, cx(0, 0) - w * .8, cy(0) - s * .4, cx(0, N - 1) - w * .8, cy(N - 1) + s * .2, COL[1], 8);
        D.line(c, cx(N - 1, 0) + w * .8, cy(0) - s * .2, cx(N - 1, N - 1) + w * .8, cy(N - 1) + s * .4, COL[1], 8);
        c.lineCap = 'butt';
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const v = g[j][i], isH = hov && hov[0] === i && hov[1] === j && v < 0 && !A.ended;
          D.poly(c, hexPath(cx(i, j), cy(j), s - 1.5), v >= 0 ? COL[v] : isH ? COL[p] + '55' : BG2, LINE, 2);
        }
      }
    };
  }
});

/* ---------- Mancala ---------- */
reg({
  id: 'mancala', name: 'Mancala', cat: 'Board', icon: '🫘', type: 'turn',
  desc: 'Sow seeds, capture, store.', help: `Pick one of your pits (Red: bottom row, Blue: top row). Seeds are sown one per pit counter-clockwise into your store. Land in your store = go again. Land in an empty pit on your side = capture the opposite pit. Most seeds wins.`,
  make(A) {
    const s = Array(14).fill(4); s[6] = s[13] = 0; let p = A.first, msg = '', lastPit = -1; A.turn(p);
    const pos = k => k === 6 ? [720, 250] : k === 13 ? [80, 250] : k < 6 ? [165 + k * 94, 340] : [165 + (12 - k) * 94, 160];
    const mine = (k, q) => q === 0 ? k >= 0 && k <= 5 : k >= 7 && k <= 12;
    const hit = (x, y) => { for (let k = 0; k < 14; k++) { if (k === 6 || k === 13) continue; const [px, py] = pos(k); if (dist(x, y, px, py) < 42) return k; } return -1; };
    let hov = -1;
    return {
      move(x, y) { hov = hit(x, y); },
      down(x, y) {
        const k = hit(x, y); if (k < 0 || !mine(k, p) || !s[k]) return;
        let n = s[k], i = k; s[k] = 0;
        while (n) { i = (i + 1) % 14; if (i === (p ? 6 : 13)) continue; s[i]++; n--; }
        lastPit = i; A.sfx('place'); msg = '';
        const store = p ? 13 : 6;
        if (mine(i, p) && s[i] === 1 && s[12 - i]) { s[store] += s[12 - i] + 1; msg = `Captured ${s[12 - i]}!`; s[12 - i] = 0; s[i] = 0; A.sfx('score'); }
        const e0 = s.slice(0, 6).every(v => !v), e1 = s.slice(7, 13).every(v => !v);
        if (e0 || e1) {
          for (let j = 0; j < 6; j++) { s[6] += s[j]; s[j] = 0; s[13] += s[j + 7]; s[j + 7] = 0; }
          return A.end(s[6] === s[13] ? -1 : s[6] > s[13] ? 0 : 1, `${s[6]} – ${s[13]}`);
        }
        if (i === store) msg = 'Free turn!'; else { p = 1 - p; }
        A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Game over' : null);
        D.text(c, msg, A.W / 2, 62, 16, ACC);
        D.rr(c, 30, 95, 740, 310, 60, '#3b2a1e');
        for (let k = 0; k < 14; k++) {
          const [x, y] = pos(k), st = k === 6 || k === 13, owner = k <= 6 ? 0 : 1;
          const can = !A.ended && mine(k, p) && s[k] > 0;
          if (st) D.rr(c, x - 40, y - 120, 80, 240, 40, '#24180f', COL[owner], 3);
          else D.circ(c, x, y, 40, '#24180f', can ? (hov === k ? '#fff' : COL[p]) : k === lastPit ? ACC + '88' : null, 3);
          for (let n = 0; n < Math.min(s[k], 24); n++) { const a = n * 2.4, r = Math.sqrt(n) * (st ? 9 : 7); D.circ(c, x + Math.cos(a) * r, y + Math.sin(a) * r * (st ? 1.6 : 1), 5, ['#e8c88a', '#a7d36b', '#e07a5f', '#9ecfff'][n % 4]); }
          D.text(c, s[k], x, st ? y + 140 : (k < 6 ? y + 58 : y - 58), 18, st ? COL[owner] : MUT);
        }
      }
    };
  }
});

/* ---------- Sea Battle ---------- */
reg({
  id: 'sea', name: 'Sea Battle', cat: 'Board', icon: '🚢', type: 'turn', long: true,
  desc: 'Hunt the hidden fleet.', help: 'Each side has a hidden random fleet (5 ships). Tap squares in your opponent\'s sea to fire. A hit lets you fire again. Sink every ship to win.',
  make(A) {
    const N = 8, cs = 38, gx = [30, 466], gy = 120, sizes = [4, 3, 3, 2, 2];
    const fleets = [0, 1].map(() => {
      const occ = grid2(N, N, -1), ships = [];
      sizes.forEach((sz, id) => { for (; ;) { const hz = rand() < .5, x = rint(0, hz ? N - sz : N - 1), y = rint(0, hz ? N - 1 : N - sz); const cells = Array.from({ length: sz }, (_, k) => hz ? [x + k, y] : [x, y + k]); if (cells.every(([a, b]) => occ[b][a] < 0)) { cells.forEach(([a, b]) => occ[b][a] = id); ships.push({ cells, sunk: false }); break; } } });
      return { occ, ships, shots: grid2(N, N, 0) };
    });
    let p = A.first, lock = 0, msg = ''; A.turn(p);
    return {
      update(dt) { if (lock > 0) { lock -= dt; if (lock <= 0) { p = 1 - p; A.turn(p); msg = ''; } } },
      down(x, y) {
        if (lock > 0) return; const t = 1 - p, F = fleets[t];
        const i = Math.floor((x - gx[t]) / cs), j = Math.floor((y - gy) / cs);
        if (i < 0 || j < 0 || i >= N || j >= N || F.shots[j][i]) return;
        const id = F.occ[j][i];
        if (id < 0) { F.shots[j][i] = 1; A.sfx('bounce'); msg = 'Miss'; lock = .7; return; }
        F.shots[j][i] = 2; A.sfx('boom'); A.shake(4); msg = 'Hit! Fire again';
        const sh = F.ships[id]; if (sh.cells.every(([a, b]) => F.shots[b][a] === 2)) { sh.sunk = true; msg = 'Sunk! Fire again'; }
        if (F.ships.every(s => s.sunk)) A.end(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Fleet destroyed!' : `${A.names[p]} — fire at ${A.names[1 - p]}'s sea`);
        D.text(c, msg, A.W / 2, 70, 18, ACC);
        for (let q = 0; q < 2; q++) {
          const F = fleets[q], target = !A.ended && q === 1 - p;
          D.text(c, `${A.names[q]}'s sea · ${F.ships.filter(s => !s.sunk).length} ships left`, gx[q] + N * cs / 2, gy - 18, 15, COL[q]);
          D.rr(c, gx[q] - 4, gy - 4, N * cs + 8, N * cs + 8, 8, '#10243a', target ? COL[p] : null, 3);
          for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
            const x = gx[q] + i * cs, y = gy + j * cs, s = F.shots[j][i];
            D.rr(c, x + 2, y + 2, cs - 4, cs - 4, 5, '#163352');
            if (A.ended && F.occ[j][i] >= 0 && !s) D.rr(c, x + 6, y + 6, cs - 12, cs - 12, 4, '#4a5a7a');
            if (s === 1) D.circ(c, x + cs / 2, y + cs / 2, 5, '#6a7fa8');
            if (s === 2) { const sunk = F.ships[F.occ[j][i]].sunk; D.rr(c, x + 4, y + 4, cs - 8, cs - 8, 4, sunk ? '#5b6077' : COL[1 - q]); if (!sunk) drawX(c, x + cs / 2, y + cs / 2, 8, '#fff', 3); }
          }
        }
      }
    };
  }
});

/* ---------- Memory ---------- */
reg({
  id: 'memory', name: 'Memory Match', cat: 'Board', icon: '🃏', type: 'turn', w: 640, h: 700,
  desc: 'Flip pairs, remember everything.', help: 'Flip two cards per turn. Find a matching pair to keep it and go again. Most pairs wins.',
  make(A) {
    const E = shuffle(['🍕', '🚀', '🐙', '🌵', '🎸', '🦊', '🍩', '⚽', '🌈', '👑', '🐝', '🎲']), cards = shuffle([...E, ...E].map(e => ({ e, own: -1, up: 0 })));
    const B = mkBoard(A, 4, 6, 90, 20); let p = A.first, open = [], lock = 0, sc = [0, 0]; A.turn(p);
    return {
      update(dt) { if (lock > 0) { lock -= dt; if (lock <= 0) { open.forEach(k => cards[k].up = 0); open = []; p = 1 - p; A.turn(p); } } },
      down(x, y) {
        if (lock > 0) return; const k = B.at(x, y); if (!k) return; const i = k[1] * 4 + k[0], cd = cards[i];
        if (cd.up || cd.own >= 0) return; cd.up = 1; open.push(i); A.sfx('click');
        if (open.length === 2) {
          const [a, b] = open;
          if (cards[a].e === cards[b].e) { cards[a].own = cards[b].own = p; sc[p]++; open = []; A.sfx('score'); if (sc[0] + sc[1] === 12) A.end(sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1, `${sc[0]} – ${sc[1]} pairs`); }
          else lock = 1;
        }
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'All pairs found' : null);
        D.text(c, sc[0], A.W / 2 - 40, 68, 22, COL[0]); D.text(c, sc[1], A.W / 2 + 40, 68, 22, COL[1]);
        cards.forEach((cd, i) => {
          const x = B.x0 + (i % 4) * B.cs + 5, y = B.y0 + Math.floor(i / 4) * B.cs + 5, s = B.cs - 10;
          if (cd.own >= 0) { D.rr(c, x, y, s, s, 12, COL[cd.own] + '33', COL[cd.own], 2); D.text(c, cd.e, x + s / 2, y + s / 2 + 3, s * .5); }
          else if (cd.up) { D.rr(c, x, y, s, s, 12, '#e9ecff'); D.text(c, cd.e, x + s / 2, y + s / 2 + 3, s * .5); }
          else { D.rr(c, x, y, s, s, 12, BG2, LINE, 2); D.text(c, '?', x + s / 2, y + s / 2, s * .35, LINE); }
        });
      }
    };
  }
});

/* ---------- Isolation ---------- */
reg({
  id: 'isolation', name: 'Isolation', cat: 'Board', icon: '♛', type: 'turn', w: 600, h: 660,
  desc: 'Move like a queen. Trap your foe.', help: 'Move your piece any distance in a straight or diagonal line (no jumping over holes or pieces). The square you leave collapses. If you cannot move on your turn, you lose.',
  make(A) {
    const N = 7, B = mkBoard(A, N, N, 70, 30), gone = grid2(N, N, false), pos = [[3, 6], [3, 0]]; let p = A.first; A.turn(p);
    const moves = q => { const o = [], [x, y] = pos[q]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { let i = x + dx, j = y + dy; while (i >= 0 && j >= 0 && i < N && j < N && !gone[j][i] && !(pos[1 - q][0] === i && pos[1 - q][1] === j)) { o.push([i, j]); i += dx; j += dy; } } return o; };
    return {
      down(x, y) {
        const k = B.at(x, y); if (!k || !moves(p).some(m => m[0] === k[0] && m[1] === k[1])) return;
        gone[pos[p][1]][pos[p][0]] = true; pos[p] = k; A.sfx('place');
        p = 1 - p; A.turn(p); if (!moves(p).length) A.end(1 - p, `${A.names[p]} is trapped`);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Trapped!' : null);
        const mv = A.ended ? [] : moves(p);
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!gone[j][i]) D.rr(c, B.x0 + i * B.cs + 3, B.y0 + j * B.cs + 3, B.cs - 6, B.cs - 6, 10, mv.some(m => m[0] === i && m[1] === j) ? COL[p] + '30' : BG2);
        pos.forEach(([i, j], q) => { D.circ(c, B.cx(i), B.cy(j), B.cs * .36, COL[q]); D.text(c, '♛', B.cx(i), B.cy(j) + 2, B.cs * .4, '#fff'); });
      }
    };
  }
});

/* ---------- Domineering ---------- */
reg({
  id: 'domineering', name: 'Domineering', cat: 'Board', icon: '🁢', type: 'turn', w: 600, h: 660,
  desc: 'Vertical vs horizontal dominoes.', help: 'Red places vertical dominoes, Blue places horizontal ones. Tap a square to place a domino starting there. The first player who has no room to place loses.',
  make(A) {
    const N = 8, B = mkBoard(A, N, N, 70, 30), g = grid2(N, N, -1); let p = A.first, hov = null; A.turn(p);
    const cells = (q, i, j) => q ? [[i, j], [i + 1, j]] : [[i, j], [i, j + 1]];
    const ok = (q, i, j) => cells(q, i, j).every(([a, b]) => a < N && b < N && g[b][a] < 0);
    const any = q => { for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (ok(q, i, j)) return true; return false; };
    return {
      move(x, y) { hov = B.at(x, y); },
      down(x, y) {
        const k = B.at(x, y); if (!k || !ok(p, ...k)) return; cells(p, ...k).forEach(([a, b]) => g[b][a] = p); A.sfx('place');
        p = 1 - p; A.turn(p); if (!any(p)) A.end(1 - p, `${A.names[p]} has no room`);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'No room left' : `${A.names[p]} — place ${p ? 'horizontal ↔' : 'vertical ↕'}`);
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) D.rr(c, B.x0 + i * B.cs + 2, B.y0 + j * B.cs + 2, B.cs - 4, B.cs - 4, 6, g[j][i] >= 0 ? COL[g[j][i]] : BG2);
        if (hov && !A.ended && ok(p, ...hov)) { c.globalAlpha = .45; cells(p, ...hov).forEach(([a, b]) => D.rr(c, B.x0 + a * B.cs + 2, B.y0 + b * B.cs + 2, B.cs - 4, B.cs - 4, 6, COL[p])); c.globalAlpha = 1; }
      }
    };
  }
});

/* ---------- Breakthrough ---------- */
reg({
  id: 'breakthrough', name: 'Breakthrough', cat: 'Board', icon: '♟️', type: 'turn', w: 600, h: 660,
  desc: 'Race a pawn to the other side.', help: 'Tap a pawn, then a destination. Pawns move one step straight or diagonally forward, and capture diagonally only. Reach the far row (or capture everything) to win.',
  make(A) {
    const N = 8, B = mkBoard(A, N, N, 70, 30), g = grid2(N, N, -1); let p = A.first, sel = null; A.turn(p);
    for (let i = 0; i < N; i++) { g[0][i] = g[1][i] = 1; g[6][i] = g[7][i] = 0; }
    const moves = (i, j) => { const q = g[j][i], f = q ? 1 : -1, o = [], y = j + f; if (y < 0 || y >= N) return o; for (const dx of [-1, 0, 1]) { const x = i + dx; if (x < 0 || x >= N) continue; if (g[y][x] < 0 || (dx && g[y][x] === 1 - q)) o.push([x, y]); } return o; };
    return {
      down(x, y) {
        const k = B.at(x, y); if (!k) return; const [i, j] = k;
        if (g[j][i] === p) { sel = k; A.sfx('click'); return; }
        if (!sel || !moves(...sel).some(m => m[0] === i && m[1] === j)) return;
        const cap = g[j][i] >= 0; g[j][i] = p; g[sel[1]][sel[0]] = -1; sel = null; A.sfx(cap ? 'hit' : 'place');
        if (j === (p ? N - 1 : 0) || !g.flat().includes(1 - p)) return A.end(p);
        p = 1 - p; A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Breakthrough!' : null);
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          D.rect(c, B.x0 + i * B.cs, B.y0 + j * B.cs, B.cs, B.cs, (i + j) % 2 ? '#23284a' : '#2d335c');
          if (g[j][i] >= 0) { const on = sel && sel[0] === i && sel[1] === j; D.circ(c, B.cx(i), B.cy(j) + 2, B.cs * .32, COLD[g[j][i]]); D.circ(c, B.cx(i), B.cy(j), B.cs * .32, COL[g[j][i]], on ? '#fff' : null, 4); }
        }
        if (sel) moves(...sel).forEach(([i, j]) => D.circ(c, B.cx(i), B.cy(j), 8, ACC));
      }
    };
  }
});

/* ---------- Sim ---------- */
reg({
  id: 'sim', name: 'Sim', cat: 'Board', icon: '🔺', type: 'turn', w: 600, h: 660,
  desc: "Don't make a triangle.", help: 'Take turns coloring one of the 15 lines. If you complete a triangle entirely in your own color, you LOSE. There is always a loser.',
  make(A) {
    const P = Array.from({ length: 6 }, (_, k) => [300 + Math.cos(k * Math.PI / 3 - Math.PI / 2) * 230, 370 + Math.sin(k * Math.PI / 3 - Math.PI / 2) * 230]);
    const E = []; for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) E.push({ a, b, o: -1 });
    let p = A.first, hov = -1, tri = null; A.turn(p);
    const segD = (x, y, [x1, y1], [x2, y2]) => { const dx = x2 - x1, dy = y2 - y1, t = clamp(((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy), 0, 1); return dist(x, y, x1 + dx * t, y1 + dy * t); };
    const near = (x, y) => { let bi = -1, bd = 18; E.forEach((e, i) => { if (e.o >= 0) return; const d = segD(x, y, P[e.a], P[e.b]); if (d < bd) { bd = d; bi = i; } }); return bi; };
    const col = (a, b) => E.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a)).o;
    return {
      move(x, y) { hov = near(x, y); },
      down(x, y) {
        const i = near(x, y); if (i < 0) return; E[i].o = p; A.sfx('place');
        for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) for (let d = b + 1; d < 6; d++) if (col(a, b) === p && col(b, d) === p && col(a, d) === p) { tri = [a, b, d]; return A.end(1 - p, `${A.names[p]} made a triangle`); }
        p = 1 - p; A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Triangle!' : null);
        if (tri) D.poly(c, tri.map(i => P[i]), ACC + '33');
        c.lineCap = 'round';
        E.forEach((e, i) => D.line(c, ...P[e.a], ...P[e.b], e.o >= 0 ? COL[e.o] : i === hov && !A.ended ? COL[p] + '88' : LINE, e.o >= 0 ? 8 : i === hov ? 8 : 4));
        c.lineCap = 'butt';
        P.forEach(([x, y]) => D.circ(c, x, y, 12, TXT));
      }
    };
  }
});

/* ---------- Atari Go ---------- */
reg({
  id: 'atarigo', name: 'Capture Go', cat: 'Board', icon: '🪨', type: 'turn', w: 600, h: 660,
  desc: 'First capture wins.', help: 'Place stones on intersections. A group with no empty neighboring points (liberties) is captured. The first player to capture any stones wins. Suicide moves are not allowed.',
  make(A) {
    const N = 9, B = mkBoard(A, N, N, 70, 24), g = grid2(N, N, -1); let p = A.first, hov = null, capd = []; A.turn(p);
    const nb = (i, j) => [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N);
    const group = (i, j) => { const q = g[j][i], seen = new Set([i + ',' + j]), st = [[i, j]], cells = []; let lib = 0; const libs = new Set();
      while (st.length) { const [a, b] = st.pop(); cells.push([a, b]); for (const [x, y] of nb(a, b)) { const k = x + ',' + y; if (g[y][x] < 0) libs.add(k); else if (g[y][x] === q && !seen.has(k)) { seen.add(k); st.push([x, y]); } } }
      lib = libs.size; return { cells, lib }; };
    return {
      move(x, y) { hov = B.at(x, y); },
      down(x, y) {
        const k = B.at(x, y); if (!k || g[k[1]][k[0]] >= 0) return; const [i, j] = k; g[j][i] = p;
        capd = []; for (const [a, b] of nb(i, j)) if (g[b][a] === 1 - p) { const gr = group(a, b); if (!gr.lib) capd.push(...gr.cells); }
        if (capd.length) { A.sfx('score'); return A.end(p, `Captured ${capd.length} stone${capd.length > 1 ? 's' : ''}`); }
        if (!group(i, j).lib) { g[j][i] = -1; A.sfx('bad'); return; }
        A.sfx('place'); p = 1 - p; A.turn(p);
        if (g.every(r => r.every(v => v >= 0))) A.end(-1);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Captured!' : null);
        D.rr(c, B.x0, B.y0, B.cs * N, B.cs * N, 10, '#c8a25e');
        for (let i = 0; i < N; i++) { D.line(c, B.cx(i), B.cy(0), B.cx(i), B.cy(N - 1), '#5a4220', 2); D.line(c, B.cx(0), B.cy(i), B.cx(N - 1), B.cy(i), '#5a4220', 2); }
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (g[j][i] >= 0) { D.circ(c, B.cx(i), B.cy(j) + 2, B.cs * .44, '#0006'); D.circ(c, B.cx(i), B.cy(j), B.cs * .44, COL[g[j][i]]); }
        capd.forEach(([i, j]) => drawX(c, B.cx(i), B.cy(j), B.cs * .2, '#fff', 4));
        if (hov && !A.ended && g[hov[1]][hov[0]] < 0) { c.globalAlpha = .4; D.circ(c, B.cx(hov[0]), B.cy(hov[1]), B.cs * .44, COL[p]); c.globalAlpha = 1; }
      }
    };
  }
});

/* ---------- Minesweeper Flags ---------- */
reg({
  id: 'mineflags', name: 'Mine Flags', cat: 'Board', icon: '💣', type: 'turn', w: 600, h: 680, long: true,
  desc: 'Minesweeper, but you WANT the mines.', help: 'Take turns revealing squares. Find a mine and you claim it and go again. Reveal a safe square and your turn ends. First to claim 13 of the 25 mines wins.',
  make(A) {
    const N = 12, M = 25, B = mkBoard(A, N, N, 80, 20), mine = grid2(N, N, false), rev = grid2(N, N, -1); let p = A.first, sc = [0, 0], last = null; A.turn(p);
    let placed = 0; while (placed < M) { const i = rint(0, N - 1), j = rint(0, N - 1); if (!mine[j][i]) { mine[j][i] = true; placed++; } }
    const nb = (i, j) => { const o = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = i + dx, b = j + dy; if ((dx || dy) && a >= 0 && b >= 0 && a < N && b < N) o.push([a, b]); } return o; };
    const num = (i, j) => nb(i, j).filter(([a, b]) => mine[b][a]).length;
    const NC = ['', '#3ec5ff', '#7bd389', '#ffd166', '#ff9f43', '#ff4f6d', '#c56cf0', '#fff', '#fff'];
    return {
      down(x, y) {
        const k = B.at(x, y); if (!k) return; const [i, j] = k; if (rev[j][i] >= 0) return; last = k;
        if (mine[j][i]) { rev[j][i] = 10 + p; sc[p]++; A.sfx('coin'); if (sc[p] > M / 2) A.end(p, `${sc[0]} – ${sc[1]} mines`); return; }
        const st = [[i, j]]; rev[j][i] = num(i, j);
        while (st.length) { const [a, b] = st.pop(); if (rev[b][a] === 0) for (const [c2, d2] of nb(a, b)) if (rev[d2][c2] < 0 && !mine[d2][c2]) { rev[d2][c2] = num(c2, d2); st.push([c2, d2]); } }
        A.sfx('click'); p = 1 - p; A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Minefield cleared' : null);
        D.text(c, `💣 ${sc[0]}`, A.W / 2 - 60, 66, 18, COL[0]); D.text(c, `${sc[1]} 💣`, A.W / 2 + 60, 66, 18, COL[1]); D.text(c, `${M - sc[0] - sc[1]} left`, A.W / 2, 66, 13, MUT);
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const x = B.x0 + i * B.cs, y = B.y0 + j * B.cs, r = rev[j][i];
          if (r < 0) D.rr(c, x + 1.5, y + 1.5, B.cs - 3, B.cs - 3, 5, '#2f3560');
          else if (r >= 10) { D.rr(c, x + 1.5, y + 1.5, B.cs - 3, B.cs - 3, 5, COL[r - 10]); D.text(c, '⚑', x + B.cs / 2, y + B.cs / 2 + 1, B.cs * .55, '#fff'); }
          else { D.rr(c, x + 1.5, y + 1.5, B.cs - 3, B.cs - 3, 5, BG2); if (r) D.text(c, r, x + B.cs / 2, y + B.cs / 2 + 1, B.cs * .5, NC[r]); }
          if (A.ended && mine[j][i] && r < 0) D.circ(c, x + B.cs / 2, y + B.cs / 2, B.cs * .2, MUT);
        }
        if (last) D.rr(c, B.x0 + last[0] * B.cs, B.y0 + last[1] * B.cs, B.cs, B.cs, 5, null, ACC, 2);
      }
    };
  }
});

/* ---------- Chomp ---------- */
reg({
  id: 'chomp', name: 'Chomp', cat: 'Board', icon: '🍫', type: 'turn',
  desc: "Eat chocolate. Avoid the poison.", help: 'Tap a square to eat it plus every square to its right and below. The top-left square is poisoned — whoever eats it loses.',
  make(A) {
    const C = 8, R = 5, B = mkBoard(A, C, R, 70, 30), g = grid2(C, R, 1); let p = A.first, hov = null; A.turn(p);
    return {
      move(x, y) { hov = B.at(x, y); },
      down(x, y) {
        const k = B.at(x, y); if (!k || !g[k[1]][k[0]]) return;
        if (k[0] === 0 && k[1] === 0) { g[0][0] = 0; A.sfx('bad'); return A.end(1 - p, `${A.names[p]} ate the poison ☠`); }
        for (let j = k[1]; j < R; j++) for (let i = k[0]; i < C; i++) g[j][i] = 0; A.sfx('place');
        p = 1 - p; A.turn(p);
      },
      draw(c) {
        banner(c, A, A.ended ? -1 : p, A.ended ? 'Poisoned!' : null);
        for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
          if (!g[j][i]) continue; const x = B.x0 + i * B.cs, y = B.y0 + j * B.cs;
          const sel = hov && !A.ended && i >= hov[0] && j >= hov[1] && g[hov[1]][hov[0]];
          D.rr(c, x + 3, y + 3, B.cs - 6, B.cs - 6, 8, sel ? COL[p] : '#7b4a2e'); D.rr(c, x + 10, y + 10, B.cs - 20, B.cs - 20, 6, sel ? '#ffffff33' : '#8f5a3a');
          if (!i && !j) D.text(c, '☠', x + B.cs / 2, y + B.cs / 2 + 2, B.cs * .45, '#b8ff6a');
        }
      }
    };
  }
});
