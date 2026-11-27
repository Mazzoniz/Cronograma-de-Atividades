/* Zeit — estrutura das telas do setor: menu lateral + barra superior */
(function () {
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'cronogramas', label: 'Cronogramas', icon: 'folder' },
    { id: 'atividades', label: 'Todas Atividades', icon: 'list' },
    { id: 'kanban', label: 'Kanban', icon: 'kanban' },
    { id: 'gantt', label: 'Gantt', icon: 'gantt' },
    { id: 'equipe', label: 'Equipe', icon: 'team' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
    { id: 'timeline', label: 'Timeline', icon: 'timeline' },
    { id: 'calendario', label: 'Calendário', icon: 'calendar' },
    { id: 'ocorrencias', label: 'Ocorrências', icon: 'wrench', hint: 'Falhas, MTBF e MTTR' },
    { id: 'relatorios', label: 'Relatórios', icon: 'report' },
    { id: 'configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  /** Monta o layout e devolve o elemento de conteúdo. */
  function render(sector, active, { title, actions = '', crumbs = '' } = {}) {
    const app = document.getElementById('app');
    app.className = 'layout';
    app.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="#/">${brandMark()}<span>Zeit</span></a>
        <div class="sector-box">
          <span class="sector-ico">${sector.icon || '🏭'}</span>
          <div class="sector-txt"><small>Setor</small><strong>${U.esc(sector.name)}</strong></div>
        </div>
        <nav class="nav">
          ${NAV.map((n) => `<a href="#/s/${sector.id}/${n.id}" class="${n.id === active ? 'on' : ''}" ${n.hint ? `title="${n.hint}"` : ''}>${UI.icon(n.icon)}<span>${n.label}</span></a>`).join('')}
        </nav>
        <a class="nav-switch" href="#/">${UI.icon('swap', 16)}<span>Trocar setor</span></a>
      </aside>
      <div class="sidebar-scrim" id="scrim"></div>
      <div class="main">
        <header class="topbar">
          <button class="btn btn-ghost btn-icon only-mobile" id="btn-nav" aria-label="Menu">${UI.icon('menu')}</button>
          <div class="topbar-title">
            ${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}
            <h1>${title}</h1>
          </div>
          <div class="topbar-actions">${actions}
            <button class="btn btn-ghost theme-btn" data-theme-toggle></button>
          </div>
        </header>
        <div class="content" id="content"></div>
      </div>`;
    UI.applyTheme(Store.settings.theme);
    app.querySelector('[data-theme-toggle]').addEventListener('click', UI.toggleTheme);
    app.querySelector('#btn-nav').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    app.querySelector('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
    return app.querySelector('#content');
  }

  function brandMark(size = 30) {
    return `<svg class="brand-mark" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--primary)"/><path d="M10 10h12L10 22h12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  /** Seleção de cronograma (usado em Gantt, Kanban etc.) */
  function scheduleSelect(sectorId, selected, { all = true, id = 'sel-schedule' } = {}) {
    const list = C.sectorSchedules(sectorId).sort((a, b) => Store.schedStart(b).localeCompare(Store.schedStart(a)));
    return `<select id="${id}" class="select-inline">
      ${all ? `<option value="">Todos os cronogramas</option>` : ''}
      ${list.map((s) => `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${U.esc(s.title)}</option>`).join('')}
    </select>`;
  }

  window.Shell = { NAV, render, brandMark, scheduleSelect };
})();
