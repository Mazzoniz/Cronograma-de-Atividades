/* Zeit — Todas Atividades, Kanban, Gantt, Timeline e Calendário */
(function () {
  const openAct = (s, a) => ScheduleView.activityForm(s, a);

  /* ================= Todas as atividades ================= */
  const af = { q: '', sit: '', resp: '', sched: '' };
  function activities(sector) {
    const el = Shell.render(sector, 'atividades', { title: 'Todas as atividades' });
    const all = C.sectorActivities(sector.id);
    const resps = [...new Set(all.flatMap(({ a }) => C.responsibles(a)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const draw = () => {
      const q = U.norm(af.q);
      const list = all.filter(({ a, s }) => (!q || U.norm(`${a.description} ${a.supplier} ${a.responsible} ${a.note}`).includes(q))
        && (!af.sit || C.situation(a) === af.sit) && (!af.resp || C.responsibles(a).includes(af.resp)) && (!af.sched || s.id === af.sched))
        .sort((x, y) => Store.schedStart(y.s).localeCompare(Store.schedStart(x.s)) || x.s.activities.indexOf(x.a) - y.s.activities.indexOf(y.a));
      const st = C.stats(list.map((x) => x.a));
      el.querySelector('#at-body').innerHTML = list.map(({ a, s }) => `
        <tr data-s="${s.id}" data-a="${a.id}" class="clickable">
          <td class="num">${s.activities.indexOf(a) + 1}</td>
          <td class="wrap"><b>${U.esc(a.description)}</b>${a.note ? `<div class="note-line">${UI.icon('note', 13)} ${U.esc(a.note)}</div>` : ''}</td>
          <td class="wrap muted">${U.esc(s.title)}</td>
          <td>${U.esc(a.supplier)}</td><td>${U.esc(a.responsible)}</td>
          <td>${UI.sitBadge(C.situation(a))}</td>
          <td class="num">${U.hours(C.planHours(a))}</td><td class="num">${U.hours(C.realHours(a))}</td>
          <td class="num">${a.menEnabled ? `${C.men(a)} × → ${U.num(C.realHH(a))}` : '—'}</td>
          <td>${UI.progress(C.progress(a))}</td>
        </tr>`).join('') || '<tr><td colspan="10" class="center muted">Nenhuma atividade encontrada.</td></tr>';
      el.querySelector('#at-foot').innerHTML = `<tr><td colspan="6">${U.plural(st.count, 'atividade', 'atividades')}</td><td class="num">${U.hours(st.plan)}</td><td class="num">${U.hours(st.real)}</td><td class="num">${U.num(st.realHH)} HH</td><td>${UI.progress(st.progress)}</td></tr>`;
      el.querySelectorAll('tr[data-a]').forEach((tr) => tr.addEventListener('click', () => {
        const s = Store.schedule(tr.dataset.s); openAct(s, s.activities.find((a) => a.id === tr.dataset.a));
      }));
    };
    el.innerHTML = `
      <div class="toolbar wrap">
        <div class="search-box">${UI.icon('search', 16)}<input type="search" id="at-q" placeholder="Buscar descrição, fornecedor, observação…" value="${U.esc(af.q)}"></div>
        ${Shell.scheduleSelect(sector.id, af.sched, { id: 'at-sched' })}
        <select id="at-sit" class="select-inline"><option value="">Todas as situações</option>${Object.keys(C.SIT_COLOR).map((k) => `<option ${af.sit === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
        <select id="at-resp" class="select-inline"><option value="">Todos os responsáveis</option>${resps.map((r) => `<option ${af.resp === r ? 'selected' : ''}>${U.esc(r)}</option>`).join('')}</select>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th class="num">N°</th><th>Descrição da ação</th><th>Cronograma</th><th>Fornecedor</th><th>Resp.</th><th>Situação</th><th class="num">Plan.</th><th class="num">Real.</th><th class="num">Homens / HH</th><th>Progresso</th></tr></thead>
        <tbody id="at-body"></tbody><tfoot id="at-foot"></tfoot></table></div>`;
    draw();
    el.querySelector('#at-q').addEventListener('input', U.debounce((e) => { af.q = e.target.value; draw(); }, 150));
    el.querySelector('#at-sched').addEventListener('change', (e) => { af.sched = e.target.value; draw(); });
    el.querySelector('#at-sit').addEventListener('change', (e) => { af.sit = e.target.value; draw(); });
    el.querySelector('#at-resp').addEventListener('change', (e) => { af.resp = e.target.value; draw(); });
  }

  /* ================= Kanban ================= */
  const KCOLS = ['Sem datas', 'Planejado', 'Pendente', 'Em andamento', 'Atrasado', 'Parada', 'Postergado', 'Concluído', 'Cancelado'];
  function kanban(sector) {
    const sel = sessionStorage.getItem('zeit:kanban') || '';
    const el = Shell.render(sector, 'kanban', { title: 'Kanban', actions: Shell.scheduleSelect(sector.id, sel, { id: 'kb-sched' }) });
    const items = C.sectorActivities(sector.id).filter(({ s }) => !sel || s.id === sel);
    const col = (sit) => (sit === 'Realizado' ? 'Concluído' : sit);
    el.classList.add('content-wide');
    el.innerHTML = `<p class="muted small tip-top">Arraste um cartão para mudar a situação. (Ao arrastar, a situação deixa de ser automática.)</p>
      <div class="kanban">${KCOLS.map((k) => {
        const cards = items.filter(({ a }) => col(C.situation(a)) === k);
        return `<section class="kcol" data-col="${k}">
          <header><i style="background:${C.SIT_COLOR[k]}"></i>${k}<span>${cards.length}</span></header>
          <div class="kcards">${cards.map(({ a, s }) => `
            <article class="kcard" draggable="true" data-s="${s.id}" data-a="${a.id}">
              <b>${U.esc(a.description)}</b>
              <span class="muted small">${U.esc(s.title)}</span>
              <div class="kmeta">${a.responsible ? `<span>${UI.icon('team', 13)} ${U.esc(a.responsible)}</span>` : ''}<span>${UI.icon('clock', 13)} ${U.num(C.realHours(a))}/${U.num(C.planHours(a))}h</span>${a.menEnabled ? `<span>${UI.icon('users', 13)} ${C.men(a)}</span>` : ''}${a.note ? `<span title="${U.esc(a.note)}">${UI.icon('note', 13)}</span>` : ''}</div>
            </article>`).join('')}</div>
        </section>`;
      }).join('')}</div>`;
    document.getElementById('kb-sched').addEventListener('change', (e) => { sessionStorage.setItem('zeit:kanban', e.target.value); kanban(sector); });
    el.querySelectorAll('.kcard').forEach((c) => {
      c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', `${c.dataset.s}|${c.dataset.a}`); c.classList.add('dragging'); });
      c.addEventListener('dragend', () => c.classList.remove('dragging'));
      c.addEventListener('click', () => { const s = Store.schedule(c.dataset.s); openAct(s, s.activities.find((a) => a.id === c.dataset.a)); });
    });
    el.querySelectorAll('.kcol').forEach((k) => {
      k.addEventListener('dragover', (e) => { e.preventDefault(); k.classList.add('drop-over'); });
      k.addEventListener('dragleave', () => k.classList.remove('drop-over'));
      k.addEventListener('drop', (e) => {
        e.preventDefault(); k.classList.remove('drop-over');
        const [sid, aid] = e.dataTransfer.getData('text/plain').split('|');
        const s = Store.schedule(sid); const a = s && s.activities.find((x) => x.id === aid);
        if (!a) return;
        a.situation = k.dataset.col === 'Sem datas' ? 'auto' : k.dataset.col;
        Store.touch(s);
      });
    });
  }

  /* ================= Gantt ================= */
  function gantt(sector) {
    const sel = sessionStorage.getItem('zeit:gantt') || '';
    const s = sel ? Store.schedule(sel) : null;
    const el = Shell.render(sector, 'gantt', { title: 'Diagrama de Gantt', actions: Shell.scheduleSelect(sector.id, s ? s.id : '', { id: 'gt-sched' }) });
    el.classList.add('content-wide');
    let rows, start, end;
    if (s) {
      start = Store.schedStart(s); end = Store.schedEnd(s);
      rows = s.activities.map((a, i) => {
        const pd = Object.keys(a.plan).filter((d) => a.plan[d].c === 'PL').sort();
        const rd = Object.keys(a.real).filter((d) => a.real[d].c === 'R').sort();
        return { label: `${i + 1}. ${a.description}`, sub: a.responsible, plan: pd, real: rd, all: C.markedDays(a), color: '#2f5597', sit: C.situation(a), onClick: () => openAct(s, a) };
      });
    } else {
      const list = C.sectorSchedules(sector.id).sort((a, b) => Store.schedStart(a).localeCompare(Store.schedStart(b)));
      const y = Number(sessionStorage.getItem('zeit:year')) || new Date().getFullYear();
      const inY = list.filter((x) => x.start.year === y || x.end.year === y);
      const use = inY.length ? inY : list;
      start = use.length ? Store.schedStart(use[0]) : `${y}-01-01`;
      end = use.length ? use.map(Store.schedEnd).sort().pop() : `${y}-12-31`;
      rows = use.map((x) => {
        const st = C.stats(x.activities);
        return { label: x.title, sub: `${U.num(st.real)}/${U.num(st.plan)}h`, range: [Store.schedStart(x), Store.schedEnd(x)], prog: st.progress, hol: x.holidays, onClick: () => { location.hash = `${Z.base()}/c/${x.id}`; } };
      });
    }
    const days = U.days(start, end);
    const dw = days.length <= 45 ? 30 : days.length <= 120 ? 14 : days.length <= 240 ? 6 : 3;
    const W = days.length * dw;
    const x = (d) => U.diffDays(start, d) * dw;
    const months = []; days.forEach((d) => { const k = d.slice(0, 7); if (!months.length || months[months.length - 1].k !== k) months.push({ k, d, n: 0 }); months[months.length - 1].n++; });
    const weeks = []; days.forEach((d) => { const w = U.isoWeek(d).week; if (!weeks.length || weeks[weeks.length - 1].w !== w) weeks.push({ w, n: 0 }); weeks[weeks.length - 1].n++; });
    const today = U.today();
    const segs = (list, cls) => {
      // agrupa dias consecutivos em barras
      const out = []; let cur = null;
      list.forEach((d) => { if (cur && U.diffDays(cur.e, d) === 1) cur.e = d; else { if (cur) out.push(cur); cur = { s: d, e: d }; } });
      if (cur) out.push(cur);
      return out.map((g) => `<i class="gb ${cls}" style="left:${x(g.s)}px;width:${(U.diffDays(g.s, g.e) + 1) * dw - 2}px"></i>`).join('');
    };
    const rowsHtml = rows.map((r, i) => `
      <div class="gr" data-i="${i}">
        <div class="gl"><b title="${U.esc(r.label)}">${U.esc(r.label)}</b><span>${U.esc(r.sub || '')}${r.sit ? ` · ${r.sit}` : ''}</span></div>
        <div class="gt" style="width:${W}px">
          ${r.range ? `<i class="gb sched" style="left:${x(r.range[0])}px;width:${(U.diffDays(r.range[0], r.range[1]) + 1) * dw - 2}px" data-tip="${U.esc(`<b>${r.label}</b><br>${U.fmt(r.range[0])} a ${U.fmt(r.range[1])}<br>Progresso: ${r.prog == null ? '—' : U.pct(r.prog)}`)}"><em style="width:${Math.min(100, r.prog || 0)}%"></em></i>` : ''}
          ${r.plan ? segs(r.plan, 'plan') + segs(r.real, 'real') : ''}
          ${r.plan && !r.plan.length && !r.real.length ? '<span class="g-empty">sem dias marcados</span>' : ''}
        </div>
      </div>`).join('');
    el.innerHTML = `
      ${s ? '' : '<p class="muted small tip-top">Mostrando os cronogramas do ano. Escolha um cronograma acima para ver as atividades.</p>'}
      <div class="gantt-wrap"><div class="gantt" style="--W:${W}px">
        <div class="gh">
          <div class="gl gl-head">${s ? 'Atividade' : 'Cronograma'}</div>
          <div class="gs" style="width:${W}px">
            <div class="gs-row">${months.map((m) => `<span style="width:${m.n * dw}px">${m.n * dw > 70 ? `${U.MONTHS[U.monthOf(m.d)]} ${U.yearOf(m.d)}` : U.MONTHS_SHORT[U.monthOf(m.d)]}</span>`).join('')}</div>
            <div class="gs-row kw">${weeks.map((w) => `<span style="width:${w.n * dw}px">${w.n * dw >= 30 ? U.kwLabel(w.w) : ''}</span>`).join('')}</div>
            ${dw >= 14 ? `<div class="gs-row dd">${days.map((d) => `<span style="width:${dw}px" class="${U.isWeekend(d) ? 'we' : ''}">${U.parse(d).getDate()}</span>`).join('')}</div>` : ''}
          </div>
        </div>
        <div class="gbody">
          <div class="gbg" style="width:${W}px">
            ${dw >= 6 ? days.map((d) => (U.isWeekend(d) ? `<i class="we" style="left:${x(d)}px;width:${dw}px"></i>` : '')).join('') : ''}
            ${(s ? s.holidays : []).map((d) => `<i class="hol" style="left:${x(d)}px;width:${dw}px"></i>`).join('')}
            ${today >= start && today <= end ? `<i class="today" style="left:${x(today) + dw / 2}px"></i>` : ''}
          </div>
          ${rowsHtml || '<div class="empty"><p class="muted">Nada para exibir.</p></div>'}
        </div>
      </div></div>
      ${s ? Charts.legend([{ name: 'Planejado (PL)', color: Store.CODES.PL.color }, { name: 'Realizado (R)', color: Store.CODES.R.color }, { name: 'Feriado / parada', color: Store.HOLIDAY_COLOR }]) : ''}`;
    el.querySelectorAll('.gr').forEach((r) => r.querySelector('.gl').addEventListener('click', () => rows[+r.dataset.i].onClick()));
    el.querySelectorAll('.gb.sched').forEach((b, i) => b.addEventListener('click', () => rows[i].onClick()));
    Charts.bindTips(el);
    // posiciona a rolagem perto de hoje (ou do primeiro cronograma futuro)
    const gw = el.querySelector('.gantt-wrap');
    const todayLine = el.querySelector('.gbg .today');
    if (gw && todayLine) requestAnimationFrame(() => { if (!gw.scrollLeft) gw.scrollLeft = Math.max(0, todayLine.offsetLeft - 260); });
    document.getElementById('gt-sched').addEventListener('change', (e) => { sessionStorage.setItem('zeit:gantt', e.target.value); gantt(sector); });
  }

  /* ================= Timeline ================= */
  function timeline(sector) {
    const el = Shell.render(sector, 'timeline', { title: 'Timeline' });
    const list = C.sectorSchedules(sector.id).sort((a, b) => Store.schedStart(b).localeCompare(Store.schedStart(a)));
    const today = U.today();
    let lastYear = null;
    el.innerHTML = list.length ? `<div class="timeline">${list.map((s) => {
      const st = C.stats(s.activities);
      const a = Store.schedStart(s), b = Store.schedEnd(s);
      const state = today < a ? 'Futuro' : today > b ? 'Encerrado' : 'Em andamento';
      const y = s.start.year;
      const yh = y !== lastYear ? `<div class="tl-year">${y}</div>` : ''; lastYear = y;
      return `${yh}<a class="tl-item ${state === 'Em andamento' ? 'now' : ''}" href="${Z.base()}/c/${s.id}">
        <div class="tl-dot"></div>
        <div class="tl-card">
          <div class="tl-top"><b>${U.esc(s.title)}</b><span class="state">${state}</span></div>
          <div class="muted">${U.esc(C.periodLabel(s))}</div>
          <div class="tl-stats"><span>${U.plural(st.count, 'atividade', 'atividades')}</span><span>${U.hours(st.real)} / ${U.hours(st.plan)}</span><span>${U.num(st.realHH)} HH</span>${st.postponed ? `<span>${st.postponed} postergadas</span>` : ''}</div>
          ${UI.progress(st.progress)}
        </div></a>`;
    }).join('')}</div>` : '<div class="empty"><p class="muted">Nenhum cronograma neste setor.</p></div>';
  }

  /* ================= Calendário ================= */
  function calendar(sector) {
    const ym = sessionStorage.getItem('zeit:cal') || U.today().slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    const el = Shell.render(sector, 'calendario', {
      title: 'Calendário',
      actions: `<div class="seg"><button id="cal-prev">${UI.icon('back', 16)}</button><button id="cal-today">Hoje</button><button id="cal-next">${UI.icon('chevron', 16)}</button></div>`,
    });
    const first = `${ym}-01`;
    const gridStart = U.addDays(first, -((U.dow(first) + 6) % 7));
    const days = U.days(gridStart, U.addDays(gridStart, 41));
    const byDay = {}; const hol = {};
    C.sectorSchedules(sector.id).forEach((s) => {
      s.holidays.forEach((d) => { (hol[d] = hol[d] || []).push(s.title); });
      s.activities.forEach((a) => {
        C.markedDays(a).forEach((d) => {
          const pc = a.plan[d], rc = a.real[d];
          (byDay[d] = byDay[d] || []).push({ a, s, code: rc ? rc.c : pc.c });
        });
      });
    });
    el.innerHTML = `
      <h2 class="cal-title">${U.MONTHS[m - 1]} ${y}</h2>
      <div class="cal">
        ${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => `<div class="cal-h">${d}</div>`).join('')}
        ${days.map((d) => {
          const list = byDay[d] || [];
          return `<div class="cal-d ${d.slice(0, 7) !== ym ? 'out' : ''} ${d === U.today() ? 'today' : ''} ${hol[d] ? 'hol' : ''}">
            <div class="cal-n"><b>${U.parse(d).getDate()}</b>${U.dow(d) === 1 ? `<small>${U.kwLabel(U.isoWeek(d).week)}</small>` : ''}</div>
            ${hol[d] ? `<div class="cal-hol" title="${U.esc(hol[d].join(', '))}">Feriado / parada</div>` : ''}
            ${list.slice(0, 3).map((x) => `<button class="cal-ev" style="--bg:${Store.CODES[x.code].color};--ink:${Store.CODES[x.code].ink}" data-s="${x.s.id}" data-a="${x.a.id}" title="${U.esc(`${x.a.description} — ${x.s.title}`)}"><b>${x.code}</b> ${U.esc(x.a.description)}</button>`).join('')}
            ${list.length > 3 ? `<span class="cal-more">+${list.length - 3} atividades</span>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    const go = (v) => { sessionStorage.setItem('zeit:cal', v); calendar(sector); };
    document.getElementById('cal-prev').addEventListener('click', () => go(m === 1 ? `${y - 1}-12` : `${y}-${U.pad(m - 1)}`));
    document.getElementById('cal-next').addEventListener('click', () => go(m === 12 ? `${y + 1}-01` : `${y}-${U.pad(m + 1)}`));
    document.getElementById('cal-today').addEventListener('click', () => go(U.today().slice(0, 7)));
    el.querySelectorAll('.cal-ev').forEach((b) => b.addEventListener('click', () => { const s = Store.schedule(b.dataset.s); openAct(s, s.activities.find((a) => a.id === b.dataset.a)); }));
  }

  window.Boards = { activities, kanban, gantt, timeline, calendar };
})();
