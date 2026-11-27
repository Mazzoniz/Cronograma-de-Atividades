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

  /* ---------- exemplo inicial (baseado na planilha Carnaval KW08) ---------- */
  function seed() {
    const now = new Date().toISOString();
    const sManut = U.uid(), sArm = U.uid(), sMont = U.uid(), sEst = U.uid();
    const f2026 = U.uid(), f2025 = U.uid();
    const mk = (description, supplier, responsible, situation, hoursPerDay, plan, real, extra = {}) => ({
      id: U.uid(), description, supplier, responsible, situation, fullDay: true, hoursPerDay,
      menEnabled: false, men: 1, note: '',
      plan: Object.fromEntries(plan.map((d) => [d, { c: 'PL' }])),
      real: Object.fromEntries(real.map(([d, c]) => [d, { c }])),
      ...extra,
    });
    const D = (n) => `2026-02-${U.pad(n)}`;
    const carnaval = {
      id: U.uid(), sectorId: sManut, folderId: f2026,
      title: 'Carnaval - KW 08 - 2026', description: 'Exemplo importado da planilha de Carnaval.',
      start: { year: 2026, week: 7 }, end: { year: 2026, week: 8 },
      holidays: [D(16), D(17)],
      createdAt: now, updatedAt: now,
      activities: [
        mk('Manutenção Preventiva Sistema Proteção contra Incêndio ESTA CO2', 'Minimax', 'J. Coelho', 'Concluído', 8, [D(16), D(17)], [[D(16), 'R'], [D(17), 'R']]),
        mk('Adequar Infraestrutura Redes Ar Comprimido Utilidades', 'Tech Chiller', 'R. Macedo', 'Realizado', 8,
          [D(15), D(16), D(17), D(18), D(19), D(20)], [[D(15), 'R'], [D(16), 'R'], [D(17), 'N'], [D(18), 'R'], [D(19), 'R'], [D(20), 'R']], { menEnabled: true, men: 3 }),
        mk('Desligamento rede Ar Comprimido 7/9 bar e 12 bar (18:00 às 06:00)', 'In Haus', 'R. Macedo', 'Concluído', 3, [D(15), D(16)], [[D(15), 'R'], [D(16), 'R']]),
        mk('Adequar Tubulação Água Resfriada CP01', 'Tech Chiller', 'R. Macedo', 'Postergado', 8, [D(15), D(16)], [[D(15), 'PO'], [D(16), 'PO']],
          { note: 'Serviço postergado: aguardando peças do fornecedor.' }),
        mk('Desligar rede Água Gelada', 'In Haus', 'R. Macedo', 'Concluído', 4, [D(15)], [[D(15), 'R']]),
        mk('Troca de válvulas de Água Gelada', 'In Haus', 'M. Novellino', 'Concluído', 8, [D(15)], [[D(15), 'R']], { menEnabled: true, men: 2 }),
        mk('Barramento Bufferizado - Armação Painel NS coluna D11 (desligamento após 15 hs)', 'In Haus', 'R. Macedo', 'Concluído', 8, [D(14)], [[D(14), 'R']]),
        mk('Manutenção CP03 Corretiva', 'Air Power', 'R. Macedo', 'Concluído', 8, [D(16), D(17)], [[D(16), 'R'], [D(17), 'R'], [D(18), 'R']]),
        mk('Adequar Infraestrutura Redes Ar Comprimido VW Eixos (elétrica)', 'Tech Chiller', 'R. Macedo', 'Concluído', 8, [D(14), D(16), D(17)], [[D(14), 'R'], [D(16), 'R'], [D(17), 'R']]),
        mk('Relatório Ambiental Declaração de Carga Poluidora', 'VW', 'A. Espinosa', 'Concluído', 8, [D(14)], [[D(14), 'R']]),
      ],
    };
    const ferias = {
      id: U.uid(), sectorId: sManut, folderId: f2026,
      title: 'Férias Coletivas - KW 50 a 02 - 2026/2027', description: 'Cronograma ainda sem datas definidas — marque os dias conforme forem programados.',
      start: { year: 2026, week: 50 }, end: { year: 2027, week: 2 },
      holidays: ['2026-12-24', '2026-12-25', '2026-12-31', '2027-01-01'],
      createdAt: now, updatedAt: now,
      activities: [
        mk('Análise de vibração 30 AHUs', 'Predponta', 'L. Arruda', 'auto', 8, ['2026-12-21', '2026-12-22', '2026-12-23'], []),
        mk('Roof-Tops Cêra e Bloco-B. Manutenção', 'Tech-Chiller', 'Diego', 'auto', 8, ['2026-12-28', '2026-12-29'], [], { menEnabled: true, men: 4 }),
        mk('Troca das telhas da Pintura-A e prolongar duto de exaustão', 'In-Haus', 'Fernando', 'auto', 8, [], []),
      ],
    };
    return {
      version: 1,
      settings: { theme: 'light', opHoursPerDay: 24, defaultHours: 8 },
      sectors: [
        { id: sManut, name: 'Manutenção Site', description: 'Preventiva, Corretiva, Preditiva', icon: '🔧', people: [
          { id: U.uid(), name: 'R. Macedo', role: 'Técnico' }, { id: U.uid(), name: 'J. Coelho', role: 'Técnico' },
          { id: U.uid(), name: 'M. Novellino', role: 'Técnico' }, { id: U.uid(), name: 'A. Espinosa', role: 'Meio ambiente' },
        ] },
        { id: sArm, name: 'Armação', description: 'Estruturas, Soldas, Ferragens', icon: '🏗️', people: [] },
        { id: sMont, name: 'Montagem', description: 'Linha de Produção, Assemblagem', icon: '🔩', people: [] },
        { id: sEst, name: 'Estamparia', description: 'Prensas, Moldes, Conformação', icon: '⚡', people: [] },
      ],
      folders: [
        { id: f2026, sectorId: sManut, parentId: null, name: '2026', createdAt: now },
        { id: f2025, sectorId: sManut, parentId: null, name: '2025', createdAt: now },
      ],
      schedules: [carnaval, ferias],
      failures: [
        { id: U.uid(), sectorId: sManut, equipment: 'Compressor CP03', start: '2026-10-06T08:00', end: '2026-10-06T11:30', description: 'Falha no pressostato', type: 'Mecânica' },
        { id: U.uid(), sectorId: sManut, equipment: 'Chiller 02', start: '2026-10-19T14:00', end: '2026-10-19T16:00', description: 'Alarme de alta pressão', type: 'Elétrica' },
        { id: U.uid(), sectorId: sManut, equipment: 'Compressor CP03', start: '2026-11-03T06:30', end: '2026-11-03T08:00', description: 'Vazamento na linha', type: 'Mecânica' },
        { id: U.uid(), sectorId: sManut, equipment: 'AHU-009', start: '2026-11-12T10:00', end: '2026-11-12T13:00', description: 'Correia rompida', type: 'Mecânica' },
      ],
    };
  }

  function migrate(s) {
    s.settings = Object.assign({ theme: 'light', opHoursPerDay: 24, defaultHours: 8 }, s.settings || {});
    s.sectors = s.sectors || []; s.folders = s.folders || []; s.schedules = s.schedules || []; s.failures = s.failures || [];
    s.sectors.forEach((x) => { x.people = x.people || []; });
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
      const na = /^\d{4}$/.test(a.name), nb = /^\d{4}$/.test(b.name);
      if (na && nb) return b.name.localeCompare(a.name);
      if (na !== nb) return na ? -1 : 1;
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
    target = target || null;
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
      id: U.uid(), sectorId: data.sectorId, folderId: data.folderId || null,
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
  const failuresOf = (sectorId) => state.failures.filter((f) => f.sectorId === sectorId).sort((a, b) => b.start.localeCompare(a.start));
  function saveFailure(data) {
    const ex = state.failures.find((f) => f.id === data.id);
    if (ex) Object.assign(ex, data); else state.failures.push({ ...data, id: U.uid() });
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
