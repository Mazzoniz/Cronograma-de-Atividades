/* Zeit — importação e exportação de planilhas Excel (layout "MANUTENÇÃO SITE") */
(function () {
  const MONTH_IDX = { janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11 };
  const SIT_MAP = Object.fromEntries(Store.SITUATIONS.map((s) => [U.norm(s), s]));
  Object.assign(SIT_MAP, { concluida: 'Concluído', atrasada: 'Atrasado', cancelada: 'Cancelado', postergada: 'Postergado', 'em execucao': 'Em andamento', andamento: 'Em andamento' });

  /* ---------------- leitura ---------------- */
  function val(cell) {
    let v = cell && cell.value;
    if (v && typeof v === 'object') {
      if (v instanceof Date) return v;
      if ('result' in v) v = v.result;
      else if (v.richText) v = v.richText.map((t) => t.text).join('');
      else if ('text' in v) v = v.text;
    }
    return v;
  }
  const txt = (cell) => { const v = val(cell); return v == null ? '' : (v instanceof Date ? '' : String(v)).trim(); };
  function formula(cell) { const v = cell && cell.value; return v && typeof v === 'object' && v.formula ? v.formula : (v && v.sharedFormula ? v.sharedFormula : ''); }
  function fillOf(cell) {
    const f = cell && cell.fill;
    if (!f || f.type !== 'pattern' || !f.fgColor) return '';
    return f.fgColor.argb || (f.fgColor.theme != null ? `t${f.fgColor.theme}:${f.fgColor.tint || 0}` : '');
  }

  function parseSheet(ws, fileName) {
    // 1) linha de cabeçalho
    let hr = 0; const col = {};
    for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= Math.min(80, ws.columnCount); c++) {
        if (U.norm(txt(row.getCell(c))).startsWith('descricao')) { hr = r; break; }
      }
      if (hr) break;
    }
    if (!hr) throw new Error('não encontrei a coluna "DESCRIÇÃO DA AÇÃO"');
    const head = ws.getRow(hr);
    let firstMonthCol = 0;
    for (let c = 1; c <= ws.columnCount; c++) {
      const t = U.norm(txt(head.getCell(c)));
      if (!t) continue;
      if (/^n[°ºo]?\.?$/.test(t) || t === 'no' || t === 'n°') col.n = col.n || c;
      else if (t.startsWith('descricao')) col.desc = c;
      else if (t.startsWith('fornecedor')) col.sup = c;
      else if (t.startsWith('responsavel')) col.resp = c;
      else if (t.startsWith('situacao')) col.sit = c;
      else if (t === 'p/r') col.pr = c;
      else if (t.startsWith('horas')) col.h = c;
      else if (t.startsWith('homens')) col.men = c;
      else if (t.startsWith('resp')) col.resp2 = c;
      else if (t.startsWith('progresso')) col.prog = c;
      else if (MONTH_IDX[t] != null && !firstMonthCol) firstMonthCol = c;
    }
    if (!col.desc || !col.pr) throw new Error('layout não reconhecido (faltam colunas DESCRIÇÃO ou P/R)');
    const dayStart = firstMonthCol || (Math.max(col.h || 0, col.resp2 || 0, col.men || 0, col.pr) + 1);
    const dayEnd = (col.prog || ws.columnCount + 1) - 1;

    // 2) linha dos dias
    let dr = 0;
    for (let r = hr + 1; r <= hr + 4; r++) {
      const row = ws.getRow(r); let n = 0;
      for (let c = dayStart; c <= dayEnd; c++) { const v = val(row.getCell(c)); if (v instanceof Date || typeof v === 'number') n++; }
      if (n >= Math.max(1, (dayEnd - dayStart + 1) / 2)) { dr = r; break; }
    }
    if (!dr) throw new Error('não encontrei a linha com os dias');

    // 3) ano base: do título ou do nome do arquivo
    const title = txt(ws.getRow(1).getCell(col.n || 2)) || txt(ws.getRow(1).getCell(2)) || fileName.replace(/\.xlsx?$/i, '');
    const yMatch = (title.match(/20\d\d/) || fileName.match(/20\d\d/) || [String(new Date().getFullYear())])[0];
    let year = Number(yMatch);

    // 4) datas de cada coluna
    //    As planilhas guardam só o "dia" (número de série pequeno formatado como d) ou a data completa.
    //    O mês vem do cabeçalho (ex.: "Fevereiro") ou, se estiver vazio, da KW acima do dia.
    const serialOf = (v) => (v instanceof Date ? Math.round(v.getTime() / 86400000 + 25569) : v);
    const excelDay = (serial) => {
      if (serial <= 31) return serial;          // jan/1900 (série 1..31)
      if (serial <= 59) return serial - 31;     // fev/1900
      if (serial === 60) return 29;             // 29/02/1900 inexistente (bug histórico do Excel)
      return new Date(Date.UTC(1899, 11, 30) + serial * 86400000).getUTCDate();
    };
    const headerAt = (r, c) => {
      const cell = ws.getRow(r).getCell(c);
      return txt(cell.isMerged && cell.master ? cell.master : cell);
    };
    const kwAt = (c) => { for (let k = c; k >= dayStart; k--) { const m = /KW\s*(\d+)/i.exec(headerAt(hr + 1, k)); if (m) return Number(m[1]); } return null; };
    const dates = {}; let prevDate = null;
    for (let c = dayStart; c <= dayEnd; c++) {
      const v = val(ws.getRow(dr).getCell(c));
      if (!(v instanceof Date) && typeof v !== 'number') continue;
      let full = null;
      if (v instanceof Date && v.getUTCFullYear() >= 2000) {
        if (v.getUTCFullYear() > 2100) continue;          // marcador 31/12/9999 no fim da grade
        full = U.iso(new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
      } else {
        const serial = serialOf(v);
        if (serial > 2958000) continue;                   // 9999-12-31
        if (serial > 20000) {
          const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
          full = U.iso(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        } else {
          const day = excelDay(serial);
          if (prevDate) {
            // continua a sequência: próximo dia com esse número
            let d = U.addDays(prevDate, 1);
            for (let k = 0; k < 40 && Number(d.slice(8)) !== day; k++) d = U.addDays(d, 1);
            full = d;
          } else {
            const mi = MONTH_IDX[U.norm(headerAt(hr, c))];
            const kw = kwAt(c);
            if (mi != null) full = `${year}-${U.pad(mi + 1)}-${U.pad(day)}`;
            else if (kw) {
              const mon = U.kwMonday(year, kw);
              for (let k = -7; k <= 13; k++) { const d = U.addDays(mon, k); if (Number(d.slice(8)) === day) { full = d; if (k >= 0) break; } }
            }
            if (!full) full = `${year}-01-${U.pad(day)}`;
          }
        }
      }
      dates[c] = full; prevDate = full;
    }
    const allDates = Object.values(dates).sort();
    if (!allDates.length) throw new Error('não consegui ler as datas da grade');

    // 5) feriados: dias com cor de cabeçalho diferente da maioria
    const fills = {}; Object.keys(dates).forEach((c) => { const f = fillOf(ws.getRow(dr).getCell(+c)); fills[c] = f; });
    const count = {}; Object.values(fills).forEach((f) => { count[f] = (count[f] || 0) + 1; });
    const major = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
    const holidays = Object.keys(dates).filter((c) => fills[c] && fills[c] !== major).map((c) => dates[c]);

    // 6) atividades
    const refRow = (f) => { const m = /([A-Z]+)(\d+):[A-Z]+\d+/.exec(f || ''); return m ? Number(m[2]) : 0; };
    const mult = (f) => { const m = /\*\s*([\d.,]+)/.exec(f || ''); return m ? Number(m[1].replace(',', '.')) : 0; };
    const codesOf = (r) => {
      const out = {}; if (!r) return out;
      Object.entries(dates).forEach(([c, d]) => {
        const t = txt(ws.getRow(r).getCell(+c)).toUpperCase();
        if (Store.CODES[t]) out[d] = { c: t };
      });
      return out;
    };
    const acts = [];
    for (let r = dr + 1; r <= ws.rowCount; r++) {
      const prCell = ws.getRow(r).getCell(col.pr);
      if (prCell.isMerged && prCell.master && prCell.master.address !== prCell.address) continue; // parte de célula mesclada
      const pr = U.norm(txt(prCell));
      if (!pr.startsWith('plan')) continue;
      // linha Real. logo abaixo
      let rr = 0;
      for (let k = r + 1; k <= r + 4; k++) {
        const kc = ws.getRow(k).getCell(col.pr);
        if (kc.isMerged && kc.master && kc.master.address !== kc.address) continue;
        if (U.norm(txt(kc)).startsWith('real')) { rr = k; break; }
      }
      const fPlan = col.h ? formula(ws.getRow(r).getCell(col.h)) : '';
      const fReal = col.h && rr ? formula(ws.getRow(rr).getCell(col.h)) : '';
      const planRow = refRow(fPlan) || r + 1;
      const realRow = refRow(fReal) || rr;
      const hpd = mult(fPlan) || mult(fReal) || Store.settings.defaultHours || 8;
      const desc = txt(ws.getRow(r).getCell(col.desc));
      const plan = codesOf(planRow);
      // a linha do plan pode ser a própria linha do rótulo
      if (!Object.keys(plan).length && planRow !== r) Object.assign(plan, codesOf(r));
      const real = codesOf(realRow);
      if (!desc && !Object.keys(plan).length && !Object.keys(real).length) continue;
      const sitTxt = col.sit ? U.norm(txt(ws.getRow(r).getCell(col.sit))) : '';
      const resp = [col.resp ? txt(ws.getRow(r).getCell(col.resp)) : '', col.resp2 ? txt(ws.getRow(r).getCell(col.resp2)) : ''].filter(Boolean);
      const menV = col.men ? Number(txt(ws.getRow(r).getCell(col.men))) : 0;
      acts.push(Store.newActivity({
        description: desc || '(sem descrição)', supplier: col.sup ? txt(ws.getRow(r).getCell(col.sup)) : '',
        responsible: [...new Set(resp)].join(' / '), situation: SIT_MAP[sitTxt] || 'auto',
        fullDay: true, hoursPerDay: hpd, plan, real, menEnabled: menV > 0, men: menV > 0 ? menV : 1,
        note: ws.getRow(r).getCell(col.desc).note ? String(ws.getRow(r).getCell(col.desc).note.texts ? ws.getRow(r).getCell(col.desc).note.texts.map((t) => t.text).join('') : ws.getRow(r).getCell(col.desc).note) : '',
      }));
    }
    const a = U.isoWeek(allDates[0]), b = U.isoWeek(allDates[allDates.length - 1]);
    return { title: title || fileName, start: a, end: b, holidays, activities: acts, firstDate: allDates[0] };
  }

  async function readFile(file) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const sheets = wb.worksheets.filter((w) => !/legenda/i.test(w.name) && w.rowCount > 5);
    const results = [];
    for (const ws of sheets) {
      try { results.push({ ok: true, ...parseSheet(ws, file.name), sheet: ws.name }); } catch (e) { results.push({ ok: false, sheet: ws.name, error: e.message }); }
    }
    return results.filter((r) => r.ok || sheets.length === 1);
  }

  function importDialog(sectorId, folderId) {
    const sectors = Store.state.sectors;
    UI.modal({
      title: 'Importar planilhas Excel', size: 'md', submitLabel: 'Importar',
      body: `<p class="muted">Selecione um ou mais arquivos <b>.xlsx</b> no layout das planilhas de atividades (colunas N°, Descrição, Fornecedor, Responsável, Situação, P/R, Horas e a grade de dias). Cada aba vira um cronograma.</p>
        <label class="field">Arquivos<input type="file" name="files" accept=".xlsx" multiple required></label>
        <div class="grid-2">
          <label class="field">Setor<select name="sector" id="imp-sector">${sectors.map((s) => `<option value="${s.id}" ${s.id === sectorId ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}</select></label>
          <label class="field">Pasta de destino<select name="folder" id="imp-folder">${UI.folderOptions(sectorId, folderId)}</select></label>
        </div>
        <label class="check"><input type="checkbox" name="byYear" checked> <span>Organizar em pastas por ano automaticamente (ex.: 2025, 2026)</span></label>
        <div id="imp-log" class="imp-log" hidden></div>`,
      onOpen(f) {
        f.querySelector('#imp-sector').addEventListener('change', (e) => { f.querySelector('#imp-folder').innerHTML = UI.folderOptions(e.target.value, null); });
      },
      onSubmit(d, f) {
        const files = [...f.querySelector('input[type=file]').files];
        if (!files.length) { f.showError('Escolha ao menos um arquivo.'); return false; }
        const log = f.querySelector('#imp-log'); log.hidden = false; log.innerHTML = '<p>Lendo arquivos…</p>';
        const btn = f.querySelector('[type=submit]'); btn.disabled = true;
        (async () => {
          const lines = []; let created = 0; let lastId = null;
          for (const file of files) {
            try {
              const res = await readFile(file);
              for (const r of res) {
                if (!r.ok) { lines.push(`<li class="err">✕ ${U.esc(file.name)} (${U.esc(r.sheet)}): ${U.esc(r.error)}</li>`); continue; }
                let target = d.folder || null;
                if (d.byYear) {
                  const y = String(U.yearOf(r.firstDate));
                  let fd = Store.state.folders.find((x) => x.sectorId === d.sector && (x.parentId || null) === (target || null) && x.name === y);
                  if (!fd) fd = Store.createFolder(d.sector, y, target);
                  target = fd.id;
                }
                const s = Store.createSchedule({ sectorId: d.sector, folderId: target, title: r.title, description: `Importado de ${file.name}`, start: r.start, end: r.end, holidays: r.holidays, activities: r.activities });
                created++; lastId = s.id;
                lines.push(`<li class="ok">✓ <b>${U.esc(r.title)}</b> — ${U.plural(r.activities.length, 'atividade', 'atividades')}, ${U.kwLabel(r.start.week)} a ${U.kwLabel(r.end.week)}</li>`);
              }
            } catch (e) { lines.push(`<li class="err">✕ ${U.esc(file.name)}: ${U.esc(e.message)}</li>`); }
            log.innerHTML = `<ul>${lines.join('')}</ul>`;
          }
          btn.disabled = false;
          btn.textContent = 'Concluir';
          f.onsubmit = null;
          btn.type = 'button';
          btn.onclick = () => { f.close(); if (created === 1 && lastId) location.hash = `#/s/${d.sector}/c/${lastId}`; else location.hash = `#/s/${d.sector}/cronogramas`; };
          UI.toast(`${U.plural(created, 'cronograma importado', 'cronogramas importados')}`);
        })();
        return false;
      },
    });
  }

  /* ---------------- escrita ---------------- */
  const argb = (hex) => `FF${hex.replace('#', '').toUpperCase()}`;
  const NAVY = 'FF002060';
  const thin = { style: 'thin', color: { argb: 'FF9AA4B2' } };
  const med = { style: 'medium', color: { argb: 'FF1F2937' } };

  function colName(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

  function writeSheet(wb, s, name) {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', xSplit: 9, ySplit: 5, showGridLines: false }] });
    const days = C.days(s); const hol = new Set(s.holidays);
    const D0 = 10; const DL = D0 + days.length - 1; const PCOL = DL + 1;
    const font = { name: 'Arial', size: 10 };
    ws.columns = [{ width: 2 }, { width: 6 }, { width: 58 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 7 }, { width: 9 }, { width: 8 },
      ...days.map(() => ({ width: 4.6 })), { width: 12 }];

    ws.mergeCells(1, 2, 1, PCOL);
    Object.assign(ws.getCell(1, 2), { value: s.title, font: { name: 'Arial', size: 20, bold: true }, alignment: { horizontal: 'center' } });
    ws.mergeCells(2, 2, 2, PCOL);
    Object.assign(ws.getCell(2, 2), { value: `ATUALIZADO EM ${U.fmt(s.updatedAt.slice(0, 10))}`, font: { name: 'Arial', size: 11, bold: true }, alignment: { horizontal: 'center' } });
    ws.getRow(1).height = 32;

    const hdr = (r, c, v) => {
      const cell = ws.getCell(r, c);
      cell.value = v; cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: thin, left: thin, bottom: thin, right: thin };
    };
    [['N°', 2], ['DESCRIÇÃO DA AÇÃO', 3], ['Fornecedor', 4], ['RESPONSÁVEL', 5], ['Situação', 6], ['P/R', 7], ['HORAS', 8], ['Homens', 9]].forEach(([t, c]) => { ws.mergeCells(3, c, 5, c); hdr(3, c, t); });
    ws.mergeCells(3, PCOL, 5, PCOL); hdr(3, PCOL, 'PROGRESSO');
    // meses / KW / dias
    let c = D0;
    const groups = (keyFn) => { const g = []; days.forEach((d, i) => { const k = keyFn(d); if (!g.length || g[g.length - 1].k !== k) g.push({ k, i, n: 0, d }); g[g.length - 1].n++; }); return g; };
    groups((d) => d.slice(0, 7)).forEach((g) => { if (g.n > 1) ws.mergeCells(3, D0 + g.i, 3, D0 + g.i + g.n - 1); hdr(3, D0 + g.i, U.MONTHS[U.monthOf(g.d)]); });
    groups((d) => U.isoWeek(d).week).forEach((g) => { if (g.n > 1) ws.mergeCells(4, D0 + g.i, 4, D0 + g.i + g.n - 1); hdr(4, D0 + g.i, U.kwLabel(g.k)); });
    days.forEach((d, i) => {
      hdr(5, D0 + i, U.parse(d).getDate());
      if (hol.has(d)) { ws.getCell(5, D0 + i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(Store.HOLIDAY_COLOR) } }; ws.getCell(5, D0 + i).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B1B1B' } }; }
    });
    ws.getRow(3).height = 20; ws.getRow(4).height = 16; ws.getRow(5).height = 16;

    let r = 6;
    const first = colName(D0), last = colName(DL);
    s.activities.forEach((a, i) => {
      const rp = r, rr = r + 1;
      [[2, i + 1], [3, a.description], [4, a.supplier], [5, a.responsible], [6, C.situation(a)], [9, a.menEnabled ? C.men(a) : null]].forEach(([cc, v]) => {
        ws.mergeCells(rp, cc, rr, cc);
        const cell = ws.getCell(rp, cc);
        cell.value = v; cell.font = cc === 2 ? { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } } : cc === 3 ? { ...font, size: 11 } : { ...font, bold: cc === 5 || cc === 6, italic: cc === 4 };
        if (cc === 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        cell.alignment = { horizontal: cc === 3 ? 'left' : 'center', vertical: 'middle', wrapText: true };
      });
      if (a.note) ws.getCell(rp, 3).note = `Observação: ${a.note}`;
      ws.getCell(rp, 7).value = 'Plan.'; ws.getCell(rr, 7).value = 'Real.';
      const hpd = Number(a.hoursPerDay) || 0;
      if (a.fullDay) {
        ws.getCell(rp, 8).value = { formula: `COUNTIF(${first}${rp}:${last}${rp},"PL")*${hpd}`, result: C.planHours(a) };
        ws.getCell(rr, 8).value = { formula: `COUNTIF(${first}${rr}:${last}${rr},"R")*${hpd}`, result: C.realHours(a) };
      } else {
        ws.getCell(rp, 8).value = C.planHours(a); ws.getCell(rr, 8).value = C.realHours(a);
        ws.getCell(rp, 8).note = 'Atividade lançada por horas (valores por dia no Zeit).';
      }
      ws.mergeCells(rp, PCOL, rr, PCOL);
      ws.getCell(rp, PCOL).value = { formula: `IFERROR(${colName(8)}${rr}/${colName(8)}${rp},0)`, result: (C.progress(a) || 0) / 100 };
      ws.getCell(rp, PCOL).numFmt = '0.0%';
      ws.getCell(rp, PCOL).font = { name: 'Arial', size: 11, bold: true };
      ws.getCell(rp, PCOL).alignment = { horizontal: 'center', vertical: 'middle' };
      [rp, rr].forEach((row) => {
        [7, 8].forEach((cc) => { const cell = ws.getCell(row, cc); cell.font = font; cell.alignment = { horizontal: 'center', vertical: 'middle' }; });
        days.forEach((d, k) => {
          const cell = ws.getCell(row, D0 + k);
          const mk = a[row === rp ? 'plan' : 'real'][d];
          if (mk) {
            const code = Store.CODES[mk.c];
            cell.value = a.fullDay ? mk.c : `${mk.c} ${U.num(C.cellHours(a, mk))}`;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(code.color) } };
            cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: argb(code.ink) } };
          } else if (hol.has(d)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        ws.getRow(row).height = 18;
      });
      // bordas
      for (let cc = 2; cc <= PCOL; cc++) {
        [rp, rr].forEach((row) => {
          ws.getCell(row, cc).border = { left: thin, right: thin, top: row === rp ? med : thin, bottom: row === rr ? med : thin };
        });
      }
      r += 2;
    });
    // total
    ws.getCell(r, 3).value = 'TOTAL'; ws.getCell(r, 3).font = { name: 'Arial', size: 11, bold: true };
    if (s.activities.length) {
      ws.getCell(r, 7).value = 'Plan.'; ws.getCell(r + 1, 7).value = 'Real.';
      const rows = s.activities.map((_, i) => 6 + i * 2);
      ws.getCell(r, 8).value = { formula: rows.map((x) => `H${x}`).join('+'), result: C.stats(s.activities).plan };
      ws.getCell(r + 1, 8).value = { formula: rows.map((x) => `H${x + 1}`).join('+'), result: C.stats(s.activities).real };
      ws.mergeCells(r, PCOL, r + 1, PCOL);
      ws.getCell(r, PCOL).value = { formula: `IFERROR(H${r + 1}/H${r},0)`, result: (C.stats(s.activities).progress || 0) / 100 };
      ws.getCell(r, PCOL).numFmt = '0.0%';
      [r, r + 1].forEach((row) => [7, 8, PCOL].forEach((cc) => { ws.getCell(row, cc).font = { name: 'Arial', size: 11, bold: true }; ws.getCell(row, cc).alignment = { horizontal: 'center' }; }));
    }
    ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };
    ws.pageSetup.printTitlesRow = '3:5';
    return ws;
  }

  function legendSheet(wb) {
    const ws = wb.addWorksheet('Legendas');
    ws.columns = [{ width: 3 }, { width: 6 }, { width: 24 }];
    let r = 3;
    Object.entries(Store.CODES).forEach(([k, v]) => {
      ws.getCell(r, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(v.color) } };
      ws.getCell(r, 2).value = k; ws.getCell(r, 2).font = { name: 'Arial', bold: true, color: { argb: argb(v.ink) } };
      ws.getCell(r, 2).alignment = { horizontal: 'center' };
      ws.getCell(r, 3).value = `${v.label} (${k})`; ws.getCell(r, 3).font = { name: 'Arial', size: 11 };
      r++;
    });
    ws.getCell(r, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(Store.HOLIDAY_COLOR) } };
    ws.getCell(r, 3).value = 'Feriado / parada'; ws.getCell(r, 3).font = { name: 'Arial', size: 11 };
    ws.getCell(r + 2, 2).value = 'Horas = nº de dias marcados × horas do dia. Progresso = Real. ÷ Plan.';
    ws.getCell(r + 2, 2).font = { name: 'Arial', size: 10, italic: true };
  }

  function sheetName(t, used) {
    let n = String(t).replace(/[\\/*?:[\]]/g, '-').slice(0, 31) || 'Cronograma';
    let k = 2; const base = n;
    while (used.has(n.toLowerCase())) { n = `${base.slice(0, 27)} (${k++})`; }
    used.add(n.toLowerCase()); return n;
  }

  async function save(wb, filename) {
    const buf = await wb.xlsx.writeBuffer();
    UI.download(filename, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  }

  async function exportSchedule(s) {
    const wb = new ExcelJS.Workbook(); wb.creator = 'Zeit';
    writeSheet(wb, s, sheetName(Store.sector(s.sectorId).name.toUpperCase(), new Set()));
    legendSheet(wb);
    await save(wb, `${UI.safeName(s.title)}.xlsx`);
    UI.toast('Planilha exportada');
  }

  async function exportSector(sector) {
    const list = C.sectorSchedules(sector.id).sort((a, b) => Store.schedStart(a).localeCompare(Store.schedStart(b)));
    if (!list.length) { UI.toast('Nenhum cronograma para exportar'); return; }
    const wb = new ExcelJS.Workbook(); wb.creator = 'Zeit';
    const used = new Set();
    list.forEach((s) => writeSheet(wb, s, sheetName(s.title, used)));
    legendSheet(wb);
    await save(wb, `Zeit - ${UI.safeName(sector.name)} - cronogramas.xlsx`);
    UI.toast('Planilha exportada');
  }

  window.Excel = { importDialog, readFile, parseSheet, exportSchedule, exportSector };
})();
