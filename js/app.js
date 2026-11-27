/* Zeit — inicialização e rotas
 *   #/                         → escolha do setor
 *   #/s/<setor>                → escolha da subpasta (área de trabalho) do setor
 *   #/s/<setor>/w/<subpasta>/… → o sistema, limitado àquela subpasta */
(function () {
  Store.load();
  UI.applyTheme(Store.settings.theme);

  function route() {
    UI.hideMenu();
    document.getElementById('viz-tip').hidden = true;
    document.body.classList.remove('nav-open');
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
    if (parts[0] !== 's') { Z.clear(); Home.render(); return; }
    const sector = Store.sector(parts[1]);
    if (!sector) { location.hash = '#/'; return; }
    if (parts[2] !== 'w') { Z.set(sector, null); Spaces.render(sector); return; }
    const ws = Store.folder(parts[3]);
    if (!ws || ws.sectorId !== sector.id || ws.parentId) { location.hash = `#/s/${sector.id}`; return; }
    Z.set(sector, ws);
    localStorage.setItem(`zeit:lastWs:${sector.id}`, ws.id);
    const view = parts[4] || 'cronogramas';
    const arg = parts[5] || null;
    switch (view) {
      case 'dashboard': DashboardView.render(sector); break;
      case 'cronogramas': Drive.render(sector, arg); break;
      case 'c': ScheduleView.render(sector, arg, parts[6] || 'grade'); break;
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
      default: location.hash = Z.url('cronogramas');
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
