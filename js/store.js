/* Armazenamento: pastas e cronogramas salvos no localStorage do navegador */
(function () {
  const KEY = 'cronograma-atividades:v1';

  /* Cores categóricas em ordem fixa (validadas para daltonismo) — uma por responsável */
  const PERSON_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

  let state = null;
  const listeners = new Set();

  function seed() {
    const f1 = U.uid(), f2 = U.uid(), f3 = U.uid();
    const ana = U.uid(), bruno = U.uid(), carla = U.uid();
    const now = new Date().toISOString();
    const act = (name, personId, start, end, hours, doneHours, status, priority, description = '') => ({
      id: U.uid(), name, description, personId, start, end, hours, doneHours, status, priority,
    });
    return {
      version: 1,
      folders: [
        { id: f1, name: 'Projetos 2026', parentId: null, createdAt: now },
        { id: f2, name: 'Marketing', parentId: f1, createdAt: now },
        { id: f3, name: 'Operações', parentId: null, createdAt: now },
      ],
      schedules: [
        {
          id: U.uid(),
          name: 'Lançamento do novo site',
          description: 'Cronograma de exemplo — fique à vontade para editar ou excluir.',
          folderId: f1,
          startMonth: '2026-11',
          endMonth: '2026-12',
          createdAt: now,
          updatedAt: now,
          people: [
            { id: ana, name: 'Ana Souza', role: 'Designer', hoursPerDay: 8, color: PERSON_COLORS[0] },
            { id: bruno, name: 'Bruno Lima', role: 'Desenvolvedor', hoursPerDay: 6, color: PERSON_COLORS[1] },
            { id: carla, name: 'Carla Mendes', role: 'Gerente de projeto', hoursPerDay: 4, color: PERSON_COLORS[2] },
          ],
          activities: [
            act('Levantamento de requisitos', carla, '2026-11-02', '2026-11-06', 20, 20, 'concluida', 'alta'),
            act('Wireframes', ana, '2026-11-05', '2026-11-13', 48, 40, 'em_andamento', 'alta'),
            act('Identidade visual', ana, '2026-11-16', '2026-11-27', 64, 10, 'em_andamento', 'media'),
            act('Configurar servidor e domínio', bruno, '2026-11-09', '2026-11-11', 12, 12, 'concluida', 'media'),
            act('Desenvolvimento do front-end', bruno, '2026-11-23', '2026-12-11', 90, 0, 'pendente', 'alta'),
            act('Conteúdo e textos', carla, '2026-11-30', '2026-12-09', 24, 0, 'pendente', 'baixa'),
            act('Testes e homologação', bruno, '2026-12-14', '2026-12-18', 30, 0, 'pendente', 'alta'),
            act('Publicação', carla, '2026-12-21', '2026-12-22', 8, 0, 'pendente', 'alta'),
          ],
        },
      ],
    };
  }

  function load() {
    try {
      state = JSON.parse(localStorage.getItem(KEY));
    } catch (e) {
      state = null;
    }
    if (!state || !Array.isArray(state.folders) || !Array.isArray(state.schedules)) {
      state = seed();
      persist();
    }
    return state;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Falha ao salvar', e);
    }
  }

  function save() {
    persist();
    listeners.forEach((fn) => fn());
  }

  /* ---------- Pastas ---------- */
  const folder = (id) => state.folders.find((f) => f.id === id) || null;
  const childFolders = (parentId) => state.folders
    .filter((f) => (f.parentId || null) === (parentId || null))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const schedulesIn = (folderId) => state.schedules
    .filter((s) => (s.folderId || null) === (folderId || null))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  function folderPath(id) {
    const path = [];
    let f = folder(id);
    const guard = new Set();
    while (f && !guard.has(f.id)) {
      guard.add(f.id);
      path.unshift(f);
      f = folder(f.parentId);
    }
    return path;
  }

  function descendantFolderIds(id) {
    const out = new Set([id]);
    let added = true;
    while (added) {
      added = false;
      state.folders.forEach((f) => {
        if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
          out.add(f.id);
          added = true;
        }
      });
    }
    return out;
  }

  function createFolder(name, parentId) {
    const f = { id: U.uid(), name: name.trim(), parentId: parentId || null, createdAt: new Date().toISOString() };
    state.folders.push(f);
    save();
    return f;
  }

  function renameFolder(id, name) {
    const f = folder(id);
    if (f) { f.name = name.trim(); save(); }
  }

  function deleteFolder(id) {
    const ids = descendantFolderIds(id);
    state.folders = state.folders.filter((f) => !ids.has(f.id));
    state.schedules = state.schedules.filter((s) => !ids.has(s.folderId));
    save();
  }

  function countInside(id) {
    const ids = descendantFolderIds(id);
    return {
      folders: ids.size - 1,
      schedules: state.schedules.filter((s) => ids.has(s.folderId)).length,
    };
  }

  /** Move pasta ou cronograma para outra pasta (null = raiz). */
  function move(kind, id, targetFolderId) {
    targetFolderId = targetFolderId || null;
    if (kind === 'folder') {
      if (targetFolderId && descendantFolderIds(id).has(targetFolderId)) return false;
      const f = folder(id);
      if (!f || f.parentId === targetFolderId) return false;
      f.parentId = targetFolderId;
    } else {
      const s = schedule(id);
      if (!s || s.folderId === targetFolderId) return false;
      s.folderId = targetFolderId;
    }
    save();
    return true;
  }

  /* ---------- Cronogramas ---------- */
  const schedule = (id) => state.schedules.find((s) => s.id === id) || null;

  function createSchedule({ name, description, folderId, startMonth, endMonth }) {
    const now = new Date().toISOString();
    const s = {
      id: U.uid(), name: name.trim(), description: (description || '').trim(),
      folderId: folderId || null, startMonth, endMonth,
      createdAt: now, updatedAt: now, people: [], activities: [],
    };
    state.schedules.push(s);
    save();
    return s;
  }

  function touch(s) {
    s.updatedAt = new Date().toISOString();
    save();
  }

  function deleteSchedule(id) {
    state.schedules = state.schedules.filter((s) => s.id !== id);
    save();
  }

  function duplicateSchedule(id) {
    const src = schedule(id);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    const idMap = {};
    copy.id = U.uid();
    copy.name = `${src.name} (cópia)`;
    copy.createdAt = copy.updatedAt = new Date().toISOString();
    copy.people.forEach((p) => { const n = U.uid(); idMap[p.id] = n; p.id = n; });
    copy.activities.forEach((a) => { a.id = U.uid(); a.personId = idMap[a.personId] || null; });
    state.schedules.push(copy);
    save();
    return copy;
  }

  function nextPersonColor(s) {
    const used = new Set(s.people.map((p) => p.color));
    return PERSON_COLORS.find((c) => !used.has(c)) || PERSON_COLORS[s.people.length % PERSON_COLORS.length];
  }

  /* ---------- Backup ---------- */
  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.folders) || !Array.isArray(data.schedules)) {
      throw new Error('Arquivo inválido: não parece um backup do Cronograma de Atividades.');
    }
    state = data;
    save();
  }

  window.Store = {
    PERSON_COLORS,
    load, save, onChange: (fn) => listeners.add(fn),
    get state() { return state; },
    folder, childFolders, schedulesIn, folderPath, descendantFolderIds,
    createFolder, renameFolder, deleteFolder, countInside, move,
    schedule, createSchedule, touch, deleteSchedule, duplicateSchedule, nextPersonColor,
    exportJSON, importJSON,
  };
})();
