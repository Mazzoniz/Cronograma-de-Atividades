/* Zeit — tela do cronograma: grade por KW com marcação dia a dia (Plan./Real.) */
(function () {
  let tool = 'auto'; // 'auto' = PL na linha Plan. e R na linha Real.; ou um código; ou 'erase'
  let filter = '';
  let endPaint = null;
  document.addEventListener('mouseup', () => { if (endPaint) endPaint(); });

  /* ---------- formulário de atividade ---------- */
  function suggestions(sectorId) {
    const sup = new Set(), resp = new Set();
    C.sectorActivities(sectorId).forEach(({ a }) => { if (a.supplier) sup.add(a.supplier); C.responsibles(a).forEach((r) => resp.add(r)); });
    (Store.sector(sectorId).people || []).forEach((p) => resp.add(p.name));
    const opt = (set) => [...set].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((v) => `<option value="${U.esc(v)}">`).join('');
    return `<datalist id="dl-sup">${opt(sup)}</datalist><datalist id="dl-resp">${opt(resp)}</datalist>`;
  }

  function activityForm(s, existing) {
    const a = existing || Store.newActivity();
    const isNew = !existing;
    UI.modal({
      title: isNew ? 'Nova atividade' : `Atividade nº ${s.activities.indexOf(a) + 1}`, size: 'lg',
      submitLabel: isNew ? 'Adicionar' : 'Salvar',
      extraFoot: isNew ? '' : `<button type="button" class="btn btn-danger-ghost" id="a-del">${UI.icon('trash', 16)} Excluir</button>`,
      body: `${suggestions(s.sectorId)}
        <label class="field">Descrição da ação<textarea name="description" rows="2" required maxlength="400" placeholder="Ex.: Manutenção preventiva do sistema de proteção contra incêndio">${U.esc(a.description)}</textarea></label>
        <div class="grid-3">
          <label class="field">Fornecedor<input name="supplier" list="dl-sup" maxlength="80" value="${U.esc(a.supplier)}" placeholder="Ex.: In-Haus"></label>
          <label class="field">Resp. (responsáveis)<input name="responsible" list="dl-resp" maxlength="120" value="${U.esc(a.responsible)}" placeholder="Ex.: R. Macedo / Diego"></label>
          <label class="field">Situação
            <select name="situation">
              <option value="auto" ${a.situation === 'auto' ? 'selected' : ''}>Automática (pela grade)</option>
              ${Store.SITUATIONS.map((x) => `<option ${a.situation === x ? 'selected' : ''}>${x}</option>`).join('')}
            </select>
          </label>
        </div>
        <fieldset class="box">
          <legend>Lançamento de horas</legend>
          <label class="check"><input type="checkbox" name="fullDay" ${a.fullDay ? 'checked' : ''}> <span><b>Dia inteiro</b> — cada dia marcado na grade conta as horas abaixo</span></label>
          <div class="grid-3">
            <label class="field"><span id="hpd-label">${a.fullDay ? 'Horas de um dia' : 'Horas padrão por marcação'}</span><input name="hoursPerDay" type="number" min="0.5" max="24" step="0.5" required value="${a.hoursPerDay}"></label>
          </div>
          <p class="hint" id="mode-hint"></p>
        </fieldset>
        <fieldset class="box">
          <legend>Equipe</legend>
          <label class="check"><input type="checkbox" name="menEnabled" ${a.menEnabled ? 'checked' : ''}> <span><b>Homens necessários</b></span></label>
          <div class="grid-3" id="men-wrap" ${a.menEnabled ? '' : 'hidden'}>
            <label class="field">Quantidade de homens<input name="men" type="number" min="1" max="500" step="1" value="${a.men || 1}"></label>
            <p class="hint span-2" id="hh-hint"></p>
          </div>
        </fieldset>
        <div id="note-wrap">
          ${a.note ? '' : `<button type="button" class="btn btn-ghost" id="note-add">${UI.icon('note', 17)} Adicionar observação</button>`}
          <label class="field" id="note-field" ${a.note ? '' : 'hidden'}>Observação <span class="opt">(ex.: serviço descontinuado, motivo do adiamento…)</span>
            <textarea name="note" rows="3" maxlength="1000">${U.esc(a.note)}</textarea></label>
        </div>`,
      onOpen(f) {
        const el = f.elements;
        const upd = () => {
          f.querySelector('#hpd-label').textContent = el.fullDay.checked ? 'Horas de um dia' : 'Horas padrão por marcação';
          f.querySelector('#mode-hint').innerHTML = el.fullDay.checked
            ? `Cada dia marcado com <b>PL</b> soma <b>${U.num(el.hoursPerDay.value)}h</b> no planejado; cada <b>R</b> soma no realizado.`
            : 'Cada marcação começa com esse valor; <b>dê dois cliques no dia</b> da grade para lançar as horas exatas daquele dia.';
          f.querySelector('#men-wrap').hidden = !el.menEnabled.checked;
          const tmp = { ...a, fullDay: el.fullDay.checked, hoursPerDay: +el.hoursPerDay.value || 0 };
          const p = C.planHours(tmp), r = C.realHours(tmp), m = Math.max(1, +el.men.value || 1);
          f.querySelector('#hh-hint').innerHTML = `Homem-hora: planejado <b>${U.num(p * m)} HH</b> · realizado <b>${U.num(r * m)} HH</b> (${U.num(p)}h × ${m})`;
        };
        ['fullDay', 'hoursPerDay', 'menEnabled', 'men'].forEach((n) => { el[n].addEventListener('input', upd); el[n].addEventListener('change', upd); });
        upd();
        const na = f.querySelector('#note-add');
        if (na) na.addEventListener('click', () => { na.remove(); f.querySelector('#note-field').hidden = false; el.note.focus(); });
        const del = f.querySelector('#a-del');
        if (del) del.addEventListener('click', async () => {
          f.close();
          if (await UI.confirm(`Excluir a atividade <b>${U.esc(a.description)}</b>?`, { title: 'Excluir atividade' })) {
            s.activities = s.activities.filter((x) => x.id !== a.id); Store.touch(s); UI.toast('Atividade excluída');
          }
        });
      },
      onSubmit(d) {
        Object.assign(a, {
          description: d.description.trim(), supplier: d.supplier.trim(), responsible: d.responsible.trim(),
          situation: d.situation, fullDay: !!d.fullDay, hoursPerDay: +d.hoursPerDay || 8,
          menEnabled: !!d.menEnabled, men: Math.max(1, +d.men || 1), note: (d.note || '').trim(),
        });
        if (isNew) s.activities.push(a);
        Store.touch(s);
        UI.toast(isNew ? 'Atividade adicionada' : 'Atividade atualizada');
      },
    });
  }

  function hoursDialog(s, a, row, day) {
    const cell = a[row][day];
    UI.modal({
      title: `Horas em ${U.fmt(day)}`, size: 'sm', submitLabel: 'Salvar',
      body: `<p class="muted">${U.esc(a.description)} — linha <b>${row === 'plan' ? 'Planejado' : 'Realizado'}</b></p>
        <label class="field">Horas neste dia<input name="h" type="number" min="0.5" max="24" step="0.5" required value="${cell && cell.h != null ? cell.h : a.hoursPerDay}" autofocus></label>`,
      onSubmit(d) {
        a[row][day] = { c: cell ? cell.c : (row === 'plan' ? 'PL' : 'R'), h: +d.h };
        Store.touch(s);
      },
    });
  }

  /* ---------- grade ---------- */
  function cellHtml(a, row, d, holidays) {
    const cell = a[row][d];
    const cls = ['g-cell'];
    if (holidays.has(d)) cls.push('hol'); else if (U.isWeekend(d)) cls.push('we');
    if (U.dow(d) === 1) cls.push('mon');
    if (d === U.today()) cls.push('today');
    let inner = '';
    let style = '';
    if (cell) {
      const k = Store.CODES[cell.c];
      style = `style="--bg:${k.color};--ink:${k.ink}"`;
      cls.push('mk');
      inner = a.fullDay ? cell.c : `<span class="c-code">${cell.c}</span><span class="c-h">${U.num(C.cellHours(a, cell))}</span>`;
    }
    return `<td class="${cls.join(' ')}" data-r="${row}" data-d="${d}" ${style}>${inner}</td>`;
  }

  function gridHtml(s) {
    const days = C.days(s);
    const hol = new Set(s.holidays);
    // cabeçalhos: meses, KW, dias
    const months = []; const weeks = [];
    days.forEach((d) => {
      const mk = d.slice(0, 7);
      if (!months.length || months[months.length - 1].k !== mk) months.push({ k: mk, n: 0, d }); months[months.length - 1].n++;
      const w = U.isoWeek(d).week;
      if (!weeks.length || weeks[weeks.length - 1].w !== w) weeks.push({ w, n: 0 }); weeks[weeks.length - 1].n++;
    });
    const q = U.norm(filter);
    const acts = s.activities.map((a, i) => ({ a, i })).filter(({ a }) => !q || U.norm(`${a.description} ${a.supplier} ${a.responsible}`).includes(q));

    const head = `
      <thead>
        <tr class="h-month">
          <th rowspan="3" class="c-n sticky s0">N°</th>
          <th rowspan="3" class="c-desc sticky s1">Descrição da ação</th>
          <th rowspan="3" class="c-sup">Fornecedor</th>
          <th rowspan="3" class="c-resp">Resp.</th>
          <th rowspan="3" class="c-sit">Situação</th>
          <th rowspan="3" class="c-pr">P/R</th>
          <th rowspan="3" class="c-h">Horas</th>
          ${months.map((m) => `<th colspan="${m.n}" class="m">${U.MONTHS[U.monthOf(m.d)]}${m.n >= 4 ? ` ${U.yearOf(m.d)}` : ''}</th>`).join('')}
          <th rowspan="3" class="c-prog">Progresso</th>
          <th rowspan="3" class="c-act no-print"></th>
        </tr>
        <tr class="h-kw">${weeks.map((w) => `<th colspan="${w.n}">${U.kwLabel(w.w)}</th>`).join('')}</tr>
        <tr class="h-day">${days.map((d) => `<th class="day ${hol.has(d) ? 'hol' : U.isWeekend(d) ? 'we' : ''} ${U.dow(d) === 1 ? 'mon' : ''} ${d === U.today() ? 'today' : ''}" data-day="${d}" title="${U.WEEKDAYS[U.dow(d)]}, ${U.fmt(d)} — clique para marcar/desmarcar como feriado">
          <b>${U.parse(d).getDate()}</b><span>${U.WEEKDAYS_1[U.dow(d)]}</span></th>`).join('')}</tr>
      </thead>`;

    const body = acts.map(({ a, i }) => {
      const sit = C.situation(a);
      const p = C.planHours(a), r = C.realHours(a), m = C.men(a);
      const prog = C.progress(a);
      const badges = `${a.menEnabled ? `<span class="tag" title="Homens necessários">${UI.icon('users', 13)} ${m}</span>` : ''}${!a.fullDay ? '<span class="tag" title="Lançamento por horas">h</span>' : `<span class="tag subtle" title="Dia inteiro = ${U.num(a.hoursPerDay)}h">${U.num(a.hoursPerDay)}h/dia</span>`}${a.note ? `<span class="tag note" title="${U.esc(a.note)}">${UI.icon('note', 13)} Obs.</span>` : ''}`;
      return `
        <tr class="r-plan" data-id="${a.id}">
          <td rowspan="2" class="c-n sticky s0">${i + 1}</td>
          <td rowspan="2" class="c-desc sticky s1"><button class="desc-btn" data-edit="${a.id}">${U.esc(a.description) || '<i class="muted">(sem descrição)</i>'}</button><div class="tags">${badges}</div></td>
          <td rowspan="2" class="c-sup">${U.esc(a.supplier)}</td>
          <td rowspan="2" class="c-resp">${U.esc(a.responsible)}</td>
          <td rowspan="2" class="c-sit">${UI.sitBadge(sit)}${a.situation === 'auto' ? '<small class="auto">auto</small>' : ''}</td>
          <td class="c-pr">Plan.</td>
          <td class="c-h">${U.num(p)}${a.menEnabled ? `<small title="Homem-hora">${U.num(p * m)} HH</small>` : ''}</td>
          ${days.map((d) => cellHtml(a, 'plan', d, hol)).join('')}
          <td rowspan="2" class="c-prog">${UI.progress(prog)}</td>
          <td rowspan="2" class="c-act no-print"><button class="btn btn-ghost btn-icon btn-sm" data-more="${a.id}" aria-label="Opções">${UI.icon('more', 16)}</button></td>
        </tr>
        <tr class="r-real" data-id="${a.id}">
          <td class="c-pr">Real.</td>
          <td class="c-h">${U.num(r)}${a.menEnabled ? `<small title="Homem-hora">${U.num(r * m)} HH</small>` : ''}</td>
          ${days.map((d) => cellHtml(a, 'real', d, hol)).join('')}
        </tr>`;
    }).join('');

    const st = C.stats(s.activities);
    const foot = s.activities.length ? `
      <tfoot><tr>
        <td colspan="5" class="sticky-foot">Total — ${U.plural(st.count, 'atividade', 'atividades')}</td>
        <td class="c-pr">P / R</td>
        <td class="c-h"><b>${U.num(st.plan)}</b><small>${U.num(st.real)}</small></td>
        ${days.map((d) => {
          let pd = 0, rd = 0;
          s.activities.forEach((a) => { const pc = a.plan[d], rc = a.real[d]; if (pc && pc.c === 'PL') pd += C.cellHours(a, pc) * C.men(a); if (rc && rc.c === 'R') rd += C.cellHours(a, rc) * C.men(a); });
          return `<td class="f-day ${hol.has(d) ? 'hol' : ''}" title="${U.fmt(d)} — ${U.num(pd)} HH planejadas · ${U.num(rd)} HH realizadas">${pd || rd ? `${U.num(pd, 0)}<small>${U.num(rd, 0)}</small>` : ''}</td>`;
        }).join('')}
        <td class="c-prog">${UI.progress(st.progress)}</td><td class="no-print"></td>
      </tr></tfoot>` : '';

    return `<table class="grid">${head}<tbody>${body || ''}</tbody>${foot}</table>
      ${!s.activities.length ? `<div class="empty in-grid"><p><b>Nenhuma atividade ainda.</b></p><p class="muted">Clique em <b>Nova atividade</b> para começar. As datas podem ser marcadas depois.</p></div>` : ''}
      ${s.activities.length && !acts.length ? '<div class="empty in-grid"><p class="muted">Nenhuma atividade corresponde à busca.</p></div>' : ''}`;
  }

  function palette() {
    const tools = [['auto', 'PL / R', 'Automático: PL na linha Plan. e R na linha Real.']]
      .concat(Object.entries(Store.CODES).map(([k, v]) => [k, k, v.label]));
    return `<div class="palette" role="toolbar" aria-label="Marcar dias">
      <span class="pal-label">Marcar:</span>
      ${tools.map(([k, l, t]) => `<button class="pal ${tool === k ? 'on' : ''}" data-tool="${k}" title="${t}" ${Store.CODES[k] ? `style="--bg:${Store.CODES[k].color};--ink:${Store.CODES[k].ink}"` : ''}>
        ${Store.CODES[k] ? `<i class="pal-sw">${l}</i><span>${Store.CODES[k].label}</span>` : `<i class="pal-sw auto">${l}</i><span>Automático</span>`}</button>`).join('')}
      <button class="pal ${tool === 'erase' ? 'on' : ''}" data-tool="erase" title="Apagar marcação"><i class="pal-sw erase">✕</i><span>Apagar</span></button>
    </div>`;
  }

  /* ---------- tela ---------- */
  function render(sector, id, tab = 'grade') {
    const s = Store.schedule(id);
    if (!s || s.sectorId !== sector.id || !Z.inScope(s)) { location.hash = `${Z.base()}/cronogramas`; return; }
    const st = C.stats(s.activities);
    const el = Shell.render(sector, 'cronogramas', {
      title: U.esc(s.title),
      crumbs: Drive.crumbs(sector, s.folderId),
      actions: `<button class="btn" id="s-edit">${UI.icon('calendar', 17)}<span class="lbl">Período</span></button>
        <button class="btn" id="s-print">${UI.icon('print', 17)}<span class="lbl">Imprimir</span></button>
        <button class="btn" id="s-xls">${UI.icon('download', 17)}<span class="lbl">Excel</span></button>
        <button class="btn btn-ghost btn-icon" id="s-more" aria-label="Mais">${UI.icon('more')}</button>`,
    });
    el.classList.add('content-wide');
    el.innerHTML = `
      <div class="sched-head">
        <div class="sched-meta">
          <span class="pill">${UI.icon('calendar', 14)} ${U.esc(C.periodLabel(s))}</span>
          ${s.holidays.length ? `<span class="pill hol">${U.plural(s.holidays.length, 'dia de feriado/parada', 'dias de feriado/parada')}</span>` : ''}
          <span class="pill muted-pill">Atualizado em ${U.fmtDateTime(s.updatedAt)}</span>
        </div>
        ${s.description ? `<p class="muted desc">${U.esc(s.description)}</p>` : ''}
        <nav class="tabs">
          <a href="${Z.base()}/c/${s.id}" class="tab ${tab !== 'dash' ? 'on' : ''}">${UI.icon('list', 17)} Grade</a>
          <a href="${Z.base()}/c/${s.id}/dash" class="tab ${tab === 'dash' ? 'on' : ''}">${UI.icon('dashboard', 17)} Dashboard deste cronograma</a>
        </nav>
        ${tab === 'dash' ? '' : `<div class="kpis kpis-sm">
          <div class="kpi"><small>Atividades</small><b>${st.count}</b><span>${st.done} concluídas${st.postponed ? ` · ${st.postponed} postergadas` : ''}</span></div>
          <div class="kpi"><small>Horas planejadas</small><b>${U.hours(st.plan)}</b><span>${U.num(st.planHH)} HH</span></div>
          <div class="kpi"><small>Horas realizadas</small><b>${U.hours(st.real)}</b><span>${U.num(st.realHH)} HH</span></div>
          <div class="kpi"><small>Progresso</small><b>${st.progress == null ? '—' : U.pct(st.progress)}</b><span>realizado ÷ planejado</span></div>
          <div class="kpi"><small>Backlog</small><b>${U.hours(st.backlog)}</b><span>horas ainda não realizadas</span></div>
        </div>`}
      </div>
      ${tab === 'dash' ? '<div id="sched-dash"></div>' : `<div class="toolbar sticky-tools">
        ${palette()}
        <span class="spacer"></span>
        <div class="search-box sm">${UI.icon('search', 15)}<input type="search" id="s-q" placeholder="Filtrar…" value="${U.esc(filter)}"></div>
        <button class="btn btn-primary" id="s-add">${UI.icon('plus', 17)}<span>Nova atividade</span></button>
      </div>
      <div class="grid-wrap" id="grid-wrap">${gridHtml(s)}</div>
      <p class="muted small tip">Escolha um código acima e clique (ou arraste) nos dias. Clicar de novo no mesmo código apaga. Clique no número do dia para marcá-lo como feriado. Atividades "por horas": dois cliques no dia para lançar as horas.</p>`}`;

    if (tab === 'dash') { bindHead(s); DashboardView.scheduleDash(s, el.querySelector('#sched-dash')); return; }
    bind(s, el);
  }

  function bind(s, el) {
    bindHead(s);
    el.querySelector('#s-add').addEventListener('click', () => activityForm(s));
    el.querySelector('#s-q').addEventListener('input', U.debounce((e) => {
      filter = e.target.value;
      el.querySelector('#grid-wrap').innerHTML = gridHtml(s);
      bindGrid(s, el);
    }, 150));
    el.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => {
      tool = b.dataset.tool;
      el.querySelectorAll('[data-tool]').forEach((x) => x.classList.toggle('on', x === b));
    }));
    bindGrid(s, el);
  }

  function bindHead(s) {
    document.getElementById('s-edit').addEventListener('click', () => Drive.scheduleForm(s.sectorId, s));
    document.getElementById('s-print').addEventListener('click', () => Print.dialog(s));
    document.getElementById('s-xls').addEventListener('click', () => Excel.exportSchedule(s));
    document.getElementById('s-more').addEventListener('click', (e) => UI.menuAt(e.currentTarget, [
      { label: 'Editar título / período / feriados', icon: 'edit', action: () => Drive.scheduleForm(s.sectorId, s) },
      { label: 'Mover para outra pasta', icon: 'folder', action: () => Drive.moveDialog('schedule', s.id) },
      { label: 'Duplicar (sem realizado)', icon: 'copy', action: () => { const c = Store.duplicateSchedule(s.id); location.hash = `${Z.base()}/c/${c.id}`; } },
      { label: 'Ver no Gantt', icon: 'gantt', action: () => { sessionStorage.setItem('zeit:gantt', s.id); location.hash = `${Z.base()}/gantt`; } },
      { label: 'Limpar todas as marcações de realizado', icon: 'swap', action: async () => {
        if (await UI.confirm('Apagar todas as marcações da linha <b>Real.</b> deste cronograma?', { title: 'Limpar realizado', okLabel: 'Limpar' })) {
          s.activities.forEach((a) => { a.real = {}; }); Store.touch(s);
        }
      } },
      { divider: true },
      { label: 'Excluir cronograma', icon: 'trash', danger: true, action: () => Drive.remove('schedule', s.id) },
    ]));
  }

  function bindGrid(s, el) {
    const wrap = el.querySelector('#grid-wrap');
    const find = (id) => s.activities.find((a) => a.id === id);

    wrap.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => activityForm(s, find(b.dataset.edit))));
    wrap.querySelectorAll('th.day').forEach((th) => th.addEventListener('click', () => {
      const d = th.dataset.day;
      const set = new Set(s.holidays);
      if (set.has(d)) set.delete(d); else set.add(d);
      s.holidays = [...set].sort();
      Store.touch(s);
    }));
    wrap.querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', () => {
      const a = find(b.dataset.more); const i = s.activities.indexOf(a);
      UI.menuAt(b, [
        { label: 'Editar atividade', icon: 'edit', action: () => activityForm(s, a) },
        { label: a.note ? 'Editar observação' : 'Adicionar observação', icon: 'note', action: () => activityForm(s, a) },
        { label: 'Duplicar', icon: 'copy', action: () => { s.activities.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(a)), id: U.uid(), real: {} }); Store.touch(s); } },
        ...(i > 0 ? [{ label: 'Mover para cima', icon: 'upload', action: () => { s.activities.splice(i - 1, 0, s.activities.splice(i, 1)[0]); Store.touch(s); } }] : []),
        ...(i < s.activities.length - 1 ? [{ label: 'Mover para baixo', icon: 'download', action: () => { s.activities.splice(i + 1, 0, s.activities.splice(i, 1)[0]); Store.touch(s); } }] : []),
        { label: 'Limpar marcações desta atividade', icon: 'swap', action: () => { a.plan = {}; a.real = {}; Store.touch(s); } },
        { divider: true },
        { label: 'Excluir', icon: 'trash', danger: true, action: async () => {
          if (await UI.confirm(`Excluir a atividade <b>${U.esc(a.description)}</b>?`, { title: 'Excluir atividade' })) { s.activities.splice(i, 1); Store.touch(s); }
        } },
      ]);
    }));

    /* pintura com clique/arraste */
    let painting = null; // { action: 'set'|'clear', code }
    let changed = false;
    const apply = (td) => {
      const a = find(td.closest('tr').dataset.id); if (!a) return;
      const row = td.dataset.r, d = td.dataset.d;
      if (painting.action === 'clear') { if (a[row][d]) { delete a[row][d]; changed = true; } }
      else {
        const prev = a[row][d];
        if (!prev || prev.c !== painting.code) { a[row][d] = { c: painting.code, ...(prev && prev.h != null ? { h: prev.h } : {}) }; changed = true; }
      }
      // atualiza só a célula
      const tmp = document.createElement('tbody');
      tmp.innerHTML = `<tr>${cellHtml(a, row, d, new Set(s.holidays))}</tr>`;
      const fresh = tmp.querySelector('td');
      td.className = fresh.className; td.innerHTML = fresh.innerHTML; td.setAttribute('style', fresh.getAttribute('style') || '');
    };
    wrap.querySelectorAll('td.g-cell').forEach((td) => {
      td.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const a = find(td.closest('tr').dataset.id);
        const row = td.dataset.r, d = td.dataset.d;
        const code = tool === 'auto' ? (row === 'plan' ? 'PL' : 'R') : tool;
        const cur = a[row][d];
        painting = tool === 'erase' || (cur && cur.c === code) ? { action: 'clear' } : { action: 'set', code };
        changed = false;
        apply(td);
      });
      td.addEventListener('mouseenter', () => { if (painting) apply(td); });
      td.addEventListener('dblclick', () => {
        const a = find(td.closest('tr').dataset.id);
        if (!a.fullDay) hoursDialog(s, a, td.dataset.r, td.dataset.d);
        else UI.toast('Esta atividade é "dia inteiro". Para lançar horas por dia, desmarque "Dia inteiro" na atividade.');
      });
    });
    const end = () => { if (painting) { painting = null; if (changed) Store.touch(s); } };
    endPaint = end;
    // toque (tablet): toque simples aplica
    wrap.querySelectorAll('td.g-cell').forEach((td) => td.addEventListener('touchend', (e) => {
      e.preventDefault();
      const a = find(td.closest('tr').dataset.id); const row = td.dataset.r, d = td.dataset.d;
      const code = tool === 'auto' ? (row === 'plan' ? 'PL' : 'R') : tool;
      const cur = a[row][d];
      if (tool === 'erase' || (cur && cur.c === code)) delete a[row][d]; else a[row][d] = { c: code };
      Store.touch(s);
    }));
  }

  window.ScheduleView = { render, activityForm };
})();
