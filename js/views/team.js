/* Zeit — Equipe, Analytics e Ocorrências (MTBF/MTTR) */
(function () {
  /* ================= Equipe ================= */
  function personForm(sector, existing) {
    const p = existing || {};
    UI.modal({
      title: existing ? 'Editar pessoa' : 'Adicionar pessoa', size: 'sm', submitLabel: existing ? 'Salvar' : 'Adicionar',
      extraFoot: existing ? `<button type="button" class="btn btn-danger-ghost" id="p-del">${UI.icon('trash', 16)} Remover</button>` : '',
      body: `<label class="field">Nome (como aparece na coluna Resp.)<input name="name" required maxlength="80" value="${U.esc(p.name || '')}" placeholder="Ex.: R. Macedo"></label>
        <label class="field">Função <span class="opt">(opcional)</span><input name="role" maxlength="80" value="${U.esc(p.role || '')}" placeholder="Ex.: Eletricista"></label>`,
      onOpen(f) {
        const del = f.querySelector('#p-del');
        if (del) del.addEventListener('click', () => { sector.people = sector.people.filter((x) => x.id !== p.id); Store.save(); f.close(); });
      },
      onSubmit(d) {
        if (existing) Object.assign(existing, { name: d.name.trim(), role: d.role.trim() });
        else sector.people.push({ id: U.uid(), name: d.name.trim(), role: d.role.trim() });
        Store.save();
      },
    });
  }

  function team(sector) {
    const el = Shell.render(sector, 'equipe', { title: 'Equipe', actions: `<button class="btn btn-primary" id="t-add">${UI.icon('plus', 17)}<span class="lbl">Adicionar pessoa</span></button>` });
    const items = C.sectorActivities(sector.id);
    const groups = C.groupBy(items, (a) => C.responsibles(a));
    const map = new Map(groups.map((g) => [g.key, g]));
    const names = [...new Set([...sector.people.map((p) => p.name), ...groups.map((g) => g.key)])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const sup = C.groupBy(items, (a) => a.supplier).sort((a, b) => b.real - a.real);
    el.innerHTML = `
      <div class="people">${names.map((n) => {
        const g = map.get(n) || C.stats([]); const p = sector.people.find((x) => x.name === n);
        return `<div class="card person">
          <div class="person-top"><span class="avatar">${U.esc(U.initials(n))}</span><div><b>${U.esc(n)}</b><span class="muted">${U.esc(p && p.role ? p.role : (p ? '' : 'Não cadastrado — aparece nas atividades'))}</span></div>
            ${p ? `<button class="btn btn-ghost btn-icon btn-sm push" data-edit="${p.id}" aria-label="Editar">${UI.icon('edit', 15)}</button>` : `<button class="btn btn-ghost btn-sm push" data-reg="${U.esc(n)}">Cadastrar</button>`}</div>
          <div class="pstats">
            <div><b>${g.count || 0}</b><span>atividades</span></div>
            <div><b>${g.done || 0}</b><span>concluídas</span></div>
            <div><b>${U.hours(g.real || 0)}</b><span>realizadas</span></div>
            <div><b>${U.hours(g.plan || 0)}</b><span>planejadas</span></div>
          </div>
          ${UI.progress(g.progress == null ? null : g.progress)}
        </div>`;
      }).join('') || '<div class="empty"><p class="muted">Nenhum responsável ainda. Cadastre pessoas ou preencha a coluna Resp. nas atividades.</p></div>'}</div>
      <section class="card"><h3>Horas por fornecedor</h3>
        <div class="table-wrap flat"><table class="table">
          <thead><tr><th>Fornecedor</th><th class="num">Atividades</th><th class="num">Plan.</th><th class="num">Real.</th><th class="num">HH real.</th><th>Progresso</th></tr></thead>
          <tbody>${sup.map((g) => `<tr><td>${U.esc(g.key)}</td><td class="num">${g.count}</td><td class="num">${U.hours(g.plan)}</td><td class="num">${U.hours(g.real)}</td><td class="num">${U.num(g.realHH)}</td><td>${UI.progress(g.progress)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted center">Sem dados.</td></tr>'}</tbody>
        </table></div></section>`;
    document.getElementById('t-add').addEventListener('click', () => personForm(sector));
    el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => personForm(sector, sector.people.find((p) => p.id === b.dataset.edit))));
    el.querySelectorAll('[data-reg]').forEach((b) => b.addEventListener('click', () => { sector.people.push({ id: U.uid(), name: b.dataset.reg, role: '' }); Store.save(); }));
  }

  /* ================= Analytics ================= */
  function analytics(sector) {
    const year = Number(sessionStorage.getItem('zeit:year')) || new Date().getFullYear();
    const el = Shell.render(sector, 'analytics', { title: 'Analytics', actions: `<label class="inline-label">Ano ${DashboardView.periodSelect(sector.id, year)}</label>` });
    const scheds = C.sectorSchedules(sector.id).filter((s) => s.start.year === year || s.end.year === year);
    const items = scheds.flatMap((s) => s.activities.map((a) => ({ a, s })));
    const w = el.clientWidth;
    const half = Math.min(720, (w > 1000 ? w / 2 : w) - 70);
    const bySup = C.groupBy(items, (a) => a.supplier).sort((a, b) => b.plan - a.plan).slice(0, 10);
    const byResp = C.groupBy(items, (a) => C.responsibles(a)).sort((a, b) => b.plan - a.plan).slice(0, 10);
    const daily = C.dailyHours(items);
    const months = U.MONTHS_SHORT.map((l, i) => {
      let p = 0, r = 0;
      Object.entries(daily).forEach(([d, v]) => { if (U.yearOf(d) === year && U.monthOf(d) === i) { p += v.p; r += v.r; } });
      return { label: l, p, r };
    });
    const st = C.stats(items.map((x) => x.a));
    const postponedRate = st.count ? ((st.postponed + st.cancelled) / st.count) * 100 : null;
    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><small>Taxa de conclusão</small><b>${st.completion == null ? '—' : U.pct(st.completion)}</b><span>${st.done} de ${st.count} atividades</span></div>
        <div class="kpi"><small>Aderência ao plano</small><b>${st.adherence == null ? '—' : U.pct(st.adherence)}</b><span>realizado dentro do planejado</span></div>
        <div class="kpi"><small>Postergadas + canceladas</small><b>${postponedRate == null ? '—' : U.pct(postponedRate)}</b><span>${st.postponed + st.cancelled} atividades</span></div>
        <div class="kpi"><small>Média de homens</small><b>${U.num(items.filter((x) => x.a.menEnabled).length ? st.men / items.filter((x) => x.a.menEnabled).length : 0)}</b><span>nas atividades com equipe definida</span></div>
      </div>
      <div class="cards-2">
        <section class="card"><h3>Homem-hora por mês (${year})</h3>${Charts.columns(months.map((m) => ({ label: m.label, values: [m.p, m.r] })), [{ name: 'HH planejado', color: Charts.PLAN }, { name: 'HH realizado', color: Charts.REAL }], { width: half, unit: '' })}</section>
        <section class="card"><h3>Situação das atividades</h3>${Charts.donut(Object.keys(C.SIT_COLOR).map((k) => ({ label: k, value: st.bySit[k] || 0, color: C.SIT_COLOR[k] })).filter((i) => i.value), { center: String(st.count), sub: 'atividades' })}</section>
      </div>
      <div class="cards-2">
        <section class="card"><h3>Horas por fornecedor</h3>${Charts.hbars(bySup.map((g) => ({ label: g.key, plan: g.plan, real: g.real })))}</section>
        <section class="card"><h3>Horas por responsável</h3>${Charts.hbars(byResp.map((g) => ({ label: g.key, plan: g.plan, real: g.real })))}</section>
      </div>
      <section class="card"><h3>Resumo por cronograma</h3>
        <div class="table-wrap flat"><table class="table">
          <thead><tr><th>Cronograma</th><th>Período</th><th class="num">Ativ.</th><th class="num">Plan.</th><th class="num">Real.</th><th class="num">HH real.</th><th class="num">Backlog</th><th>Progresso</th></tr></thead>
          <tbody>${scheds.map((s) => { const x = C.stats(s.activities); return `<tr class="clickable" data-s="${s.id}"><td>${U.esc(s.title)}</td><td>${U.esc(C.periodLabel(s))}</td><td class="num">${x.count}</td><td class="num">${U.hours(x.plan)}</td><td class="num">${U.hours(x.real)}</td><td class="num">${U.num(x.realHH)}</td><td class="num">${U.hours(x.backlog)}</td><td>${UI.progress(x.progress)}</td></tr>`; }).join('') || '<tr><td colspan="8" class="muted center">Sem cronogramas neste ano.</td></tr>'}</tbody>
        </table></div></section>`;
    Charts.bindTips(el);
    el.querySelectorAll('tr[data-s]').forEach((tr) => tr.addEventListener('click', () => { location.hash = `#/s/${sector.id}/c/${tr.dataset.s}`; }));
    document.getElementById('dash-year').addEventListener('change', (e) => { sessionStorage.setItem('zeit:year', e.target.value); analytics(sector); });
  }

  /* ================= Ocorrências (falhas) ================= */
  function failureForm(sector, existing) {
    const f = existing || {};
    const now = new Date(); now.setMinutes(0, 0, 0);
    const local = (d) => `${U.iso(d)}T${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`;
    const eqs = [...new Set(Store.failuresOf(sector.id).map((x) => x.equipment))];
    UI.modal({
      title: existing ? 'Editar falha' : 'Registrar falha', submitLabel: existing ? 'Salvar' : 'Registrar',
      extraFoot: existing ? `<button type="button" class="btn btn-danger-ghost" id="f-del">${UI.icon('trash', 16)} Excluir</button>` : '',
      body: `<datalist id="dl-eq">${eqs.map((e) => `<option value="${U.esc(e)}">`).join('')}</datalist>
        <div class="grid-2">
          <label class="field">Equipamento<input name="equipment" list="dl-eq" required maxlength="80" value="${U.esc(f.equipment || '')}" placeholder="Ex.: Compressor CP03"></label>
          <label class="field">Tipo<select name="type">${['Mecânica', 'Elétrica', 'Hidráulica', 'Pneumática', 'Eletrônica', 'Operacional', 'Outra'].map((t) => `<option ${f.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="field">Início da parada<input name="start" type="datetime-local" required value="${f.start || local(now)}"></label>
          <label class="field">Fim (equipamento liberado)<input name="end" type="datetime-local" required value="${f.end || local(new Date(now.getTime() + 3600000))}"></label>
        </div>
        <label class="field">Descrição <span class="opt">(opcional)</span><input name="description" maxlength="200" value="${U.esc(f.description || '')}"></label>`,
      onOpen(form) {
        const del = form.querySelector('#f-del');
        if (del) del.addEventListener('click', () => { Store.deleteFailure(f.id); form.close(); });
      },
      onSubmit(d, form) {
        if (d.end < d.start) { form.showError('O fim deve ser depois do início.'); return false; }
        Store.saveFailure({ ...f, ...d, sectorId: sector.id });
      },
    });
  }

  function failures(sector) {
    const range = JSON.parse(sessionStorage.getItem('zeit:frange') || 'null') || { from: `${new Date().getFullYear()}-01-01`, to: U.today(), eq: '' };
    const el = Shell.render(sector, 'ocorrencias', { title: 'Ocorrências e confiabilidade', actions: `<button class="btn btn-primary" id="f-add">${UI.icon('plus', 17)}<span class="lbl">Registrar falha</span></button>` });
    const rel = C.reliability(sector.id, range.from, range.to, range.eq || null);
    const eqs = [...new Set(Store.failuresOf(sector.id).map((x) => x.equipment))].sort();
    const byEq = eqs.map((e) => ({ e, ...C.reliability(sector.id, range.from, range.to, e) })).filter((x) => x.n).sort((a, b) => b.down - a.down);
    el.innerHTML = `
      <div class="toolbar wrap">
        <label class="inline-label">De <input type="date" id="f-from" value="${range.from}"></label>
        <label class="inline-label">até <input type="date" id="f-to" value="${range.to}"></label>
        <select id="f-eq" class="select-inline"><option value="">Todos os equipamentos</option>${eqs.map((e) => `<option ${range.eq === e ? 'selected' : ''}>${U.esc(e)}</option>`).join('')}</select>
        <span class="spacer"></span>
        <span class="muted small">Base: ${U.num(Store.settings.opHoursPerDay)}h de operação por dia (altere em Configurações)</span>
      </div>
      <div class="kpis">
        <div class="kpi"><small>MTBF</small><b>${rel.mtbf == null ? '—' : U.hours(rel.mtbf)}</b><span>(tempo operando − parado) ÷ nº de falhas</span></div>
        <div class="kpi"><small>MTTR</small><b>${rel.mttr == null ? '—' : U.hours(rel.mttr)}</b><span>tempo parado ÷ nº de falhas</span></div>
        <div class="kpi"><small>Disponibilidade</small><b>${rel.availability == null ? '—' : U.pct(rel.availability)}</b><span>MTBF ÷ (MTBF + MTTR)</span></div>
        <div class="kpi"><small>Falhas</small><b>${rel.n}</b><span>${U.hours(rel.down)} de parada no período</span></div>
      </div>
      <div class="cards-2">
        <section class="card"><h3>Falhas registradas</h3>
          <div class="table-wrap flat"><table class="table">
            <thead><tr><th>Equipamento</th><th>Tipo</th><th>Início</th><th>Fim</th><th class="num">Parado</th><th>Descrição</th></tr></thead>
            <tbody>${rel.list.map((f) => `<tr class="clickable" data-f="${f.id}"><td><b>${U.esc(f.equipment)}</b></td><td>${U.esc(f.type || '')}</td><td>${U.fmtDateTime(f.start)}</td><td>${U.fmtDateTime(f.end)}</td><td class="num">${U.hours(C.failureHours(f))}</td><td class="wrap">${U.esc(f.description || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted center">Nenhuma falha no período.</td></tr>'}</tbody>
          </table></div></section>
        <section class="card"><h3>Por equipamento</h3>
          <div class="table-wrap flat"><table class="table">
            <thead><tr><th>Equipamento</th><th class="num">Falhas</th><th class="num">MTBF</th><th class="num">MTTR</th><th class="num">Disp.</th></tr></thead>
            <tbody>${byEq.map((x) => `<tr><td>${U.esc(x.e)}</td><td class="num">${x.n}</td><td class="num">${U.hours(x.mtbf)}</td><td class="num">${U.hours(x.mttr)}</td><td class="num">${U.pct(x.availability)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted center">—</td></tr>'}</tbody>
          </table></div></section>
      </div>`;
    const save = () => {
      sessionStorage.setItem('zeit:frange', JSON.stringify({ from: el.querySelector('#f-from').value || range.from, to: el.querySelector('#f-to').value || range.to, eq: el.querySelector('#f-eq').value }));
      failures(sector);
    };
    ['#f-from', '#f-to', '#f-eq'].forEach((s) => el.querySelector(s).addEventListener('change', save));
    document.getElementById('f-add').addEventListener('click', () => failureForm(sector));
    el.querySelectorAll('tr[data-f]').forEach((tr) => tr.addEventListener('click', () => failureForm(sector, Store.state.failures.find((f) => f.id === tr.dataset.f))));
  }

  window.TeamView = { team, analytics, failures };
})();
