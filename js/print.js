/* Zeit — versões para impressão (letra grande, grade para preencher à mão) */
(function () {
  const SIZES = { normal: { pt: 11, day: 8, desc: 52 }, grande: { pt: 13, day: 9, desc: 58 }, extra: { pt: 15, day: 10.5, desc: 64 } };

  function dialog(s, { mode = 'filled' } = {}) {
    const pref = JSON.parse(localStorage.getItem('zeit:print') || '{}');
    UI.modal({
      title: 'Imprimir cronograma', size: 'md', submitLabel: 'Imprimir',
      body: `
        <p class="muted"><b>${U.esc(s.title)}</b> — ${U.esc(C.periodLabel(s))}</p>
        <div class="field">O que imprimir
          <div class="radio-cards">
            <label><input type="radio" name="mode" value="filled" ${mode === 'filled' ? 'checked' : ''}><span><b>Preenchido</b><small>Como está no sistema, com planejado e realizado.</small></span></label>
            <label><input type="radio" name="mode" value="blank" ${mode === 'blank' ? 'checked' : ''}><span><b>Para preencher</b><small>Mantém o planejado e deixa a linha <b>Real.</b> em branco para marcar à mão.</small></span></label>
            <label><input type="radio" name="mode" value="empty" ${mode === 'empty' ? 'checked' : ''}><span><b>Em branco</b><small>Só as atividades e a grade de dias, sem nenhuma marcação (quando as datas ainda não são conhecidas).</small></span></label>
          </div>
        </div>
        <div class="grid-2">
          <label class="field">Tamanho da letra<select name="size">
            <option value="normal" ${pref.size === 'normal' ? 'selected' : ''}>Normal (11 pt)</option>
            <option value="grande" ${!pref.size || pref.size === 'grande' ? 'selected' : ''}>Grande (13 pt)</option>
            <option value="extra" ${pref.size === 'extra' ? 'selected' : ''}>Extra grande (15 pt)</option></select></label>
          <label class="field">Linhas extras em branco <span class="opt">(para atividades novas)</span><input name="extra" type="number" min="0" max="30" value="${pref.extra ?? 3}"></label>
        </div>
        <div class="field">Colunas
          <div class="check-row">
            <label class="check"><input type="checkbox" name="cSup" ${pref.cSup !== false ? 'checked' : ''}> Fornecedor</label>
            <label class="check"><input type="checkbox" name="cSit" ${pref.cSit !== false ? 'checked' : ''}> Situação <span class="opt">(só no preenchido)</span></label>
            <label class="check"><input type="checkbox" name="cProg" ${pref.cProg !== false ? 'checked' : ''}> Progresso <span class="opt">(só no preenchido)</span></label>
            <label class="check"><input type="checkbox" name="weekends" ${pref.weekends !== false ? 'checked' : ''}> Sábados e domingos</label>
          </div>
        </div>
        <p class="hint">Quando os dias não cabem em uma folha (A4 deitada), a grade é dividida em mais folhas, quebrando nas semanas (KW). Dica: na janela de impressão, escolha "Salvar como PDF" para gerar o arquivo.</p>`,
      onSubmit(d) {
        const opts = { mode: d.mode, size: d.size, extra: Math.max(0, Math.min(30, +d.extra || 0)), cSup: d.cSup, cSit: d.cSit, cProg: d.cProg, weekends: d.weekends };
        localStorage.setItem('zeit:print', JSON.stringify(opts));
        printSchedule(s, opts);
      },
    });
  }

  function pageChunks(days, perPage) {
    if (days.length <= perPage) return [days];
    const pages = []; let cur = [];
    // quebra preferindo o fim de uma semana
    days.forEach((d) => {
      cur.push(d);
      if (cur.length >= perPage) {
        let cut = cur.length;
        for (let i = cur.length - 1; i > cur.length / 2; i--) { if (U.dow(cur[i]) === 0 || (U.dow(cur[i]) === 5 && !cur.some((x) => U.isWeekend(x)))) { cut = i + 1; break; } }
        pages.push(cur.slice(0, cut)); cur = cur.slice(cut);
      }
    });
    if (cur.length) pages.push(cur);
    return pages;
  }

  function printSchedule(s, o) {
    const sz = SIZES[o.size] || SIZES.grande;
    const hol = new Set(s.holidays);
    let days = C.days(s);
    if (!o.weekends) days = days.filter((d) => !U.isWeekend(d) || hol.has(d));
    // larguras em mm (A4 paisagem: 277mm úteis)
    // nas versões para preencher, Situação e Progresso ficariam vazias: escondemos para sobrar espaço para os dias
    if (o.mode !== 'filled') { o = { ...o, cSit: false, cProg: false }; }
    const fixed = { n: 9, desc: sz.desc, sup: o.cSup ? 22 : 0, resp: 22, sit: o.cSit ? 21 : 0, pr: 11, h: 12, prog: o.cProg ? 15 : 0 };
    const fixedSum = Object.values(fixed).reduce((a, b) => a + b, 0);
    const perPage = Math.max(5, Math.floor((277 - fixedSum) / sz.day));
    const pages = pageChunks(days, perPage);
    const showReal = o.mode === 'filled';
    const showPlan = o.mode !== 'empty';

    const legend = `<div class="p-legend">${Object.entries(Store.CODES).map(([c, v]) => `<span><i style="background:${v.color};color:${v.ink}">${c}</i>${v.label}</span>`).join('')}<span><i style="background:${Store.HOLIDAY_COLOR}"></i>Feriado / parada</span></div>`;

    const html = pages.map((pd, pi) => {
      const months = []; const weeks = [];
      pd.forEach((d) => {
        const mk = d.slice(0, 7); if (!months.length || months[months.length - 1].k !== mk) months.push({ k: mk, d, n: 0 }); months[months.length - 1].n++;
        const w = U.isoWeek(d).week; if (!weeks.length || weeks[weeks.length - 1].w !== w) weeks.push({ w, n: 0 }); weeks[weeks.length - 1].n++;
      });
      const cell = (a, row, d) => {
        const m = a && a[row][d];
        const show = m && ((row === 'plan' && showPlan) || (row === 'real' && showReal));
        if (!show) return `<td class="pd ${hol.has(d) ? 'hol' : U.isWeekend(d) ? 'we' : ''}"></td>`;
        const c = Store.CODES[m.c];
        return `<td class="pd mk" style="background:${c.color};color:${c.ink}">${a.fullDay ? m.c : `${m.c}<small>${U.num(C.cellHours(a, m))}</small>`}</td>`;
      };
      const rows = s.activities.map((a, i) => {
        const p = C.planHours(a), r = C.realHours(a);
        return `<tr class="p-plan">
            <td rowspan="2" class="pn">${i + 1}</td>
            <td rowspan="2" class="pdesc">${U.esc(a.description)}${a.menEnabled ? `<span class="p-men">Homens: ${C.men(a)}</span>` : ''}${a.note && o.mode === 'filled' ? `<span class="p-note">Obs.: ${U.esc(a.note)}</span>` : ''}</td>
            ${o.cSup ? `<td rowspan="2">${U.esc(a.supplier)}</td>` : ''}
            <td rowspan="2">${U.esc(a.responsible)}</td>
            ${o.cSit ? `<td rowspan="2">${o.mode === 'filled' ? U.esc(C.situation(a)) : ''}</td>` : ''}
            <td class="ppr">Plan.</td><td class="ph">${showPlan ? U.num(p) : ''}</td>
            ${pd.map((d) => cell(a, 'plan', d)).join('')}
            ${o.cProg ? `<td rowspan="2" class="pprog">${o.mode === 'filled' && C.progress(a) != null ? U.pct(C.progress(a)) : ''}</td>` : ''}
          </tr>
          <tr class="p-real"><td class="ppr">Real.</td><td class="ph">${showReal ? U.num(r) : ''}</td>${pd.map((d) => cell(a, 'real', d)).join('')}</tr>`;
      }).join('') + Array.from({ length: o.extra }, (_, j) => `
          <tr class="p-plan"><td rowspan="2" class="pn">${s.activities.length + j + 1}</td><td rowspan="2" class="pdesc"></td>${o.cSup ? '<td rowspan="2"></td>' : ''}<td rowspan="2"></td>${o.cSit ? '<td rowspan="2"></td>' : ''}
            <td class="ppr">Plan.</td><td class="ph"></td>${pd.map((d) => cell(null, 'plan', d)).join('')}${o.cProg ? '<td rowspan="2"></td>' : ''}</tr>
          <tr class="p-real"><td class="ppr">Real.</td><td class="ph"></td>${pd.map((d) => cell(null, 'real', d)).join('')}</tr>`).join('');
      return `<section class="p-page">
        <header class="p-head">
          <div><h1>${U.esc(s.title)}</h1><p>${U.esc(Store.sector(s.sectorId).name)} · ${U.esc(C.periodLabel(s))}${pages.length > 1 ? ` · folha ${pi + 1} de ${pages.length} (${U.fmtShort(pd[0])} a ${U.fmtShort(pd[pd.length - 1])})` : ''}</p></div>
          <div class="p-upd">${o.mode === 'filled' ? `ATUALIZADO EM ${U.fmt(s.updatedAt.slice(0, 10))}` : 'PREENCHIDO EM ____/____/______'}<span>Zeit</span></div>
        </header>
        <table class="p-grid" style="font-size:${sz.pt}pt">
          <colgroup><col style="width:${fixed.n}mm"><col style="width:${fixed.desc}mm">${o.cSup ? `<col style="width:${fixed.sup}mm">` : ''}<col style="width:${fixed.resp}mm">${o.cSit ? `<col style="width:${fixed.sit}mm">` : ''}<col style="width:${fixed.pr}mm"><col style="width:${fixed.h}mm">${pd.map(() => `<col style="width:${sz.day}mm">`).join('')}${o.cProg ? `<col style="width:${fixed.prog}mm">` : ''}</colgroup>
          <thead>
            <tr><th rowspan="3">N°</th><th rowspan="3">Descrição da ação</th>${o.cSup ? '<th rowspan="3">Fornec.</th>' : ''}<th rowspan="3">Resp.</th>${o.cSit ? '<th rowspan="3">Situação</th>' : ''}<th rowspan="3">P/R</th><th rowspan="3">Horas</th>
              ${months.map((m) => `<th colspan="${m.n}">${m.n >= 3 ? U.MONTHS[U.monthOf(m.d)] : U.MONTHS_SHORT[U.monthOf(m.d)]}</th>`).join('')}${o.cProg ? '<th rowspan="3">Progr.</th>' : ''}</tr>
            <tr>${weeks.map((w) => `<th colspan="${w.n}">${w.n >= 2 ? U.kwLabel(w.w) : w.w}</th>`).join('')}</tr>
            <tr>${pd.map((d) => `<th class="pday ${hol.has(d) ? 'hol' : U.isWeekend(d) ? 'we' : ''}">${U.parse(d).getDate()}<small>${U.WEEKDAYS_1[U.dow(d)]}</small></th>`).join('')}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <footer class="p-foot">${legend}<div class="p-sign"><span>Responsável: ______________________________</span><span>Visto: ____________________</span></div></footer>
      </section>`;
    }).join('');
    run(html);
  }

  function sectorSummary(sector) {
    const list = C.sectorSchedules(sector.id).sort((a, b) => Store.schedStart(a).localeCompare(Store.schedStart(b)));
    const st = C.stats(list.flatMap((s) => s.activities));
    const html = `<section class="p-page p-report">
      <header class="p-head"><div><h1>Resumo de cronogramas — ${U.esc(sector.name)}</h1><p>Gerado em ${U.fmtDateTime(new Date().toISOString())}</p></div><div class="p-upd"><span>Zeit</span></div></header>
      <div class="p-kpis"><div><small>Cronogramas</small><b>${list.length}</b></div><div><small>Atividades</small><b>${st.count}</b></div><div><small>Horas plan.</small><b>${U.hours(st.plan)}</b></div><div><small>Horas real.</small><b>${U.hours(st.real)}</b></div><div><small>HH real.</small><b>${U.num(st.realHH)}</b></div><div><small>Progresso</small><b>${st.progress == null ? '—' : U.pct(st.progress)}</b></div></div>
      <table class="p-table"><thead><tr><th>Cronograma</th><th>Período</th><th>Ativ.</th><th>Concl.</th><th>Poster.</th><th>Plan.</th><th>Real.</th><th>HH real.</th><th>Progresso</th></tr></thead>
      <tbody>${list.map((s) => { const x = C.stats(s.activities); return `<tr><td>${U.esc(s.title)}</td><td>${U.esc(C.periodLabel(s))}</td><td>${x.count}</td><td>${x.done}</td><td>${x.postponed}</td><td>${U.hours(x.plan)}</td><td>${U.hours(x.real)}</td><td>${U.num(x.realHH)}</td><td>${x.progress == null ? '—' : U.pct(x.progress)}</td></tr>`; }).join('')}</tbody></table>
    </section>`;
    run(html);
  }

  function run(html) {
    const root = document.getElementById('print-root');
    root.innerHTML = html;
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 80);
  }

  window.Print = { dialog, printSchedule, sectorSummary };
})();
