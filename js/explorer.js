/* Explorador de pastas e cronogramas (estilo Windows Explorer) */
(function () {
  const expanded = new Set(JSON.parse(localStorage.getItem('cronograma:expanded') || '[]'));
  const saveExpanded = () => localStorage.setItem('cronograma:expanded', JSON.stringify([...expanded]));
  let viewMode = localStorage.getItem('cronograma:view') || 'grid';

  /* ---------------- Formulário de cronograma (criar / editar) ---------------- */
  function monthYearSelect(prefix, ym) {
    const [y, m] = (ym || U.today().slice(0, 7)).split('-').map(Number);
    const cy = new Date().getFullYear();
    const years = [];
    for (let i = Math.min(cy - 2, y); i <= Math.max(cy + 6, y); i++) years.push(i);
    return `
      <div class="month-picker">
        <select name="${prefix}M" aria-label="Mês">
          ${U.MONTHS.map((n, i) => `<option value="${i + 1}" ${i + 1 === m ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
        <select name="${prefix}Y" aria-label="Ano">
          ${years.map((v) => `<option ${v === y ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>`;
  }

  function scheduleForm(existing, folderId) {
    const s = existing || {};
    const thisMonth = U.today().slice(0, 7);
    const nextMonth = U.monthsBetween(thisMonth, '9999-12')[1];
    UI.modal({
      title: existing ? 'Editar cronograma' : 'Novo cronograma',
      submitLabel: existing ? 'Salvar' : 'Criar cronograma',
      body: `
        <label>Título<input name="name" required maxlength="120" value="${U.esc(s.name || '')}" placeholder="Ex.: Implantação do sistema"></label>
        <div class="grid-2">
          <div class="field"><span class="field-label">Mês de início</span>${monthYearSelect('start', s.startMonth || thisMonth)}</div>
          <div class="field"><span class="field-label">Mês de término</span>${monthYearSelect('end', s.endMonth || nextMonth)}</div>
        </div>
        <p class="hint" id="period-hint"></p>
        <label>Pasta<select name="folderId">${UI.folderOptions(existing ? s.folderId : folderId)}</select></label>
        <label><span>Descrição <span class="muted">(opcional)</span></span><textarea name="description" rows="3" maxlength="1000">${U.esc(s.description || '')}</textarea></label>`,
      onOpen(form) {
        const upd = () => {
          const d = Object.fromEntries(new FormData(form).entries());
          const sm = `${d.startY}-${U.pad(d.startM)}`;
          const em = `${d.endY}-${U.pad(d.endM)}`;
          const hint = form.querySelector('#period-hint');
          if (em < sm) {
            hint.textContent = '⚠ O mês de término deve ser igual ou posterior ao de início.';
            hint.classList.add('warn');
          } else {
            const months = U.monthsBetween(sm, em).length;
            const wd = U.countWorkdays(`${sm}-01`, U.monthEnd(em));
            hint.textContent = `Período: ${U.periodLabel({ startMonth: sm, endMonth: em })} · ${U.plural(months, 'mês', 'meses')} · ${wd} dias úteis`;
            hint.classList.remove('warn');
          }
        };
        form.addEventListener('change', upd);
        upd();
      },
      onSubmit(d, form) {
        const startMonth = `${d.startY}-${U.pad(d.startM)}`;
        const endMonth = `${d.endY}-${U.pad(d.endM)}`;
        if (endMonth < startMonth) {
          form.showError('O mês de término deve ser igual ou posterior ao mês de início.');
          return false;
        }
        if (existing) {
          Object.assign(existing, {
            name: d.name.trim(), description: d.description.trim(), folderId: d.folderId || null, startMonth, endMonth,
          });
          Store.touch(existing);
          UI.toast('Cronograma atualizado');
        } else {
          const created = Store.createSchedule({ ...d, folderId: d.folderId || null, startMonth, endMonth });
          UI.toast('Cronograma criado');
          location.hash = `#/cronograma/${created.id}/atividades`;
        }
      },
    });
  }

  /* ---------------- Ações ---------------- */
  async function newFolder(parentId) {
    const name = await UI.prompt('Nova pasta', { value: 'Nova pasta', submitLabel: 'Criar' });
    if (!name) return;
    Store.createFolder(name, parentId);
    if (parentId) { expanded.add(parentId); saveExpanded(); }
    UI.toast('Pasta criada');
  }

  async function rename(kind, id) {
    const item = kind === 'folder' ? Store.folder(id) : Store.schedule(id);
    if (!item) return;
    const name = await UI.prompt(kind === 'folder' ? 'Renomear pasta' : 'Renomear cronograma', { value: item.name });
    if (!name) return;
    if (kind === 'folder') Store.renameFolder(id, name);
    else { item.name = name; Store.touch(item); }
  }

  async function remove(kind, id) {
    if (kind === 'folder') {
      const f = Store.folder(id);
      const c = Store.countInside(id);
      const extra = c.folders || c.schedules
        ? `<br><br><strong>Atenção:</strong> isso também excluirá ${[c.folders ? U.plural(c.folders, 'subpasta', 'subpastas') : '', c.schedules ? U.plural(c.schedules, 'cronograma', 'cronogramas') : ''].filter(Boolean).join(' e ')} dentro dela.`
        : '';
      if (!(await UI.confirm(`Excluir a pasta <strong>${U.esc(f.name)}</strong>?${extra}`, { title: 'Excluir pasta' }))) return;
      const parent = f.parentId;
      const inside = Store.descendantFolderIds(id);
      Store.deleteFolder(id);
      const cur = currentFolderFromHash();
      if (cur && inside.has(cur)) location.hash = parent ? `#/pasta/${parent}` : '#/';
      UI.toast('Pasta excluída');
    } else {
      const s = Store.schedule(id);
      if (!(await UI.confirm(`Excluir o cronograma <strong>${U.esc(s.name)}</strong> e todas as suas atividades?`, { title: 'Excluir cronograma' }))) return;
      const folderId = s.folderId;
      Store.deleteSchedule(id);
      if (location.hash.includes(id)) location.hash = folderId ? `#/pasta/${folderId}` : '#/';
      UI.toast('Cronograma excluído');
    }
  }

  function moveDialog(kind, id) {
    const item = kind === 'folder' ? Store.folder(id) : Store.schedule(id);
    const exclude = kind === 'folder' ? Store.descendantFolderIds(id) : null;
    UI.modal({
      title: `Mover "${item.name}"`,
      submitLabel: 'Mover',
      body: `<label>Mover para<select name="target" size="10" class="folder-list">${UI.folderOptions(kind === 'folder' ? item.parentId : item.folderId, exclude)}</select></label>`,
      onSubmit(d) {
        if (Store.move(kind, id, d.target || null)) UI.toast('Item movido');
      },
    });
  }

  function itemMenu(e, kind, id) {
    e.preventDefault();
    const items = [
      { label: 'Abrir', icon: '↗', action: () => { location.hash = kind === 'folder' ? `#/pasta/${id}` : `#/cronograma/${id}/atividades`; } },
      { label: 'Renomear', icon: '✎', action: () => rename(kind, id) },
      { label: 'Mover para…', icon: '⇄', action: () => moveDialog(kind, id) },
    ];
    if (kind === 'folder') {
      items.push({ label: 'Nova subpasta', icon: '＋', action: () => newFolder(id) });
      items.push({ label: 'Novo cronograma aqui', icon: '＋', action: () => scheduleForm(null, id) });
    } else {
      items.push({ label: 'Editar período/dados', icon: '⚙', action: () => scheduleForm(Store.schedule(id)) });
      items.push({ label: 'Duplicar', icon: '⧉', action: () => { Store.duplicateSchedule(id); UI.toast('Cronograma duplicado'); } });
    }
    items.push({ divider: true });
    items.push({ label: 'Excluir', icon: '🗑', danger: true, action: () => remove(kind, id) });
    UI.contextMenu(e.clientX, e.clientY, items);
  }

  function backgroundMenu(e, folderId) {
    if (e.target.closest('[data-kind]')) return;
    e.preventDefault();
    UI.contextMenu(e.clientX, e.clientY, [
      { label: 'Nova pasta', icon: '📁', action: () => newFolder(folderId) },
      { label: 'Novo cronograma', icon: '📅', action: () => scheduleForm(null, folderId) },
    ]);
  }

  /* ---------------- Arrastar e soltar ---------------- */
  function bindDrag(container) {
    container.querySelectorAll('[draggable=true][data-kind]').forEach((el) => {
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', `${el.dataset.kind}:${el.dataset.id}`);
        e.dataTransfer.effectAllowed = 'move';
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
    });
    container.querySelectorAll('[data-drop]').forEach((el) => {
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop-over'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop-over'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drop-over');
        const [kind, id] = (e.dataTransfer.getData('text/plain') || '').split(':');
        if (!kind || !id) return;
        const target = el.dataset.drop === 'root' ? null : el.dataset.drop;
        if (kind === 'folder' && id === target) return;
        if (Store.move(kind, id, target)) UI.toast('Item movido');
        else if (kind === 'folder' && target && Store.descendantFolderIds(id).has(target)) UI.toast('Não é possível mover uma pasta para dentro dela mesma');
      });
    });
  }

  /* ---------------- Barra lateral (árvore) ---------------- */
  function currentFolderFromHash() {
    const m = location.hash.match(/^#\/pasta\/([^/]+)/);
    if (m) return m[1];
    const s = location.hash.match(/^#\/cronograma\/([^/]+)/);
    if (s) { const sc = Store.schedule(s[1]); return sc ? sc.folderId : null; }
    return null;
  }

  function renderSidebar() {
    const el = document.getElementById('sidebar');
    const curFolder = (location.hash.match(/^#\/pasta\/([^/]+)/) || [])[1] || null;
    const curSchedule = (location.hash.match(/^#\/cronograma\/([^/]+)/) || [])[1] || null;
    const isRoot = !location.hash || location.hash === '#/' || location.hash === '#';

    // expande automaticamente o caminho até o item atual
    const ctx = currentFolderFromHash();
    if (ctx) Store.folderPath(ctx).forEach((f) => expanded.add(f.id));

    const node = (parentId, depth) => {
      const folders = Store.childFolders(parentId);
      const schedules = Store.schedulesIn(parentId);
      return folders.map((f) => {
        const hasKids = Store.childFolders(f.id).length || Store.schedulesIn(f.id).length;
        const open = expanded.has(f.id);
        return `
          <li>
            <div class="tree-row ${curFolder === f.id ? 'active' : ''}" style="--depth:${depth}" data-kind="folder" data-id="${f.id}" data-drop="${f.id}" draggable="true">
              <button class="tree-toggle ${hasKids ? '' : 'invisible'}" data-toggle="${f.id}" aria-label="${open ? 'Recolher' : 'Expandir'}">${open ? '▾' : '▸'}</button>
              <a href="#/pasta/${f.id}" class="tree-link"><span class="ico">${open ? '📂' : '📁'}</span><span class="tree-name">${U.esc(f.name)}</span></a>
            </div>
            ${open ? `<ul>${node(f.id, depth + 1)}</ul>` : ''}
          </li>`;
      }).join('') + schedules.map((s) => `
          <li>
            <div class="tree-row ${curSchedule === s.id ? 'active' : ''}" style="--depth:${depth}" data-kind="schedule" data-id="${s.id}" draggable="true">
              <span class="tree-toggle invisible"></span>
              <a href="#/cronograma/${s.id}/atividades" class="tree-link"><span class="ico">📅</span><span class="tree-name">${U.esc(s.name)}</span></a>
            </div>
          </li>`).join('');
    };

    el.innerHTML = `
      <div class="sidebar-head">
        <span>Pastas</span>
        <button class="btn btn-ghost btn-icon btn-sm" id="sb-new-folder" title="Nova pasta na raiz">＋</button>
      </div>
      <ul class="tree">
        <li>
          <div class="tree-row ${isRoot ? 'active' : ''}" style="--depth:0" data-drop="root">
            <span class="tree-toggle invisible"></span>
            <a href="#/" class="tree-link"><span class="ico">🏠</span><span class="tree-name">Início</span></a>
          </div>
          <ul>${node(null, 1)}</ul>
        </li>
      </ul>`;

    el.querySelector('#sb-new-folder').addEventListener('click', () => newFolder(null));
    el.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      const id = b.dataset.toggle;
      if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
      saveExpanded();
      renderSidebar();
    }));
    el.querySelectorAll('.tree-row[data-kind]').forEach((row) => {
      row.addEventListener('contextmenu', (e) => itemMenu(e, row.dataset.kind, row.dataset.id));
    });
    bindDrag(el);
  }

  /* ---------------- Área principal ---------------- */
  function breadcrumb(folderId, extra) {
    const path = folderId ? Store.folderPath(folderId) : [];
    const parts = [`<a href="#/" data-drop="root">🏠 Início</a>`]
      .concat(path.map((f) => `<a href="#/pasta/${f.id}" data-drop="${f.id}">${U.esc(f.name)}</a>`));
    if (extra) parts.push(`<span class="current">${extra}</span>`);
    return `<nav class="breadcrumb" aria-label="Caminho">${parts.join('<span class="sep">›</span>')}</nav>`;
  }

  function scheduleCard(s) {
    const st = C.stats(s);
    return `
      <div class="item item-schedule" tabindex="0" data-kind="schedule" data-id="${s.id}" draggable="true" title="${U.esc(s.name)}">
        <div class="item-icon">📅</div>
        <div class="item-info">
          <div class="item-name">${U.esc(s.name)}</div>
          <div class="item-meta">${U.esc(U.periodLabel(s))}</div>
          <div class="item-meta">${U.plural(st.count, 'atividade', 'atividades')} · ${U.hours(st.planned)}</div>
          <div class="mini-progress" title="Progresso ${U.pct(st.progress)}"><span style="width:${st.progress}%"></span></div>
        </div>
        <div class="item-col">${U.esc(U.periodLabel(s))}</div>
        <div class="item-col">${st.count}</div>
        <div class="item-col">${U.pct(st.progress)}</div>
        <div class="item-col">${new Date(s.updatedAt).toLocaleDateString('pt-BR')}</div>
        <button type="button" class="item-more" aria-label="Mais opções" title="Mais opções">⋯</button>
      </div>`;
  }

  function folderCard(f) {
    const c = Store.countInside(f.id);
    const desc = [c.folders ? U.plural(c.folders, 'pasta', 'pastas') : '', U.plural(c.schedules, 'cronograma', 'cronogramas')].filter(Boolean).join(' · ');
    return `
      <div class="item item-folder" tabindex="0" data-kind="folder" data-id="${f.id}" data-drop="${f.id}" draggable="true" title="${U.esc(f.name)}">
        <div class="item-icon">📁</div>
        <div class="item-info">
          <div class="item-name">${U.esc(f.name)}</div>
          <div class="item-meta">${desc}</div>
        </div>
        <div class="item-col">Pasta</div>
        <div class="item-col">${c.schedules}</div>
        <div class="item-col"></div>
        <div class="item-col">${new Date(f.createdAt).toLocaleDateString('pt-BR')}</div>
        <button type="button" class="item-more" aria-label="Mais opções" title="Mais opções">⋯</button>
      </div>`;
  }

  function bindItems(main) {
    main.querySelectorAll('.item[data-kind]').forEach((el) => {
      const open = () => {
        location.hash = el.dataset.kind === 'folder' ? `#/pasta/${el.dataset.id}` : `#/cronograma/${el.dataset.id}/atividades`;
      };
      el.addEventListener('dblclick', open);
      el.addEventListener('click', (e) => {
        if (e.target.closest('.item-more')) { e.stopPropagation(); itemMenu(e, el.dataset.kind, el.dataset.id); return; }
        main.querySelectorAll('.item.selected').forEach((x) => x.classList.remove('selected'));
        el.classList.add('selected');
        // toque único em telas sem mouse abre direto
        if (window.matchMedia('(hover: none)').matches) open();
        e.stopPropagation();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') open();
        if (e.key === 'Delete') remove(el.dataset.kind, el.dataset.id);
        if (e.key === 'F2') { e.preventDefault(); rename(el.dataset.kind, el.dataset.id); }
      });
      el.addEventListener('contextmenu', (e) => itemMenu(e, el.dataset.kind, el.dataset.id));
    });
  }

  function listHeader() {
    return `<div class="list-header"><div></div><div>Nome</div><div>Tipo / Período</div><div>Itens</div><div>Progresso</div><div>Data</div></div>`;
  }

  function render(folderId, query) {
    const main = document.getElementById('main');
    if (folderId && !Store.folder(folderId)) { location.hash = '#/'; return; }

    let folders, schedules, title;
    if (query) {
      const q = query.toLowerCase();
      folders = Store.state.folders.filter((f) => f.name.toLowerCase().includes(q));
      schedules = Store.state.schedules.filter((s) => s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q));
      title = `Resultados para "${U.esc(query)}"`;
    } else {
      folders = Store.childFolders(folderId);
      schedules = Store.schedulesIn(folderId);
      title = folderId ? U.esc(Store.folder(folderId).name) : 'Início';
    }

    const empty = !folders.length && !schedules.length;
    main.innerHTML = `
      <div class="page explorer">
        ${query ? '' : breadcrumb(folderId)}
        <div class="page-head">
          <h1>${title}</h1>
          <div class="toolbar">
            ${query ? '' : `
            <button class="btn" id="ex-new-folder">📁 Nova pasta</button>
            <button class="btn btn-primary" id="ex-new-schedule">＋ Novo cronograma</button>`}
            <div class="segmented" role="group" aria-label="Modo de exibição">
              <button class="${viewMode === 'grid' ? 'on' : ''}" data-view="grid" title="Ícones">▦</button>
              <button class="${viewMode === 'list' ? 'on' : ''}" data-view="list" title="Detalhes">☰</button>
            </div>
          </div>
        </div>
        ${empty ? `
          <div class="empty">
            <div class="empty-icon">${query ? '🔍' : '📂'}</div>
            <p>${query ? 'Nada encontrado.' : 'Esta pasta está vazia.'}</p>
            ${query ? '' : '<p class="muted">Crie uma pasta para organizar ou um cronograma para começar a planejar.</p>'}
          </div>` : `
          <div class="items ${viewMode}" id="items">
            ${viewMode === 'list' ? listHeader() : ''}
            ${folders.map(folderCard).join('')}
            ${schedules.map(scheduleCard).join('')}
          </div>`}
        <p class="muted small explorer-tip">Dica: clique duas vezes para abrir · clique direito ou ⋯ para mais opções · arraste itens para dentro de pastas.</p>
      </div>`;

    const nf = main.querySelector('#ex-new-folder');
    if (nf) nf.addEventListener('click', () => newFolder(folderId));
    const ns = main.querySelector('#ex-new-schedule');
    if (ns) ns.addEventListener('click', () => scheduleForm(null, folderId));
    main.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      viewMode = b.dataset.view;
      localStorage.setItem('cronograma:view', viewMode);
      render(folderId, query);
    }));
    const page = main.querySelector('.page');
    page.addEventListener('contextmenu', (e) => { if (!query) backgroundMenu(e, folderId); });
    page.addEventListener('click', () => main.querySelectorAll('.item.selected').forEach((x) => x.classList.remove('selected')));
    bindItems(main);
    bindDrag(main);
  }

  window.Explorer = { render, renderSidebar, scheduleForm, breadcrumb, itemMenu, remove, moveDialog, bindDrag };
})();
