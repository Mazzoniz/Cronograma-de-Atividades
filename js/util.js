/* Zeit — utilidades: datas, semanas ISO (KW), formatação e HTML */
(function () {
  const pad = (n) => String(n).padStart(2, '0');
  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const WEEKDAYS_1 = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const U = {
    pad, MONTHS, MONTHS_SHORT, WEEKDAYS, WEEKDAYS_1,

    uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5); },
    esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    /* ---------- datas (horário local, ISO yyyy-mm-dd) ---------- */
    parse(iso) { if (!iso) return null; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d || 1); },
    iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    today() { return U.iso(new Date()); },
    addDays(iso, n) { const d = U.parse(iso); d.setDate(d.getDate() + n); return U.iso(d); },
    days(startIso, endIso) {
      const out = [];
      if (!startIso || !endIso || endIso < startIso) return out;
      let d = startIso;
      while (d <= endIso) { out.push(d); d = U.addDays(d, 1); }
      return out;
    },
    diffDays(a, b) { return Math.round((U.parse(b) - U.parse(a)) / 86400000); },
    dow(iso) { return U.parse(iso).getDay(); },
    isWeekend(iso) { const w = U.dow(iso); return w === 0 || w === 6; },
    fmt(iso) { const d = U.parse(iso); return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '—'; },
    fmtShort(iso) { const d = U.parse(iso); return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : '—'; },
    fmtDateTime(s) {
      if (!s) return '—';
      const d = new Date(s);
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    monthOf(iso) { return Number(iso.slice(5, 7)) - 1; },
    yearOf(iso) { return Number(iso.slice(0, 4)); },

    /* ---------- semana ISO (KW = Kalenderwoche) ---------- */
    isoWeek(iso) {
      const d = U.parse(iso);
      const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const day = t.getUTCDay() || 7;
      t.setUTCDate(t.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
      return { year: t.getUTCFullYear(), week: Math.ceil(((t - yearStart) / 86400000 + 1) / 7) };
    },
    weeksInYear(year) { return U.isoWeek(`${year}-12-28`).week; },
    /** Segunda-feira da semana ISO */
    kwMonday(year, week) {
      const jan4 = new Date(year, 0, 4);
      const day = jan4.getDay() || 7;
      const mon = new Date(year, 0, 4 - day + 1 + (week - 1) * 7);
      return U.iso(mon);
    },
    kwLabel(week) { return `KW${pad(week)}`; },
    kwKey(year, week) { return year * 100 + week; },

    /* ---------- números ---------- */
    num(n, digits = 1) { return (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits }); },
    hours(n) { return `${U.num(n)}h`; },
    pct(n) { return `${(Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`; },
    clamp(v, a, b) { return Math.min(b, Math.max(a, v)); },
    plural(n, one, many) { return `${U.num(n, 0)} ${n === 1 ? one : many}`; },
    initials(name) { return String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase(); },
    norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); },
    debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },
    sum(arr, f = (x) => x) { return arr.reduce((t, x) => t + (Number(f(x)) || 0), 0); },
  };

  window.U = U;
})();
