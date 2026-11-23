/* 월 입력(직장) 화면 부품(2026-11-17): 다기능 습숙표(P1), 장비면허 명부(P2), 작업표준서(TIS) 올리기(Q1·자료실). */
const SheetJs = (() => {
  let p = null;
  return () => {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!p) {
      p = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = () => resolve(window.XLSX);
        s.onerror = () => { p = null; reject(new Error('엑셀 읽기 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.')); };
        document.head.append(s);
      });
    }
    return p;
  };
})();

/* ---------- P1 다기능 습숙표 (Flexibility Chart) ----------
   공정(행) × 인원(열). 칸을 누를 때마다 습숙 단계가 0→1→2→3→4→0으로 바뀐다(2×2 칸: 1 3 / 2 4).
   4단계를 모두 채운 칸만 습숙으로 세어 공정당 습숙인원수, 인당 습숙공정수를 계산한다(목표는 각각 인원·공정 수의 40%). */
const P1_STEPS = [
  ['1단계', '작업내용을 안다.'],
  ['2단계', '조립공장 아이템 취부공정을 안다. 그러나 택타임을 못 맞춘다.'],
  ['3단계', '택타임 내에 품질, 안전을 확보하면서 스스로 작업을 할 수 있다.'],
  ['4단계', '표준작업을 교육할 수 있다.']
];
function p1Mark(level) {
  /* 엑셀 양식과 같은 순서: 왼쪽 위 1, 왼쪽 아래 2, 오른쪽 위 3, 오른쪽 아래 4 */
  return h('span', { class: 'p1-mark', 'aria-hidden': 'true' }, [1, 3, 2, 4].map((n) => h('i', { class: n <= level ? 'on' : '' }, String(n))));
}

