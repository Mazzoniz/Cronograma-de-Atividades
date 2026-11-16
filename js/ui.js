/* Componentes de interface: modal, confirmação, toast e menu de contexto */
(function () {
  const root = () => document.getElementById('modal-root');

  /**
   * Abre um modal com formulário.
   * opts: { title, body (html), submitLabel, wide, onOpen(form), onSubmit(data, form) -> false para manter aberto }
   */
  function modal(opts) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <form class="modal ${opts.wide ? 'modal-wide' : ''}" novalidate>
        <div class="modal-head">
          <h2>${U.esc(opts.title)}</h2>
          <button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">${opts.body || ''}</div>
        <div class="form-error" hidden></div>
        <div class="modal-foot">
          ${opts.extraFoot || ''}
          <span class="spacer"></span>
          <button type="button" class="btn" data-close>Cancelar</button>
          ${opts.onSubmit ? `<button type="submit" class="btn btn-primary">${U.esc(opts.submitLabel || 'Salvar')}</button>` : ''}
        </div>
      </form>`;
    root().appendChild(wrap);
    const form = wrap.querySelector('form');
    const errBox = wrap.querySelector('.form-error');

    const close = () => {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    form.showError = (msg) => {
      errBox.textContent = msg || '';
      errBox.hidden = !msg;
    };
    form.close = close;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.showError('');
      if (!form.checkValidity()) {
        const bad = form.querySelector(':invalid');
        const label = bad && bad.closest('label');
        form.showError(`Verifique o campo ${label ? `"${label.firstChild.textContent.trim()}"` : 'destacado'}.`);
        if (bad) bad.focus();
        return;
      }
      const data = Object.fromEntries(new FormData(form).entries());
      const result = opts.onSubmit(data, form);
      if (result !== false) close();
    });

    if (opts.onOpen) opts.onOpen(form);
    const first = form.querySelector('input:not([type=hidden]):not([readonly]), select, textarea');
    if (first) setTimeout(() => { first.focus(); if (first.select) first.select(); }, 30);
    return form;
  }

  function confirm(message, { title = 'Confirmar', okLabel = 'Excluir', danger = true } = {}) {
    return new Promise((resolve) => {
      let ok = false;
      const form = modal({
        title,
        body: `<p class="confirm-text">${message}</p>`,
        submitLabel: okLabel,
        onSubmit: () => { ok = true; },
      });
      if (danger) form.querySelector('[type=submit]').classList.add('btn-danger');
      const obs = new MutationObserver(() => {
        if (!document.body.contains(form)) { obs.disconnect(); resolve(ok); }
      });
      obs.observe(root(), { childList: true });
    });
  }

  function prompt(title, { label = 'Nome', value = '', submitLabel = 'Salvar' } = {}) {
    return new Promise((resolve) => {
      let result = null;
      const form = modal({
        title,
        submitLabel,
        body: `<label>${U.esc(label)}<input name="value" required maxlength="120" value="${U.esc(value)}"></label>`,
        onSubmit: (d) => {
          if (!d.value.trim()) { form.showError('Informe um nome.'); return false; }
          result = d.value.trim();
        },
      });
      const obs = new MutationObserver(() => {
        if (!document.body.contains(form)) { obs.disconnect(); resolve(result); }
      });
      obs.observe(root(), { childList: true });
    });
  }

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /** items: [{ label, icon, action, danger, divider }] */
  function contextMenu(x, y, items) {
    const menu = document.getElementById('ctx-menu');
    menu.innerHTML = items.map((it, i) => (it.divider
      ? '<div class="ctx-divider"></div>'
      : `<button type="button" data-i="${i}" class="${it.danger ? 'danger' : ''}"><span class="ctx-icon">${it.icon || ''}</span>${U.esc(it.label)}</button>`)).join('');
    menu.hidden = false;
    const r = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(x, window.innerWidth - r.width - 8)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - r.height - 8)}px`;
    menu.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      hideMenu();
      items[Number(b.dataset.i)].action();
    }));
  }
  function hideMenu() {
    document.getElementById('ctx-menu').hidden = true;
  }
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#ctx-menu')) hideMenu();
  });
  window.addEventListener('blur', hideMenu);
  window.addEventListener('resize', hideMenu);

  /** <option>s com todas as pastas em árvore. exclude = Set de ids a ocultar. */
  function folderOptions(selectedId, exclude) {
    const opts = [`<option value="" ${!selectedId ? 'selected' : ''}>📁 Início (raiz)</option>`];
    const walk = (parentId, depth) => {
      Store.childFolders(parentId).forEach((f) => {
        if (exclude && exclude.has(f.id)) return;
        opts.push(`<option value="${f.id}" ${f.id === selectedId ? 'selected' : ''}>${'   '.repeat(depth + 1)}📁 ${U.esc(f.name)}</option>`);
        walk(f.id, depth + 1);
      });
    };
    walk(null, 0);
    return opts.join('');
  }

  function download(filename, text, type = 'application/json') {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  window.UI = { modal, confirm, prompt, toast, contextMenu, hideMenu, folderOptions, download };
})();
