/* Inicialização e roteamento por hash */
(function () {
  Store.load();
  let query = '';

  function route() {
    UI.hideMenu();
    const tip = document.getElementById('viz-tip');
    if (tip) tip.hidden = true;
    const h = location.hash || '#/';
    let m;
    if ((m = h.match(/^#\/cronograma\/([^/]+)(?:\/([^/]+))?/))) {
      query = '';
      document.getElementById('global-search').value = '';
      Schedule.render(m[1], m[2] || 'atividades');
    } else if ((m = h.match(/^#\/pasta\/([^/]+)/))) {
      Explorer.render(m[1], query);
    } else {
      Explorer.render(null, query);
    }
    Explorer.renderSidebar();
    document.body.classList.remove('sidebar-open');
  }

  window.addEventListener('hashchange', route);
  Store.onChange(() => {
    // preserva rolagem ao re-renderizar após alterações
    const main = document.getElementById('main');
    const top = main.scrollTop;
    const gs = main.querySelector('.gantt-scroll');
    const left = gs ? gs.scrollLeft : null;
    route();
    main.scrollTop = top;
    const gs2 = main.querySelector('.gantt-scroll');
    if (gs2 && left != null) gs2.scrollLeft = left;
  });

  const search = document.getElementById('global-search');
  search.addEventListener('input', () => {
    query = search.value.trim();
    if (location.hash.startsWith('#/cronograma/')) {
      if (query) { location.hash = '#/'; return; }
    }
    const m = location.hash.match(/^#\/pasta\/([^/]+)/);
    Explorer.render(m ? m[1] : null, query);
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    UI.download(`cronogramas-backup-${U.today()}.json`, Store.exportJSON());
    UI.toast('Backup exportado');
  });
  const file = document.getElementById('import-file');
  document.getElementById('btn-import').addEventListener('click', async () => {
    if (await UI.confirm('Importar um backup <strong>substitui todos os dados atuais</strong> (pastas e cronogramas). Deseja continuar?', { title: 'Importar backup', okLabel: 'Escolher arquivo', danger: false })) {
      file.click();
    }
  });
  file.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJSON(reader.result);
        location.hash = '#/';
        UI.toast('Backup importado com sucesso');
      } catch (e) {
        UI.toast(e.message || 'Arquivo inválido');
      }
      file.value = '';
    };
    reader.readAsText(f);
  });
  document.getElementById('btn-sidebar').addEventListener('click', () => {
    if (window.innerWidth <= 860) document.body.classList.toggle('sidebar-open');
    else document.body.classList.toggle('sidebar-hidden');
  });

  route();
})();