window.P1Grid = function (body, ym, dept, data, alive) {
  const src = data.detail || data.prev || null;
  const fromLevels = src && Array.isArray(src.levels);
  let procs = src ? (src.processes || []).map((x) => x.name) : (data.standardProcesses || []).slice();
  let people = src ? (src.people || []).map((x) => x.name) : data.roster.slice();
  if (!procs.length) procs = [''];
  if (!people.length) people = [''];
  let levels = procs.map((p, i) => people.map((q, j) => (fromLevels && src.levels[i] ? Number(src.levels[i][j]) || 0 : 0)));
  const ro = data.closed;
  const box = h('div');
  const r1 = (n) => Math.round(n * 10) / 10;

  function calc() {
    const P = procs.map((p, i) => ({ i, name: p })).filter((x) => x.name.trim());
    const Q = people.map((q, j) => ({ j, name: q })).filter((x) => x.name.trim());
    const pc = (i) => Q.filter((q) => levels[i][q.j] === 4).length;
    const qc = (j) => P.filter((p) => levels[p.i][j] === 4).length;
    const tA = Q.length * 0.4, tB = P.length * 0.4;
    const avgA = P.length ? P.reduce((s, p) => s + pc(p.i), 0) / P.length : 0;
    const avgB = Q.length ? Q.reduce((s, q) => s + qc(q.j), 0) / Q.length : 0;
    const okPeople = Q.filter((q) => qc(q.j) >= tB).length;
    return { P, Q, pc, qc, tA, tB, avgA, avgB, okPeople, value: tA + tB ? (avgA + avgB) / (tA + tB) : 0 };
  }

  function draw() {
    const c = calc();
    const judge = (ok) => h('span', { class: 'chip ' + (ok ? 'good' : 'bad') }, ok ? '달성' : '미달성');
    const nameInput = (list, i, ph) => (ro ? h('span', null, list[i]) : h('input', { class: 'p1-name', value: list[i], placeholder: ph, 'aria-label': ph,
      oninput: (e) => { list[i] = e.target.value; }, onchange: () => draw() }));
    const delBtn = (fn, label) => (ro ? null : h('button', { class: 'picker-x', type: 'button', 'aria-label': label, onclick: fn }, '×'));
    const head = h('tr', null,
      h('th', { class: 'p1-corner' }, '공정 \\ 인원'),
      people.map((q, j) => h('th', { class: 'p1-person' }, nameInput(people, j, '성명'),
        delBtn(() => { people.splice(j, 1); levels.forEach((row) => row.splice(j, 1)); draw(); }, '인원 빼기'))),
      h('th', { class: 'num' }, '계획'), h('th', { class: 'num' }, '실시'), h('th', null, '판정'));
    const rows = procs.map((p, i) => h('tr', null,
      h('th', { class: 'p1-proc' }, nameInput(procs, i, '공정명'), delBtn(() => { procs.splice(i, 1); levels.splice(i, 1); draw(); }, '공정 빼기')),
      people.map((q, j) => h('td', { class: 'p1-cell' }, h('button', {
        type: 'button', class: 'p1-btn lv' + levels[i][j], disabled: ro, 'aria-label': (p || '공정') + ' / ' + (q || '인원') + ' ' + levels[i][j] + '단계',
        onclick: () => { levels[i][j] = (levels[i][j] + 1) % 5; draw(); },
        oncontextmenu: (e) => { e.preventDefault(); levels[i][j] = (levels[i][j] + 4) % 5; draw(); }
      }, p1Mark(levels[i][j])))),
      h('td', { class: 'num' }, p.trim() ? r1(c.tA).toFixed(1) : ''),
      h('td', { class: 'num' }, p.trim() ? c.pc(i).toFixed(1) : ''),
      h('td', null, p.trim() ? judge(c.pc(i) >= c.tA) : '')));
    const foot = [
      h('tr', { class: 'p1-foot' }, h('th', null, '인당 습숙공정수 계획'), people.map((q) => h('td', { class: 'num' }, q.trim() ? r1(c.tB).toFixed(1) : '')), h('td', { colspan: 3 })),
      h('tr', { class: 'p1-foot' }, h('th', null, '인당 습숙공정수 실시'), people.map((q, j) => h('td', { class: 'num' }, q.trim() ? c.qc(j).toFixed(1) : '')), h('td', { colspan: 3 })),
      h('tr', { class: 'p1-foot' }, h('th', null, '판정'), people.map((q, j) => h('td', null, q.trim() ? judge(c.qc(j) >= c.tB) : '')), h('td', { colspan: 3 }))
    ];
    const pct = (n) => (Math.round(n * 1000) / 10) + '%';
    fill(box,
      h('div', { class: 'p1-summary' },
        [['공정당 습숙인원수', r1(c.avgA) + ' / 목표 ' + r1(c.tA)], ['인당 습숙공정수', r1(c.avgB) + ' / 목표 ' + r1(c.tB)],
          ['목표 달성 인원', c.okPeople + ' / ' + c.Q.length + '명'], ['다기능 습숙도(KPI)', pct(c.value)]]
          .map(([a, b]) => h('div', null, h('span', { class: 'sub' }, a), h('strong', null, b)))),
      h('div', { class: 'table-wrap p1-wrap' }, h('table', { class: 'data p1-table' }, h('thead', null, head), h('tbody', null, rows, foot))),
      !ro && h('div', { class: 'row-btns no-print' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { procs.push(''); levels.push(people.map(() => 0)); draw(); } }, '공정 추가'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { people.push(''); levels.forEach((row) => row.push(0)); draw(); } }, '인원 추가')),
      h('div', { class: 'p1-legend' }, h('span', { class: 'sub' }, '칸을 누를 때마다 단계가 하나씩 올라갑니다(4단계 다음은 0). PC에서는 오른쪽 버튼으로 한 단계 내립니다. 4단계를 모두 채운 칸만 습숙으로 셉니다.'),
        h('dl', null, P1_STEPS.map(([a, b], i) => [h('dt', null, p1Mark(i + 1), a), h('dd', null, b)]))));
  }

  const save = h('button', { class: 'btn wide', type: 'button', disabled: ro, onclick: async () => {
    const keepP = procs.map((p, i) => i).filter((i) => procs[i].trim());
    const keepQ = people.map((q, j) => j).filter((j) => people[j].trim());
    if (!keepP.length || !keepQ.length) { UI.toast('공정과 인원을 입력해 주세요.', true); return; }
    save.disabled = true;
    try {
      await Api.call('kpiMonthlySave', { ym, dept, code: 'P1', detail: {
        processes: keepP.map((i) => procs[i].trim()), people: keepQ.map((j) => people[j].trim()),
        levels: keepP.map((i) => keepQ.map((j) => levels[i][j]))
      } });
      UI.toast('저장했습니다.');
    } catch (e) { UI.toast(e.message, true); }
    save.disabled = false;
  } }, '저장');
  const note = ro ? '마감된 월이라 수정할 수 없습니다.'
    : !data.detail && data.prev ? '지난달 내용을 불러왔습니다. 바뀐 부분만 고치고 저장해 주세요.'
      : src && !fromLevels ? '예전 방식으로 저장된 자료라 단계 칸이 비어 있습니다. 칸을 눌러 새로 입력해 주세요.'
        : !src ? '처음 입력하는 달입니다. 공정은 표준서 목록, 인원은 직 명단에서 가져왔습니다.' : '';
  draw();
  body.replaceChildren(h('div', { class: 'p1-sheet print-page' },
    h('div', { class: 'p1-title' }, h('h2', null, '다기능 습숙표 (Flexibility Chart)'), h('span', { class: 'sub' }, dept + ' · ' + ym.replace('-', '년 ') + '월')),
    note && h('p', { class: 'sub no-print' }, note), box,
    h('div', { class: 'row-btns no-print' }, save, h('button', { class: 'btn ghost pc-only', type: 'button', onclick: () => window.print() }, '인쇄'))));
};

