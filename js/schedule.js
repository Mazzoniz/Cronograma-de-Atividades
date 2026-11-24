/* Tela do cronograma: Atividades, Responsáveis, Horas e Dashboard */
(function () {
  const TABS = [
    { id: 'atividades', label: 'Atividades', icon: '☑' },
    { id: 'responsaveis', label: 'Responsáveis', icon: '👥' },
    { id: 'horas', label: 'Horas', icon: '⏱' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  ];
  const filters = { q: '', person: '', status: '', sort: 'start' };
  let hoursMode = 'mes';

  /* ---------------- helpers visuais ---------------- */
  function personChip(s, personId) {
    const p = C.person(s, personId);
    if (!p) return '<span class="muted">— sem responsável —</span>';
    return `<span class="person-chip"><span class="avatar" style="--c:${p.color}">${U.esc(U.initials(p.name))}</span>${U.esc(p.name)}</span>`;
  }
  function statusBadge(a) {
    const k = C.effectiveStatus(a);
    const st = C.STATUS[k];
    return `<span class="badge" style="--c:${st.color}"><span class="badge-ico">${st.icon}</span>${st.label}</span>`;
  }
  function progressBar(pct) {
    return `<div class="progress" title="${U.pct(pct)}"><span style="width:${pct}%"></span></div><span class="progress-label">${U.pct(pct)}</span>`;
  }

  /* ---------------- Formulário de atividade ---------------- */
  function activityForm(s, existing) {
    const a = existing || {};
    const period = C.period(s);
    const defaultStart = U.today() >= period.start && U.today() <= period.end ? U.nextWorkday(U.today()) : U.nextWorkday(period.start);
    const isNew = !existing;
    const peopleOpts = s.people.map((p) => `<option value="${p.id}" ${p.id === a.personId ? 'selected' : ''}>${U.esc(p.name)}${p.role ? ` — ${U.esc(p.role)}` : ''} (${U.num(p.hoursPerDay)}h/dia)</option>`).join('');

    UI.modal({
      title: isNew ? 'Nova atividade' : 'Editar atividade',
      submitLabel: isNew ? 'Adicionar' : 'Salvar',
      wide: true,
      extraFoot: isNew ? '' : '<button type="button" class="btn btn-danger-ghost" id="act-del">🗑 Excluir</button>',
      body: `
        <label>Atividade<input name="name" required maxlength="160" value="${U.esc(a.name || '')}" placeholder="Ex.: Elaborar relatório mensal"></label>
        <label><span>Descrição <span class="muted">(opcional)</span></span><textarea name="description" rows="2" maxlength="1000">${U.esc(a.description || '')}</textarea></label>
        <div class="grid-3">
          <label>Responsável
            <select name="personId">
              <option value="">— sem responsável —</option>
              ${peopleOpts}
            </select>
          </label>
          <label>Prioridade
            <select name="priority">
              ${Object.entries(C.PRIORITY).map(([k, v]) => `<option value="${k}" ${(a.priority || 'media') === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select>
          </label>
          <label>Status
            <select name="status">
              ${['pendente', 'em_andamento', 'concluida', 'bloqueada'].map((k) => `<option value="${k}" ${(a.status || 'pendente') === k ? 'selected' : ''}>${C.STATUS[k].label}</option>`).join('')}
            </select>
          </label>
        </div>
        ${s.people.length ? '' : '<p class="hint warn">Nenhum responsável cadastrado ainda. Cadastre na aba <strong>Responsáveis</strong> para atribuir atividades e calcular a duração pela jornada.</p>'}
        <div class="grid-3">
          <label>Horas estimadas<input name="hours" type="number" min="0" step="0.5" required value="${a.hours ?? 8}"></label>
          <label>Início<input name="start" type="date" required value="${a.start || defaultStart}"></label>
          <label>Término<input name="end" type="date" required value="${a.end || defaultStart}"></label>
        </div>
        <label class="check"><input type="checkbox" name="auto" ${isNew ? 'checked' : ''}> Calcular o término automaticamente pelas horas e pela jornada do responsável</label>
        <p class="hint" id="act-hint"></p>
        <div class="grid-3">
          <label>Horas realizadas<input name="doneHours" type="number" min="0" step="0.5" value="${a.doneHours ?? 0}"></label>
        </div>`,
      onOpen(form) {
        const f = form.elements;
        const hint = form.querySelector('#act-hint');
        const recompute = () => {
          const p = C.person(s, f.personId.value);
          const perDay = p && p.hoursPerDay > 0 ? Number(p.hoursPerDay) : 8;
          const hours = Number(f.hours.value) || 0;
          const need = Math.max(1, Math.ceil(hours / perDay));
          f.end.readOnly = f.auto.checked;
          if (f.auto.checked && f.start.value) f.end.value = U.addWorkdays(f.start.value, need);
          const avail = U.countWorkdays(f.start.value, f.end.value);
          const msgs = [`⏱ ${U.hours(hours)} ÷ ${U.num(perDay)}h/dia${p ? ` (${U.esc(p.name)})` : ' (jornada padrão)'} ≈ <strong>${U.plural(need, 'dia útil', 'dias úteis')}</strong> de trabalho.`];
          if (f.start.value && f.end.value) {
            if (f.end.value < f.start.value) msgs.push('<span class="warn">⚠ O término é anterior ao início.</span>');
            else msgs.push(`Janela escolhida: ${U.plural(avail, 'dia útil', 'dias úteis')} (${U.fmt(f.start.value)} a ${U.fmt(f.end.value)}).`);
            if (avail && avail < need) msgs.push(`<span class="warn">⚠ A janela é menor que o necessário — isso exige ${U.num(hours / avail)}h por dia.</span>`);
            if (f.start.value < period.start || f.end.value > period.end) msgs.push(`<span class="warn">⚠ Fora do período do cronograma (${U.fmt(period.start)} a ${U.fmt(period.end)}).</span>`);
          }
          hint.innerHTML = msgs.join('<br>');
        };
        ['personId', 'hours', 'start', 'end', 'auto'].forEach((n) => {
          f[n].addEventListener('input', recompute);
          f[n].addEventListener('change', recompute);
        });
        f.status.addEventListener('change', () => {
          if (f.status.value === 'concluida' && (Number(f.doneHours.value) || 0) === 0) f.doneHours.value = f.hours.value;
        });
        recompute();
        const del = form.querySelector('#act-del');
        if (del) del.addEventListener('click', async () => {
          form.close();
          if (await UI.confirm(`Excluir a atividade <strong>${U.esc(a.name)}</strong>?`, { title: 'Excluir atividade' })) {
            s.activities = s.activities.filter((x) => x.id !== a.id);
            Store.touch(s);
            UI.toast('Atividade excluída');
          }
        });
      },
      onSubmit(d, form) {
        if (d.end < d.start) { form.showError('A data de término deve ser igual ou posterior à de início.'); return false; }
        const data = {
          name: d.name.trim(), description: d.description.trim(), personId: d.personId || null,
          priority: d.priority, status: d.status, start: d.start, end: d.end,
          hours: Number(d.hours) || 0, doneHours: Number(d.doneHours) || 0,
        };
        if (existing) Object.assign(existing, data);
        else s.activities.push({ id: U.uid(), ...data });
        Store.touch(s);
        UI.toast(existing ? 'Atividade atualizada' : 'Atividade adicionada');
      },
    });
  }

  /* ---------------- Formulário de responsável ---------------- */
  function personForm(s, existing) {
    const p = existing || {};
    const color = p.color || Store.nextPersonColor(s);
    UI.modal({
      title: existing ? 'Editar responsável' : 'Novo responsável',
      submitLabel: existing ? 'Salvar' : 'Adicionar',
      extraFoot: existing ? '<button type="button" class="btn btn-danger-ghost" id="p-del">🗑 Excluir</button>' : '',
      body: `
        <label>Nome<input name="name" required maxlength="80" value="${U.esc(p.name || '')}" placeholder="Ex.: Maria Silva"></label>
        <label><span>Função / cargo <span class="muted">(opcional)</span></span><input name="role" maxlength="80" value="${U.esc(p.role || '')}" placeholder="Ex.: Analista"></label>
        <div class="grid-2">
          <label>Horas disponíveis por dia<input name="hoursPerDay" type="number" min="0.5" max="24" step="0.5" required value="${p.hoursPerDay ?? 8}"></label>
          <div class="field"><span class="field-label">Cor</span>
            <div class="color-row">
              ${Store.PERSON_COLORS.map((c) => `<label class="swatch" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === color ? 'checked' : ''}><span></span></label>`).join('')}
            </div>
          </div>
        </div>
        <p class="hint" id="p-hint"></p>`,
      onOpen(form) {
        const upd = () => {
          const h = Number(form.elements.hoursPerDay.value) || 0;
          const wd = C.periodWorkdays(s);
          form.querySelector('#p-hint').textContent = `Capacidade no período: ${U.num(h)}h × ${wd} dias úteis = ${U.hours(h * wd)}.`;
        };
        form.elements.hoursPerDay.addEventListener('input', upd);
        upd();
        const del = form.querySelector('#p-del');
        if (del) del.addEventListener('click', async () => {
          form.close();
          const n = s.activities.filter((a) => a.personId === p.id).length;
          const extra = n ? `<br><br>${U.plural(n, 'atividade ficará', 'atividades ficarão')} sem responsável.` : '';
          if (await UI.confirm(`Excluir <strong>${U.esc(p.name)}</strong>?${extra}`, { title: 'Excluir responsável' })) {
            s.people = s.people.filter((x) => x.id !== p.id);
            s.activities.forEach((a) => { if (a.personId === p.id) a.personId = null; });
            Store.touch(s);
            UI.toast('Responsável excluído');
          }
        });
      },
      onSubmit(d) {
        const data = { name: d.name.trim(), role: d.role.trim(), hoursPerDay: Number(d.hoursPerDay) || 8, color: d.color || color };
        if (existing) Object.assign(existing, data);
        else s.people.push({ id: U.uid(), ...data });
        Store.touch(s);
        UI.toast(existing ? 'Responsável atualizado' : 'Responsável adicionado');
      },
    });
  }

  /* ---------------- Aba: Atividades ---------------- */
  function renderActivities(s, el) {
    const q = filters.q.toLowerCase();
    let acts = s.activities.filter((a) => (!q || a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q))
      && (!filters.person || (filters.person === '_none' ? !C.person(s, a.personId) : a.personId === filters.person))
      && (!filters.status || C.effectiveStatus(a) === filters.status));
    const sorters = {
      start: (a, b) => (a.start || '').localeCompare(b.start || '') || (a.end || '').localeCompare(b.end || ''),
      end: (a, b) => (a.end || '').localeCompare(b.end || ''),
      name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      hours: (a, b) => (b.hours || 0) - (a.hours || 0),
      priority: (a, b) => (C.PRIORITY[a.priority]?.order ?? 9) - (C.PRIORITY[b.priority]?.order ?? 9),
    };
    acts = acts.slice().sort(sorters[filters.sort] || sorters.start);
    const totalH = acts.reduce((t, a) => t + (Number(a.hours) || 0), 0);
    const totalD = acts.reduce((t, a) => t + (Number(a.doneHours) || 0), 0);

    el.innerHTML = `
      <div class="toolbar wrap">
        <input type="search" id="f-q" placeholder="Filtrar atividades…" value="${U.esc(filters.q)}">
        <select id="f-person">
          <option value="">Todos os responsáveis</option>
          ${s.people.map((p) => `<option value="${p.id}" ${filters.person === p.id ? 'selected' : ''}>${U.esc(p.name)}</option>`).join('')}
          <option value="_none" ${filters.person === '_none' ? 'selected' : ''}>Sem responsável</option>
        </select>
        <select id="f-status">
          <option value="">Todos os status</option>
          ${Object.entries(C.STATUS).map(([k, v]) => `<option value="${k}" ${filters.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
        <select id="f-sort" title="Ordenar por">
          ${[['start', 'Ordenar: início'], ['end', 'Ordenar: término'], ['name', 'Ordenar: nome'], ['hours', 'Ordenar: horas'], ['priority', 'Ordenar: prioridade']]
            .map(([k, l]) => `<option value="${k}" ${filters.sort === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <span class="spacer"></span>
        <button class="btn btn-primary" id="add-act">＋ Nova atividade</button>
      </div>
      ${!s.activities.length ? `
        <div class="empty">
          <div class="empty-icon">☑</div>
          <p>Nenhuma atividade ainda.</p>
          <p class="muted">${s.people.length ? 'Adicione a primeira atividade do cronograma.' : 'Dica: cadastre primeiro os responsáveis na aba <a href="#/cronograma/' + s.id + '/responsaveis">Responsáveis</a>.'}</p>
        </div>` : `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Atividade</th><th>Responsável</th><th>Início</th><th>Término</th>
              <th class="num" title="Dias úteis entre início e término">Dias úteis</th>
              <th class="num">Horas est.</th><th class="num">Realizadas</th><th>Progresso</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${acts.map((a) => {
              const need = C.daysNeeded(s, a);
              const wd = C.activityWorkdays(a);
              const warn = [];
              if (wd < need) warn.push(`Precisa de ${U.plural(need, 'dia útil', 'dias úteis')} pela jornada do responsável`);
              if (C.outOfPeriod(s, a)) warn.push('Fora do período do cronograma');
              return `
              <tr data-id="${a.id}" class="clickable">
                <td>
                  <div class="act-name"><span class="prio prio-${a.priority || 'media'}" title="Prioridade ${C.PRIORITY[a.priority || 'media'].label}"></span>${U.esc(a.name)}</div>
                  ${a.description ? `<div class="muted small clamp-1">${U.esc(a.description)}</div>` : ''}
                </td>
                <td>${personChip(s, a.personId)}</td>
                <td>${U.fmt(a.start)}</td>
                <td>${U.fmt(a.end)}</td>
                <td class="num">${wd}${warn.length ? ` <span class="warn-ico" title="${U.esc(warn.join(' · '))}">⚠</span>` : ''}</td>
                <td class="num">${U.hours(a.hours)}</td>
                <td class="num">${U.hours(a.doneHours)}</td>
                <td class="progress-cell">${progressBar(C.progress(a))}</td>
                <td>${statusBadge(a)}</td>
                <td class="row-actions">
                  ${a.status !== 'concluida' ? `<button class="btn btn-ghost btn-icon btn-sm" data-done="${a.id}" title="Marcar como concluída">✓</button>` : ''}
                  <button class="btn btn-ghost btn-icon btn-sm" data-menu="${a.id}" title="Mais opções">⋯</button>
                </td>
              </tr>`;
            }).join('') || '<tr><td colspan="10" class="muted center">Nenhuma atividade corresponde aos filtros.</td></tr>'}
          </tbody>
          <tfoot>
            <tr><td colspan="5">${U.plural(acts.length, 'atividade', 'atividades')}</td><td class="num">${U.hours(totalH)}</td><td class="num">${U.hours(totalD)}</td><td colspan="3"></td></tr>
          </tfoot>
        </table>
      </div>`}`;

    const rerender = () => renderActivities(s, el);
    const fq = el.querySelector('#f-q');
    fq.addEventListener('input', () => {
      filters.q = fq.value;
      const pos = fq.selectionStart;
      rerender();
      const n = el.querySelector('#f-q');
      n.focus();
      n.setSelectionRange(pos, pos);
    });
    el.querySelector('#f-person').addEventListener('change', (e) => { filters.person = e.target.value; rerender(); });
    el.querySelector('#f-status').addEventListener('change', (e) => { filters.status = e.target.value; rerender(); });
    el.querySelector('#f-sort').addEventListener('change', (e) => { filters.sort = e.target.value; rerender(); });
    el.querySelector('#add-act').addEventListener('click', () => activityForm(s));
    el.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      activityForm(s, s.activities.find((a) => a.id === tr.dataset.id));
    }));
    el.querySelectorAll('[data-done]').forEach((b) => b.addEventListener('click', () => {
      const a = s.activities.find((x) => x.id === b.dataset.done);
      a.status = 'concluida';
      if (!(Number(a.doneHours) > 0)) a.doneHours = a.hours;
      Store.touch(s);
      UI.toast('Atividade concluída 🎉');
    }));
    el.querySelectorAll('[data-menu]').forEach((b) => b.addEventListener('click', (e) => {
      const a = s.activities.find((x) => x.id === b.dataset.menu);
      const r = b.getBoundingClientRect();
      UI.contextMenu(r.left, r.bottom + 4, [
        { label: 'Editar', icon: '✎', action: () => activityForm(s, a) },
        { label: 'Duplicar', icon: '⧉', action: () => { s.activities.push({ ...a, id: U.uid(), name: `${a.name} (cópia)`, doneHours: 0, status: 'pendente' }); Store.touch(s); } },
        ...['pendente', 'em_andamento', 'concluida', 'bloqueada'].filter((k) => k !== a.status).map((k) => ({
          label: `Marcar: ${C.STATUS[k].label}`, icon: C.STATUS[k].icon,
          action: () => { a.status = k; if (k === 'concluida' && !(Number(a.doneHours) > 0)) a.doneHours = a.hours; Store.touch(s); },
        })),
        { divider: true },
        { label: 'Excluir', icon: '🗑', danger: true, action: async () => {
          if (await UI.confirm(`Excluir a atividade <strong>${U.esc(a.name)}</strong>?`, { title: 'Excluir atividade' })) {
            s.activities = s.activities.filter((x) => x.id !== a.id);
            Store.touch(s);
          }
        } },
      ]);
      e.stopPropagation();
    }));
  }

  /* ---------------- Aba: Responsáveis ---------------- */
  function renderPeople(s, el) {
    const load = C.dailyLoad(s);
    const wd = C.periodWorkdays(s);
    el.innerHTML = `
      <div class="toolbar">
        <p class="muted">Período com <strong>${wd} dias úteis</strong>. A capacidade de cada pessoa é a jornada diária × dias úteis.</p>
        <span class="spacer"></span>
        <button class="btn btn-primary" id="add-person">＋ Novo responsável</button>
      </div>
      ${!s.people.length ? `
        <div class="empty">
          <div class="empty-icon">👥</div>
          <p>Nenhum responsável cadastrado.</p>
          <p class="muted">Cadastre as pessoas e quantas horas por dia cada uma pode dedicar.</p>
        </div>` : `
      <div class="people-grid">
        ${s.people.map((p) => {
          const st = C.personStats(s, p);
          const over = C.overloadDays(s, p, load);
          const util = st.utilization;
          const level = util > 100 ? 'over' : util > 85 ? 'high' : 'ok';
          return `
          <div class="card person-card" data-id="${p.id}">
            <div class="person-head">
              <span class="avatar avatar-lg" style="--c:${p.color}">${U.esc(U.initials(p.name))}</span>
              <div>
                <div class="person-name">${U.esc(p.name)}</div>
                <div class="muted small">${U.esc(p.role || 'Sem função definida')} · ${U.num(p.hoursPerDay)}h/dia</div>
              </div>
              <button class="btn btn-ghost btn-icon btn-sm push" data-edit="${p.id}" title="Editar">✎</button>
            </div>
            <div class="person-stats">
              <div><span class="stat-v">${st.acts.length}</span><span class="stat-l">atividades</span></div>
              <div><span class="stat-v">${U.hours(st.planned)}</span><span class="stat-l">alocadas</span></div>
              <div><span class="stat-v">${U.hours(st.capacity)}</span><span class="stat-l">capacidade</span></div>
              <div><span class="stat-v">${st.daysNeeded}</span><span class="stat-l">dias de trabalho</span></div>
            </div>
            <div class="util">
              <div class="util-label"><span>Ocupação no período</span><strong class="lvl-${level}">${U.pct(util)}</strong></div>
              <div class="util-bar"><span class="lvl-${level}" style="width:${Math.min(100, util)}%"></span></div>
            </div>
            ${over.length ? `<p class="hint warn small">⚠ Sobrecarga em ${U.plural(over.length, 'dia', 'dias')} (mais de ${U.num(p.hoursPerDay)}h no dia), a partir de ${U.fmt(over[0])}.</p>` : ''}
            <div class="person-acts">
              ${st.acts.slice().sort((a, b) => (a.start || '').localeCompare(b.start || '')).slice(0, 5).map((a) => `
                <div class="person-act"><span class="clamp-1">${U.esc(a.name)}</span><span class="muted small">${U.fmtShort(a.start)}–${U.fmtShort(a.end)} · ${U.hours(a.hours)}</span></div>`).join('')}
              ${st.acts.length > 5 ? `<div class="muted small">+ ${st.acts.length - 5} outras</div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`}`;
    el.querySelector('#add-person').addEventListener('click', () => personForm(s));
    el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => personForm(s, C.person(s, b.dataset.edit))));
  }

  /* ---------------- Aba: Horas ---------------- */
  function renderHours(s, el) {
    const load = C.dailyLoad(s);
    const buckets = C.buckets(s, hoursMode);
    const rows = s.people.map((p) => ({ p, map: load[p.id] || {} }));
    if (load._none) rows.push({ p: { id: '_none', name: 'Sem responsável', hoursPerDay: 0, color: '#8a8986' }, map: load._none });

    const cell = (planned, cap) => {
      if (!planned && !cap) return '<td class="num muted">—</td>';
      const ratio = cap ? planned / cap : (planned ? 2 : 0);
      const level = ratio > 1.001 ? 'over' : ratio > 0.85 ? 'high' : planned ? 'ok' : 'zero';
      return `<td class="num hcell lvl-bg-${level}" title="${U.hours(planned)} planejadas de ${U.hours(cap)} disponíveis">
        <strong>${U.hours(planned)}</strong>${cap ? `<span class="muted small"> / ${U.hours(cap)}</span>` : ''}</td>`;
    };

    const totalsPlanned = buckets.map(() => 0);
    const totalsCap = buckets.map(() => 0);

    el.innerHTML = `
      <div class="toolbar">
        <p class="muted">Horas planejadas distribuídas pelos dias úteis de cada atividade, comparadas à capacidade de cada responsável.</p>
        <span class="spacer"></span>
        <div class="segmented" role="group" aria-label="Agrupar por">
          <button class="${hoursMode === 'mes' ? 'on' : ''}" data-mode="mes">Por mês</button>
          <button class="${hoursMode === 'semana' ? 'on' : ''}" data-mode="semana">Por semana</button>
        </div>
      </div>
      ${!rows.length ? '<div class="empty"><div class="empty-icon">⏱</div><p>Cadastre responsáveis e atividades para ver a distribuição de horas.</p></div>' : `
      <div class="table-wrap">
        <table class="table hours-table">
          <thead>
            <tr><th class="sticky-col">Responsável</th>
              ${buckets.map((b) => `<th class="num">${b.label}${b.sub ? `<div class="muted small">${b.sub}</div>` : ''}</th>`).join('')}
              <th class="num">Total</th><th class="num">Ocupação</th></tr>
          </thead>
          <tbody>
            ${rows.map(({ p, map }) => {
              let tp = 0, tc = 0;
              const cells = buckets.map((b, i) => {
                const planned = C.sumLoad(map, b.start, b.end);
                const cap = (Number(p.hoursPerDay) || 0) * U.countWorkdays(b.start, b.end);
                tp += planned; tc += cap;
                totalsPlanned[i] += planned; totalsCap[i] += cap;
                return cell(planned, cap);
              }).join('');
              const util = tc ? (tp / tc) * 100 : 0;
              return `<tr>
                <td class="sticky-col"><span class="person-chip"><span class="avatar" style="--c:${p.color}">${U.esc(U.initials(p.name))}</span>${U.esc(p.name)}</span></td>
                ${cells}
                <td class="num"><strong>${U.hours(tp)}</strong><span class="muted small"> / ${U.hours(tc)}</span></td>
                <td class="num">${tc ? U.pct(util) : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr><td class="sticky-col">Equipe</td>
              ${buckets.map((b, i) => `<td class="num"><strong>${U.hours(totalsPlanned[i])}</strong><span class="muted small"> / ${U.hours(totalsCap[i])}</span></td>`).join('')}
              <td class="num"><strong>${U.hours(totalsPlanned.reduce((a, b) => a + b, 0))}</strong></td>
              <td class="num">${(() => { const c = totalsCap.reduce((a, b) => a + b, 0); return c ? U.pct((totalsPlanned.reduce((a, b) => a + b, 0) / c) * 100) : '—'; })()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="legend-row">
        <span><i class="lg lvl-bg-ok"></i>até 85% da capacidade</span>
        <span><i class="lg lvl-bg-high"></i>85% a 100%</span>
        <span><i class="lg lvl-bg-over"></i>acima da capacidade (sobrecarga)</span>
      </div>

      <h3 class="section-title">Horas por atividade</h3>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Atividade</th><th>Responsável</th><th class="num">Dias úteis</th><th class="num">Estimadas</th><th class="num">Realizadas</th><th class="num">Restantes</th><th class="num">h/dia</th></tr></thead>
          <tbody>
            ${s.activities.slice().sort((a, b) => (a.start || '').localeCompare(b.start || '')).map((a) => {
              const wd = C.activityWorkdays(a);
              const rem = a.status === 'concluida' ? 0 : Math.max(0, (a.hours || 0) - (a.doneHours || 0));
              const p = C.person(s, a.personId);
              const perDay = wd ? (a.hours || 0) / wd : 0;
              const over = p && perDay > p.hoursPerDay + 0.01;
              return `<tr><td>${U.esc(a.name)}</td><td>${personChip(s, a.personId)}</td><td class="num">${wd}</td>
                <td class="num">${U.hours(a.hours)}</td><td class="num">${U.hours(a.doneHours)}</td><td class="num">${U.hours(rem)}</td>
                <td class="num ${over ? 'warn' : ''}" ${over ? `title="Acima da jornada de ${U.num(p.hoursPerDay)}h/dia"` : ''}>${U.num(perDay)}h${over ? ' ⚠' : ''}</td></tr>`;
            }).join('') || '<tr><td colspan="7" class="muted center">Sem atividades.</td></tr>'}
          </tbody>
        </table>
      </div>`}`;
    el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { hoursMode = b.dataset.mode; renderHours(s, el); }));
  }

  /* ---------------- Página ---------------- */
  let lastScheduleId = null;

  function render(id, tab) {
    const s = Store.schedule(id);
    const main = document.getElementById('main');
    if (!s) { location.hash = '#/'; return; }
    if (!TABS.find((t) => t.id === tab)) tab = 'atividades';
    if (lastScheduleId !== id) { Object.assign(filters, { q: '', person: '', status: '' }); lastScheduleId = id; }
    const st = C.stats(s);

    main.innerHTML = `
      <div class="page schedule">
        ${Explorer.breadcrumb(s.folderId, `📅 ${U.esc(s.name)}`)}
        <div class="page-head">
          <div>
            <h1>${U.esc(s.name)}</h1>
            <div class="sched-meta">
              <span class="pill">🗓 ${U.esc(U.periodLabel(s))}</span>
              <span class="pill">${U.plural(st.count, 'atividade', 'atividades')}</span>
              <span class="pill">${U.plural(s.people.length, 'responsável', 'responsáveis')}</span>
              <span class="pill">${U.hours(st.planned)} planejadas</span>
              <span class="pill">${U.pct(st.progress)} concluído</span>
            </div>
            ${s.description ? `<p class="muted desc">${U.esc(s.description)}</p>` : ''}
          </div>
          <div class="toolbar">
            <button class="btn" id="sc-edit">⚙ Editar</button>
            <button class="btn btn-ghost btn-icon" id="sc-more" title="Mais opções">⋯</button>
          </div>
        </div>
        <nav class="tabs" role="tablist">
          ${TABS.map((t) => `<a role="tab" href="#/cronograma/${s.id}/${t.id}" class="tab ${t.id === tab ? 'on' : ''}" aria-selected="${t.id === tab}"><span class="tab-ico">${t.icon} </span>${t.label}</a>`).join('')}
        </nav>
        <section id="tab-body" class="tab-body"></section>
      </div>`;

    main.querySelector('#sc-edit').addEventListener('click', () => Explorer.scheduleForm(s));
    main.querySelector('#sc-more').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      UI.contextMenu(r.left - 160, r.bottom + 4, [
        { label: 'Renomear / editar período', icon: '✎', action: () => Explorer.scheduleForm(s) },
        { label: 'Mover para…', icon: '⇄', action: () => Explorer.moveDialog('schedule', s.id) },
        { label: 'Duplicar', icon: '⧉', action: () => { const c = Store.duplicateSchedule(s.id); location.hash = `#/cronograma/${c.id}/${tab}`; } },
        { label: 'Exportar CSV das atividades', icon: '⬇', action: () => exportCSV(s) },
        { label: 'Imprimir', icon: '🖨', action: () => window.print() },
        { divider: true },
        { label: 'Excluir cronograma', icon: '🗑', danger: true, action: () => Explorer.remove('schedule', s.id) },
      ]);
    });

    const body = main.querySelector('#tab-body');
    if (tab === 'atividades') renderActivities(s, body);
    else if (tab === 'responsaveis') renderPeople(s, body);
    else if (tab === 'horas') renderHours(s, body);
    else Dashboard.render(s, body);
  }

  function exportCSV(s) {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Atividade', 'Descrição', 'Responsável', 'Início', 'Término', 'Dias úteis', 'Horas estimadas', 'Horas realizadas', 'Progresso (%)', 'Status', 'Prioridade'];
    const lines = s.activities.map((a) => [
      a.name, a.description, C.person(s, a.personId)?.name || '', U.fmt(a.start), U.fmt(a.end), C.activityWorkdays(a),
      String(a.hours).replace('.', ','), String(a.doneHours).replace('.', ','), Math.round(C.progress(a)),
      C.STATUS[C.effectiveStatus(a)].label, C.PRIORITY[a.priority || 'media'].label,
    ].map(q).join(';'));
    UI.download(`${s.name.replace(/[^\w\- ]+/g, '').trim() || 'cronograma'}.csv`, '﻿' + [head.map(q).join(';'), ...lines].join('\r\n'), 'text/csv;charset=utf-8');
  }

  window.Schedule = { render, activityForm, personForm, personChip, statusBadge };
})();
