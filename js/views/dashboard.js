/* Zeit — Dashboards: um para cada cronograma + visão geral da subpasta */
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
  const inYear = (s, y) => s.start.year === y || s.end.year === y;

  function kpi(label, value, sub, icon, tone = '') {
    return `<div class="kpi kpi-ic ${tone}"><div><small>${label}</small><b>${value}</b><span>${sub || ''}</span></div><i class="kpi-icon">${UI.icon(icon, 22)}</i></div>`;
  }
  function stateOf(s) {
    const t = U.today();
    if (t < Store.schedStart(s)) return 'Futuro';
    if (t > Store.schedEnd(s)) return 'Encerrado';
    return 'Em andamento';
  }
  /** cronograma "da vez": o que está acontecendo, senão o próximo, senão o mais recente */
  function defaultSchedule(list) {
    const t = U.today();
    return list.find((s) => Store.schedStart(s) <= t && t <= Store.schedEnd(s))
      || list.filter((s) => Store.schedStart(s) > t).sort((a, b) => Store.schedStart(a).localeCompare(Store.schedStart(b)))[0]
      || list.slice().sort((a, b) => Store.schedEnd(b).localeCompare(Store.schedEnd(a)))[0] || null;
  }

  /* ================= Dashboard de UM cronograma ================= */
  function scheduleDash(s, el) {
    const items = s.activities.map((a) => ({ a, s }));
    const st = C.stats(s.activities);
    const days = C.days(s);
    const daily = C.dailyHours(items);
    const hol = new Set(s.holidays);
    const w = Math.max(320, el.clientWidth || (el.parentElement && el.parentElement.clientWidth) || 900);
    const half = Math.min(760, (w > 1100 ? w * 0.58 : w) - 50);
    const rel = C.reliability(s.sectorId, Store.schedStart(s), Store.schedEnd(s));
    const menAct = s.activities.filter((a) => a.menEnabled);
    const pend = items.filter(({ a }) => !C.CLOSED.has(C.situation(a)));

    // curva S (HH acumulado)
    let cp = 0, cr = 0;
    const curveP = days.map((d) => { cp += (daily[d] || {}).p || 0; return { label: U.fmtShort(d), value: cp }; });
    const curveR = days.map((d) => { cr += (daily[d] || {}).r || 0; return { label: U.fmtShort(d), value: cr }; });
    const byResp = C.groupBy(items, (a) => C.responsibles(a)).sort((a, b) => b.plan - a.plan);
    const bySup = C.groupBy(items, (a) => a.supplier).sort((a, b) => b.plan - a.plan);
    const sitItems = Object.keys(C.SIT_COLOR).map((k) => ({ label: k, value: st.bySit[k] || 0, color: C.SIT_COLOR[k] })).filter((i) => i.value);
    const dayTip = (d) => `<b>${U.WEEKDAYS[U.dow(d)]}, ${U.fmt(d)}</b>${hol.has(d) ? ' · feriado/parada' : ''}<br><i class="sw" style="--c:${Charts.PLAN}"></i>Planejado: ${U.num((daily[d] || {}).p || 0)} HH<br><i class="sw" style="--c:${Charts.REAL}"></i>Realizado: ${U.num((daily[d] || {}).r || 0)} HH`;

    el.innerHTML = `
      <div class="kpis">
        ${kpi('Progresso', st.progress == null ? '—' : U.pct(st.progress), `${U.hours(st.real)} de ${U.hours(st.plan)} planejadas`, 'chart')}
        ${kpi('Horas realizadas', U.hours(st.real), `${U.num(st.realHH)} HH de ${U.num(st.planHH)} HH`, 'clock')}
        ${kpi('Backlog', U.hours(st.backlog), `${U.num(st.backlogHH)} HH ainda não realizados`, 'list')}
        ${kpi('Atividades', `${st.done}/${st.count}`, `${st.postponed} postergadas · ${st.cancelled} canceladas · ${st.noDates} sem datas`, 'check')}
      </div>
      <div class="kpis">
        ${kpi('Aderência ao plano', st.adherence == null ? '—' : U.pct(st.adherence), 'horas realizadas dentro do planejado', 'chart')}
        ${kpi('Homens alocados', U.num(st.men, 0), menAct.length ? `em ${U.plural(menAct.length, 'atividade', 'atividades')} com equipe definida` : 'nenhuma atividade com equipe definida', 'users')}
        ${kpi('Duração', U.plural(days.length, 'dia', 'dias'), `${U.kwLabel(s.start.week)} a ${U.kwLabel(s.end.week)} · ${U.plural(s.holidays.length, 'dia de feriado/parada', 'dias de feriado/parada')}`, 'calendar')}
        ${kpi('Falhas no período', rel.n, rel.n ? `MTBF ${U.hours(rel.mtbf)} · MTTR ${U.hours(rel.mttr)}` : 'nenhuma falha registrada nessas datas', 'wrench')}
      </div>
      <div class="cards-2">
        <section class="card"><h3>Homem-hora por dia</h3>
          ${Charts.columns(days.map((d) => ({ label: String(U.parse(d).getDate()), values: [(daily[d] || {}).p || 0, (daily[d] || {}).r || 0], tip: dayTip(d) })),
            [{ name: 'HH planejado', color: Charts.PLAN }, { name: 'HH realizado', color: Charts.REAL }], { width: half, unit: '' })}
        </section>
        <section class="card"><h3>Situação das atividades</h3>${Charts.donut(sitItems, { center: `${st.done}/${st.count}`, sub: 'concluídas' })}</section>
      </div>
      <div class="cards-2">
        <section class="card"><h3>Curva S — homem-hora acumulado</h3>
          ${Charts.line(curveP, { width: half, unit: '', series2: { color: Charts.REAL, points: curveR } })}
          ${Charts.legend([{ name: 'Planejado acumulado', color: Charts.PLAN }, { name: 'Realizado acumulado', color: Charts.REAL }])}
        </section>
        <section class="card"><h3>Horas por responsável</h3>${Charts.hbars(byResp.slice(0, 10).map((g) => ({ label: g.key, plan: g.plan, real: g.real, extra: `${U.num(g.realHH)} HH realizados` })))}</section>
      </div>
      <div class="cards-2">
        <section class="card"><div class="card-head"><h3>Pendências</h3><span class="muted small">${U.plural(pend.length, 'atividade em aberto', 'atividades em aberto')}</span></div>
          <div class="table-wrap flat"><table class="table">
            <thead><tr><th class="num">N°</th><th>Atividade</th><th>Resp.</th><th>Situação</th><th class="num">Falta</th></tr></thead>
            <tbody>${pend.slice(0, 15).map(({ a }) => `<tr class="clickable" data-a="${a.id}">
              <td class="num">${s.activities.indexOf(a) + 1}</td><td class="wrap">${U.esc(a.description)}${a.note ? `<div class="note-line">${UI.icon('note', 13)} ${U.esc(a.note)}</div>` : ''}</td>
              <td>${U.esc(a.responsible)}</td><td>${UI.sitBadge(C.situation(a))}</td><td class="num">${U.hours(Math.max(0, C.planHours(a) - C.realHours(a)))}</td></tr>`).join('') || '<tr><td colspan="5" class="muted center">Nenhuma pendência.</td></tr>'}</tbody>
          </table></div>${pend.length > 15 ? `<p class="muted small">+ ${pend.length - 15} outras — veja na grade.</p>` : ''}</section>
        <section class="card"><h3>Horas por fornecedor</h3>${Charts.hbars(bySup.slice(0, 10).map((g) => ({ label: g.key, plan: g.plan, real: g.real })))}</section>
      </div>`;
    Charts.bindTips(el);
    el.querySelectorAll('tr[data-a]').forEach((tr) => tr.addEventListener('click', () => ScheduleView.activityForm(s, s.activities.find((a) => a.id === tr.dataset.a))));
  }

  /* ================= Visão geral da subpasta ================= */
  function overview(sector, el, year) {
    const schedules = C.sectorSchedules(sector.id).filter((s) => inYear(s, year)).sort((a, b) => Store.schedStart(a).localeCompare(Store.schedStart(b)));
    const st = C.stats(schedules.flatMap((s) => s.activities));
    const end = `${year}-12-31` < U.today() ? `${year}-12-31` : U.today() < `${year}-01-01` ? `${year}-01-01` : U.today();
    const rel = C.reliability(sector.id, `${year}-01-01`, end);
    const w = el.clientWidth || 900;
    const half = Math.min(760, (w > 1100 ? w * 0.58 : w) - 60);
    el.innerHTML = `
      <div class="overview-head"><h2>Visão geral — ${U.esc(Z.ws.name)}</h2><label class="inline-label">Ano ${periodSelect(sector.id, year)}</label></div>
      <div class="kpis">
        ${kpi('MTBF', rel.mtbf == null ? '—' : U.hours(rel.mtbf), `tempo médio entre falhas · ${U.plural(rel.n, 'falha', 'falhas')}`, 'clock')}
        ${kpi('MTTR', rel.mttr == null ? '—' : U.hours(rel.mttr), 'tempo médio para reparo', 'wrench')}
        ${kpi('Disponibilidade', rel.availability == null ? '—' : U.pct(rel.availability), `${U.hours(rel.down)} de parada por falha`, 'check', rel.availability != null && rel.availability < 95 ? 'warn' : '')}
        ${kpi('Aderência ao plano', st.adherence == null ? '—' : U.pct(st.adherence), 'horas realizadas dentro do planejado', 'chart')}
      </div>
      <div class="kpis">
        ${kpi('Horas realizadas', U.hours(st.real), `de ${U.hours(st.plan)} planejadas`, 'clock')}
        ${kpi('Homem-hora (HH)', `${U.num(st.realHH)} HH`, `de ${U.num(st.planHH)} HH planejados`, 'users')}
        ${kpi('Backlog', U.hours(st.backlog), `${U.num(st.backlogHH)} HH pendentes`, 'list')}
        ${kpi('Atividades', `${st.done}/${st.count}`, `${st.completion == null ? '—' : U.pct(st.completion)} concluídas · ${st.postponed} postergadas`, 'check')}
      </div>
      <div class="cards-2">
        <section class="card"><h3>Comparativo entre cronogramas (${year})</h3>${Charts.columns(schedules.map((s) => { const x = C.stats(s.activities); return { label: s.title.replace(/\s*-\s*\d{4}(\/\d{4})?$/, ''), values: [x.plan, x.real] }; }), [{ name: 'Planejado', color: Charts.PLAN }, { name: 'Realizado', color: Charts.REAL }], { width: half, rotate: schedules.length > 4 })}</section>
        <section class="card"><div class="card-head"><h3>Últimas falhas</h3><a href="${Z.url('ocorrencias')}">Ocorrências</a></div>
          <ul class="activity-feed">${Store.failuresOf(sector.id).slice(0, 5).map((f) => `<li><i>${UI.icon('wrench', 15)}</i><div><b>${U.esc(f.equipment)}</b> — ${U.esc(f.description || f.type || 'falha')}<span>${U.fmtDateTime(f.start)} · ${U.hours(C.failureHours(f))} parado</span></div></li>`).join('') || `<li class="muted">Nenhuma falha registrada. Registre em <a href="${Z.url('ocorrencias')}">Ocorrências</a> para calcular MTBF e MTTR.</li>`}</ul>
        </section>
      </div>`;
    Charts.bindTips(el);
    el.querySelector('#dash-year').addEventListener('change', (e) => { sessionStorage.setItem('zeit:year', e.target.value); render(sector); });
  }

  /* ================= Página Dashboard ================= */
  function manageMenu(btn, s) {
    UI.menuAt(btn, [
      { label: 'Abrir a grade', icon: 'list', action: () => { location.hash = `${Z.base()}/c/${s.id}`; } },
      { label: 'Renomear / período / feriados', icon: 'edit', action: () => Drive.scheduleForm(s.sectorId, s) },
      { label: 'Mover para outra pasta', icon: 'folder', action: () => Drive.moveDialog('schedule', s.id) },
      { label: 'Duplicar (sem realizado)', icon: 'copy', action: () => { Store.duplicateSchedule(s.id); UI.toast('Cronograma duplicado'); } },
      { label: 'Imprimir', icon: 'print', action: () => Print.dialog(s) },
      { label: 'Exportar Excel', icon: 'download', action: () => Excel.exportSchedule(s) },
      { divider: true },
      { label: 'Excluir', icon: 'trash', danger: true, action: () => Drive.remove('schedule', s.id) },
    ]);
  }

  function render(sector) {
    const key = `zeit:dash:${Z.ws.id}`;
    const list = C.sectorSchedules(sector.id).sort((a, b) => Store.schedStart(b).localeCompare(Store.schedStart(a)));
    let sel = sessionStorage.getItem(key);
    if (!sel || (sel !== 'geral' && !list.some((s) => s.id === sel))) sel = (defaultSchedule(list) || {}).id || 'geral';
    const s = sel === 'geral' ? null : Store.schedule(sel);
    const el = Shell.render(sector, 'dashboard', {
      title: s ? `Dashboard — ${U.esc(s.title)}` : 'Dashboard',
      actions: s ? `<a class="btn" href="${Z.base()}/c/${s.id}">${UI.icon('list', 17)}<span class="lbl">Abrir grade</span></a>` : '',
    });
    el.innerHTML = `
      <div class="dash-pick" role="tablist" aria-label="Escolha o cronograma">
        <button class="dash-chip overview ${!s ? 'on' : ''}" data-pick="geral">${UI.icon('dashboard', 18)}<span class="chip-main"><b>Visão geral</b><small>${U.plural(list.length, 'cronograma', 'cronogramas')}</small></span></button>
        ${list.map((x) => { const st = C.stats(x.activities); return `
          <div class="dash-chip ${s && s.id === x.id ? 'on' : ''}" data-pick="${x.id}" role="tab" tabindex="0">
            <span class="chip-main"><b title="${U.esc(x.title)}">${U.esc(x.title)}</b><small>${U.kwLabel(x.start.week)}–${U.kwLabel(x.end.week)}/${x.end.year} · <em class="state">${stateOf(x)}</em></small>
              <i class="chip-prog"><i style="width:${Math.min(100, st.progress || 0)}%"></i></i></span>
            <button class="btn btn-ghost btn-icon btn-sm" data-manage="${x.id}" aria-label="Gerenciar">${UI.icon('more', 16)}</button>
          </div>`; }).join('')}
        <button class="dash-chip add" id="dash-new">${UI.icon('plus', 18)}<span class="chip-main"><b>Novo cronograma</b></span></button>
      </div>
      <div id="dash-body"></div>`;
    el.querySelectorAll('[data-pick]').forEach((c) => {
      const go = () => { sessionStorage.setItem(key, c.dataset.pick); render(sector); };
      c.addEventListener('click', (e) => { if (!e.target.closest('[data-manage]')) go(); });
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });
    el.querySelectorAll('[data-manage]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); manageMenu(b, Store.schedule(b.dataset.manage)); }));
    el.querySelector('#dash-new').addEventListener('click', () => Drive.scheduleForm(sector.id, null, Z.rootId()));
    const body = el.querySelector('#dash-body');
    if (!list.length) {
      body.innerHTML = `<div class="empty"><div class="empty-ico">${UI.icon('calendar', 34)}</div><p>Nenhum cronograma nesta subpasta ainda.</p><p class="muted">Crie um cronograma ou importe uma planilha em <a href="${Z.url('cronogramas')}">Cronogramas</a>.</p></div>`;
      return;
    }
    if (s) scheduleDash(s, body);
    else overview(sector, body, Number(sessionStorage.getItem('zeit:year')) || new Date().getFullYear());
  }

  window.DashboardView = { render, scheduleDash, periodSelect, yearsOf };
})();