/* ---------- P2 장비면허 명부 ----------
   KPI 관리자는 전체, 직장은 자기 직 인원만 보고 고친다. 자격증 사진은 비공개로 저장하고 누를 때만 서버에서 받아 보여 준다. */
window.LicenseBox = function (host, alive) {
  const KINDS = ['지게차', '건설기계'];
  let filter = '';
  const load = () => Api.call('licenseList').then((d) => {
    if (!alive()) return;
    const depts = d.depts.length ? d.depts : ['물류1직', '물류2직', '물류3직', '물류4직', '팀'];
    const f = { name: h('input', { placeholder: '성명', 'aria-label': '성명' }), dept: UI.select('dept', depts, depts[0]), kind: UI.select('kind', KINDS, KINDS[0]),
      expires: h('input', { type: 'date', 'aria-label': '유효기간' }), note: h('input', { placeholder: '비고', 'aria-label': '비고' }) };
    const add = async () => {
      try { await Api.call('licenseSave', { name: f.name.value, dept: f.dept.value, kind: f.kind.value, expires: f.expires.value, note: f.note.value }); UI.toast('저장했습니다.'); load(); }
      catch (e) { UI.toast(e.message, true); }
    };
    const shownDepts = [...new Set(d.rows.map((r) => r.v[1]))].sort();
    const fsel = h('select', { 'aria-label': '소속 거르기', onchange: (e) => { filter = e.target.value; draw(); } }, h('option', { value: '' }, '전체 소속'), shownDepts.map((x) => h('option', { value: x, selected: x === filter }, x)));
    const today = new Date().toISOString().slice(0, 10);
    const tbody = h('tbody');
    const photoCell = (r) => {
      const cell = h('div', { class: 'lic-photos' });
      for (let i = 0; i < r.photos; i++) {
        cell.append(h('button', { class: 'link', type: 'button', onclick: async () => {
          try { const x = await Api.call('licensePhoto', { rowNo: r.rowNo, name: r.v[0], index: i }); UI.lightbox('data:image/jpeg;base64,' + x.data); }
          catch (e) { UI.toast(e.message, true); }
        } }, '사진' + (i + 1)));
        if (r.canEdit) cell.append(h('button', { class: 'picker-x mini', type: 'button', 'aria-label': '사진' + (i + 1) + ' 빼기', onclick: async () => {
          if (!confirm(r.v[0] + '님의 사진' + (i + 1) + '을 뺄까요?')) return;
          try { await Api.call('licensePhotoDelete', { rowNo: r.rowNo, name: r.v[0], index: i }); load(); } catch (e) { UI.toast(e.message, true); }
        } }, '×'));
      }
      if (r.canEdit && r.photos < 4) {
        const input = h('input', { type: 'file', accept: 'image/*,.heic,.heif', hidden: true, onchange: async () => {
          const file = input.files[0];
          if (!file) return;
          try { await Api.call('licensePhotoAdd', { rowNo: r.rowNo, name: r.v[0], data: await ImageTool.compress(file) }); UI.toast('사진을 올렸습니다.'); load(); }
          catch (e) { UI.toast(e.message, true); }
        } });
        cell.append(input, h('button', { class: 'btn ghost mini', type: 'button', onclick: () => input.click() }, '사진 추가'));
      } else if (!r.photos) cell.append(h('span', { class: 'sub' }, '-'));
      return cell;
    };
    const draw = () => {
      const rows = d.rows.filter((r) => !filter || r.v[1] === filter);
      tbody.replaceChildren(...rows.map((r) => h('tr', null,
        h('td', null, r.v[0]), h('td', null, r.v[1]), h('td', null, r.v[2]),
        h('td', { class: r.v[3] && r.v[3] < today ? 'bad' : '' }, r.v[3] || '-', r.v[3] && r.v[3] < today ? ' (만료)' : ''),
        h('td', null, r.v[4]), h('td', null, photoCell(r)),
        h('td', null, r.canEdit && h('button', { class: 'link', type: 'button', onclick: async () => {
          if (!confirm(r.v[0] + '님의 ' + r.v[2] + ' 면허를 명부에서 지울까요?')) return;
          try { await Api.call('licenseDelete', { rowNo: r.rowNo, name: r.v[0] }); load(); } catch (e) { UI.toast(e.message, true); }
        } }, '삭제')))));
    };
    draw();
    fill(host,
      h('p', { class: 'sub' }, d.canImport ? '전체 명부입니다. 자격증 사진(면허증, 안전교육 이수증)은 개인정보라 권한자만 볼 수 있습니다.' : '내 직 인원의 명부입니다. 자격증 사진(면허증, 안전교육 이수증)은 개인정보라 권한자만 볼 수 있습니다.'),
      d.canEdit && h('div', { class: 'toolbar wrap-row' }, f.name, f.dept, f.kind, f.expires, f.note, h('button', { class: 'btn', type: 'button', onclick: add }, '추가')),
      d.canEdit && bulkPhotos(d.rows.filter((r) => r.canEdit), load),
      d.canImport && window.LicenseImportBox ? window.LicenseImportBox(load, d.rows) : null,
      shownDepts.length > 1 && h('div', { class: 'toolbar' }, fsel, h('span', { class: 'sub' }, d.rows.length + '건')),
      h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
        h('thead', null, h('tr', null, ['성명', '소속', '면허종류', '유효기간', '비고', '자격증 사진', ''].map((x) => h('th', null, x)))), tbody)));
  }, (e) => { if (alive()) host.replaceChildren(UI.error(e.message, load)); });
  host.replaceChildren(UI.skeleton(5));
  load();
};

