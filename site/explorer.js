(() => {
  const SVG = 'http://www.w3.org/2000/svg';

  const graphs = {
    chain: {
      pos: [[90, 170], [300, 170], [510, 170]],
      edges: (w) => [[0, 1, 1], [1, 2, 1]],
      cut: 1,
      usesW: false,
    },
    cycle: {
      pos: [[300, 70], [480, 270], [120, 270]],
      edges: (w) => [[0, 1, w], [1, 2, w], [2, 0, w]],
      cut: 2,
      usesW: true,
    },
    star: {
      pos: [[300, 170], [110, 70], [490, 70], [490, 270], [110, 270]],
      edges: () => [[0, 1, 0.25], [0, 2, 0.25], [0, 3, 0.25], [0, 4, 0.25], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1]],
      cut: 4,
      usesW: false,
    },
  };

  const matrix = (n, edges, k, cut) => {
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    edges.forEach(([i, j, w], e) => {
      if (e !== cut) A[i][j] = w * k;
    });
    return A;
  };

  const mul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, v, t) => s + v * B[t][j], 0)));

  const spectralRadius = (A) => {
    let M = A.map((r) => r.slice());
    let log = 0;
    let p = 1;
    for (let s = 0; s < 11; s++) {
      M = mul(M, M);
      log *= 2;
      p *= 2;
      const f = Math.max(...M.flat().map(Math.abs));
      if (f === 0) return 0;
      M = M.map((r) => r.map((v) => v / f));
      log += Math.log(f);
    }
    return Math.exp(log / p);
  };

  const ceiling = (A) => {
    const n = A.length;
    const M = Array.from({ length: n }, (_, i) => [...A.map((row, j) => (i === j ? 1 : 0) - A[j][i]), 1]);
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map((row, i) => row[n] / row[i]);
  };

  const fmt = (x) => String(+x.toFixed(2));

  for (const box of document.querySelectorAll('[data-explorer]')) {
    const el = (name) => box.querySelector(`[data-ex="${name}"]`);
    const svg = el('svg');
    const draw = () => {
      const topo = box.querySelector('input[type=radio]:checked').value;
      const g = graphs[topo];
      const k = +el('k').value;
      const w = +el('w').value;
      const breaker = el('breaker').checked;
      el('kOut').textContent = k;
      el('wOut').textContent = w.toFixed(2);
      el('w').disabled = !g.usesW;
      const edges = g.edges(w);
      const A = matrix(g.pos.length, edges, k, breaker ? g.cut : -1);
      const rho = spectralRadius(A);
      el('rho').textContent = `Spectral radius ${fmt(rho)}`;
      const verdict = el('verdict');
      let loads = null;
      if (rho < 1 - 1e-9) {
        loads = ceiling(A);
        verdict.textContent = `Bounded. With one unit of outside load on every service, none can carry more than ${fmt(Math.max(...loads))}.`;
        verdict.classList.remove('unbounded');
      } else {
        verdict.textContent = 'No guarantee. The radius is 1 or more, so the static check cannot rule out a retry storm.';
        verdict.classList.add('unbounded');
      }

      svg.replaceChildren();
      const defs = document.createElementNS(SVG, 'defs');
      defs.innerHTML = '<marker id="ex-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="arrow" d="M0 0L10 5L0 10z"/></marker>';
      svg.append(defs);
      const R = 30;
      edges.forEach(([i, j], e) => {
        const [x1, y1] = g.pos[i];
        const [x2, y2] = g.pos[j];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        const bend = topo === 'star' ? (i === 0 ? 14 : -14) : 0;
        const nx = (-dy / len) * bend;
        const ny = (dx / len) * bend;
        const sx = x1 + (dx / len) * R + nx;
        const sy = y1 + (dy / len) * R + ny;
        const ex = x2 - (dx / len) * (R + 4) + nx;
        const ey = y2 - (dy / len) * (R + 4) + ny;
        const line = document.createElementNS(SVG, 'path');
        line.setAttribute('d', `M${sx} ${sy}L${ex} ${ey}`);
        line.setAttribute('class', `edge${breaker && e === g.cut ? ' cut' : ''}`);
        if (!(breaker && e === g.cut)) line.setAttribute('marker-end', 'url(#ex-arrow)');
        svg.append(line);
      });
      g.pos.forEach(([x, y], i) => {
        const c = document.createElementNS(SVG, 'circle');
        c.setAttribute('cx', x);
        c.setAttribute('cy', y);
        c.setAttribute('r', R);
        c.setAttribute('class', 'node');
        const t = document.createElementNS(SVG, 'text');
        t.setAttribute('x', x);
        t.setAttribute('y', y + 5);
        t.setAttribute('class', 'node-label');
        t.textContent = String.fromCharCode(65 + i);
        const l = document.createElementNS(SVG, 'text');
        l.setAttribute('x', x);
        l.setAttribute('y', y + (y > 200 ? 54 : -42));
        l.setAttribute('class', 'load-label');
        l.textContent = loads ? `at most ${fmt(loads[i])}` : 'unbounded';
        svg.append(c, t, l);
      });
    };
    box.addEventListener('input', draw);
    draw();
  }
})();
