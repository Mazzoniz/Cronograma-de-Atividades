/* Dashboard: indicadores, gráfico de Gantt e gráficos de horas */
(function () {
  let ganttGroup = localStorage.getItem('cronograma:ganttGroup') || 'start';

  /* Tooltip único compartilhado por todos os gráficos */
  function tooltip() {
    let t = document.getElementById('viz-tip');
    if (!t) {
      t = document.createElement('div');
      t.id = 'viz-tip';
      t.className = 'viz-tip';
      t.hidden = true;
      document.body.appendChild(t);
    }
    return t;
  }
  function bindTips(root) {
    const t = tooltip();
    root.querySelectorAll('[data-tip]').forEach((el) => {
      el.addEventListener('mouseenter', () => { t.innerHTML = el.dataset.tip; t.hidden = false; });
      el.addEventListener('mousemove', (e) => {
        const r = t.getBoundingClientRect();
        let x = e.clientX + 14, y = e.clientY + 14;
        if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 14;
        if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - 14;
        t.style.left = `${x}px`;
        t.style.top = `${y}px`;
      });
      el.addEventListener('mouseleave', () => { t.hidden = true; });
    });
  }

  function kpi(label, value, sub, extra = '') {
    return `<div class="card kpi ${extra}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;
  }

  /* ---------------- Gantt ---------------- */
  function gantt(s) {
    const period = C.period(s);
    const acts = s.activities.filter((a) => a.start && a.end);
    if (!acts.length) return '<div class="empty small-empty"><p class="muted">Adicione atividades para visualizar o cronograma.</p></div>';

    // a linha do tempo cobre o período e, se preciso, atividades fora dele
    const start = [period.start, ...acts.map((a) => a.start)].sort()[0];
    const end = [period.end, ...acts.map((a) => a.end)].sort().pop();
    const days = U.countDays(start, end);
    const dw = days <= 70 ? 24 : days <= 130 ? 14 : days <= 200 ? 8 : 4;
    const width = days * dw;
    const idx = (iso) => U.countDays(start, iso) - 1;

    // cabeçalho de meses
    const months = [];
    let d = U.parse(start);
    const endD = U.parse(end);
    while (d <= endD) {
      const ym = U.iso(d).slice(0, 7);
      const mEnd = U.monthEnd(ym) > end ? end : U.monthEnd(ym);
      const from = U.iso(d);
      months.push({ ym, left: idx(from) * dw, width: U.countDays(from, mEnd) * dw });
      d = U.addDays(U.parse(mEnd), 1);
    }
    // dias (fins de semana sombreados)
    let dayCells = '', weekendBg = '';
    for (let i = 0; i < days; i++) {
      const dd = U.addDays(U.parse(start), i);
      const we = U.isWeekend(dd);
      if (we) weekendBg += `<div class="g-weekend" style="left:${i * dw}px;width:${dw}px"></div>`;
      if (dw >= 14) dayCells += `<div class="g-day ${we ? 'we' : ''}" style="left:${i * dw}px;width:${dw}px">${dd.getDate()}</div>`;
      else if (dd.getDay() === 1) dayCells += `<div class="g-day" style="left:${i * dw}px;width:${dw * 7}px;text-align:left;padding-left:2px">${dd.getDate()}</div>`;
    }
    const today = U.today();
    const todayLine = today >= start && today <= end ? `<div class="g-today" style="left:${idx(today) * dw + dw / 2}px" title="Hoje"></div>` : '';
    const outside = [];
    if (start < period.start) outside.push(`<div class="g-outside" style="left:0;width:${idx(period.start) * dw}px"></div>`);
    if (end > period.end) outside.push(`<div class="g-outside" style="left:${(idx(period.end) + 1) * dw}px;right:0"></div>`);

    // agrupamento
    let groups;
    const byStart = (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end);
    if (ganttGroup === 'person') {
      groups = s.people.map((p) => ({ title: p.name, color: p.color, acts: acts.filter((a) => a.personId === p.id).sort(byStart) }));
      const none = acts.filter((a) => !C.person(s, a.personId)).sort(byStart);
      if (none.length) groups.push({ title: 'Sem responsável', color: '#8a8986', acts: none });
      groups = groups.filter((g) => g.acts.length);
    } else {
      groups = [{ title: null, acts: acts.slice().sort(byStart) }];
    }

    const rows = groups.map((g) => {
      const head = g.title ? `<div class="g-row g-group"><div class="g-label"><span class="avatar" style="--c:${g.color}">${U.esc(U.initials(g.title))}</span><strong>${U.esc(g.title)}</strong></div><div class="g-track" style="width:${width}px"></div></div>` : '';
      return head + g.acts.map((a) => {
        const p = C.person(s, a.personId);
        const color = p ? p.color : '#8a8986';
        const left = idx(a.start) * dw;
        const w = U.countDays(a.start, a.end) * dw;
        const prog = C.progress(a);
        const status = C.STATUS[C.effectiveStatus(a)];
        const tip = `<strong>${U.esc(a.name)}</strong><br>${U.fmt(a.start)} → ${U.fmt(a.end)} · ${U.plural(C.activityWorkdays(a), 'dia útil', 'dias úteis')}<br>`
          + `${p ? U.esc(p.name) : 'Sem responsável'} · ${U.hours(a.hours)} estimadas<br>${status.icon} ${status.label} · ${U.pct(prog)} concluído`;
        return `<div class="g-row">
          <div class="g-label" title="${U.esc(a.name)}"><span class="g-dot" style="--c:${color}"></span><span class="clamp-1">${U.esc(a.name)}</span><span class="muted small g-h">${U.hours(a.hours)}</span></div>
          <div class="g-track" style="width:${width}px">
            <div class="g-bar ${C.isLate(a) ? 'late' : ''}" data-act="${a.id}" style="left:${left + 1}px;width:${Math.max(4, w - 2)}px;--c:${color}" data-tip="${U.esc(tip)}">
              <span class="g-prog" style="width:${prog}%"></span>
              ${w > 90 ? `<span class="g-bar-text ${prog >= 35 ? 'on-dark' : ''}">${U.pct(prog)}</span>` : ''}
            </div>
          </div>
        </div>`;
      }).join('');
    }).join('');

    return `
      <div class="gantt" style="--w:${width}px">
        <div class="g-head">
          <div class="g-label g-corner">Atividade</div>
          <div class="g-scale" style="width:${width}px">
            <div class="g-months">${months.map((m) => `<div class="g-month" style="left:${m.left}px;width:${m.width}px"><span>${U.monthLabel(m.ym, m.width > 120)}</span></div>`).join('')}</div>
            <div class="g-days">${dayCells}</div>
          </div>
        </div>
        <div class="g-body">
          <div class="g-bg" style="width:${width}px">${weekendBg}${outside.join('')}${todayLine}</div>
          ${rows}
        </div>
      </div>`;
  }

  /* ---------------- Horas por responsável (barras horizontais) ---------------- */
  function hoursByPerson(s) {
    const items = s.people.map((p) => ({ p, ...C.personStats(s, p) }));
    if (!items.length) return '<p class="muted">Cadastre responsáveis para ver a carga de cada um.</p>';
    const max = Math.max(1, ...items.map((i) => Math.max(i.capacity, i.planned)));
    return `<div class="hbars">
      ${items.map((i) => {
        const tip = `<strong>${U.esc(i.p.name)}</strong><br>Planejadas: ${U.hours(i.planned)}<br>Realizadas: ${U.hours(i.done)}<br>Capacidade: ${U.hours(i.capacity)}<br>Ocupação: ${U.pct(i.utilization)}`;
        const over = i.planned > i.capacity;
        return `<div class="hbar-row" data-tip="${U.esc(tip)}">
          <div class="hbar-label"><span class="g-dot" style="--c:${i.p.color}"></span>${U.esc(i.p.name)}</div>
          <div class="hbar-track">
            <div class="hbar-fill" style="width:${(i.planned / max) * 100}%;--c:${i.p.color}"><span class="hbar-done" style="width:${i.planned ? Math.min(100, (i.done / i.planned) * 100) : 0}%"></span></div>
            <div class="hbar-cap" style="left:${(i.capacity / max) * 100}%" title="Capacidade"></div>
          </div>
          <div class="hbar-value ${over ? 'warn' : ''}">${U.hours(i.planned)} <span class="muted">/ ${U.hours(i.capacity)}</span>${over ? ' ⚠' : ''}</div>
        </div>`;
      }).join('')}
      <div class="legend-row small">
        <span><i class="lg lg-solid"></i>horas planejadas</span>
        <span><i class="lg lg-done"></i>parte já realizada</span>
        <span><i class="lg lg-cap"></i>capacidade no período</span>
      </div>
    </div>`;
  }

  /* ---------------- Status (rosca) ---------------- */
  function statusDonut(st) {
    const entries = Object.entries(st.byStatus).filter(([, n]) => n > 0);
    if (!st.count) return '<p class="muted">Sem atividades.</p>';
    const R = 42, CIRC = 2 * Math.PI * R, GAP = entries.length > 1 ? 1.5 : 0;
    let offset = 0;
    const arcs = entries.map(([k, n]) => {
      const len = (n / st.count) * CIRC;
      const s = C.STATUS[k];
      const arc = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${s.color}" stroke-width="16"
        stroke-dasharray="${Math.max(0.1, len - GAP)} ${CIRC}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"
        data-tip="${U.esc(`${s.icon} <strong>${s.label}</strong>: ${n} (${U.pct((n / st.count) * 100)})`)}"></circle>`;
      offset += len;
      return arc;
    }).join('');
    return `<div class="donut-wrap">
      <svg viewBox="0 0 120 120" class="donut" role="img" aria-label="Distribuição por status">
        ${arcs}
        <text x="60" y="58" text-anchor="middle" class="donut-num">${st.doneCount}/${st.count}</text>
        <text x="60" y="73" text-anchor="middle" class="donut-sub">concluídas</text>
      </svg>
      <ul class="legend-list">
        ${Object.entries(st.byStatus).map(([k, n]) => `<li class="${n ? '' : 'dim'}"><span class="lg-sw" style="--c:${C.STATUS[k].color}"></span>${C.STATUS[k].icon} ${C.STATUS[k].label}<strong>${n}</strong></li>`).join('')}
      </ul>
    </div>`;
  }

  /* ---------------- Carga semanal (colunas empilhadas por responsável) ---------------- */
  function weeklyLoad(s, width) {
    const load = C.dailyLoad(s);
    const buckets = C.buckets(s, 'semana');
    const series = s.people.map((p) => ({ id: p.id, name: p.name, color: p.color, hpd: p.hoursPerDay }));
    if (load._none) series.push({ id: '_none', name: 'Sem responsável', color: '#8a8986', hpd: 0 });
    if (!series.length || !s.activities.length) return '<p class="muted">Sem dados de horas ainda.</p>';

    const data = buckets.map((b) => {
      const vals = series.map((se) => C.sumLoad(load[se.id], b.start, b.end));
      const cap = s.people.reduce((t, p) => t + (Number(p.hoursPerDay) || 0), 0) * U.countWorkdays(b.start, b.end);
      return { b, vals, total: vals.reduce((a, c) => a + c, 0), cap };
    });
    const maxV = Math.max(1, ...data.map((d) => Math.max(d.total, d.cap)));
    // escala "bonita"
    const step = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find((v) => maxV / v <= 5) || 2000;
    const top = Math.ceil(maxV / step) * step;

    const W = Math.max(320, Math.round(width || 640)), H = 260, PL = 44, PR = 8, PT = 10, PB = 38;
    const iw = W - PL - PR, ih = H - PT - PB;
    const bw = iw / data.length;
    const barW = Math.min(44, bw * 0.6);
    const y = (v) => PT + ih - (v / top) * ih;

    let grid = '';
    for (let v = 0; v <= top; v += step) {
      grid += `<line x1="${PL}" x2="${W - PR}" y1="${y(v)}" y2="${y(v)}" class="grid-line"/>`
        + `<text x="${PL - 6}" y="${y(v) + 4}" text-anchor="end" class="axis-text">${v}h</text>`;
    }
    const bars = data.map((d, i) => {
      const x = PL + i * bw + (bw - barW) / 2;
      let acc = 0;
      const segs = d.vals.map((v, si) => {
        if (v <= 0) return '';
        const y0 = y(acc), y1 = y(acc + v);
        acc += v;
        const h = Math.max(0, y0 - y1 - 2); // 2px de respiro entre segmentos
        return `<rect x="${x}" y="${y1}" width="${barW}" height="${h}" fill="${series[si].color}" rx="2"></rect>`;
      }).join('');
      const capY = y(d.cap);
      const tip = `<strong>Semana de ${U.fmtShort(d.b.start)} a ${U.fmtShort(d.b.end)}</strong><br>`
        + d.vals.map((v, si) => (v > 0 ? `<span class="tip-sw" style="--c:${series[si].color}"></span>${U.esc(series[si].name)}: ${U.hours(v)}` : '')).filter(Boolean).join('<br>')
        + `<br>Total: <strong>${U.hours(d.total)}</strong> · Capacidade: ${U.hours(d.cap)}`;
      return `<g class="col">
        ${segs}
        ${d.cap ? `<line x1="${x - 4}" x2="${x + barW + 4}" y1="${capY}" y2="${capY}" class="cap-line"/>` : ''}
        <text x="${x + barW / 2}" y="${H - PB + 16}" text-anchor="middle" class="axis-text">${U.fmtShort(d.b.start)}</text>
        <rect x="${PL + i * bw}" y="${PT}" width="${bw}" height="${ih}" fill="transparent" class="hit" data-tip="${U.esc(tip)}"></rect>
      </g>`;
    }).join('');

    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="colchart" role="img" aria-label="Horas planejadas por semana">
        ${grid}${bars}
        <line x1="${PL}" x2="${W - PR}" y1="${y(0)}" y2="${y(0)}" class="base-line"/>
      </svg>
      <div class="legend-row small">
        ${series.map((se) => `<span><i class="lg" style="background:${se.color}"></i>${U.esc(se.name)}</span>`).join('')}
        <span><i class="lg lg-capline"></i>capacidade da equipe</span>
      </div>`;
  }

  function render(s, el) {
    const st = C.stats(s);
    const today = U.today();
    const finished = st.last && st.last < today;
    el.innerHTML = `
      <div class="kpis">
        ${kpi('Atividades', st.count, `${st.doneCount} concluídas${st.lateCount ? ` · <span class="warn">${st.lateCount} atrasada${st.lateCount > 1 ? 's' : ''}</span>` : ''}`)}
        ${kpi('Horas planejadas', U.hours(st.planned), `${U.hours(st.done)} realizadas · ${U.hours(st.remainingHours)} restantes`)}
        ${kpi('Duração estimada', st.spanWorkdays ? `${st.spanWorkdays} <small>${st.spanWorkdays === 1 ? 'dia útil' : 'dias úteis'}</small>` : '—', st.first ? `${U.fmt(st.first)} → ${U.fmt(st.last)} (${st.spanDays} dias corridos)` : 'sem atividades')}
        ${kpi('Tempo restante', st.last ? (finished ? 'Encerrado' : `${st.remainingDays} <small>${st.remainingDays === 1 ? 'dia útil' : 'dias úteis'}</small>`) : '—', st.last ? `previsão de término em ${U.fmt(st.last)}` : '')}
        ${kpi('Progresso geral', U.pct(st.progress), `<div class="progress progress-lg"><span style="width:${st.progress}%"></span></div>`)}
        ${kpi('Ocupação da equipe', st.capacity ? U.pct(st.utilization) : '—', st.capacity ? `${U.hours(st.planned)} de ${U.hours(st.capacity)} disponíveis` : 'cadastre responsáveis', st.utilization > 100 ? 'kpi-warn' : '')}
      </div>
      ${st.unassigned ? `<p class="hint warn">⚠ ${U.plural(st.unassigned, 'atividade está', 'atividades estão')} sem responsável.</p>` : ''}

      <div class="card">
        <div class="card-head">
          <h3>Cronograma (Gantt)</h3>
          <div class="segmented" role="group" aria-label="Agrupar Gantt">
            <button class="${ganttGroup === 'start' ? 'on' : ''}" data-g="start">Por data</button>
            <button class="${ganttGroup === 'person' ? 'on' : ''}" data-g="person">Por responsável</button>
          </div>
        </div>
        <div class="gantt-scroll">${gantt(s)}</div>
        <p class="muted small">Clique em uma barra para editar a atividade. A parte mais escura indica o progresso; a linha vermelha marca hoje.</p>
      </div>

      <div class="dash-grid">
        <div class="card"><div class="card-head"><h3>Horas por responsável</h3></div>${hoursByPerson(s)}</div>
        <div class="card"><div class="card-head"><h3>Status das atividades</h3></div>${statusDonut(st)}</div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Horas planejadas por semana</h3></div>
        ${weeklyLoad(s, el.clientWidth - 34)}
      </div>`;

    el.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => {
      ganttGroup = b.dataset.g;
      localStorage.setItem('cronograma:ganttGroup', ganttGroup);
      render(s, el);
    }));
    el.querySelectorAll('.g-bar[data-act]').forEach((b) => b.addEventListener('click', () => {
      tooltip().hidden = true;
      Schedule.activityForm(s, s.activities.find((a) => a.id === b.dataset.act));
    }));
    bindTips(el);
    // rola o Gantt até hoje
    const sc = el.querySelector('.gantt-scroll');
    const tl = el.querySelector('.g-today');
    if (sc && tl) sc.scrollLeft = Math.max(0, tl.offsetLeft - sc.clientWidth / 3);
  }

  window.Dashboard = { render };
})();
