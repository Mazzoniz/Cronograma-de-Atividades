/* Zeit — tela inicial: escolha do setor */
(function () {
  function sectorForm(existing) {
    const s = existing || {};
    const icon = s.icon || '🔧';
    UI.modal({
      title: existing ? 'Editar setor' : 'Novo setor', size: 'sm', submitLabel: existing ? 'Salvar' : 'Criar setor',
      body: `
        <label class="field">Nome do setor<input name="name" required maxlength="60" value="${U.esc(s.name || '')}" placeholder="Ex.: Pintura"></label>
        <label class="field">Descrição <span class="opt">(opcional)</span><input name="description" maxlength="90" value="${U.esc(s.description || '')}" placeholder="Ex.: Cabines, estufas e tratamento"></label>
        <div class="field">Ícone<div class="icon-pick">${Store.SECTOR_ICONS.map((i) => `<label><input type="radio" name="icon" value="${i}" ${i === icon ? 'checked' : ''}><span>${i}</span></label>`).join('')}</div></div>`,
      onSubmit(d) {
        if (existing) { Object.assign(existing, { name: d.name.trim(), description: d.description.trim(), icon: d.icon }); Store.save(); }
        else Store.createSector(d);
        UI.toast(existing ? 'Setor atualizado' : 'Setor criado');
      },
    });
  }

  function render() {
    const app = document.getElementById('app');
    app.className = 'home';
    const sectors = Store.state.sectors;
    app.innerHTML = `
      <header class="home-top">
        <a class="brand" href="#/">${Shell.brandMark()}<span>Zeit</span></a>
        <div class="topbar-actions">
          <button class="btn btn-ghost" id="h-import">${UI.icon('upload', 17)}<span class="lbl">Importar planilhas</span></button>
          <button class="btn btn-ghost theme-btn" data-theme-toggle></button>
        </div>
      </header>
      <section class="hero">
        <h1>Zeit</h1>
        <p class="hero-sub">Cronogramas de atividades por KW — paradas, feriados e férias coletivas</p>
        <p class="hero-sub2">Escolha o setor da fábrica para começar</p>
      </section>
      <section class="home-panel">
        <h2>Selecione o setor</h2>
        <div class="sector-grid">
          ${sectors.map((s) => {
            const sch = C.sectorSchedules(s.id);
            const st = C.stats(sch.flatMap((x) => x.activities));
            return `<a class="sector-card" href="#/s/${s.id}/dashboard" data-id="${s.id}">
              <span class="sector-card-ico">${s.icon || '🏭'}</span>
              <strong>${U.esc(s.name)}</strong>
              <span class="muted">${U.esc(s.description || '')}</span>
              <span class="sector-card-meta">${U.plural(sch.length, 'cronograma', 'cronogramas')} · ${U.hours(st.real)} realizadas</span>
              <button type="button" class="btn btn-ghost btn-icon btn-sm card-more" data-more="${s.id}" aria-label="Opções">${UI.icon('more', 16)}</button>
            </a>`;
          }).join('')}
          <button type="button" class="sector-card add" id="h-add">
            <span class="sector-card-ico">${UI.icon('plus', 26)}</span>
            <strong>Adicionar setor</strong>
            <span class="muted">Criar nova área de trabalho</span>
          </button>
        </div>
      </section>
      <footer class="home-foot muted">Os dados ficam salvos neste navegador. Use <b>Configurações → Backup</b> dentro de um setor para copiar entre computadores.</footer>`;
    UI.applyTheme(Store.settings.theme);
    app.querySelector('[data-theme-toggle]').addEventListener('click', UI.toggleTheme);
    app.querySelector('#h-add').addEventListener('click', () => sectorForm());
    app.querySelector('#h-import').addEventListener('click', () => {
      if (!sectors.length) { UI.toast('Crie um setor primeiro'); return; }
      Excel.importDialog(sectors[0].id);
    });
    app.querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const s = Store.sector(b.dataset.more);
      UI.menuAt(b, [
        { label: 'Abrir', icon: 'chevron', action: () => { location.hash = `#/s/${s.id}/dashboard`; } },
        { label: 'Editar setor', icon: 'edit', action: () => sectorForm(s) },
        { divider: true },
        { label: 'Excluir setor', icon: 'trash', danger: true, action: async () => {
          const n = C.sectorSchedules(s.id).length;
          if (await UI.confirm(`Excluir o setor <b>${U.esc(s.name)}</b>${n ? ` e seus <b>${n} cronogramas</b>` : ''}? Essa ação não pode ser desfeita.`, { title: 'Excluir setor' })) {
            Store.deleteSector(s.id); UI.toast('Setor excluído');
          }
        } },
      ]);
    }));
  }

  window.Home = { render, sectorForm };
})();
