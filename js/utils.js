/* Utilidades gerais: datas, formatação e helpers de HTML */
(function () {
  const pad = (n) => String(n).padStart(2, '0');

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const U = {
    pad,
    MONTHS,
    MONTHS_SHORT,

    uid() {
      return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
    },

    esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
      ));
    },

    /* ---------- Datas (sempre em horário local, formato ISO yyyy-mm-dd) ---------- */
    parse(iso) {
      if (!iso) return null;
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d || 1);
    },
    iso(d) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },
    today() {
      return U.iso(new Date());
    },
    fmt(iso) {
      const d = U.parse(iso);
      return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '—';
    },
    fmtShort(iso) {
      const d = U.parse(iso);
      return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : '—';
    },
    addDays(d, n) {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    },
    isWeekend(d) {
      const w = d.getDay();
      return w === 0 || w === 6;
    },
    /** Lista de dias úteis (seg–sex) entre duas datas ISO, inclusive. */
    workdays(startIso, endIso) {
      const out = [];
      if (!startIso || !endIso || endIso < startIso) return out;
      let d = U.parse(startIso);
      const end = U.parse(endIso);
      while (d <= end) {
        if (!U.isWeekend(d)) out.push(U.iso(d));
        d = U.addDays(d, 1);
      }
      return out;
    },
    countWorkdays(startIso, endIso) {
      return U.workdays(startIso, endIso).length;
    },
    /** Dias corridos entre duas datas ISO, inclusive. */
    countDays(startIso, endIso) {
      if (!startIso || !endIso || endIso < startIso) return 0;
      return Math.round((U.parse(endIso) - U.parse(startIso)) / 86400000) + 1;
    },
    nextWorkday(iso) {
      let d = U.parse(iso);
      while (U.isWeekend(d)) d = U.addDays(d, 1);
      return U.iso(d);
    },
    /** Data em que termina uma tarefa de n dias úteis iniciando em startIso (startIso conta como dia 1). */
    addWorkdays(startIso, n) {
      let d = U.parse(U.nextWorkday(startIso));
      let c = 1;
      while (c < n) {
        d = U.addDays(d, 1);
        if (!U.isWeekend(d)) c++;
      }
      return U.iso(d);
    },
    weekStart(iso) {
      const d = U.parse(iso);
      const w = (d.getDay() + 6) % 7; // segunda = 0
      return U.iso(U.addDays(d, -w));
    },

    /* ---------- Meses / período ---------- */
    monthLabel(ym, long) {
      if (!ym) return '—';
      const [y, m] = ym.split('-').map(Number);
      return `${(long ? MONTHS : MONTHS_SHORT)[m - 1]}/${y}`;
    },
    monthsBetween(startYm, endYm) {
      const out = [];
      if (!startYm || !endYm) return out;
      let [y, m] = startYm.split('-').map(Number);
      const [ey, em] = endYm.split('-').map(Number);
      while (y < ey || (y === ey && m <= em)) {
        out.push(`${y}-${pad(m)}`);
        m++;
        if (m > 12) { m = 1; y++; }
      }
      return out;
    },
    monthEnd(ym) {
      const [y, m] = ym.split('-').map(Number);
      return U.iso(new Date(y, m, 0));
    },
    periodLabel(s) {
      if (!s) return '';
      return s.startMonth === s.endMonth
        ? U.monthLabel(s.startMonth, true)
        : `${U.monthLabel(s.startMonth)} – ${U.monthLabel(s.endMonth)}`;
    },

    /* ---------- Números ---------- */
    num(n, digits = 1) {
      const v = Number(n) || 0;
      return v.toLocaleString('pt-BR', { maximumFractionDigits: digits });
    },
    hours(n) {
      return `${U.num(n)}h`;
    },
    pct(n) {
      return `${Math.round(Number(n) || 0)}%`;
    },
    clamp(v, a, b) {
      return Math.min(b, Math.max(a, v));
    },
    plural(n, one, many) {
      return `${n} ${n === 1 ? one : many}`;
    },
    initials(name) {
      return String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    },
  };

  window.U = U;
})();