/* 자격증 사진 일괄 등록: 파일 이름 맨 앞의 성명(예: 홍길동_면허증.jpg)으로 명부의 사람을 찾아 올린다. */
function bulkPhotos(rows, reload) {
  const info = h('p', { class: 'sub' });
  let jobs = [];
  const btn = h('button', { class: 'btn', type: 'button', disabled: true });
  btn.textContent = '사진 올리기';
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true, onchange: () => {
    const byName = {};
    rows.forEach((r) => { if (!byName[r.v[0]]) byName[r.v[0]] = r; });
    const files = Array.from(input.files);
    const missing = [];
    jobs = [];
    files.forEach((file) => {
      const name = String(file.name).replace(/\.[^.]+$/, '').split('_')[0].trim();
      if (byName[name]) jobs.push({ file, row: byName[name] }); else missing.push(file.name);
    });
    info.textContent = files.length + '장 중 ' + jobs.length + '장을 명부의 사람과 맞췄습니다.' + (missing.length ? ' 맞는 사람이 없는 파일 ' + missing.length + '장: ' + missing.slice(0, 5).join(', ') + (missing.length > 5 ? ' 등' : '') : '');
    btn.disabled = !jobs.length;
  } });
  btn.onclick = async () => {
    if (!confirm(jobs.length + '장을 올릴까요? 한 사람당 최대 4장까지 들어갑니다.')) return;
    btn.disabled = true;
    let ok = 0, failed = 0;
    for (let i = 0; i < jobs.length; i++) {
      info.textContent = '올리는 중 ' + (i + 1) + ' / ' + jobs.length;
      try { await Api.call('licensePhotoAdd', { rowNo: jobs[i].row.rowNo, name: jobs[i].row.v[0], data: await ImageTool.compress(jobs[i].file) }); ok++; }
      catch (e) { failed++; }
    }
    info.textContent = '완료: ' + ok + '장 올림' + (failed ? ', ' + failed + '장 실패(이미 4장이 있거나 명부가 바뀜)' : '');
    UI.toast('사진 ' + ok + '장을 올렸습니다.');
    reload();
  };
  return h('details', { class: 'config' }, h('summary', null, '자격증 사진 일괄 등록'),
    h('div', { class: 'narrow' },
      h('p', { class: 'sub' }, '사진 파일 이름을 "성명_면허증.jpg", "성명_이수증.jpg"처럼 성명으로 시작하게 한 뒤 여러 장을 한꺼번에 고릅니다.'),
      UI.field('사진 파일(여러 장)', input), info, btn));
}

