/* Zeit — componentes de interface: ícones, modal, confirmação, toast, menus, tema */
(function () {
  const P = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    kanban: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="8" rx="1.5"/>',
    gantt: '<path d="M3 4v16h18"/><rect x="6" y="6" width="8" height="3" rx="1"/><rect x="10" y="11" width="9" height="3" rx="1"/><rect x="7" y="16" width="6" height="2.5" rx="1"/>',
    team: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    report: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4M8 9h8M8 13h5"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M17 11v6M14 14h6"/>',
    swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
  };
  const icon = (name, size = 18) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  const root = () => document.getElementById('modal-root');

  /** opts: { title, body, submitLabel, size: 'sm'|'md'|'lg', extraFoot, onOpen(form), onSubmit(data, form) -> false mantém aberto } */
  function modal(opts) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <form class="modal modal-${opts.size || 'md'}" novalidate>
        <div class="modal-head"><h2>${U.esc(opts.title)}</h2>
          <button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Fechar">✕</button></div>
        <div class="modal-body">${opts.body || ''}</div>
        <div class="form-error" hidden></div>
        <div class="modal-foot">${opts.extraFoot || ''}<span class="spacer"></span>
          <button type="button" class="btn" data-close>${opts.onSubmit ? 'Cancelar' : 'Fechar'}</button>
          ${opts.onSubmit ? `<button type="submit" class="btn btn-primary">${U.esc(opts.submitLabel || 'Salvar')}</button>` : ''}
        </div>
      </form>`;
    root().appendChild(wrap);
    const form = wrap.querySelector('form');
    const err = wrap.querySelector('.form-error');
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); if (opts.onClose) opts.onClose(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    form.showError = (m) => { err.textContent = m || ''; err.hidden = !m; };
    form.close = close;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.showError('');
      if (!form.checkValidity()) {
        const bad = form.querySelector(':invalid');
        form.showError('Preencha os campos obrigatórios destacados.');
        if (bad) { bad.classList.add('touched'); bad.focus(); }
        return;
      }
      const data = Object.fromEntries(new FormData(form).entries());
      form.querySelectorAll('input[type=checkbox][name]').forEach((c) => { data[c.name] = c.checked; });
      if (opts.onSubmit(data, form) !== false) close();
    });
    if (opts.onOpen) opts.onOpen(form);
    const first = form.querySelector('[autofocus], input:not([type=hidden]):not([type=checkbox]):not([readonly]), textarea');
    if (first) setTimeout(() => first.focus(), 40);
    return form;
  }

  function confirm(message, { title = 'Confirmar', okLabel = 'Excluir', danger = true } = {}) {
    return new Promise((resolve) => {
      let ok = false;
      const f = modal({ title, size: 'sm', body: `<p class="confirm-text">${message}</p>`, submitLabel: okLabel, onSubmit: () => { ok = true; }, onClose: () => resolve(ok) });
      if (danger) f.querySelector('[type=submit]').classList.add('btn-danger');
    });
  }

  function prompt(title, { label = 'Nome', value = '', submitLabel = 'Salvar' } = {}) {
    return new Promise((resolve) => {
      let result = null;
      modal({
        title, size: 'sm', submitLabel,
        body: `<label class="field">${U.esc(label)}<input name="value" required maxlength="160" value="${U.esc(value)}"></label>`,
        onSubmit: (d, f) => { if (!d.value.trim()) { f.showError('Informe um nome.'); return false; } result = d.value.trim(); },
        onClose: () => resolve(result),
      });
    });
  }

  let toastTimer;
  function toast(msg, kind = '') {
    const el = document.getElementById('toast');
    el.textContent = msg; el.className = `toast ${kind}`; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
  }

  function menu(x, y, items) {
    const m = document.getElementById('ctx-menu');
    m.innerHTML = items.map((it, i) => (it.divider ? '<div class="ctx-divider"></div>'
      : `<button type="button" data-i="${i}" class="${it.danger ? 'danger' : ''}">${it.icon ? icon(it.icon, 16) : '<span class="ic-sp"></span>'}<span>${U.esc(it.label)}</span></button>`)).join('');
    m.hidden = false;
    const r = m.getBoundingClientRect();
    m.style.left = `${Math.max(8, Math.min(x, innerWidth - r.width - 8))}px`;
    m.style.top = `${Math.max(8, Math.min(y, innerHeight - r.height - 8))}px`;
    m.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { hideMenu(); items[+b.dataset.i].action(); }));
  }
  function menuAt(el, items) { const r = el.getBoundingClientRect(); menu(r.right - 220, r.bottom + 4, items); }
  function hideMenu() { const m = document.getElementById('ctx-menu'); if (m) m.hidden = true; }
  document.addEventListener('mousedown', (e) => { if (!e.target.closest('#ctx-menu')) hideMenu(); });
  window.addEventListener('blur', hideMenu);
  window.addEventListener('resize', hideMenu);

  function download(filename, data, type = 'application/json') {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
  }
  function safeName(s) { return String(s || 'arquivo').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim(); }

  /* ---------- tema claro / escuro ---------- */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.innerHTML = `${icon(t === 'dark' ? 'sun' : 'moon', 17)}<span class="lbl">${t === 'dark' ? 'Claro' : 'Escuro'}</span>`;
      b.title = t === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro';
    });
  }
  function toggleTheme() {
    const t = Store.settings.theme === 'dark' ? 'light' : 'dark';
    Store.settings.theme = t;
    Store.save();
    applyTheme(t);
  }

  /* <option>s de pastas de um setor */
  function folderOptions(sectorId, selected, exclude) {
    if (Z.ws && Z.ws.sectorId === sectorId) {
      // dentro do sistema: a raiz é a subpasta escolhida
      const root = Z.ws;
      const sel = selected || root.id;
      const out = [`<option value="${root.id}" ${sel === root.id ? 'selected' : ''}>📂 ${U.esc(root.name)} (raiz)</option>`];
      const walk = (pid, depth) => Store.childFolders(sectorId, pid).forEach((f) => {
        if (exclude && exclude.has(f.id)) return;
        out.push(`<option value="${f.id}" ${f.id === sel ? 'selected' : ''}>${'\u00a0\u00a0\u00a0\u00a0'.repeat(depth)}📁 ${U.esc(f.name)}</option>`);
        walk(f.id, depth + 1);
      });
      walk(root.id, 1);
      return out.join('');
    }
    const out = [`<option value="" ${!selected ? 'selected' : ''}>Raiz do setor</option>`];
    const walk = (pid, depth) => Store.childFolders(sectorId, pid).forEach((f) => {
      if (exclude && exclude.has(f.id)) return;
      out.push(`<option value="${f.id}" ${f.id === selected ? 'selected' : ''}>${'    '.repeat(depth)}📁 ${U.esc(f.name)}</option>`);
      walk(f.id, depth + 1);
    });
    walk(null, 1);
    return out.join('');
  }

  function codeChip(code, { small = false } = {}) {
    const c = Store.CODES[code]; if (!c) return '';
    return `<span class="code-chip ${small ? 'sm' : ''}" style="--bg:${c.color};--ink:${c.ink}">${code}</span>`;
  }
  function sitBadge(sit) {
    return `<span class="sit-badge" style="--c:${C.SIT_COLOR[sit] || '#888'}"><i></i>${U.esc(sit)}</span>`;
  }
  function progress(pct) {
    if (pct == null) return '<span class="muted">—</span>';
    const w = Math.min(100, pct);
    const cls = pct >= 100 ? 'ok' : pct > 0 ? 'mid' : 'zero';
    return `<span class="prog ${cls}"><span class="prog-bar"><i style="width:${w}%"></i></span><b>${U.pct(pct)}</b></span>`;
  }

  /** ícone do setor: imagem enviada ou emoji */
  function sectorIcon(sector) {
    if (sector && sector.image) return `<img class="sector-img" src="${sector.image}" alt="">`;
    return U.esc((sector && sector.icon) || '🏭');
  }

  /** lê uma imagem e reduz para no máximo `max` px (salva como dataURL leve) */
  function readImage(file, max = 160) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('Escolha um arquivo de imagem (PNG, JPG, SVG…).')); return; }
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida.'));
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/png'));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  window.UI = { sectorIcon, readImage, icon, modal, confirm, prompt, toast, menu, menuAt, hideMenu, download, safeName, applyTheme, toggleTheme, folderOptions, codeChip, sitBadge, progress };
})();
