/* Zeit — camada de dados.
 * Hoje salva no localStorage do navegador. Toda leitura/escrita passa por aqui,
 * para que no futuro seja trocada por uma API ligada ao banco da intranet. */
(function () {
  const KEY = 'zeit:v1';
  let state = null;
  const listeners = new Set();

  /* ---------- códigos da grade (legenda) ---------- */
  const CODES = {
    PL: { label: 'Planejado', color: '#2f5597', ink: '#ffffff' },
    R: { label: 'Realizado', color: '#00b050', ink: '#ffffff' },
    P: { label: 'Parada', color: '#333f50', ink: '#ffffff' },
    A: { label: 'Atraso', color: '#bf8f00', ink: '#ffffff' },
    PE: { label: 'Pendente', color: '#ffff00', ink: '#1b1b1b' },
    C: { label: 'Concluído', color: '#8eaadb', ink: '#1b1b1b' },
    N: { label: 'Cancelado', color: '#ff0000', ink: '#ffffff' },
    PO: { label: 'Postergado', color: '#aeaaaa', ink: '#1b1b1b' },
  };
  const HOLIDAY_COLOR = '#ffc000';

  const SITUATIONS = ['Planejado', 'Em andamento', 'Realizado', 'Concluído', 'Pendente', 'Atrasado', 'Parada', 'Postergado', 'Cancelado'];

  const SECTOR_ICONS = ['🔧', '🏗️', '🔩', '⚡', '🏭', '🛠️', '⚙️', '🔌', '🧰', '🚚', '🧪', '📦'];

  /* ---------- dados iniciais: planilhas reais de exemplos/ (js/seed-data.js) ---------- */
  function seed() {
    const now = new Date().toISOString();
    const sManut = U.uid(), sArm = U.uid(), sMont = U.uid(), sEst = U.uid();
    const ws2026 = U.uid(), ws2025 = U.uid();
    const fromSeed = (key, folderId) => {
      const d = (window.ZEIT_SEED || {})[key];
      if (!d) return null;
      return {
        id: U.uid(), sectorId: sManut, folderId, title: d.title, description: `Importado de ${d.file}`,
        start: d.start, end: d.end, holidays: d.holidays || [], createdAt: now, updatedAt: now,
        activities: d.activities.map((a) => ({ ...a, id: U.uid() })),
      };
    };
    const schedules = [fromSeed('carnaval', ws2026), fromSeed('ferias', ws2026)].filter(Boolean);
    return {
      version: 2,
      settings: { theme: 'light', opHoursPerDay: 24, defaultHours: 8 },
      sectors: [
        { id: sManut, name: 'Manutenção Site', description: 'Preventiva, Corretiva, Preditiva', icon: '🔧', image: null, people: [] },
        { id: sArm, name: 'Armação', description: 'Estruturas, Soldas, Ferragens', icon: '🏗️', image: null, people: [] },
        { id: sMont, name: 'Montagem', description: 'Linha de Produção, Assemblagem', icon: '🔩', image: null, people: [] },
        { id: sEst, name: 'Estamparia', description: 'Prensas, Moldes, Conformação', icon: '⚡', image: null, people: [] },
      ],
      folders: [
        { id: ws2026, sectorId: sManut, parentId: null, name: 'Paradas 2026', description: 'Feriados, Carnaval e férias coletivas', createdAt: now },
        { id: ws2025, sectorId: sManut, parentId: null, name: 'Paradas 2025', description: '', createdAt: now },
      ],
      schedules,
      failures: [
        { id: U.uid(), sectorId: sManut, wsId: ws2026, equipment: 'Compressor CP03', start: '2026-10-06T08:00', end: '2026-10-06T11:30', description: 'Exemplo — falha no pressostato', type: 'Mecânica' },
        { id: U.uid(), sectorId: sManut, wsId: ws2026, equipment: 'Chiller 02', start: '2026-10-19T14:00', end: '2026-10-19T16:00', description: 'Exemplo — alarme de alta pressão', type: 'Elétrica' },
      ],
    };
  }

  function migrate(s) {
    s.settings = Object.assign({ theme: 'light', opHoursPerDay: 24, defaultHours: 8 }, s.settings || {});
    s.sectors = s.sectors || []; s.folders = s.folders || []; s.schedules = s.schedules || []; s.failures = s.failures || [];
    s.sectors.forEach((x) => { x.people = x.people || []; });
    // cronogramas soltos na raiz do setor vão para a subpasta "Geral"
    s.schedules.filter((sc) => !sc.folderId).forEach((sc) => {
      let g = s.folders.find((f) => f.sectorId === sc.sectorId && !f.parentId && f.name === 'Geral');
      if (!g) { g = { id: U.uid(), sectorId: sc.sectorId, parentId: null, name: 'Geral', description: '', createdAt: new Date().toISOString() }; s.folders.push(g); }
      sc.folderId = g.id;
    });
    s.schedules.forEach((sc) => {
      sc.holidays = sc.holidays || [];
      sc.activities = sc.activities || [];
      sc.activities.forEach((a) => { a.plan = a.plan || {}; a.real = a.real || {}; });
    });
    return s;
  }

  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    if (!state || !Array.isArray(state.sectors)) { state = seed(); persist(); }
    migrate(state);
    return state;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error(e); alert('Não foi possível salvar: armazenamento do navegador cheio.'); }
  }
  function save() { persist(); listeners.forEach((fn) => fn()); }

  /* ---------- setores ---------- */
  const sector = (id) => state.sectors.find((s) => s.id === id) || null;
  function createSector(data) {
    const s = { id: U.uid(), name: data.name.trim(), description: (data.description || '').trim(), icon: data.icon || '🏭', people: [] };
    state.sectors.push(s); save(); return s;
  }
  function deleteSector(id) {
    state.sectors = state.sectors.filter((s) => s.id !== id);
    state.folders = state.folders.filter((f) => f.sectorId !== id);
    state.schedules = state.schedules.filter((s) => s.sectorId !== id);
    state.failures = state.failures.filter((f) => f.sectorId !== id);
    save();
  }

  /* ---------- pastas ---------- */
  const folder = (id) => state.folders.find((f) => f.id === id) || null;
  const childFolders = (sectorId, parentId) => state.folders
    .filter((f) => f.sectorId === sectorId && (f.parentId || null) === (parentId || null))
    .sort((a, b) => {
      // pastas com nome de ano (2026, 2025…) aparecem da mais recente para a mais antiga
      const ya = (a.name.match(/\b(19|20)\d{2}\b/) || [])[0], yb = (b.name.match(/\b(19|20)\d{2}\b/) || [])[0];
      if (ya && yb && ya !== yb) return yb.localeCompare(ya);
      if (!!ya !== !!yb) return ya ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR', { numeric: true });
    });
  const schedulesIn = (sectorId, folderId) => state.schedules
    .filter((s) => s.sectorId === sectorId && (s.folderId || null) === (folderId || null))
    .sort((a, b) => schedStart(a).localeCompare(schedStart(b)));
  function folderPath(id) {
    const path = []; const guard = new Set(); let f = folder(id);
    while (f && !guard.has(f.id)) { guard.add(f.id); path.unshift(f); f = folder(f.parentId); }
    return path;
  }
  function descendantFolderIds(id) {
    const out = new Set([id]); let added = true;
    while (added) {
      added = false;
      state.folders.forEach((f) => { if (f.parentId && out.has(f.parentId) && !out.has(f.id)) { out.add(f.id); added = true; } });
    }
    return out;
  }
  function createFolder(sectorId, name, parentId) {
    const f = { id: U.uid(), sectorId, parentId: parentId || null, name: name.trim(), createdAt: new Date().toISOString() };
    state.folders.push(f); save(); return f;
  }
  function deleteFolder(id) {
    const ids = descendantFolderIds(id);
    state.folders = state.folders.filter((f) => !ids.has(f.id));
    state.schedules = state.schedules.filter((s) => !ids.has(s.folderId));
    save();
  }
  function countInside(id) {
    const ids = descendantFolderIds(id);
    return { folders: ids.size - 1, schedules: state.schedules.filter((s) => ids.has(s.folderId)).length };
  }
  function move(kind, id, target) {
    target = target || Z.rootId();
    if (kind === 'folder') {
      if (target && descendantFolderIds(id).has(target)) return false;
      const f = folder(id); if (!f || f.parentId === target) return false; f.parentId = target;
    } else {
      const s = schedule(id); if (!s || s.folderId === target) return false; s.folderId = target;
    }
    save(); return true;
  }

  /* ---------- cronogramas ---------- */
  const schedule = (id) => state.schedules.find((s) => s.id === id) || null;
  const schedStart = (s) => U.kwMonday(s.start.year, s.start.week);
  const schedEnd = (s) => U.addDays(U.kwMonday(s.end.year, s.end.week), 6);
  function createSchedule(data) {
    const now = new Date().toISOString();
    const s = {
      id: U.uid(), sectorId: data.sectorId, folderId: data.folderId || Z.rootId(),
      title: data.title.trim(), description: (data.description || '').trim(),
      start: data.start, end: data.end, holidays: data.holidays || [],
      createdAt: now, updatedAt: now, activities: data.activities || [],
    };
    state.schedules.push(s); save(); return s;
  }
  function touch(s) { s.updatedAt = new Date().toISOString(); save(); }
  function deleteSchedule(id) { state.schedules = state.schedules.filter((s) => s.id !== id); save(); }
  function duplicateSchedule(id, { keepMarks = false } = {}) {
    const src = schedule(id); if (!src) return null;
    const c = JSON.parse(JSON.stringify(src));
    c.id = U.uid(); c.title = `${src.title} (cópia)`; c.createdAt = c.updatedAt = new Date().toISOString();
    c.activities.forEach((a) => { a.id = U.uid(); if (!keepMarks) a.real = {}; });
    state.schedules.push(c); save(); return c;
  }
  function newActivity(defaults = {}) {
    return {
      id: U.uid(), description: '', supplier: '', responsible: '', situation: 'auto',
      fullDay: true, hoursPerDay: state.settings.defaultHours || 8, menEnabled: false, men: 1, note: '',
      plan: {}, real: {}, ...defaults,
    };
  }

  /* ---------- ocorrências (falhas) ---------- */
  const failuresOf = (sectorId) => state.failures.filter((f) => f.sectorId === sectorId && (!Z.ws || !f.wsId || f.wsId === Z.ws.id)).sort((a, b) => b.start.localeCompare(a.start));
  function saveFailure(data) {
    const ex = state.failures.find((f) => f.id === data.id);
    if (ex) Object.assign(ex, data); else state.failures.push({ ...data, id: U.uid(), wsId: Z.ws ? Z.ws.id : null });
    save();
  }
  function deleteFailure(id) { state.failures = state.failures.filter((f) => f.id !== id); save(); }

  /* ---------- backup ---------- */
  const exportJSON = () => JSON.stringify(state, null, 2);
  function importJSON(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.sectors) || !Array.isArray(d.schedules)) throw new Error('Arquivo inválido: não é um backup do Zeit.');
    state = migrate(d); save();
  }

  window.Store = {
    CODES, HOLIDAY_COLOR, SITUATIONS, SECTOR_ICONS,
    load, save, onChange: (fn) => listeners.add(fn),
    get state() { return state; },
    get settings() { return state.settings; },
    sector, createSector, deleteSector,
    folder, childFolders, schedulesIn, folderPath, descendantFolderIds, createFolder, deleteFolder, countInside, move,
    schedule, schedStart, schedEnd, createSchedule, touch, deleteSchedule, duplicateSchedule, newActivity,
    failuresOf, saveFailure, deleteFailure,
    exportJSON, importJSON,
  };
})();
