/* Cálculos do cronograma: duração, capacidade, carga de horas e progresso */
(function () {
  const STATUS = {
    pendente: { label: 'Pendente', color: '#8a8986', icon: '○' },
    em_andamento: { label: 'Em andamento', color: '#2a78d6', icon: '◐' },
    concluida: { label: 'Concluída', color: '#0ca30c', icon: '✓' },
    bloqueada: { label: 'Bloqueada', color: '#ec835a', icon: '⏸' },
    atrasada: { label: 'Atrasada', color: '#d03b3b', icon: '!' },
  };
  const PRIORITY = {
    alta: { label: 'Alta', order: 0 },
    media: { label: 'Média', order: 1 },
    baixa: { label: 'Baixa', order: 2 },
  };

  const C = {
    STATUS,
    PRIORITY,

    period(s) {
      return { start: `${s.startMonth}-01`, end: U.monthEnd(s.endMonth) };
    },
    periodWorkdays(s) {
      const p = C.period(s);
      return U.countWorkdays(p.start, p.end);
    },
    person(s, id) {
      return s.people.find((p) => p.id === id) || null;
    },

    activityWorkdays(a) {
      return U.countWorkdays(a.start, a.end);
    },
    /** Dias úteis necessários para concluir as horas, conforme a jornada do responsável. */
    daysNeeded(s, a) {
      const p = C.person(s, a.personId);
      const perDay = p && p.hoursPerDay > 0 ? p.hoursPerDay : 8;
      return Math.max(1, Math.ceil((Number(a.hours) || 0) / perDay));
    },
    isLate(a) {
      return a.status !== 'concluida' && a.end && a.end < U.today();
    },
    effectiveStatus(a) {
      return C.isLate(a) ? 'atrasada' : a.status;
    },
    progress(a) {
      if (a.status === 'concluida') return 100;
      const h = Number(a.hours) || 0;
      if (!h) return 0;
      return U.clamp(((Number(a.doneHours) || 0) / h) * 100, 0, 100);
    },
    outOfPeriod(s, a) {
      const p = C.period(s);
      return (a.start && a.start < p.start) || (a.end && a.end > p.end);
    },

    /** Distribui as horas de cada atividade igualmente entre seus dias úteis.
     *  Retorna { [personId|'_none']: { [isoDate]: horas } } */
    dailyLoad(s) {
      const load = {};
      s.activities.forEach((a) => {
        const days = U.workdays(a.start, a.end);
        if (!days.length) return;
        const per = (Number(a.hours) || 0) / days.length;
        const key = a.personId || '_none';
        load[key] = load[key] || {};
        days.forEach((d) => { load[key][d] = (load[key][d] || 0) + per; });
      });
      return load;
    },

    /** Agrupamentos de tempo para a matriz de horas (mês ou semana), limitados ao período. */
    buckets(s, mode) {
      const p = C.period(s);
      if (mode === 'semana') {
        const out = [];
        let ws = U.weekStart(p.start);
        while (ws <= p.end) {
          const we = U.iso(U.addDays(U.parse(ws), 6));
          const start = ws < p.start ? p.start : ws;
          const end = we > p.end ? p.end : we;
          out.push({ key: ws, label: `${U.fmtShort(start)}`, sub: `a ${U.fmtShort(end)}`, start, end });
          ws = U.iso(U.addDays(U.parse(ws), 7));
        }
        return out;
      }
      return U.monthsBetween(s.startMonth, s.endMonth).map((ym) => ({
        key: ym, label: U.monthLabel(ym), sub: '', start: `${ym}-01`, end: U.monthEnd(ym),
      }));
    },

    sumLoad(dayMap, start, end) {
      let t = 0;
      if (!dayMap) return 0;
      Object.keys(dayMap).forEach((d) => { if (d >= start && d <= end) t += dayMap[d]; });
      return t;
    },

    personStats(s, p) {
      const acts = s.activities.filter((a) => a.personId === p.id);
      const capacity = (Number(p.hoursPerDay) || 0) * C.periodWorkdays(s);
      const planned = acts.reduce((t, a) => t + (Number(a.hours) || 0), 0);
      const done = acts.reduce((t, a) => t + (Number(a.doneHours) || 0), 0);
      return {
        acts, capacity, planned, done,
        utilization: capacity ? (planned / capacity) * 100 : 0,
        daysNeeded: p.hoursPerDay > 0 ? Math.ceil(planned / p.hoursPerDay) : 0,
      };
    },

    /** Dias em que o responsável tem mais horas alocadas que sua jornada. */
    overloadDays(s, p, load) {
      const map = load[p.id] || {};
      return Object.keys(map).filter((d) => map[d] > (Number(p.hoursPerDay) || 0) + 0.01).sort();
    },

    stats(s) {
      const acts = s.activities;
      const planned = acts.reduce((t, a) => t + (Number(a.hours) || 0), 0);
      const done = acts.reduce((t, a) => t + Math.min(Number(a.doneHours) || 0, Number(a.hours) || Infinity), 0);
      const weighted = planned
        ? acts.reduce((t, a) => t + C.progress(a) * (Number(a.hours) || 0), 0) / planned
        : (acts.length ? acts.reduce((t, a) => t + C.progress(a), 0) / acts.length : 0);
      const starts = acts.map((a) => a.start).filter(Boolean).sort();
      const ends = acts.map((a) => a.end).filter(Boolean).sort();
      const first = starts[0] || null;
      const last = ends[ends.length - 1] || null;
      const byStatus = {};
      Object.keys(STATUS).forEach((k) => { byStatus[k] = 0; });
      acts.forEach((a) => { byStatus[C.effectiveStatus(a)]++; });
      const capacity = s.people.reduce((t, p) => t + (Number(p.hoursPerDay) || 0), 0) * C.periodWorkdays(s);
      const remainingHours = acts.reduce((t, a) => (a.status === 'concluida' ? t
        : t + Math.max(0, (Number(a.hours) || 0) - (Number(a.doneHours) || 0))), 0);
      const today = U.today();
      const remainingDays = last ? U.countWorkdays(today > first ? today : first, last) : 0;
      return {
        count: acts.length,
        doneCount: acts.filter((a) => a.status === 'concluida').length,
        lateCount: byStatus.atrasada,
        planned, done, progress: weighted,
        first, last,
        spanWorkdays: first && last ? U.countWorkdays(first, last) : 0,
        spanDays: first && last ? U.countDays(first, last) : 0,
        remainingDays,
        remainingHours,
        byStatus,
        capacity,
        utilization: capacity ? (planned / capacity) * 100 : 0,
        unassigned: acts.filter((a) => !C.person(s, a.personId)).length,
      };
    },
  };

  window.C = C;
})();
