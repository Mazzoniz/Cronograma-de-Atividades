/* Zeit — inicialização e rotas */
(function () {
  Store.load();
  UI.applyTheme(Store.settings.theme);

  function route() {
    UI.hideMenu();
    document.getElementById('viz-tip').hidden = true;
    document.body.classList.remove('nav-open');
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
    if (parts[0] !== 's') { Home.render(); return; }
    const sector = Store.sector(parts[1]);
    if (!sector) { location.hash = '#/'; return; }
    localStorage.setItem('zeit:lastSector', sector.id);
    const view = parts[2] || 'dashboard';
    switch (view) {
      case 'dashboard': DashboardView.render(sector); break;
      case 'cronogramas': Drive.render(sector, parts[3] || null); break;
      case 'c': ScheduleView.render(sector, parts[3]); break;
      case 'atividades': Boards.activities(sector); break;
      case 'kanban': Boards.kanban(sector); break;
      case 'gantt': Boards.gantt(sector); break;
      case 'timeline': Boards.timeline(sector); break;
      case 'calendario': Boards.calendar(sector); break;
      case 'equipe': TeamView.team(sector); break;
      case 'analytics': TeamView.analytics(sector); break;
      case 'ocorrencias': TeamView.failures(sector); break;
      case 'relatorios': ReportsView.reports(sector); break;
      case 'configuracoes': ReportsView.settings(sector); break;
      default: location.hash = `#/s/${sector.id}/dashboard`;
    }
  }

  window.addEventListener('hashchange', route);
  Store.onChange(() => {
    // re-renderiza mantendo as posições de rolagem
    const content = document.getElementById('content');
    const grid = document.getElementById('grid-wrap') || document.querySelector('.gantt-wrap');
    const pos = { top: content ? content.scrollTop : 0, gl: grid ? grid.scrollLeft : 0, gt: grid ? grid.scrollTop : 0, win: window.scrollY };
    route();
    const c2 = document.getElementById('content'); if (c2) c2.scrollTop = pos.top;
    const g2 = document.getElementById('grid-wrap') || document.querySelector('.gantt-wrap'); if (g2) { g2.scrollLeft = pos.gl; g2.scrollTop = pos.gt; }
    window.scrollTo(0, pos.win);
  });
  route();
})();
