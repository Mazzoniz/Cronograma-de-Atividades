/* Zeit — dentro do setor: escolher (ou criar) a subpasta antes de abrir o sistema */
(function () {
  function spaceForm(sector, existing) {
    const f = existing || {};
    UI.modal({
      title: existing ? 'Editar subpasta' : 'Nova subpasta', size: 'sm', submitLabel: existing ? 'Salvar' : 'Criar e abrir',
      body: `<label class="field">Nome<input name="name" required maxlength="60" value="${U.esc(f.name || '')}" placeholder="Ex.: Paradas 2026, Manutenção Preventiva…"></label>
        <label class="field">Descrição <span class="opt">(opcional)</span><input name="description" maxlength="120" value="${U.esc(f.description || '')}" placeholder="Ex.: Feriados, Carnaval e férias coletivas"></label>`,
      onSubmit(d) {
        if (existing) { existing.name = d.name.trim(); existing.description = d.description.trim(); Store.save(); return; }
        const ws = Store.createFolder(sector.id, d.name, null);
        ws.description = d.description.trim(); Store.save();
        location.hash = `#/s/${sector.id}/w/${ws.id}/cronogramas`;
      },
    });
  }

  function render(sector) {
    const app = document.getElementById('app');
    app.className = 'home';
    const spaces = Store.childFolders(sector.id, null);
    const last = localStorage.getItem(`zeit:lastWs:${sector.id}`);
    const info = (ws) => {
      const ids = Store.descendantFolderIds(ws.id);
      const sch = Store.state.schedules.filter((s) => ids.has(s.folderId));
      const st = C.stats(sch.flatMap((s) => s.activities));
      const upd = sch.map((s) => s.updatedAt).sort().pop();
      return { sch, st, upd, sub: ids.size - 1 };
    };
    app.innerHTML = `
      <header class="home-top">
        <a class="brand" href="#/">${Shell.brandMark()}<span>Zeit</span></a>
        <div class="topbar-actions">
          <a class="btn btn-ghost" href="#/">${UI.icon('back', 17)}<span class="lbl">Trocar setor</span></a>
          <button class="btn btn-ghost theme-btn" data-theme-toggle></button>
        </div>
      </header>
      <section class="hero hero-sector">
        <span class="hero-ico">${UI.sectorIcon(sector)}</span>
        <h1 class="hero-sector-name">${U.esc(sector.name)}</h1>
        <p class="hero-sub2">Escolha uma subpasta para abrir o Zeit — ou crie uma nova</p>
      </section>
      <section class="home-panel">
        <h2>Subpastas do setor</h2>
        <div class="space-grid">
          ${spaces.map((ws) => { const x = info(ws); return `
            <a class="space-card ${ws.id === last ? 'last' : ''}" href="#/s/${sector.id}/w/${ws.id}/cronogramas">
              <span class="space-ico">${UI.icon('folder', 28)}</span>
              <div class="space-txt">
                <strong>${U.esc(ws.name)}</strong>
                ${ws.description ? `<span class="muted">${U.esc(ws.description)}</span>` : ''}
                <span class="space-meta">${U.plural(x.sch.length, 'cronograma', 'cronogramas')}${x.sub ? ` · ${U.plural(x.sub, 'pasta', 'pastas')}` : ''} · ${U.hours(x.st.real)} realizadas</span>
                ${x.upd ? `<span class="space-meta muted">Atualizado em ${U.fmtDateTime(x.upd)}</span>` : ''}
              </div>
              ${ws.id === last ? '<em class="space-last">Último aberto</em>' : ''}
              <button type="button" class="btn btn-ghost btn-icon btn-sm card-more" data-more="${ws.id}" aria-label="Opções">${UI.icon('more', 16)}</button>
            </a>`; }).join('')}
          <button type="button" class="space-card add" id="sp-add">
            <span class="space-ico">${UI.icon('plus', 28)}</span>
            <div class="space-txt"><strong>Nova subpasta</strong><span class="muted">Criar uma área para os cronogramas</span></div>
          </button>
        </div>
      </section>`;
    UI.applyTheme(Store.settings.theme);
    app.querySelector('[data-theme-toggle]').addEventListener('click', UI.toggleTheme);
    app.querySelector('#sp-add').addEventListener('click', () => spaceForm(sector));
    app.querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const ws = Store.folder(b.dataset.more);
      UI.menuAt(b, [
        { label: 'Abrir', icon: 'chevron', action: () => { location.hash = `#/s/${sector.id}/w/${ws.id}/cronogramas`; } },
        { label: 'Renomear / descrição', icon: 'edit', action: () => spaceForm(sector, ws) },
        { divider: true },
        { label: 'Excluir subpasta', icon: 'trash', danger: true, action: async () => {
          const c = Store.countInside(ws.id);
          if (await UI.confirm(`Excluir a subpasta <b>${U.esc(ws.name)}</b>${c.schedules ? ` e seus <b>${U.plural(c.schedules, 'cronograma', 'cronogramas')}</b>` : ''}? Essa ação não pode ser desfeita.`, { title: 'Excluir subpasta' })) {
            Store.deleteFolder(ws.id); UI.toast('Subpasta excluída');
          }
        } },
      ]);
    }));
  }

  window.Spaces = { render, spaceForm };
})();
