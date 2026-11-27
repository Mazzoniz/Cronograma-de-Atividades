/* Zeit — cálculos: horas, homem-hora, progresso, situação e indicadores industriais */
(function () {
  const SIT_COLOR = {
    'Planejado': '#2f5597', 'Em andamento': '#2b7bd6', 'Realizado': '#1baf7a', 'Concluído': '#00a046',
    'Pendente': '#d4b400', 'Atrasado': '#bf8f00', 'Parada': '#333f50', 'Postergado': '#8c8888',
    'Cancelado': '#e02424', 'Sem datas': '#9aa4b2',
  };
  const DONE = new Set(['Concluído', 'Realizado']);
  const CLOSED = new Set(['Concluído', 'Realizado', 'Cancelado']);

  const C = {
    SIT_COLOR, DONE, CLOSED,

    days(s) { return U.days(Store.schedStart(s), Store.schedEnd(s)); },
    periodLabel(s) {
      const a = Store.schedStart(s), b = Store.schedEnd(s);
      return `${U.kwLabel(s.start.week)}${s.start.year !== s.end.year || s.start.week !== s.end.week ? ` a ${U.kwLabel(s.end.week)}` : ''} · ${U.fmtShort(a)} a ${U.fmt(b)}`;
    },

    /* horas de uma célula (dia inteiro usa as horas/dia da atividade) */
    cellHours(a, cell) {
      if (!cell) return 0;
      if (a.fullDay) return Number(a.hoursPerDay) || 0;
      return cell.h != null ? Number(cell.h) || 0 : Number(a.hoursPerDay) || 0;
    },
    planHours(a) { return Object.values(a.plan || {}).reduce((t, c) => t + (c.c === 'PL' ? C.cellHours(a, c) : 0), 0); },
    realHours(a) { return Object.values(a.real || {}).reduce((t, c) => t + (c.c === 'R' ? C.cellHours(a, c) : 0), 0); },
    men(a) { return a.menEnabled ? Math.max(1, Number(a.men) || 1) : 1; },
    planHH(a) { return C.planHours(a) * C.men(a); },
    realHH(a) { return C.realHours(a) * C.men(a); },
    progress(a) {
      const p = C.planHours(a);
      if (!p) return null;
      return (C.realHours(a) / p) * 100;
    },
    planDays(a) { return Object.keys(a.plan || {}).filter((d) => a.plan[d].c === 'PL').sort(); },
    markedDays(a) { return [...new Set([...Object.keys(a.plan || {}), ...Object.keys(a.real || {})])].sort(); },

    autoSituation(a) {
      const real = Object.values(a.real || {}).map((c) => c.c);
      const plan = C.planHours(a), done = C.realHours(a);
      const has = (k) => real.includes(k);
      if (has('N') && !has('R')) return 'Cancelado';
      if (has('PO') && done < plan) return 'Postergado';
      if (plan > 0 && done >= plan) return 'Concluído';
      if (has('C')) return 'Concluído';
      if (has('P')) return 'Parada';
      if (has('A')) return 'Atrasado';
      if (done > 0) return 'Em andamento';
      if (has('PE')) return 'Pendente';
      const pd = C.planDays(a);
      if (!pd.length) return 'Sem datas';
      if (pd[0] < U.today()) return 'Atrasado';
      return 'Planejado';
    },
    situation(a) { return !a.situation || a.situation === 'auto' ? C.autoSituation(a) : a.situation; },

    stats(acts) {
      const st = {
        count: acts.length, plan: 0, real: 0, planHH: 0, realHH: 0, backlog: 0, backlogHH: 0,
        bySit: {}, done: 0, postponed: 0, cancelled: 0, noDates: 0, men: 0,
      };
      acts.forEach((a) => {
        const p = C.planHours(a), r = C.realHours(a), m = C.men(a), sit = C.situation(a);
        st.plan += p; st.real += r; st.planHH += p * m; st.realHH += r * m;
        st.bySit[sit] = (st.bySit[sit] || 0) + 1;
        if (DONE.has(sit)) st.done++;
        if (sit === 'Postergado') st.postponed++;
        if (sit === 'Cancelado') st.cancelled++;
        if (sit === 'Sem datas') st.noDates++;
        if (!CLOSED.has(sit)) { st.backlog += Math.max(0, p - r); st.backlogHH += Math.max(0, p - r) * m; }
        if (a.menEnabled) st.men += m;
      });
      st.progress = st.plan ? (st.real / st.plan) * 100 : null;
      // aderência ao plano: horas realizadas dentro do planejado (limitada a 100% por atividade)
      const adh = acts.reduce((t, a) => t + Math.min(C.realHours(a), C.planHours(a)), 0);
      st.adherence = st.plan ? (adh / st.plan) * 100 : null;
      st.completion = st.count ? (st.done / st.count) * 100 : null;
      return st;
    },

    sectorSchedules(sectorId) { return Store.state.schedules.filter((s) => s.sectorId === sectorId); },
    sectorActivities(sectorId) {
      const out = [];
      C.sectorSchedules(sectorId).forEach((s) => s.activities.forEach((a) => out.push({ a, s })));
      return out;
    },

    /* agrupa horas por chave (responsável, fornecedor, cronograma…) */
    groupBy(items, keyFn) {
      const m = new Map();
      items.forEach(({ a, s }) => {
        const keys = keyFn(a, s);
        (Array.isArray(keys) ? keys : [keys]).forEach((k) => {
          const key = (k || '').trim() || '(sem informação)';
          if (!m.has(key)) m.set(key, []);
          m.get(key).push(a);
        });
      });
      return [...m.entries()].map(([key, acts]) => ({ key, acts, ...C.stats(acts) }));
    },
    responsibles(a) { return String(a.responsible || '').split(/\s*[\/;,]\s*/).filter(Boolean); },

    /* horas por dia (planejadas e realizadas) em um conjunto de atividades */
    dailyHours(items) {
      const m = {};
      items.forEach(({ a }) => {
        Object.entries(a.plan || {}).forEach(([d, c]) => { if (c.c === 'PL') { m[d] = m[d] || { p: 0, r: 0 }; m[d].p += C.cellHours(a, c) * C.men(a); } });
        Object.entries(a.real || {}).forEach(([d, c]) => { if (c.c === 'R') { m[d] = m[d] || { p: 0, r: 0 }; m[d].r += C.cellHours(a, c) * C.men(a); } });
      });
      return m;
    },

    /* ---------- confiabilidade: MTBF, MTTR, disponibilidade ---------- */
    reliability(sectorId, fromIso, toIso, equipment) {
      const op = Store.settings.opHoursPerDay || 24;
      const totalHours = (U.diffDays(fromIso, toIso) + 1) * op;
      const list = Store.failuresOf(sectorId).filter((f) => f.start && f.start.slice(0, 10) >= fromIso && f.start.slice(0, 10) <= toIso
        && (!equipment || f.equipment === equipment));
      const down = list.reduce((t, f) => t + C.failureHours(f), 0);
      const n = list.length;
      const mtbf = n ? (totalHours - down) / n : null;
      const mttr = n ? down / n : null;
      const availability = totalHours ? ((totalHours - down) / totalHours) * 100 : null;
      return { n, down, totalHours, mtbf, mttr, availability, list };
    },
    failureHours(f) {
      if (!f.start || !f.end) return 0;
      return Math.max(0, (new Date(f.end) - new Date(f.start)) / 3600000);
    },
  };

  window.C = C;
})();
