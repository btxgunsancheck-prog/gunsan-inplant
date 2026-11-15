/* 생산계획표(xlsx) 읽기와 달력 그리기.
   집계 기준은 기존 생산집계 문서(생산계획 업로드 4장)를 따른다.
   - 파이프라인 탭(계획_E1, L1, E2, D1): 'Input' 열의 확정 발주. 보류·확인중·취소는 뺀다. 같은 호기는 먼저 나온 행만 센다.
   - 플랫 탭(E1., L1., E2., D1.): 파이프라인에 없는 호기만, 파이프라인이 이미 확정한 날짜의 예시오더는 뺀다.
   - E1·E2 예시오더는 단축근무 택타임으로 날짜를 다시 배치한다(문서 4-4). 확정발주는 건드리지 않는다.
   - 대상월 한 달만 센다. */
const Plan = (() => {
  /* 달력 줄 순서: E01, E02, L01, D01 */
  const LINES = [
    { key: 'E1', label: 'E01', pipe: '계획_E1', flat: 'E1.' },
    { key: 'E2', label: 'E02', pipe: 'E2', flat: 'E2.' },
    { key: 'L1', label: 'L01', pipe: 'L1', flat: 'L1.' },
    { key: 'D1', label: 'D01', pipe: 'D1', flat: 'D1.' }
  ];
  const SHEETS = ['종합'].concat(...LINES.map((l) => [l.pipe, l.flat]));
  const HOLD_WORDS = ['보류', '확인중', '취소'];

  /* E1·E2 단축근무 재배치 설정(기존 대시보드 16_Upload.js의 PLAN_SHORT_SHIFT와 같은 값).
     last: 재배치를 적용하는 마지막 대상월. 그 다음 달 계획부터는 정상근무로 보고 파일 날짜 그대로 센다(2026-12부터 정상근무).
     단축근무가 다시 필요해지면 last를 늘리거나 비운다(비우면 계속 적용). */
  const SHORT_SHIFT = {
    E1: { tact: 74, start: '2026-10-06', last: '2026-11' },
    E2: { tact: 518, start: '2026-10-06', last: '2026-11' }
  };
  const DAY_MINUTES = 450; /* 근무 8:10~16:40(510분) - 점심 60분 */
  const SAFETY_CUT = 60; /* 안전교육일은 8:10~9:10을 더 뺀다 */
  /* 안전교육일. 기존 대시보드에는 10/26까지만 등록되어 있어 같은 값을 쓴다. 그 뒤 월요일 교육이 계속되면 여기에 추가한다. */
  const SAFETY_DATES = ['2026-10-06', '2026-10-12', '2026-10-19', '2026-10-26'];
  const pad = (n) => String(n).padStart(2, '0');

  /* 엑셀 일련번호, 날짜 글자('2026.09.01', '2026-10-28 08:30')를 'YYYY-MM-DD'로 바꾼다. */
  function toDate(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') {
      if (!(v > 20000 && v < 80000)) return '';
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
      return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    }
    const m = String(v).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    return m ? m[1] + '-' + pad(Number(m[2])) + '-' + pad(Number(m[3])) : '';
  }
  const text = (v) => (v === null || v === undefined ? '' : String(v).trim());
  const compact = (v) => text(v).replace(/\s+/g, '');

  /* 파이프라인 탭: B열이 '시작일자'인 행을 머리글로, 정확히 'Input'인 열 묶음을 쓴다. */
  function readPipeline(rows) {
    const head = rows.findIndex((r) => text(r[1]) === '시작일자');
    if (head < 0) return { items: [], held: new Set(), error: '시작일자 머리글을 찾지 못했습니다.' };
    const col = rows[head].findIndex((c) => compact(c) === 'Input');
    if (col < 0) return { items: [], held: new Set(), error: 'Input 열을 찾지 못했습니다.' };
    const items = [];
    const seen = new Set();
    const held = new Set();
    for (let i = head + 1; i < rows.length; i++) {
      const r = rows[i];
      const date = toDate(r[1]);
      const unit = text(r[col + 1]);
      if (!date || !unit || unit.startsWith('#')) continue;
      /* Input 오른쪽 메모 칸 세 개에 보류·확인중·취소가 있으면 확정이 아니다(플랫 탭에서도 다시 줍지 않는다). */
      const memo = [r[col + 3], r[col + 4], r[col + 5]].map(text).join(' ');
      if (HOLD_WORDS.some((w) => memo.includes(w))) { held.add(unit); continue; }
      if (seen.has(unit)) continue;
      seen.add(unit);
      items.push({ date, unit, kind: '확정발주' });
    }
    return { items, held };
  }

  /* 플랫 탭: B열이 '계획일'인 행을 머리글로 삼고 열 이름으로 위치를 찾는다. */
  function readFlat(rows, pipeline) {
    const head = rows.findIndex((r) => text(r[1]) === '계획일');
    if (head < 0) return { items: [], error: '계획일 머리글을 찾지 못했습니다.' };
    const find = (name) => rows[head].findIndex((c) => compact(c) === name);
    const cDate = find('계획일');
    const cUnit = find('기종-호기');
    if (cUnit < 0) return { items: [], error: '기종-호기 열을 찾지 못했습니다.' };
    const confirmed = new Set(pipeline.items.map((x) => x.date));
    const known = new Set(pipeline.items.map((x) => x.unit));
    const items = [];
    for (let i = head + 1; i < rows.length; i++) {
      const r = rows[i];
      const date = toDate(r[cDate]);
      const unit = text(r[cUnit]);
      if (!date || !unit || unit.startsWith('#')) continue;
      if (known.has(unit) || pipeline.held.has(unit)) continue;
      known.add(unit);
      if (confirmed.has(date)) continue; /* 이미 확정된 날짜의 예시오더는 지난 예시의 잔재로 본다 */
      items.push({ date, unit, kind: '예시오더' });
    }
    return { items };
  }

  /* 종합 탭 위쪽의 '[ 배포일자 : 10/29일 ]' */
  function readDist(rows) {
    for (let i = 0; i < Math.min(rows.length, 8); i++) {
      for (const c of rows[i]) {
        const m = typeof c === 'string' && c.match(/배포일자\s*:\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
        if (m) return Number(m[1]) + '/' + Number(m[2]);
      }
    }
    return '';
  }

  /* 근무일: 월~금에서 쉬는 날(HOLIDAYS)을 뺀다. */
  function isWorkday(iso) {
    const d = new Date(iso + 'T00:00:00Z');
    const w = d.getUTCDay();
    return w !== 0 && w !== 6 && !HOLIDAYS[iso];
  }
  function nextIso(iso) {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  /* E1·E2 예시오더(flat)의 날짜를 택타임으로 다시 계산한다.
     시작: 확정발주(pipeline)의 마지막 날짜 다음날(단, 설정의 시작일보다 이르면 시작일부터).
     N번째 대수는 가용시간(하루 450분, 안전교육일 390분)을 날짜순으로 쌓아 택타임 x N에 처음 닿는 근무일에 끝난다. */
  function reflow(lineKey, pipeline, flat) {
    const cfg = SHORT_SHIFT[lineKey];
    if (!cfg || !flat.length) return flat;
    const lastConfirmed = pipeline.reduce((m, x) => (x.date > m ? x.date : m), '');
    let day = lastConfirmed ? nextIso(lastConfirmed) : cfg.start;
    if (day < cfg.start) day = cfg.start;
    const out = [];
    let cum = 0;
    let n = 0;
    for (let guard = 0; n < flat.length && guard < 800; guard++, day = nextIso(day)) {
      if (!isWorkday(day)) continue;
      cum += DAY_MINUTES - (SAFETY_DATES.includes(day) ? SAFETY_CUT : 0);
      while (n < flat.length && cum >= cfg.tact * (n + 1) - 1e-9) {
        out.push({ date: day, unit: flat[n].unit, kind: '예시오더(단축조정)', orig: flat[n].date });
        n++;
      }
    }
    return out.concat(flat.slice(n)); /* 800일 안에 못 놓은 나머지는 파일 날짜 그대로 */
  }

  /* 엑셀 읽기 도구(SheetJS)는 생산계획을 올릴 때만 인터넷에서 받는다. */
  let libLoader = null;
  function loadLib() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!libLoader) {
      libLoader = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = () => resolve(window.XLSX);
        s.onerror = () => { libLoader = null; reject(new Error('엑셀 읽기 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.')); };
        document.head.append(s);
      });
    }
    return libLoader;
  }

  /* XLSX: SheetJS, data: 파일 내용(ArrayBuffer). 필요한 탭만 읽는다. */
  function parse(XLSX, data) {
    const wb = XLSX.read(data, { type: 'array', sheets: SHEETS, cellDates: false });
    /* 시트의 사용 범위가 B열이나 중간 행에서 시작해도 열 번호가 A열 기준이 되도록 범위를 A1부터로 넓힌다. */
    const rowsOf = (name) => {
      const ws = wb.Sheets[name];
      if (!ws || !ws['!ref']) return null;
      const rg = XLSX.utils.decode_range(ws['!ref']);
      rg.s.c = 0;
      rg.s.r = 0;
      ws['!ref'] = XLSX.utils.encode_range(rg);
      return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    };
    const out = { dist: '', lines: {}, errors: [] };
    const sum = rowsOf('종합');
    out.dist = sum ? readDist(sum) : '';
    LINES.forEach((l) => {
      const pr = rowsOf(l.pipe);
      const fr = rowsOf(l.flat);
      if (!pr) { out.errors.push(l.label + ': ' + l.pipe + ' 탭이 없습니다.'); }
      const pipeline = pr ? readPipeline(pr) : { items: [], held: new Set() };
      if (pipeline.error) out.errors.push(l.label + ': ' + pipeline.error);
      const flat = fr ? readFlat(fr, pipeline) : { items: [] };
      if (!fr) out.errors.push(l.label + ': ' + l.flat + ' 탭이 없습니다.');
      if (flat.error) out.errors.push(l.label + ': ' + flat.error);
      out.lines[l.key] = { pipeline: pipeline.items, flat: reflow(l.key, pipeline.items, flat.items) };
    });
    return out;
  }

  /* 대상월(YYYY-MM) 한 달만 날짜별·라인별 대수로 센다. 같은 호기+라인은 한 번만 센다. */
  function summarize(parsed, ym) {
    const days = {};
    const totals = LINES.map(() => 0);
    const kinds = { 확정발주: 0, 예시오더: 0 };
    LINES.forEach((l, li) => {
      const seen = new Set();
      /* 정상근무 달(last 다음 달부터)은 재배치하지 않은 파일 날짜(orig)로 센다. */
      const cfg = SHORT_SHIFT[l.key];
      const useFile = !!(cfg && cfg.last && ym > cfg.last);
      const flat = parsed.lines[l.key].flat.map((x) => (useFile && x.orig ? { date: x.orig, unit: x.unit, kind: '예시오더' } : x));
      const all = parsed.lines[l.key].pipeline.concat(flat);
      all.forEach((x) => {
        if (!x.date.startsWith(ym + '-') || seen.has(x.unit)) return;
        seen.add(x.unit);
        (days[x.date] = days[x.date] || [0, 0, 0, 0])[li]++;
        totals[li]++;
        kinds[x.kind === '확정발주' ? '확정발주' : '예시오더']++;
      });
    });
    return { ym, dist: parsed.dist, days, totals, kinds, total: totals.reduce((a, b) => a + b, 0) };
  }

  /* 쉬는 날 이름(달력에서 계획이 없는 날에만 표시). 해마다 확인이 필요한 참고용이다. */
  const HOLIDAYS = {
    '2026-01-01': '신정', '2026-02-16': '설날', '2026-02-17': '설날', '2026-02-18': '설날', '2026-03-01': '삼일절', '2026-03-02': '대체공휴일',
    '2026-05-01': '근로자의 날', '2026-05-05': '어린이날', '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일', '2026-06-03': '지방선거', '2026-06-06': '현충일',
    '2026-08-15': '광복절', '2026-08-17': '대체공휴일', '2026-09-24': '추석', '2026-09-25': '추석', '2026-09-26': '추석', '2026-10-03': '개천절', '2026-10-05': '대체공휴일',
    '2026-10-09': '한글날', '2026-12-25': '성탄절',
    '2027-01-01': '신정', '2027-02-06': '설날', '2027-02-07': '설날', '2027-02-08': '설날', '2027-02-09': '대체공휴일', '2027-03-01': '삼일절', '2027-05-01': '근로자의 날',
    '2027-05-05': '어린이날', '2027-05-13': '부처님오신날', '2027-06-07': '대체공휴일', '2027-08-16': '대체공휴일', '2027-09-14': '추석', '2027-09-15': '추석', '2027-09-16': '추석',
    '2027-10-04': '대체공휴일', '2027-10-11': '대체공휴일', '2027-12-25': '성탄절'
  };

  /* 달력(일~토). 날짜마다 둥근 카드에 E01·E02·L01·D01 대수와 소계를 보여 주고, 일요일 왼쪽에 라인구분 열을 둔다.
     plan: { ym, days } */
  function calendar(plan) {
    const [y, m] = plan.ym.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); /* 일요일 시작 */
    const weeks = Math.ceil((lead + last) / 7);
    const DOW = ['일', '월', '화', '수', '목', '금', '토'];
    const un = (n) => (n ? [String(n), h('span', { class: 'u' }, '대')] : '-');
    const side = () => h('div', { class: 'pc-side' },
      h('span', { class: 'pc-dn' }, h('span', { class: 'full' }, '라인구분'), h('span', { class: 'short' }, '라인')),
      LINES.map((l) => h('span', { class: 'pc-r' }, l.label)),
      h('span', { class: 'pc-r pc-t' }, '소계'));
    const day = (d, col) => {
      if (!d) return h('div', { class: 'pc-day blank' });
      const iso = plan.ym + '-' + pad(d);
      const counts = plan.days[iso] || [0, 0, 0, 0];
      const total = counts.reduce((a, b) => a + b, 0);
      const extra = total > 0 && (col === 0 || col === 6);
      const holiday = !total && HOLIDAYS[iso];
      const chip = extra ? h('span', { class: 'pc-chip' }, '특근') : holiday ? h('span', { class: 'pc-chip hol' }, holiday) : null;
      return h('div', { class: 'pc-day' + (total ? '' : ' idle') },
        h('span', { class: 'pc-dn' }, h('span', null, d === 1 ? m + '/1' : String(d)), chip),
        counts.map((n) => h('span', { class: 'pc-r' + (n ? '' : ' zero') }, un(n))),
        h('span', { class: 'pc-r pc-t' + (total ? '' : ' zero') }, un(total)));
    };
    const rows = [h('div', { class: 'pc-week pc-dow' }, h('div', null, ''), DOW.map((d, i) => h('div', { class: i === 0 ? 'sun' : i === 6 ? 'sat' : '' }, d)))];
    for (let w = 0; w < weeks; w++) {
      const cells = [];
      for (let i = 0; i < 7; i++) {
        const d = w * 7 + i - lead + 1;
        cells.push(day(d >= 1 && d <= last ? d : 0, i));
      }
      rows.push(h('div', { class: 'pc-week' }, side(), cells));
    }
    return h('div', { class: 'plan-panel' },
      h('div', { class: 'pc-title' }, h('strong', null, m + '월 일별 생산계획'), h('span', { class: 'sub' }, '(단위: 대 · 계획)')),
      rows);
  }

  return { LINES, SHEETS, SHORT_SHIFT, SAFETY_DATES, toDate, loadLib, parse, summarize, calendar, HOLIDAYS };
})();
if (typeof module !== 'undefined') module.exports = Plan;
