/* Zeit — Relatórios e Configurações */
(function () {
  function reports(sector) {
    const el = Shell.render(sector, 'relatorios', { title: 'Relatórios' });
    const list = C.sectorSchedules(sector.id).sort((a, b) => Store.schedStart(b).localeCompare(Store.schedStart(a)));
    el.innerHTML = `
      <div class="cards-3">
        <section class="card action-card"><i>${UI.icon('print', 26)}</i><h3>Resumo do setor</h3><p class="muted">Todos os cronogramas com horas planejadas, realizadas, HH e progresso, pronto para imprimir ou salvar em PDF.</p>
          <button class="btn" id="r-summary">${UI.icon('print', 16)} Imprimir resumo</button></section>
        <section class="card action-card"><i>${UI.icon('download', 26)}</i><h3>Exportar Excel do setor</h3><p class="muted">Um arquivo .xlsx com uma aba por cronograma, no mesmo layout das planilhas (grade, cores e fórmulas).</p>
          <button class="btn" id="r-xls">${UI.icon('download', 16)} Exportar tudo</button></section>
        <section class="card action-card"><i>${UI.icon('list', 26)}</i><h3>Atividades em CSV</h3><p class="muted">Lista de todas as atividades do setor com horas e situação, para abrir no Excel ou no Power BI.</p>
          <button class="btn" id="r-csv">${UI.icon('download', 16)} Baixar CSV</button></section>
      </div>
      <section class="card"><h3>Cronogramas</h3>
        <div class="table-wrap flat"><table class="table">
          <thead><tr><th>Cronograma</th><th>Período</th><th class="num">Ativ.</th><th class="num">Real./Plan.</th><th class="no-wrap">Ações</th></tr></thead>
          <tbody>${list.map((s) => { const x = C.stats(s.activities); return `<tr>
            <td><a href="${Z.base()}/c/${s.id}"><b>${U.esc(s.title)}</b></a></td><td>${U.esc(C.periodLabel(s))}</td>
            <td class="num">${x.count}</td><td class="num">${U.hours(x.real)} / ${U.hours(x.plan)}</td>
            <td class="no-wrap"><button class="btn btn-sm" data-pf="${s.id}">${UI.icon('print', 15)} Preenchido</button>
              <button class="btn btn-sm" data-pb="${s.id}" title="Grade vazia na linha Real. para marcar à mão">${UI.icon('print', 15)} Para preencher</button>
              <button class="btn btn-sm" data-x="${s.id}">${UI.icon('download', 15)} Excel</button></td></tr>`; }).join('') || '<tr><td colspan="5" class="muted center">Nenhum cronograma.</td></tr>'}</tbody>
        </table></div></section>`;
    el.querySelector('#r-summary').addEventListener('click', () => Print.sectorSummary(sector));
    el.querySelector('#r-xls').addEventListener('click', () => Excel.exportSector(sector));
    el.querySelector('#r-csv').addEventListener('click', () => csv(sector));
    el.querySelectorAll('[data-pf]').forEach((b) => b.addEventListener('click', () => Print.dialog(Store.schedule(b.dataset.pf), { mode: 'filled' })));
    el.querySelectorAll('[data-pb]').forEach((b) => b.addEventListener('click', () => Print.dialog(Store.schedule(b.dataset.pb), { mode: 'blank' })));
    el.querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', () => Excel.exportSchedule(Store.schedule(b.dataset.x))));
  }

  function csv(sector) {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const n = (v) => String(Math.round((Number(v) || 0) * 100) / 100).replace('.', ',');
    const head = ['Cronograma', 'KW inicial', 'KW final', 'N°', 'Descrição da ação', 'Fornecedor', 'Resp.', 'Situação', 'Dia inteiro', 'Horas/dia', 'Homens', 'Horas plan.', 'Horas real.', 'HH plan.', 'HH real.', 'Progresso %', 'Primeiro dia', 'Último dia', 'Observação'];
    const rows = [];
    C.sectorSchedules(sector.id).forEach((s) => s.activities.forEach((a, i) => {
      const days = C.markedDays(a); const pr = C.progress(a);
      rows.push([s.title, `${U.kwLabel(s.start.week)}/${s.start.year}`, `${U.kwLabel(s.end.week)}/${s.end.year}`, i + 1, a.description, a.supplier, a.responsible, C.situation(a),
        a.fullDay ? 'Sim' : 'Não', n(a.hoursPerDay), C.men(a), n(C.planHours(a)), n(C.realHours(a)), n(C.planHH(a)), n(C.realHH(a)), pr == null ? '' : n(pr),
        days[0] ? U.fmt(days[0]) : '', days.length ? U.fmt(days[days.length - 1]) : '', a.note].map(q).join(';'));
    }));
    UI.download(`Zeit - ${UI.safeName(sector.name)} - atividades.csv`, '﻿' + [head.map(q).join(';'), ...rows].join('\r\n'), 'text/csv;charset=utf-8');
  }

  function settings(sector) {
    const el = Shell.render(sector, 'configuracoes', { title: 'Configurações' });
    const st = Store.settings;
    el.innerHTML = `
      <div class="cards-2">
        <section class="card"><h3>Setor</h3>
          <div class="set-row"><span class="sector-ico lg">${UI.sectorIcon(sector)}</span><div><b>${U.esc(sector.name)}</b><div class="muted">${U.esc(sector.description || '')}</div></div>
            <button class="btn push" id="c-sector">${UI.icon('edit', 16)} Editar</button></div>
        </section>
        <section class="card"><h3>Aparência</h3>
          <div class="set-row"><div><b>Tema</b><div class="muted">Claro ou escuro (também no botão do topo).</div></div>
            <div class="seg push"><button data-th="light" class="${st.theme !== 'dark' ? 'on' : ''}">${UI.icon('sun', 16)} Claro</button><button data-th="dark" class="${st.theme === 'dark' ? 'on' : ''}">${UI.icon('moon', 16)} Escuro</button></div></div>
        </section>
      </div>
      <section class="card"><h3>Padrões de cálculo</h3>
        <form id="c-form" class="grid-3">
          <label class="field">Horas de um dia (padrão para novas atividades)<input name="defaultHours" type="number" min="0.5" max="24" step="0.5" value="${st.defaultHours}"></label>
          <label class="field">Horas de operação por dia (base do MTBF / disponibilidade)<input name="opHoursPerDay" type="number" min="1" max="24" step="0.5" value="${st.opHoursPerDay}"></label>
          <div class="field"><span>&nbsp;</span><button class="btn btn-primary" type="submit">Salvar</button></div>
        </form>
      </section>
      <section class="card"><h3>Legenda da grade</h3>
        <div class="legend-grid">${Object.entries(Store.CODES).map(([k, v]) => `<div>${UI.codeChip(k)}<span>${v.label} (${k})</span></div>`).join('')}
          <div><span class="code-chip" style="--bg:${Store.HOLIDAY_COLOR};--ink:#1b1b1b">&nbsp;</span><span>Feriado / parada (dia destacado)</span></div></div>
        <p class="muted small">Horas planejadas somam os dias <b>PL</b>; horas realizadas somam os dias <b>R</b> — igual às fórmulas das planilhas (CONT.SE × horas).</p>
      </section>
      <div class="cards-2">
        <section class="card"><h3>Importar planilhas</h3><p class="muted">Traga os arquivos .xlsx existentes (layout "MANUTENÇÃO SITE") para esta subpasta. Cada arquivo vira um cronograma.</p>
          <button class="btn" id="c-import">${UI.icon('upload', 16)} Importar .xlsx</button></section>
        <section class="card"><h3>Backup</h3><p class="muted">Os dados ficam neste navegador. Baixe um backup para guardar ou levar a outro computador.</p>
          <div class="btn-row"><button class="btn" id="c-exp">${UI.icon('download', 16)} Baixar backup</button><button class="btn" id="c-imp">${UI.icon('upload', 16)} Restaurar backup</button></div>
          <input type="file" id="c-file" accept=".json,application/json" hidden></section>
      </div>`;
    el.querySelector('#c-sector').addEventListener('click', () => Home.sectorForm(sector));
    el.querySelectorAll('[data-th]').forEach((b) => b.addEventListener('click', () => { if (Store.settings.theme !== b.dataset.th) UI.toggleTheme(); settings(sector); }));
    el.querySelector('#c-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target).entries());
      st.defaultHours = +d.defaultHours || 8; st.opHoursPerDay = +d.opHoursPerDay || 24; Store.save(); UI.toast('Configurações salvas');
    });
    el.querySelector('#c-import').addEventListener('click', () => Excel.importDialog(sector.id, Z.rootId()));
    el.querySelector('#c-exp').addEventListener('click', () => UI.download(`Zeit-backup-${U.today()}.json`, Store.exportJSON()));
    const file = el.querySelector('#c-file');
    el.querySelector('#c-imp').addEventListener('click', async () => {
      if (await UI.confirm('Restaurar um backup <b>substitui todos os dados</b> deste navegador. Continuar?', { title: 'Restaurar backup', okLabel: 'Escolher arquivo', danger: false })) file.click();
    });
    file.addEventListener('change', () => {
      const f = file.files[0]; if (!f) return;
      f.text().then((t) => { try { Store.importJSON(t); UI.toast('Backup restaurado'); location.hash = '#/'; } catch (err) { UI.toast(err.message, 'err'); } });
    });
  }

  window.ReportsView = { reports, settings, csv };
})();
