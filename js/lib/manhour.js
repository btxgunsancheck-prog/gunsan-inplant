/* 공수 현황 계산과 엑셀 읽기(2026-11-23). 서버(gas/Manhour.js)와 같은 계산을 쓴다.
   STS 단위작업 1줄(분) = 적용 기종 CAPA 합 x 빈도 x (왕복거리/1000/이동속도 x 60 + 작업시간) x 여유율
   업무 공수 = 합계(분) / 근무시간(분). 이동속도와 여유율은 업무(STS)마다 다르다(3·4·5km/h, 1.15·1.1). */
const MH = (() => {
  const MODELS = ['E1', 'E2', 'L1', 'D1'];
  const FIXED = '고정';
  const n = (v) => { const x = Number(String(v === null || v === undefined ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };
  const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

  function rowMin(r, capa, t) {
    let c = 0;
    list(r.models).forEach((m) => { c += m === FIXED ? 1 : n(capa && capa[m]); });
    const move = (n(r.dist) * 2 / 1000) / (n(t.speed) || 3) * 60;
    return c * n(r.freq) * (move + n(r.time)) * (n(t.allow) || 1.15);
  }
  const moveMin = (r, t) => (n(r.dist) * 2 / 1000) / (n(t.speed) || 3) * 60;
  function calcTask(t, rows, capa) {
    if (t.mode !== 'STS') return { total: null, mh: t.fixed === '' || t.fixed === null || t.fixed === undefined ? '' : n(t.fixed) };
    let total = 0;
    (rows || []).forEach((r) => { total += rowMin(r, capa, t); });
    return { total, mh: total / (n(t.work) || 550) };
  }

  /* ---------- 엑셀 읽기 ---------- */
  const cellOf = (ws, a) => ws[a] || null;
  const val = (ws, a) => { const c = cellOf(ws, a); return c ? c.v : undefined; };
  const txt = (ws, a) => { const v = val(ws, a); return v === undefined || v === null ? '' : String(v).trim(); };
  const numOrBlank = (v) => (v === undefined || v === null || String(v).trim() === '' ? '' : (isFinite(Number(v)) ? Number(v) : ''));

  function excelDate(XLSX, v) {
    if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return d ? d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0') : ''; }
    const s = String(v || '').trim();
    const m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    return m ? m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0') : '';
  }

  function range(ws) { return ws['!ref'] ? ws['!ref'] : 'A1:A1'; }

  /* STS 한 장. 종합 시트에서 이 시트를 가리키는 업무에 붙인다. */
  function parseSts(XLSX, ws, warn, name) {
    const R = XLSX.utils.decode_range(range(ws));
    let work = 550, nameRow = 0, totalRow = 0, modelRow = 0;
    for (let r = 0; r <= Math.min(R.e.r, 60); r++) {
      const b = txt(ws, 'B' + (r + 1));
      if (b.indexOf('근무시간') === 0) work = n(val(ws, 'C' + (r + 1))) || 550;
      if (b === '생산기종') modelRow = r + 1;
      if (/^NO\.?$/i.test(b) && !nameRow) nameRow = r + 1;
      if (/^TOTAL/i.test(b)) { totalRow = r + 1; break; }
    }
    if (!nameRow || !totalRow) { warn.push(name + ': 단위작업 표(NO. ~ TOTAL)를 찾지 못했습니다.'); return null; }
    /* 생산기종 줄: 어떤 열이 어느 기종인지(C=E1 ... G=고정작업) */
    const colModel = {};
    if (modelRow) {
      'CDEFGH'.split('').forEach((col) => {
        const t = txt(ws, col + modelRow);
        if (MODELS.indexOf(t) >= 0) colModel[col] = t;
        else if (t.indexOf('고정') === 0) colModel[col] = FIXED;
      });
    }
    if (!Object.keys(colModel).length) { colModel.C = 'E1'; colModel.D = 'E2'; colModel.E = 'L1'; colModel.F = 'D1'; colModel.G = FIXED; }
    const rows = [];
    let speed = null, allow = null;
    for (let r = nameRow + 1; r < totalRow; r++) {
      const m = cellOf(ws, 'M' + r);
      if (!m || !m.f) continue;
      const f = String(m.f);
      const models = [];
      (f.match(/\$([A-Z])\$\d+/g) || []).forEach((ref) => { const col = ref.charAt(1); if (colModel[col] && models.indexOf(colModel[col]) < 0) models.push(colModel[col]); });
      const am = f.match(/\*\s*([\d.]+)\s*$/);
      const k = cellOf(ws, 'K' + r);
      const sm = k && k.f ? String(k.f).match(/\/\s*1000\s*\)\s*\/\s*([\d.]+)\s*\*\s*3600/) : null;
      if (am) { const a = Number(am[1]); if (allow === null) allow = a; else if (a !== allow) warn.push(name + ' ' + r + '행: 여유율이 다른 줄과 다릅니다(' + a + ').'); }
      if (sm) { const s = Number(sm[1]); if (speed === null) speed = s; else if (s !== speed) warn.push(name + ' ' + r + '행: 이동속도가 다른 줄과 다릅니다(' + s + 'km).'); }
      const l = cellOf(ws, 'L' + r);
      rows.push({
        name: txt(ws, 'C' + r), models: models.join(','), freq: n(val(ws, 'H' + r)), dist: n(val(ws, 'I' + r)), time: n(val(ws, 'L' + r)),
        timeNote: l && l.f ? String(l.f).slice(0, 200) : '', route: txt(ws, 'N' + r).slice(0, 200), cached: n(m.v)
      });
      if (!models.length) warn.push(name + ' ' + r + '행: 적용 기종을 읽지 못했습니다.');
    }
    /* 문서 번호, 담당/공정, 개정 이력 */
    let docNo = '';
    for (let r = 1; r <= 6 && !docNo; r++) {
      ['R', 'S', 'Q'].forEach((c) => { if (!docNo && /문서\s*No/i.test(txt(ws, c + r))) { const nx = String.fromCharCode(c.charCodeAt(0) + 1); docNo = txt(ws, nx + r); } });
    }
    const rev = [];
    for (let r = 3; r <= 12; r++) {
      const no = val(ws, 'N' + r);
      if (no === undefined || no === null || no === '' || !isFinite(Number(no))) continue;
      rev.push({ no: Number(no), date: excelDate(XLSX, val(ws, 'O' + r)), text: txt(ws, 'P' + r).slice(0, 200), by: txt(ws, 'R' + r).slice(0, 40) });
    }
    const mh = cellOf(ws, 'M' + (totalRow + 1));
    return { work, speed: speed || 3, allow: allow || 1.15, rows, owner: txt(ws, 'C2').slice(0, 200), docNo: docNo.slice(0, 50), rev, cachedMh: mh ? n(mh.v) : null };
  }

  /* 파일 전체. 종합 시트를 기준으로 업무를 읽고, 산출 공수가 STS를 가리키면 그 시트를 읽어 붙인다. */
  function parse(XLSX, data) {
    const wb = XLSX.read(data, { type: 'array', cellFormula: true });
    const warn = [];
    const ws = wb.Sheets['종합'];
    if (!ws) return { errors: ['"종합" 시트가 없습니다. 물류공수 종합 엑셀인지 확인해 주세요.'] };
    const R = XLSX.utils.decode_range(range(ws));
    let head = 0;
    for (let r = 1; r <= Math.min(R.e.r + 1, 30); r++) if (txt(ws, 'B' + r) === '직' && txt(ws, 'C' + r) === '업무') { head = r; break; }
    if (!head) return { errors: ['종합 시트에서 "직 / 업무" 머리글을 찾지 못했습니다.'] };
    /* CAPA: '생산 CAPA' 칸 오른쪽 값, 바로 윗줄이 기종 이름. '기준일' 바로 아래가 날짜 */
    const capa = { date: '' };
    for (let r = 1; r < head; r++) {
      for (let c = 0; c <= 20; c++) {
        const a = XLSX.utils.encode_cell({ r: r - 1, c });
        const t = txt(ws, a);
        if (t.replace(/\s/g, '') === '생산CAPA') {
          for (let k = c + 1; k <= c + 8; k++) {
            const top = txt(ws, XLSX.utils.encode_cell({ r: r - 2, c: k }));
            if (MODELS.indexOf(top) >= 0) capa[top] = n(val(ws, XLSX.utils.encode_cell({ r: r - 1, c: k })));
          }
        }
        if (t === '기준일') capa.date = excelDate(XLSX, val(ws, XLSX.utils.encode_cell({ r, c })));
      }
    }
    const hasCapa = MODELS.every((m) => capa[m] !== undefined);
    const tasks = [];
    let group = '', taskName = '', fileTotal = null;
    for (let r = head + 1; r <= R.e.r + 1; r++) {
      const b = txt(ws, 'B' + r);
      if (/^합\s*계/.test(b)) { fileTotal = n(val(ws, 'H' + r)); break; }
      if (/^소\s*계/.test(b)) { taskName = ''; continue; }
      if (b) { group = b; taskName = ''; }
      const c = txt(ws, 'C' + r);
      const d = txt(ws, 'D' + r);
      if (!c && !d) continue;
      if (c) taskName = c;
      const hc = cellOf(ws, 'H' + r);
      const ref = hc && hc.f ? String(hc.f).match(/^'?(.+?)'?!\$?M\$?3[78]$/) : null;
      const t = {
        group: group || '(직 없음)', task: (taskName || d).slice(0, 100), detail: d.slice(0, 300), kind: txt(ws, 'E' + r).slice(0, 20),
        contract: numOrBlank(val(ws, 'F' + r)), current: numOrBlank(val(ws, 'G' + r)), note: txt(ws, 'K' + r).replace(/^-\s*/, '').slice(0, 300),
        mode: ref ? 'STS' : '고정', fixed: ref ? '' : numOrBlank(hc ? hc.v : ''), sheet: ref ? ref[1] : '', owner: '', docNo: '', work: 550, speed: 3, allow: 1.15, rows: [], rev: [], line: r
      };
      if (ref) {
        const sw = wb.Sheets[ref[1]];
        if (!sw) { warn.push('종합 ' + r + '행: "' + ref[1] + '" 시트가 없습니다. 고정 공수로 읽습니다.'); t.mode = '고정'; t.fixed = numOrBlank(hc.v); t.sheet = ''; }
        else {
          const s = parseSts(XLSX, sw, warn, ref[1]);
          if (s) Object.assign(t, { work: s.work, speed: s.speed, allow: s.allow, rows: s.rows, owner: s.owner, docNo: s.docNo, rev: s.rev, cachedMh: s.cachedMh, cachedSummary: n(hc.v) });
        }
      }
      tasks.push(t);
    }
    /* 확인: 엑셀에 저장된 값과 사이트 계산이 같은지 */
    const mismatch = [];
    let siteTotal = 0;
    tasks.forEach((t) => {
      const c = calcTask(t, t.rows, capa);
      siteTotal += n(c.mh);
      if (t.mode === 'STS' && hasCapa && t.cachedSummary !== undefined && Math.abs(n(c.mh) - t.cachedSummary) > 0.0005) mismatch.push(t.sheet + ' (엑셀 ' + t.cachedSummary.toFixed(3) + ', 사이트 ' + n(c.mh).toFixed(3) + ')');
    });
    return {
      errors: [], warnings: warn, tasks, capa: hasCapa ? capa : null, fileTotal, siteTotal, mismatch,
      groups: tasks.reduce((a, t) => (a.indexOf(t.group) < 0 ? a.concat(t.group) : a), []),
      stsCount: tasks.filter((t) => t.mode === 'STS').length, rowCount: tasks.reduce((a, t) => a + t.rows.length, 0)
    };
  }

  /* ---------- 계약 인원표(엑셀 '사내물류팀' 시트) ----------
     머리글 줄의 '100대/월' 같은 칸에서 구간을 읽고, 아래 업무 줄을 직(왼쪽 두 번째 열)별로 더한다. '총계' 줄에서 멈춘다. */
  function parseContract(XLSX, data) {
    const wb = XLSX.read(data, { type: 'array' });
    const hasBand = (ws) => { for (const k of Object.keys(ws)) { if (k[0] !== '!' && /^\s*\d+\s*대\s*\/\s*월\s*$/.test(String(ws[k].v))) return true; } return false; };
    let name = wb.SheetNames.find((n) => n.replace(/\s/g, '') === '사내물류팀' && hasBand(wb.Sheets[n])) || wb.SheetNames.find((n) => hasBand(wb.Sheets[n]));
    if (!name) return { errors: ['"몇 대/월" 구간 머리글(예: 100대/월)이 있는 시트를 찾지 못했습니다. 월 생산대수별 계약 인원 엑셀인지 확인해 주세요.'] };
    const ws = wb.Sheets[name];
    const R = XLSX.utils.decode_range(range(ws));
    let hr = -1; let cols = [];
    for (let r = R.s.r; r <= Math.min(R.e.r, 40) && hr < 0; r++) {
      const found = [];
      for (let c = R.s.c; c <= Math.min(R.e.c, 40); c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        const m = cell ? String(cell.v).match(/^\s*(\d+)\s*대\s*\/\s*월\s*$/) : null;
        if (m) found.push({ c, low: Number(m[1]) });
      }
      if (found.length >= 2) { hr = r; cols = found; }
    }
    if (hr < 0) return { errors: ['구간 머리글 줄을 찾지 못했습니다.'] };
    const gc = cols[0].c - 2;
    if (gc < 0) return { errors: ['직(구분) 열을 찾지 못했습니다.'] };
    const groups = []; const idx = {};
    let totals = null;
    for (let r = hr + 1; r <= R.e.r; r++) {
      const g = String((ws[XLSX.utils.encode_cell({ r, c: gc })] || {}).v || '').trim();
      if (/총\s*계/.test(g)) { totals = cols.map((x) => n((ws[XLSX.utils.encode_cell({ r, c: x.c })] || {}).v)); break; }
      const task = String((ws[XLSX.utils.encode_cell({ r, c: gc + 1 })] || {}).v || '').trim();
      if (!g || !task) continue;
      if (idx[g] === undefined) { idx[g] = groups.length; groups.push({ name: g, values: cols.map(() => 0) }); }
      cols.forEach((x, k) => { groups[idx[g]].values[k] += n((ws[XLSX.utils.encode_cell({ r, c: x.c })] || {}).v); });
    }
    if (!groups.length) return { errors: ['업무 줄을 읽지 못했습니다.'] };
    groups.forEach((g) => { g.values = g.values.map((v) => Math.round(v * 100) / 100); });
    const sums = cols.map((_, k) => Math.round(groups.reduce((a, g) => a + g.values[k], 0) * 100) / 100);
    return { errors: [], sheet: name, brackets: cols.map((x) => x.low), groups, sums, fileTotals: totals, same: !totals || totals.every((v, k) => Math.abs(v - sums[k]) < 0.001) };
  }

  /* ---------- 월별 기록 CSV(연월, 일CAPA, 월생산량, 운영인원, 계약인원). 엑셀에서 복사한 탭 구분도 읽는다 ---------- */
  function parseMonthCsv(text) {
    const src = String(text || '').replace(/^﻿/, '');
    const delim = src.indexOf('\t') >= 0 && src.split('\n')[0].indexOf('\t') >= 0 ? '\t' : ',';
    const rows = []; let row = []; let cell = ''; let q = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const norm = (s) => String(s || '').replace(/\s/g, '');
    const hi = rows.findIndex((r) => r.some((x) => norm(x) === '연월'));
    if (hi < 0) return { errors: ['머리글 줄(연월, 일CAPA, 월생산량, 운영인원, 계약인원)을 찾지 못했습니다.'] };
    const head = rows[hi].map(norm);
    const col = { ym: head.indexOf('연월'), capa: head.indexOf('일CAPA'), prod: head.indexOf('월생산량'), staff: head.indexOf('운영인원'), contract: head.indexOf('계약인원') };
    const out = []; const errors = [];
    rows.slice(hi + 1).forEach((r, i) => {
      if (!r.some((x) => String(x).trim())) return;
      const ym = String(r[col.ym] || '').trim().replace(/[./]/g, '-').replace(/^(\d{4})-(\d)$/, '$1-0$2');
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) { errors.push((hi + i + 2) + '번째 줄: 연월(예: 2026-07)을 확인해 주세요.'); return; }
      const o = { ym };
      ['capa', 'prod', 'staff', 'contract'].forEach((k) => {
        const v = col[k] >= 0 ? String(r[col[k]] || '').trim().replace(/,/g, '') : '';
        if (v === '') { o[k] = ''; return; }
        if (!isFinite(Number(v))) errors.push((hi + i + 2) + '번째 줄: ' + k + ' 값이 숫자가 아닙니다.'); else o[k] = Number(v);
      });
      out.push(o);
    });
    return { errors, rows: out, missingCols: Object.keys(col).filter((k) => col[k] < 0) };
  }

  const MONTH_CSV_SAMPLE = '﻿연월,일CAPA,월생산량,운영인원,계약인원\r\n2026-07,17,345,59,\r\n2026-08,,,,\r\n';

  /* 서버로 보낼 모양(엑셀에서만 쓰는 확인용 값은 뺀다) */
  function payload(p) {
    return p.tasks.map((t) => ({
      group: t.group, task: t.task, detail: t.detail, kind: t.kind, contract: t.contract, current: t.current, mode: t.mode, fixed: t.fixed, note: t.note,
      sheet: t.sheet, owner: t.owner, docNo: t.docNo, work: t.work, speed: t.speed, allow: t.allow,
      rows: t.rows.map((r) => ({ name: r.name || '(이름 없음)', models: r.models || FIXED, freq: r.freq, dist: r.dist, time: r.time, timeNote: r.timeNote, route: r.route })), rev: t.rev
    }));
  }

  const fmt = (v, d) => (v === '' || v === null || v === undefined ? '' : (Math.round(Number(v) * Math.pow(10, d === undefined ? 2 : d)) / Math.pow(10, d === undefined ? 2 : d)).toLocaleString('ko-KR', { maximumFractionDigits: d === undefined ? 2 : d }));

  return { MODELS, FIXED, rowMin, moveMin, calcTask, parse, parseContract, parseMonthCsv, MONTH_CSV_SAMPLE, payload, fmt };
})();
if (typeof module !== 'undefined') module.exports = MH;
