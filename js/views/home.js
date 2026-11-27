/* Zeit — tela inicial: escolha do setor */
(function () {
  function sectorForm(existing) {
    const s = existing || {};
    let image = s.image || null;
    const icon = s.icon || '🔧';
    UI.modal({
      title: existing ? 'Editar setor' : 'Novo setor', size: 'md', submitLabel: existing ? 'Salvar' : 'Criar setor',
      body: `
        <label class="field">Nome do setor<input name="name" required maxlength="60" value="${U.esc(s.name || '')}" placeholder="Ex.: Pintura"></label>
        <label class="field">Descrição <span class="opt">(opcional)</span><input name="description" maxlength="90" value="${U.esc(s.description || '')}" placeholder="Ex.: Cabines, estufas e tratamento"></label>
        <div class="field">Ícone do setor
          <div class="icon-mode">
            <div class="icon-preview" id="ic-prev"></div>
            <div class="icon-mode-opts">
              <label class="btn btn-sm" for="ic-file">${UI.icon('upload', 15)} Enviar imagem</label>
              <input type="file" id="ic-file" accept="image/*" hidden>
              <button type="button" class="btn btn-sm btn-ghost" id="ic-clear" ${image ? '' : 'hidden'}>${UI.icon('trash', 15)} Remover imagem</button>
              <span class="opt">PNG, JPG ou SVG — ex.: logo da área. Ou escolha um dos ícones abaixo.</span>
            </div>
          </div>
          <div class="icon-pick">${Store.SECTOR_ICONS.map((i) => `<label><input type="radio" name="icon" value="${i}" ${i === icon ? 'checked' : ''}><span>${i}</span></label>`).join('')}</div>
        </div>`,
      onOpen(f) {
        const prev = f.querySelector('#ic-prev');
        const clear = f.querySelector('#ic-clear');
        const paint = () => {
          const ic = (f.querySelector('input[name=icon]:checked') || {}).value || icon;
          prev.innerHTML = image ? `<img src="${image}" alt="">` : `<span>${ic}</span>`;
          clear.hidden = !image;
        };
        f.querySelectorAll('input[name=icon]').forEach((r) => r.addEventListener('change', () => { image = null; paint(); }));
        f.querySelector('#ic-file').addEventListener('change', async (e) => {
          try { image = await UI.readImage(e.target.files[0], 160); f.showError(''); } catch (err) { f.showError(err.message); }
          e.target.value = ''; paint();
        });
        clear.addEventListener('click', () => { image = null; paint(); });
        paint();
      },
      onSubmit(d) {
        const data = { name: d.name.trim(), description: d.description.trim(), icon: d.icon || icon, image };
        if (existing) { Object.assign(existing, data); Store.save(); } else { const n = Store.createSector(data); n.image = image; Store.save(); }
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
          <button class="btn btn-ghost theme-btn" data-theme-toggle></button>
        </div>
      </header>
      <section class="hero">
        <h1>Zeit</h1>
        <p class="hero-sub">Cronogramas de atividades por KW — paradas, feriados e férias coletivas</p>
        <p class="hero-sub2">Escolha o setor da fábrica e depois a subpasta para começar</p>
      </section>
      <section class="home-panel">
        <h2>Selecione o setor</h2>
        <div class="sector-grid">
          ${sectors.map((s) => {
            const sch = Store.state.schedules.filter((x) => x.sectorId === s.id);
            const nWs = Store.childFolders(s.id, null).length;
            const st = C.stats(sch.flatMap((x) => x.activities));
            return `<a class="sector-card" href="#/s/${s.id}" data-id="${s.id}">
              <span class="sector-card-ico">${UI.sectorIcon(s)}</span>
              <strong>${U.esc(s.name)}</strong>
              <span class="muted">${U.esc(s.description || '')}</span>
              <span class="sector-card-meta">${U.plural(nWs, 'subpasta', 'subpastas')} · ${U.plural(sch.length, 'cronograma', 'cronogramas')}</span>
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
    app.querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const s = Store.sector(b.dataset.more);
      UI.menuAt(b, [
        { label: 'Abrir', icon: 'chevron', action: () => { location.hash = `#/s/${s.id}`; } },
        { label: 'Editar setor', icon: 'edit', action: () => sectorForm(s) },
        { divider: true },
        { label: 'Excluir setor', icon: 'trash', danger: true, action: async () => {
          const n = Store.state.schedules.filter((x) => x.sectorId === s.id).length;
          if (await UI.confirm(`Excluir o setor <b>${U.esc(s.name)}</b>${n ? ` e seus <b>${n} cronogramas</b>` : ''}? Essa ação não pode ser desfeita.`, { title: 'Excluir setor' })) {
            Store.deleteSector(s.id); UI.toast('Setor excluído');
          }
        } },
      ]);
    }));
  }

  window.Home = { render, sectorForm };
})();
