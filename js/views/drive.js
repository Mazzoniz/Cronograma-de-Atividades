/* Zeit — "drive" do setor: pastas e cronogramas */
(function () {
  let viewMode = localStorage.getItem('zeit:view') || 'grid';

  /* ---------- formulário de cronograma ---------- */
  function kwPicker(prefix, year, week) {
    const cy = new Date().getFullYear();
    const years = []; for (let y = Math.min(cy - 2, year); y <= Math.max(cy + 3, year); y++) years.push(y);
    return `<div class="kw-pick">
      <select name="${prefix}W" aria-label="Semana">${Array.from({ length: 53 }, (_, i) => i + 1).map((w) => `<option value="${w}" ${w === week ? 'selected' : ''}>KW${U.pad(w)}</option>`).join('')}</select>
      <select name="${prefix}Y" aria-label="Ano">${years.map((y) => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select>
    </div>`;
  }

  function scheduleForm(sectorId, existing, folderId) {
    const s = existing || {};
    const now = U.isoWeek(U.today());
    const start = s.start || now;
    const end = s.end || now;
    const holidays = new Set(s.holidays || []);
    UI.modal({
      title: existing ? 'Editar cronograma' : 'Novo cronograma', size: 'lg',
      submitLabel: existing ? 'Salvar' : 'Criar cronograma',
      body: `
        <label class="field">Título (feriado ou ação)<input name="title" required maxlength="140" value="${U.esc(s.title || '')}" placeholder="Ex.: Carnaval - KW 08 - 2026"></label>
        <div class="grid-2">
          <div class="field">Semana inicial${kwPicker('start', start.year, start.week)}</div>
          <div class="field">Semana final${kwPicker('end', end.year, end.week)}</div>
        </div>
        <p class="hint" id="kw-hint"></p>
        <div class="field">Dias de feriado / parada <span class="opt">(clique para destacar em laranja — também dá para mudar depois clicando no dia da grade)</span>
          <div class="hol-pick" id="hol-pick"></div>
        </div>
        <div class="grid-2">
          <label class="field">Pasta<select name="folderId">${UI.folderOptions(sectorId, existing ? s.folderId : folderId)}</select></label>
          <label class="field">Descrição <span class="opt">(opcional)</span><input name="description" maxlength="300" value="${U.esc(s.description || '')}"></label>
        </div>`,
      onOpen(form) {
        const hp = form.querySelector('#hol-pick');
        const read = () => {
          const d = Object.fromEntries(new FormData(form).entries());
          return { start: { year: +d.startY, week: Math.min(+d.startW, U.weeksInYear(+d.startY)) }, end: { year: +d.endY, week: Math.min(+d.endW, U.weeksInYear(+d.endY)) } };
        };
        const upd = () => {
          const { start: a, end: b } = read();
          const hint = form.querySelector('#kw-hint');
          if (U.kwKey(b.year, b.week) < U.kwKey(a.year, a.week)) {
            hint.innerHTML = '⚠ A semana final deve ser igual ou posterior à inicial.'; hint.className = 'hint warn'; hp.innerHTML = ''; return;
          }
          const d0 = U.kwMonday(a.year, a.week), d1 = U.addDays(U.kwMonday(b.year, b.week), 6);
          const days = U.days(d0, d1);
          if (days.length > 140) { hint.innerHTML = '⚠ Período muito longo (máximo de 20 semanas).'; hint.className = 'hint warn'; hp.innerHTML = ''; return; }
          const months = [...new Set(days.map((d) => `${U.MONTHS[U.monthOf(d)]}/${U.yearOf(d)}`))];
          hint.className = 'hint';
          hint.innerHTML = `<b>${U.fmt(d0)}</b> a <b>${U.fmt(d1)}</b> · ${U.plural(days.length / 7, 'semana', 'semanas')} · ${months.join(', ')}`;
          hp.innerHTML = days.map((d) => `<button type="button" class="hol-day ${holidays.has(d) ? 'on' : ''} ${U.isWeekend(d) ? 'we' : ''} ${U.dow(d) === 1 ? 'mon' : ''}" data-d="${d}" title="${U.WEEKDAYS[U.dow(d)]} ${U.fmt(d)}">
              ${U.dow(d) === 1 ? `<small>${U.kwLabel(U.isoWeek(d).week)}</small>` : '<small>&nbsp;</small>'}<b>${U.parse(d).getDate()}</b><span>${U.WEEKDAYS_1[U.dow(d)]}</span></button>`).join('');
          hp.querySelectorAll('.hol-day').forEach((b) => b.addEventListener('click', () => {
            const d = b.dataset.d; if (holidays.has(d)) holidays.delete(d); else holidays.add(d); b.classList.toggle('on');
          }));
        };
        form.querySelectorAll('select[name^=start], select[name^=end]').forEach((el) => el.addEventListener('change', upd));
        form.readKw = read;
        upd();
      },
      onSubmit(d, form) {
        const { start: a, end: b } = form.readKw();
        if (U.kwKey(b.year, b.week) < U.kwKey(a.year, a.week)) { form.showError('A semana final deve ser igual ou posterior à inicial.'); return false; }
        const d0 = U.kwMonday(a.year, a.week), d1 = U.addDays(U.kwMonday(b.year, b.week), 6);
        if (U.diffDays(d0, d1) > 140) { form.showError('Período muito longo (máximo de 20 semanas).'); return false; }
        const hol = [...holidays].filter((x) => x >= d0 && x <= d1).sort();
        if (existing) {
          Object.assign(existing, { title: d.title.trim(), description: d.description.trim(), folderId: d.folderId || null, start: a, end: b, holidays: hol });
          Store.touch(existing); UI.toast('Cronograma atualizado');
        } else {
          const c = Store.createSchedule({ sectorId, folderId: d.folderId || null, title: d.title, description: d.description, start: a, end: b, holidays: hol });
          UI.toast('Cronograma criado');
          location.hash = `#/s/${sectorId}/c/${c.id}`;
        }
      },
    });
  }

  /* ---------- ações ---------- */
  async function newFolder(sectorId, parentId) {
    const name = await UI.prompt('Nova pasta', { value: String(new Date().getFullYear()), submitLabel: 'Criar' });
    if (name) { Store.createFolder(sectorId, name, parentId); UI.toast('Pasta criada'); }
  }
  async function rename(kind, id) {
    const it = kind === 'folder' ? Store.folder(id) : Store.schedule(id);
    const name = await UI.prompt(kind === 'folder' ? 'Renomear pasta' : 'Renomear cronograma', { value: kind === 'folder' ? it.name : it.title });
    if (!name) return;
    if (kind === 'folder') { it.name = name; Store.save(); } else { it.title = name; Store.touch(it); }
  }
  async function remove(kind, id) {
    if (kind === 'folder') {
      const f = Store.folder(id); const c = Store.countInside(id);
      const extra = c.folders || c.schedules ? `<br><br>Isso também exclui ${[c.folders ? U.plural(c.folders, 'subpasta', 'subpastas') : '', c.schedules ? U.plural(c.schedules, 'cronograma', 'cronogramas') : ''].filter(Boolean).join(' e ')}.` : '';
      if (!(await UI.confirm(`Excluir a pasta <b>${U.esc(f.name)}</b>?${extra}`, { title: 'Excluir pasta' }))) return;
      Store.deleteFolder(id); UI.toast('Pasta excluída');
      if (location.hash.includes(id)) location.hash = `#/s/${f.sectorId}/cronogramas${f.parentId ? `/${f.parentId}` : ''}`;
    } else {
      const s = Store.schedule(id);
      if (!(await UI.confirm(`Excluir o cronograma <b>${U.esc(s.title)}</b> e todas as suas atividades?`, { title: 'Excluir cronograma' }))) return;
      Store.deleteSchedule(id); UI.toast('Cronograma excluído');
      if (location.hash.includes(id)) location.hash = `#/s/${s.sectorId}/cronogramas${s.folderId ? `/${s.folderId}` : ''}`;
    }
  }
  function moveDialog(kind, id) {
    const it = kind === 'folder' ? Store.folder(id) : Store.schedule(id);
    UI.modal({
      title: `Mover "${kind === 'folder' ? it.name : it.title}"`, size: 'sm', submitLabel: 'Mover',
      body: `<label class="field">Destino<select name="t" size="10" class="folder-list">${UI.folderOptions(it.sectorId, kind === 'folder' ? it.parentId : it.folderId, kind === 'folder' ? Store.descendantFolderIds(id) : null)}</select></label>`,
      onSubmit(d) { if (Store.move(kind, id, d.t || null)) UI.toast('Item movido'); },
    });
  }
  function itemMenu(e, kind, id) {
    e.preventDefault();
    const sectorId = (kind === 'folder' ? Store.folder(id) : Store.schedule(id)).sectorId;
    const items = [
      { label: 'Abrir', icon: 'chevron', action: () => { location.hash = kind === 'folder' ? `#/s/${sectorId}/cronogramas/${id}` : `#/s/${sectorId}/c/${id}`; } },
      { label: 'Renomear', icon: 'edit', action: () => rename(kind, id) },
      { label: 'Mover para…', icon: 'folder', action: () => moveDialog(kind, id) },
    ];
    if (kind === 'folder') {
      items.push({ label: 'Nova subpasta', icon: 'plus', action: () => newFolder(sectorId, id) });
    } else {
      items.push({ label: 'Editar período / feriados', icon: 'calendar', action: () => scheduleForm(sectorId, Store.schedule(id)) });
      items.push({ label: 'Duplicar (sem marcações de realizado)', icon: 'copy', action: () => { Store.duplicateSchedule(id); UI.toast('Cronograma duplicado'); } });
      items.push({ label: 'Imprimir', icon: 'print', action: () => Print.dialog(Store.schedule(id)) });
      items.push({ label: 'Exportar Excel', icon: 'download', action: () => Excel.exportSchedule(Store.schedule(id)) });
    }
    items.push({ divider: true }, { label: 'Excluir', icon: 'trash', danger: true, action: () => remove(kind, id) });
    UI.menu(e.clientX, e.clientY, items);
  }

  function bindDrag(root) {
    root.querySelectorAll('[draggable=true][data-kind]').forEach((el) => {
      el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', `${el.dataset.kind}:${el.dataset.id}`); el.classList.add('dragging'); });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
    });
    root.querySelectorAll('[data-drop]').forEach((el) => {
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop-over'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop-over'));
      el.addEventListener('drop', (e) => {
        e.preventDefault(); el.classList.remove('drop-over');
        const [kind, id] = (e.dataTransfer.getData('text/plain') || '').split(':');
        const t = el.dataset.drop === 'root' ? null : el.dataset.drop;
        if (!kind || (kind === 'folder' && id === t)) return;
        if (Store.move(kind, id, t)) UI.toast('Item movido');
      });
    });
  }

  /* ---------- tela ---------- */
  function crumbs(sector, folderId, extra) {
    const path = folderId ? Store.folderPath(folderId) : [];
    return [`<a href="#/s/${sector.id}/cronogramas" data-drop="root">${U.esc(sector.name)}</a>`]
      .concat(path.map((f) => `<a href="#/s/${sector.id}/cronogramas/${f.id}" data-drop="${f.id}">${U.esc(f.name)}</a>`))
      .concat(extra ? [`<span>${extra}</span>`] : []).join('<i>›</i>');
  }

  function scheduleCard(s) {
    const st = C.stats(s.activities);
    return `<div class="item" tabindex="0" draggable="true" data-kind="schedule" data-id="${s.id}" title="${U.esc(s.title)}">
      <div class="item-ico sched">${UI.icon('calendar', 24)}</div>
      <div class="item-info">
        <div class="item-name">${U.esc(s.title)}</div>
        <div class="item-meta">${U.esc(C.periodLabel(s))}</div>
        <div class="item-meta">${U.plural(st.count, 'atividade', 'atividades')} · ${U.hours(st.real)} / ${U.hours(st.plan)}</div>
        <div class="mini-prog"><i style="width:${Math.min(100, st.progress || 0)}%"></i></div>
      </div>
      <div class="col">${U.kwLabel(s.start.week)}–${U.kwLabel(s.end.week)}</div>
      <div class="col">${st.count}</div>
      <div class="col">${U.hours(st.real)} / ${U.hours(st.plan)}</div>
      <div class="col">${st.progress == null ? '—' : U.pct(st.progress)}</div>
      <div class="col">${new Date(s.updatedAt).toLocaleDateString('pt-BR')}</div>
    </div>`;
  }
  function folderCard(f) {
    const c = Store.countInside(f.id);
    return `<div class="item" tabindex="0" draggable="true" data-kind="folder" data-id="${f.id}" data-drop="${f.id}" title="${U.esc(f.name)}">
      <div class="item-ico fold">${UI.icon('folder', 24)}</div>
      <div class="item-info"><div class="item-name">${U.esc(f.name)}</div>
        <div class="item-meta">${[c.folders ? U.plural(c.folders, 'pasta', 'pastas') : '', U.plural(c.schedules, 'cronograma', 'cronogramas')].filter(Boolean).join(' · ')}</div></div>
      <div class="col">Pasta</div><div class="col">${c.schedules}</div><div class="col"></div><div class="col"></div>
      <div class="col">${new Date(f.createdAt).toLocaleDateString('pt-BR')}</div>
    </div>`;
  }

  function render(sector, folderId) {
    if (folderId && !Store.folder(folderId)) { location.hash = `#/s/${sector.id}/cronogramas`; return; }
    const title = folderId ? U.esc(Store.folder(folderId).name) : 'Cronogramas';
    const el = Shell.render(sector, 'cronogramas', {
      title, crumbs: crumbs(sector, folderId),
      actions: `<button class="btn" id="d-folder">${UI.icon('folder', 17)}<span class="lbl">Nova pasta</span></button>
        <button class="btn" id="d-import">${UI.icon('upload', 17)}<span class="lbl">Importar Excel</span></button>
        <button class="btn btn-primary" id="d-new">${UI.icon('plus', 17)}<span class="lbl">Novo cronograma</span></button>`,
    });
    const q = (el.dataset.q = sessionStorage.getItem('zeit:q') || '');
    const draw = () => {
      const query = U.norm(sessionStorage.getItem('zeit:q') || '');
      let folders, schedules;
      if (query) {
        folders = Store.state.folders.filter((f) => f.sectorId === sector.id && U.norm(f.name).includes(query));
        schedules = C.sectorSchedules(sector.id).filter((s) => U.norm(s.title).includes(query) || s.activities.some((a) => U.norm(a.description).includes(query)));
      } else {
        folders = Store.childFolders(sector.id, folderId);
        schedules = Store.schedulesIn(sector.id, folderId);
      }
      const empty = !folders.length && !schedules.length;
      el.querySelector('#d-items').innerHTML = empty
        ? `<div class="empty"><div class="empty-ico">${UI.icon(query ? 'search' : 'folder', 34)}</div><p>${query ? 'Nada encontrado.' : 'Esta pasta está vazia.'}</p>${query ? '' : '<p class="muted">Crie uma pasta (ex.: 2026) ou um cronograma.</p>'}</div>`
        : `<div class="items ${viewMode}">
            ${viewMode === 'list' ? '<div class="list-head"><div></div><div>Nome</div><div>Período</div><div>Ativ.</div><div>Horas (real/plan)</div><div>Progresso</div><div>Atualizado</div></div>' : ''}
            ${folders.map(folderCard).join('')}${schedules.map(scheduleCard).join('')}</div>`;
      el.querySelectorAll('.item[data-kind]').forEach((it) => {
        const open = () => { location.hash = it.dataset.kind === 'folder' ? `#/s/${sector.id}/cronogramas/${it.dataset.id}` : `#/s/${sector.id}/c/${it.dataset.id}`; };
        it.addEventListener('dblclick', open);
        it.addEventListener('click', (e) => {
          el.querySelectorAll('.item.sel').forEach((x) => x.classList.remove('sel')); it.classList.add('sel'); e.stopPropagation();
          if (matchMedia('(hover: none)').matches) open();
        });
        it.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') open();
          if (e.key === 'Delete') remove(it.dataset.kind, it.dataset.id);
          if (e.key === 'F2') { e.preventDefault(); rename(it.dataset.kind, it.dataset.id); }
        });
        it.addEventListener('contextmenu', (e) => itemMenu(e, it.dataset.kind, it.dataset.id));
      });
      bindDrag(el);
    };

    el.innerHTML = `
      <div class="toolbar">
        <div class="search-box">${UI.icon('search', 16)}<input type="search" id="d-q" placeholder="Buscar cronogramas e atividades…" value="${U.esc(q)}"></div>
        <span class="spacer"></span>
        <div class="seg"><button data-v="grid" class="${viewMode === 'grid' ? 'on' : ''}" title="Ícones">${UI.icon('dashboard', 16)}</button><button data-v="list" class="${viewMode === 'list' ? 'on' : ''}" title="Detalhes">${UI.icon('list', 16)}</button></div>
      </div>
      <div id="d-items"></div>
      <p class="muted small tip">Duplo clique abre · clique direito mostra opções · arraste para mover entre pastas.</p>`;
    draw();

    el.querySelector('#d-q').addEventListener('input', U.debounce((e) => { sessionStorage.setItem('zeit:q', e.target.value); draw(); }, 150));
    el.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => { viewMode = b.dataset.v; localStorage.setItem('zeit:view', viewMode); render(sector, folderId); }));
    document.getElementById('d-folder').addEventListener('click', () => newFolder(sector.id, folderId));
    document.getElementById('d-new').addEventListener('click', () => scheduleForm(sector.id, null, folderId));
    document.getElementById('d-import').addEventListener('click', () => Excel.importDialog(sector.id, folderId));
    el.addEventListener('contextmenu', (e) => {
      if (e.target.closest('[data-kind]')) return;
      e.preventDefault();
      UI.menu(e.clientX, e.clientY, [
        { label: 'Nova pasta', icon: 'folder', action: () => newFolder(sector.id, folderId) },
        { label: 'Novo cronograma', icon: 'plus', action: () => scheduleForm(sector.id, null, folderId) },
      ]);
    });
    el.addEventListener('click', () => el.querySelectorAll('.item.sel').forEach((x) => x.classList.remove('sel')));
    bindDrag(document.querySelector('.crumbs') || el);
  }

  window.Drive = { render, scheduleForm, crumbs, itemMenu, remove, moveDialog };
})();
