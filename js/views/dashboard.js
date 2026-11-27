/* Zeit — Dashboard do setor (indicadores industriais + horas) */
(function () {
  function yearsOf(sectorId) {
    const ys = new Set([new Date().getFullYear()]);
    C.sectorSchedules(sectorId).forEach((s) => { ys.add(s.start.year); ys.add(s.end.year); });
    Store.failuresOf(sectorId).forEach((f) => ys.add(Number(f.start.slice(0, 4))));
    return [...ys].sort((a, b) => b - a);
  }
  function periodSelect(sectorId, value) {
    return `<select id="dash-year" class="select-inline">${yearsOf(sectorId).map((y) => `<option ${y === value ? 'selected' : ''}>${y}</option>`).join('')}</select>`;
  }
  function inYear(s, y) { return s.start.year === y || s.end.year === y; }

  function kpi(label, value, sub, icon, tone = '') {
    return `<div class="kpi kpi-ic ${tone}"><div><small>${label}</small><b>${value}</b><span>${sub || ''}</span></div><i class="kpi-icon">${UI.icon(icon, 22)}</i></div>`;
  }
  function ring(pct) {
    const v = Math.min(100, pct || 0), R = 18, Cc = 2 * Math.PI * R;
    return `<svg class="ring" viewBox="0 0 44 44" width="52" height="52"><circle cx="22" cy="22" r="${R}" class="ring-bg"/><circle cx="22" cy="22" r="${R}" class="ring-fg" stroke-dasharray="${(v / 100) * Cc} ${Cc}" transform="rotate(-90 22 22)"/><text x="22" y="26" text-anchor="middle">${pct == null ? '—' : Math.round(pct)}%</text></svg>`;
  }

  function render(sector) {
    const year = Number(sessionStorage.getItem('zeit:year')) || new Date().getFullYear();
    const el = Shell.render(sector, 'dashboard', {
      title: 'Dashboard',
      actions: `<label class="inline-label">Ano ${periodSelect(sector.id, year)}</label>`,
    });
    const schedules = C.sectorSchedules(sector.id).filter((s) => inYear(s, year)).sort((a, b) => Store.schedStart(a).localeCompare(Store.schedStart(b)));
    const items = schedules.flatMap((s) => s.activities.map((a) => ({ a, s })));
    const st = C.stats(items.map((x) => x.a));
    const rel = C.reliability(sector.id, `${year}-01-01`, `${year}-12-31` < U.today() ? `${year}-12-31` : U.today() < `${year}-01-01` ? `${year}-01-01` : U.today());
    const w = el.clientWidth;

    // HH por KW
    const daily = C.dailyHours(items);
    const byKw = new Map();
    Object.entries(daily).forEach(([d, v]) => {
      const k = U.isoWeek(d); if (k.year !== year) return;
      const key = k.week; const cur = byKw.get(key) || { p: 0, r: 0 }; cur.p += v.p; cur.r += v.r; byKw.set(key, cur);
    });
    const kws = [...byKw.keys()].sort((a, b) => a - b);

    const sitItems = Object.keys(C.SIT_COLOR).map((k) => ({ label: k, value: st.bySit[k] || 0, color: C.SIT_COLOR[k] })).filter((i) => i.value || ['Concluído', 'Em andamento', 'Planejado', 'Postergado'].includes(i.label));
    const recent = C.sectorSchedules(sector.id).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
    const people = C.groupBy(items, (a) => C.responsibles(a)).sort((a, b) => b.realHH + b.planHH - a.realHH - a.planHH).slice(0, 8);

    el.innerHTML = `
      <div class="welcome">Bem-vindo ao <b>Zeit</b> — ${U.esc(sector.name)} · ${year}</div>
      <div class="kpis">
        ${kpi('MTBF', rel.mtbf == null ? '—' : U.hours(rel.mtbf), `tempo médio entre falhas · ${U.plural(rel.n, 'falha', 'falhas')}`, 'clock')}
        ${kpi('MTTR', rel.mttr == null ? '—' : U.hours(rel.mttr), 'tempo médio para reparo', 'wrench')}
        ${kpi('Disponibilidade', rel.availability == null ? '—' : U.pct(rel.availability), `${U.hours(rel.down)} de parada por falha`, 'check', rel.availability != null && rel.availability < 95 ? 'warn' : '')}
        ${kpi('Aderência ao plano', st.adherence == null ? '—' : U.pct(st.adherence), 'horas realizadas dentro do planejado', 'chart')}
      </div>
      <div class="kpis">
        ${kpi('Horas realizadas', U.hours(st.real), `de ${U.hours(st.plan)} planejadas`, 'clock')}
        ${kpi('Homem-hora (HH)', `${U.num(st.realHH)} HH`, `de ${U.num(st.planHH)} HH planejados`, 'users')}
        ${kpi('Backlog', U.hours(st.backlog), `${U.num(st.backlogHH)} HH pendentes`, 'list', st.backlog > 0 ? '' : '')}
        ${kpi('Atividades', `${st.done}/${st.count}`, `${st.completion == null ? '—' : U.pct(st.completion)} concluídas · ${st.postponed} postergadas · ${st.cancelled} canceladas`, 'check')}
      </div>
      <div class="cards-2">
        <section class="card"><h3>Horas por cronograma</h3><div id="ch-sched">${Charts.columns(schedules.map((s) => { const x = C.stats(s.activities); return { label: s.title.replace(/\s*-\s*\d{4}(\/\d{4})?$/, ''), values: [x.plan, x.real] }; }), [{ name: 'Planejado', color: Charts.PLAN }, { name: 'Realizado', color: Charts.REAL }], { width: Math.min(760, w * 0.58 - 60), rotate: schedules.length > 4 })}</div></section>
        <section class="card"><h3>Distribuição das atividades</h3>${Charts.donut(sitItems, { center: `${st.done}/${st.count}`, sub: 'concluídas' })}</section>
      </div>
      <div class="cards-2">
        <section class="card"><h3>Homem-hora por semana (KW)</h3>
          ${kws.length ? Charts.line(kws.map((k) => ({ label: U.kwLabel(k), value: byKw.get(k).p })), { width: Math.min(760, w * 0.58 - 60), unit: '', series2: { color: Charts.REAL, points: kws.map((k) => ({ label: U.kwLabel(k), value: byKw.get(k).r })) } }) + Charts.legend([{ name: 'HH planejado', color: Charts.PLAN }, { name: 'HH realizado', color: Charts.REAL }]) : '<p class="muted empty-chart">Sem horas marcadas neste ano.</p>'}
        </section>
        <section class="card"><h3>Horas por responsável</h3>${Charts.hbars(people.map((g) => ({ label: g.key, plan: g.plan, real: g.real, extra: `${U.num(g.realHH)} HH realizados` })))}</section>
      </div>
      <div class="cards-2">
        <section class="card">
          <div class="card-head"><h3>Cronogramas recentes</h3><a href="#/s/${sector.id}/cronogramas">Ver todos</a></div>
          <div class="recent">${recent.map((s) => { const x = C.stats(s.activities); const sit = x.progress >= 100 ? 'Concluído' : U.today() < Store.schedStart(s) ? 'Planejado' : U.today() > Store.schedEnd(s) ? 'Encerrado' : 'Em andamento'; return `
            <a class="recent-item" href="#/s/${sector.id}/c/${s.id}"><div><b>${U.esc(s.title)}</b><span><em class="state">${sit}</em> ${U.esc(C.periodLabel(s))}</span></div>${ring(x.progress)}</a>`; }).join('') || '<p class="muted">Nenhum cronograma ainda.</p>'}</div>
        </section>
        <section class="card">
          <div class="card-head"><h3>Últimas falhas registradas</h3><a href="#/s/${sector.id}/ocorrencias">Ocorrências</a></div>
          <ul class="activity-feed">${Store.failuresOf(sector.id).slice(0, 5).map((f) => `<li><i>${UI.icon('wrench', 15)}</i><div><b>${U.esc(f.equipment)}</b> — ${U.esc(f.description || f.type || 'falha')}<span>${U.fmtDateTime(f.start)} · ${U.hours(C.failureHours(f))} parado</span></div></li>`).join('') || '<li class="muted">Nenhuma falha registrada. Registre em <a href="#/s/' + sector.id + '/ocorrencias">Ocorrências</a> para calcular MTBF e MTTR.</li>'}</ul>
        </section>
      </div>`;
    Charts.bindTips(el);
    document.getElementById('dash-year').addEventListener('change', (e) => { sessionStorage.setItem('zeit:year', e.target.value); render(sector); });
  }

  window.DashboardView = { render, periodSelect, yearsOf };
})();