/* ---------- 작업표준서(TIS) 올리기: 표준서 제/개정(Q1) + 자료실 ----------
   엑셀 파일의 시트 이름에서 'TIS'가 들어간 시트를 공정으로 읽는다. 새 공정은 제정, 이미 있는 공정은 고쳤을 때만 개정으로 고른다.
   파일은 자료실(직별, 비공개)에 저장한다. opts: { depts: [..], dept, onDone } */
window.TisUpload = function (opts) {
  const depts = opts.depts;
  const deptSel = UI.select('dept', depts, opts.dept && depts.includes(opts.dept) ? opts.dept : depts[0]);
  const today = App.home.today;
  const date = h('input', { type: 'date', value: today, max: today, 'aria-label': '제/개정 일자' });
  const file = h('input', { type: 'file', accept: '.xlsx,.xlsm,.xls,.xlsb' });
  const preview = h('div');
  const MAX = 10 * 1048576;
  const canApply = (dept) => UI.has('KPI_MANAGER') || UI.checkDepts().includes(dept);
  let items = [];

  async function read() {
    const f = file.files[0];
    preview.replaceChildren();
    if (!f) return;
    if (f.size > MAX) { preview.append(h('p', { class: 'form-error' }, '파일이 10MB를 넘습니다(지금 ' + UI.size(f.size) + '). 그림 용량을 줄이거나 TIS 시트만 남겨 10MB 이하로 다시 올려 주세요.')); return; }
    preview.append(UI.skeleton(2));
    let names = [];
    let have = [];
    try {
      const X = await SheetJs();
      names = X.read(await f.arrayBuffer(), { type: 'array', bookSheets: true }).SheetNames;
      if (canApply(deptSel.value)) have = (await Api.call('standardList', { dept: deptSel.value })).rows.filter((r) => r.v[4] !== '개정').map((r) => r.v[2]);
    } catch (e) { preview.replaceChildren(h('p', { class: 'form-error' }, e.message || '파일을 읽지 못했습니다.')); return; }
    const tis = names.filter((n) => /TIS/i.test(n));
    const procOf = (n) => n.replace(/\s*TIS\s*/i, ' ').replace(/\s+/g, ' ').trim();
    items = tis.map((n, i) => {
      const process = procOf(n);
      const known = have.includes(process);
      return { no: String(i + 1), process, known, kind: known ? '' : '제정' };
    });
    const gone = have.filter((p) => !items.some((x) => x.process === p));
    const rows = items.map((it) => h('tr', null, h('td', null, it.no), h('td', null, it.process),
      h('td', null, it.known
        ? h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e) => { it.kind = e.target.checked ? '개정' : ''; } }), h('span', null, '고침(개정)'))
        : h('span', { class: 'chip good' }, '제정(새 공정)'))));
    fill(preview,
      tis.length ? h('p', { class: 'sub' }, '이 파일의 TIS 시트(공정) ' + tis.length + '개를 찾았습니다. 이미 있는 공정은 내용을 고친 경우에만 "고침(개정)"에 체크해 주세요.')
        : h('p', { class: 'form-error' }, 'TIS 시트를 찾지 못했습니다. 파일만 자료실에 올리고 표준서 실적은 바꾸지 않습니다.'),
      !canApply(deptSel.value) && h('p', { class: 'sub' }, '이 직의 표준서 실적을 입력할 권한이 없어 파일만 자료실에 올립니다.'),
      tis.length > 0 && h('div', { class: 'table-wrap' }, h('table', { class: 'data' }, h('thead', null, h('tr', null, ['번호', '공정(TIS 시트)', '제/개정'].map((x) => h('th', null, x)))), h('tbody', null, rows))),
      gone.length > 0 && h('p', { class: 'sub' }, '파일에 없는 기존 공정 ' + gone.length + '개(' + gone.slice(0, 5).join(', ') + (gone.length > 5 ? ' 등' : '') + ')는 그대로 둡니다. 없어진 공정이면 아래 표준서 목록에서 지워 주세요.'));
  }
  file.onchange = read;
  deptSel.onchange = () => { if (file.files[0]) read(); };
  const result = h('p', { class: 'sub' });
  const btn = h('button', { class: 'btn', type: 'button', onclick: async () => {
    const f = file.files[0];
    if (!f) { UI.toast('작업표준서 엑셀 파일을 골라 주세요.', true); return; }
    if (f.size > MAX) { UI.toast('파일이 10MB를 넘습니다(지금 ' + UI.size(f.size) + '). 10MB 이하로 줄여 다시 올려 주세요.', true); return; }
    const dept = deptSel.value;
    const apply = canApply(dept) ? items.filter((x) => x.kind) : [];
    if (!confirm(dept + ' 작업표준서를 자료실에 올립니다.' + (apply.length ? ' 표준서 실적에 제정 ' + apply.filter((x) => x.kind === '제정').length + '건, 개정 ' + apply.filter((x) => x.kind === '개정').length + '건을 더합니다.' : '') + ' 진행할까요?')) return;
    btn.disabled = true;
    try {
      result.textContent = '파일을 올리는 중입니다(' + UI.size(f.size) + '). 잠시만 기다려 주세요.';
      await Api.call('libraryUpload', { dept, category: '작업표준서', name: f.name, title: dept + ' 작업표준서(TIS)', data: await UI.fileBase64(f) });
      if (apply.length) {
        result.textContent = '표준서 실적을 반영하는 중입니다.';
        await Api.call('standardApply', { dept, date: date.value, items: apply.map((x) => ({ no: x.no, process: x.process, kind: x.kind })) });
      }
      result.textContent = '완료했습니다.';
      UI.toast('작업표준서를 올렸습니다.');
      file.value = ''; preview.replaceChildren(); items = [];
      if (opts.onDone) opts.onDone(dept);
    } catch (e) { result.textContent = e.message; }
    btn.disabled = false;
  } }, '올리기');
  return h('div', { class: 'tis-up' },
    h('div', { class: 'toolbar wrap-row' }, depts.length > 1 ? deptSel : h('strong', null, depts[0]), h('span', { class: 'sub' }, '제/개정 일자'), date),
    UI.field('작업표준서 엑셀 파일 (10MB까지)', file), preview, h('div', { class: 'row-btns' }, btn), result);
};
