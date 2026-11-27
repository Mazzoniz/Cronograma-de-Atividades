/* Zeit — gráficos em SVG (sem dependências), com tooltip ao passar o mouse */
(function () {
  const PLAN = '#2f5597';
  const REAL = '#00b050';

  function niceMax(v) {
    if (v <= 0) return 10;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return m * p;
  }

  /** Colunas agrupadas: rows [{label, values:[...], tip}], series [{name,color}] */
  function columns(rows, series, { height = 260, unit = 'h', width = 640, rotate = false } = {}) {
    if (!rows.length) return '<p class="muted empty-chart">Sem dados para exibir.</p>';
    const W = Math.max(320, width), H = height, PL = 46, PR = 10, PT = 12, PB = rotate ? 70 : 34;
    const iw = W - PL - PR, ih = H - PT - PB;
    const max = niceMax(Math.max(...rows.flatMap((r) => r.values)));
    const y = (v) => PT + ih - (v / max) * ih;
    const gw = iw / rows.length;
    const bw = Math.min(28, (gw * 0.7) / series.length);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i;
      g += `<line x1="${PL}" x2="${W - PR}" y1="${y(v)}" y2="${y(v)}" class="grid-line"/><text x="${PL - 6}" y="${y(v) + 4}" text-anchor="end" class="axis-text">${U.num(v, 0)}${unit}</text>`;
    }
    rows.forEach((r, i) => {
      const x0 = PL + i * gw + (gw - bw * series.length - 2 * (series.length - 1)) / 2;
      r.values.forEach((v, si) => {
        const h = Math.max(0, y(0) - y(v));
        g += `<rect x="${x0 + si * (bw + 2)}" y="${y(v)}" width="${bw}" height="${h}" rx="3" fill="${series[si].color}"/>`;
      });
      const lx = PL + i * gw + gw / 2;
      const label = U.esc(r.label.length > 18 ? `${r.label.slice(0, 17)}…` : r.label);
      g += rotate
        ? `<text x="${lx}" y="${H - PB + 14}" text-anchor="end" transform="rotate(-35 ${lx} ${H - PB + 14})" class="axis-text">${label}</text>`
        : `<text x="${lx}" y="${H - PB + 18}" text-anchor="middle" class="axis-text">${label}</text>`;
      const tip = r.tip || `<b>${U.esc(r.label)}</b><br>${series.map((s, si) => `<i class="sw" style="--c:${s.color}"></i>${s.name}: ${U.num(r.values[si])}${unit}`).join('<br>')}`;
      g += `<rect x="${PL + i * gw}" y="${PT}" width="${gw}" height="${ih}" class="hit" data-tip="${U.esc(tip)}"/>`;
    });
    g += `<line x1="${PL}" x2="${W - PR}" y1="${y(0)}" y2="${y(0)}" class="base-line"/>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">${g}</svg>${legend(series)}`;
  }

  /** Barras horizontais plan × real: rows [{label, plan, real, extra}] */
  function hbars(rows, { unit = 'h' } = {}) {
    if (!rows.length) return '<p class="muted empty-chart">Sem dados para exibir.</p>';
    const max = Math.max(1, ...rows.map((r) => Math.max(r.plan, r.real)));
    return `<div class="hbars">${rows.map((r) => {
      const tip = `<b>${U.esc(r.label)}</b><br><i class="sw" style="--c:${PLAN}"></i>Planejado: ${U.num(r.plan)}${unit}<br><i class="sw" style="--c:${REAL}"></i>Realizado: ${U.num(r.real)}${unit}${r.extra ? `<br>${r.extra}` : ''}`;
      return `<div class="hbar" data-tip="${U.esc(tip)}">
        <div class="hbar-label" title="${U.esc(r.label)}">${U.esc(r.label)}</div>
        <div class="hbar-tracks">
          <div class="hbar-track"><i style="width:${(r.plan / max) * 100}%;background:${PLAN}"></i></div>
          <div class="hbar-track"><i style="width:${(r.real / max) * 100}%;background:${REAL}"></i></div>
        </div>
        <div class="hbar-val"><b>${U.num(r.real)}</b> / ${U.num(r.plan)}${unit}</div>
      </div>`;
    }).join('')}</div>${legend([{ name: 'Planejado', color: PLAN }, { name: 'Realizado', color: REAL }])}`;
  }

  /** Rosca: items [{label, value, color}] */
  function donut(items, { center = '', sub = '' } = {}) {
    const total = U.sum(items, (i) => i.value);
    if (!total) return '<p class="muted empty-chart">Sem dados para exibir.</p>';
    const R = 42, CIRC = 2 * Math.PI * R, gap = items.filter((i) => i.value).length > 1 ? 1.2 : 0;
    let off = 0;
    const arcs = items.filter((i) => i.value).map((i) => {
      const len = (i.value / total) * CIRC;
      const a = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${i.color}" stroke-width="15" stroke-dasharray="${Math.max(0.1, len - gap)} ${CIRC}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)" data-tip="${U.esc(`<b>${i.label}</b>: ${U.num(i.value, 0)} (${U.pct((i.value / total) * 100)})`)}"/>`;
      off += len; return a;
    }).join('');
    return `<div class="donut-wrap"><svg viewBox="0 0 120 120" class="donut">${arcs}
      <text x="60" y="59" text-anchor="middle" class="donut-num">${center}</text><text x="60" y="73" text-anchor="middle" class="donut-sub">${sub}</text></svg>
      <ul class="legend-list">${items.map((i) => `<li class="${i.value ? '' : 'dim'}"><i class="sw" style="--c:${i.color}"></i><span>${U.esc(i.label)}</span><b>${U.num(i.value, 0)}</b></li>`).join('')}</ul></div>`;
  }

  /** Linha: points [{label, value}] */
  function line(points, { height = 220, width = 640, unit = 'h', color = PLAN, series2 } = {}) {
    if (!points.length) return '<p class="muted empty-chart">Sem dados para exibir.</p>';
    const W = Math.max(320, width), H = height, PL = 46, PR = 12, PT = 12, PB = 34;
    const iw = W - PL - PR, ih = H - PT - PB;
    const all = points.map((p) => p.value).concat(series2 ? series2.points.map((p) => p.value) : []);
    const max = niceMax(Math.max(...all));
    const x = (i) => PL + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
    const y = (v) => PT + ih - (v / max) * ih;
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = (max / 4) * i; g += `<line x1="${PL}" x2="${W - PR}" y1="${y(v)}" y2="${y(v)}" class="grid-line"/><text x="${PL - 6}" y="${y(v) + 4}" text-anchor="end" class="axis-text">${U.num(v, 0)}${unit}</text>`; }
    const path = (pts, c) => `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ')}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/>`
      + pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="3.5" fill="${c}" stroke="var(--surface)" stroke-width="1.5"/>`).join('');
    g += path(points, color);
    if (series2) g += path(series2.points, series2.color);
    const step = Math.ceil(points.length / 12);
    points.forEach((p, i) => {
      if (i % step === 0) g += `<text x="${x(i)}" y="${H - PB + 18}" text-anchor="middle" class="axis-text">${U.esc(p.label)}</text>`;
      const w = iw / Math.max(1, points.length);
      const tip = `<b>${U.esc(p.label)}</b><br><i class="sw" style="--c:${color}"></i>${U.num(p.value)}${unit}${series2 ? `<br><i class="sw" style="--c:${series2.color}"></i>${U.num(series2.points[i].value)}${unit}` : ''}`;
      g += `<rect x="${x(i) - w / 2}" y="${PT}" width="${w}" height="${ih}" class="hit" data-tip="${U.esc(tip)}"/>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${g}</svg>`;
  }

  function legend(series) {
    return `<div class="legend-row">${series.map((s) => `<span><i class="sw" style="--c:${s.color}"></i>${U.esc(s.name)}</span>`).join('')}</div>`;
  }

  function bindTips(root) {
    const t = document.getElementById('viz-tip');
    root.querySelectorAll('[data-tip]').forEach((el) => {
      el.addEventListener('mouseenter', () => { t.innerHTML = el.dataset.tip; t.hidden = false; });
      el.addEventListener('mousemove', (e) => {
        const r = t.getBoundingClientRect();
        let x = e.clientX + 14, y = e.clientY + 14;
        if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
        if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
        t.style.left = `${x}px`; t.style.top = `${y}px`;
      });
      el.addEventListener('mouseleave', () => { t.hidden = true; });
    });
  }

  window.Charts = { PLAN, REAL, columns, hbars, donut, line, legend, bindTips };
})();
