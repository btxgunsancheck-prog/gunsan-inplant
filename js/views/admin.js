/* 관리자 메뉴: 사용자 관리, 장비면허 명부, 목표·평가기준, 데이터 관리(작업기록 포함). */
(() => {
  function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  /* 지금 명부를 일괄 등록 파일과 같은 모양으로 내려받는다. 엑셀에서 한글이 깨지지 않게 UTF-8(BOM)으로 저장한다. */
  function downloadCsv(name, head, rows) {
    const q = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const text = '\ufeff' + [head].concat(rows).map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  /* 엑셀의 'CSV UTF-8'과 'CSV(쉼표로 분리)'(한글 ANSI) 저장 파일을 모두 읽는다 */
  async function readCsv(file) {
    const buf = await file.arrayBuffer();
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { text = new TextDecoder('euc-kr').decode(buf); }
    return parseCsv(text.replace(/^\ufeff/, ''));
  }
  /* 엑셀이 바꿔 놓은 날짜(2027.3.1, 2027/3/1)를 2027-03-01로 맞춘다 */
  const normDate = (v) => {
    const s = String(v || '').trim();
    const m = s.match(/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\.?$/);
    return m ? m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0') : s;
  };
  const today = () => { const d = new Date(); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
  const steps = (...lines) => h('ol', { class: 'steps' }, lines.map((x) => h('li', null, x)));

  const PERM_NAME = {
    USER: '기본(로그인, 게시판, 건의, 소속 직 KPI)', KPI_VIEW_ALL: 'KPI 전체 열람', VIEW_EXEC: '열람 전용(사업부장)', NOTICE_WRITE: '공지 작성',
    'KPI_CHECK:물류1직': '물류1직 확인(직장)', 'KPI_CHECK:물류2직': '물류2직 확인(직장)', 'KPI_CHECK:물류3직': '물류3직 확인(직장)', 'KPI_CHECK:물류4직': '물류4직 확인(직장)',
    KPI_TEAM: '팀 KPI 관리, 월 마감', KPI_MANAGER: '관리자 입력(장비면허)', UPLOAD_ABNORMAL: '이상발생 업로드', UPLOAD_INVENTORY: '순환재고 업로드',
    SUGGEST_VIEW: '건의 전체 열람·답변', SUGGEST_READ: '건의 전체 열람(관제)', ADMIN: '관리자 메뉴 전체'
  };
  const stateOf = (u) => (!u.site ? '미등록' : !u.active ? '사용 중지' : u.locked ? '잠김' : u.mustChange ? '첫 로그인 전' : '사용');
  const stateClass = { 사용: 'good', '사용 중지': 'bad', 잠김: 'bad', '첫 로그인 전': 'warn', 미등록: '' };

  function importBox(getData) {
    let rows = [];
    const info = h('p', { class: 'sub' });
    const btn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: async () => {
      btn.disabled = true;
      info.textContent = '등록하는 중입니다.';
      try {
        const r = await Api.call('importUsers', { rows });
        info.textContent = '완료: 기존 사용자 ' + r.updated + '명 수정, 새 사용자 ' + r.added + '명 추가, 사진 ' + r.photos + '장 등록';
        App.refreshInit();
      } catch (e) { info.textContent = e.message; btn.disabled = false; }
    } }, '일괄 등록');
    const input = h('input', { type: 'file', accept: '.csv,text/csv', onchange: async () => {
      const file = input.files[0];
      if (!file) return;
      const grid = await readCsv(file);
      const head = grid[0] || [];
      const at = (name) => head.indexOf(name);
      if (['사번', '성명', '직급', '소속', '권한', '사진Base64'].some((n) => at(n) < 0)) { info.textContent = '파일 머리글이 올바르지 않습니다.'; btn.disabled = true; return; }
      rows = grid.slice(1).filter((r) => r[at('사번')]).map((r) => ({
        empNo: r[at('사번')], name: r[at('성명')], rank: r[at('직급')], dept: r[at('소속')], perms: r[at('권한')], photo: r[at('사진Base64')]
      }));
      info.textContent = rows.length + '명, 사진 ' + rows.filter((r) => r.photo).length + '장을 읽었습니다. 일괄 등록을 눌러 주세요.';
      btn.disabled = false;
    } });
    const download = () => {
      const d = getData();
      if (!d) { UI.toast('명부를 아직 불러오지 못했습니다.', true); return; }
      const rows = d.rows.filter((u) => u.site).map((u) => [u.empNo, u.name, u.rank, u.dept, u.perms.concat(u.siteOff ? ['OFF'] : []).join(','), '']);
      downloadCsv('users_import_' + today() + '.csv', ['사번', '성명', '직급', '소속', '권한', '사진Base64'], rows);
    };
    return h('details', { class: 'config' }, h('summary', null, 'CSV 파일로 일괄 등록 (users_import.csv)'),
      h('div', { class: 'narrow' },
        steps('현재 명부를 내려받아 엑셀에서 고칩니다.', '저장할 때 파일 형식은 CSV UTF-8 또는 CSV(쉼표로 분리)를 고릅니다.', '고친 파일을 올리고 일괄 등록을 누릅니다.'),
        h('button', { class: 'btn ghost', type: 'button', onclick: download }, '현재 명부 내려받기'),
        h('p', { class: 'sub' }, '사이트 사용자만 내려받습니다. 이미 있는 사람은 권한만 바뀌고, 성명·직급·소속은 위 표에서 한 명씩 고칩니다. 사진 칸이 비어 있으면 기존 사진을 그대로 두며, 파일에 없는 사람은 지워지지 않습니다.'),
        UI.field('CSV 파일', input), info, btn));
  }

  function editor(u, d, done) {
    const isNew = !u;
    const x = u || { empNo: '', name: '', rank: '사원', dept: '물류1직', perms: ['USER'], site: false };
    const register = isNew || !x.site;
    const f = {
      empNo: h('input', { value: x.empNo, disabled: !isNew, autocapitalize: 'characters', 'aria-label': '사번' }),
      name: h('input', { value: x.name, 'aria-label': '성명' }),
      rank: h('input', { value: x.rank, 'aria-label': '직급' }),
      dept: UI.select('dept', d.depts, x.dept)
    };
    const boxes = d.perms.map((p) => ({ p, el: h('input', { type: 'checkbox', checked: x.perms.includes(p) || p === 'USER', disabled: p === 'USER' }) }));
    const act = (action, msg, extra) => async () => {
      if (msg && !confirm(msg)) return;
      try { await Api.call(action, Object.assign({ empNo: x.empNo }, extra || {})); UI.toast('처리했습니다.'); done(); } catch (e) { UI.toast(e.message, true); }
    };
    const save = async () => {
      try {
        await Api.call('userSave', { isNew: register, empNo: f.empNo.value, name: f.name.value, rank: f.rank.value, dept: f.dept.value, perms: boxes.filter((b) => b.el.checked).map((b) => b.p) });
        UI.toast(register ? '등록했습니다. 첫 비밀번호는 사번입니다.' : '저장했습니다.');
        done();
      } catch (e) { UI.toast(e.message, true); }
    };
    const stopMsg = x.name + '님의 사이트 사용을 중지할까요? QR장비점검 사용은 그대로입니다.';
    return h('div', { class: 'tile user-edit' },
      h('h2', { class: 'block-h' }, isNew ? '새 사용자 등록' : x.name + ' (' + x.empNo + ')' + (x.site ? '' : ' 사이트 등록')),
      h('div', { class: 'toolbar wrap-row' }, UI.field('사번', f.empNo), UI.field('성명', f.name), UI.field('직급', f.rank), UI.field('소속', f.dept)),
      h('p', { class: 'field-label' }, '권한'),
      h('div', { class: 'perm-grid' }, boxes.map((b) => h('label', { class: 'check' }, b.el, h('span', null, PERM_NAME[b.p] || b.p)))),
      h('p', { class: 'sub' }, '성명, 직급, 소속은 QR장비점검과 함께 쓰는 정보라 바꾸면 QR장비점검에도 반영됩니다.'),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn', type: 'button', onclick: save }, register ? '등록' : '저장'),
        !register && h('button', { class: 'btn ghost', type: 'button', onclick: act('userReset', x.name + '님의 비밀번호를 사번으로 초기화할까요?') }, '비밀번호 초기화'),
        !register && x.locked && h('button', { class: 'btn ghost', type: 'button', onclick: act('userUnlock') }, '잠금 해제'),
        !register && x.empNo !== d.me && h('button', { class: 'btn ghost', type: 'button', onclick: act('userActive', x.active ? stopMsg : '', { active: !x.active }) }, x.active ? '사용 중지' : '사용 재개'),
        h('button', { class: 'link', type: 'button', onclick: () => done(true) }, '닫기')));
  }

  /* 휴대폰에서는 관리 화면이 좁으므로 PC 이용을 안내한다. */
  const pcNotice = () => h('p', { class: 'pc-notice m-only', role: 'note' }, '관리자 화면은 표와 입력 칸이 많아 PC에서 이용하시는 것이 편합니다.');

  Router.add('/admin/users', (params, app, alive) => {
    if (!UI.has('ADMIN')) { app.replaceChildren(UI.placeholder('권한이 없습니다')); return; }
    const body = h('div', null, UI.skeleton(8));
    const edit = h('div');
    const search = h('input', { type: 'search', placeholder: '사번, 성명, 소속 검색', 'aria-label': '검색' });
    const showAll = h('input', { type: 'checkbox' });
    let data = null;
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const rows = data.rows.filter((u) => (showAll.checked || u.site) && (!q || [u.empNo, u.name, u.dept, u.rank].join(' ').toLowerCase().includes(q)));
      fill(body, h('p', { class: 'sub' }, rows.length + '명'),
        h('div', { class: 'table-wrap' }, h('table', { class: 'data click' },
          h('thead', null, h('tr', null, ['사번', '성명', '직급', '소속', '상태', '권한', '최종 로그인'].map((t) => h('th', null, t)))),
          h('tbody', null, rows.map((u) => h('tr', { onclick: () => open(u) },
            h('td', null, u.empNo), h('td', null, u.name), h('td', null, u.rank), h('td', null, u.dept),
            h('td', { class: stateClass[stateOf(u)] }, stateOf(u)),
            h('td', { class: 'pre' }, u.perms.filter((p) => p !== 'USER').map((p) => PERM_NAME[p] || p).join(', ') || '기본'),
            h('td', null, u.lastLogin || '-')))))));
    };
    const open = (u) => {
      fill(edit, editor(u, data, (close) => { edit.replaceChildren(); if (!close) load(); }));
      edit.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const load = () => Api.call('userAdminList').then((d) => { if (!alive()) return; data = d; draw(); }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    search.oninput = () => data && draw();
    showAll.onchange = () => data && draw();
    app.replaceChildren(UI.hero('사용자 관리', '줄을 누르면 수정, 비밀번호 초기화, 잠금 해제, 사용 중지를 할 수 있습니다.'), pcNotice(),
      h('section', { class: 'section' }, h('div', { class: 'wrap wide' },
        h('div', { class: 'toolbar wrap-row' }, search, h('label', { class: 'check' }, showAll, h('span', null, 'QR장비점검에만 있는 사람도 보기')),
          h('button', { class: 'btn', type: 'button', onclick: () => open(null) }, '새 사용자 등록')),
        edit, body, importBox(() => data))));
    load();
  });

  function licenseImportBox(reload, current) {
    let rows = [];
    const info = h('p', { class: 'sub' }, '파일을 올리면 지금 명부 전체가 파일 내용으로 바뀝니다.');
    const btn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: async () => {
      if (!confirm('현재 명부 전체를 파일 내용(' + rows.length + '명)으로 바꿀까요? 장비면허 취득현황 실적이 다시 계산됩니다.')) return;
      btn.disabled = true;
      info.textContent = '등록하는 중입니다.';
      try { const r = await Api.call('licenseImport', { rows }); UI.toast(r.count + '명을 등록했습니다.'); reload(); }
      catch (e) { info.textContent = e.message; btn.disabled = false; }
    } }, '명부 일괄 등록');
    const input = h('input', { type: 'file', accept: '.csv,text/csv', onchange: async () => {
      const file = input.files[0];
      if (!file) return;
      const grid = await readCsv(file);
      const head = grid[0] || [];
      const at = (name) => head.indexOf(name);
      if (['성명', '소속', '면허종류', '유효기간', '비고'].some((n) => at(n) < 0)) { info.textContent = '파일 머리글이 올바르지 않습니다.'; btn.disabled = true; return; }
      rows = grid.slice(1).filter((r) => r[at('성명')]).map((r) => ({ name: r[at('성명')], dept: r[at('소속')], kind: r[at('면허종류')], expires: normDate(r[at('유효기간')]), note: r[at('비고')] }));
      info.textContent = rows.length + '명을 읽었습니다. 명부 일괄 등록을 눌러 주세요.';
      btn.disabled = false;
    } });
    const download = () => downloadCsv('license_import_' + today() + '.csv', ['성명', '소속', '면허종류', '유효기간', '비고'], current.map((r) => r.v.slice(0, 5)));
    return h('details', { class: 'config' }, h('summary', null, 'CSV 파일로 일괄 등록 (license_import.csv)'),
      h('div', { class: 'narrow' },
        steps('현재 명부를 내려받아 엑셀에서 고칩니다.', '저장할 때 파일 형식은 CSV UTF-8 또는 CSV(쉼표로 분리)를 고릅니다.', '고친 파일을 올리고 명부 일괄 등록을 누릅니다.'),
        h('button', { class: 'btn ghost', type: 'button', onclick: download }, '현재 명부 내려받기 (' + current.length + '명)'),
        UI.field('CSV 파일', input), info, btn));
  }

  Router.add('/admin/license', (params, app, alive) => {
    if (!UI.hasAny(['KPI_MANAGER', 'VIEW_EXEC'])) { app.replaceChildren(UI.placeholder('권한이 없습니다')); return; }
    const body = h('div', { class: 'wrap' }, UI.skeleton(6));
    const depts = ['물류1직', '물류2직', '물류3직', '물류4직', '팀'];
    const load = () => Api.call('licenseList').then((d) => {
      if (!alive()) return;
      const f = { name: h('input', { placeholder: '성명', 'aria-label': '성명' }), dept: UI.select('dept', depts, depts[0]), kind: UI.select('kind', ['지게차', '건설기계'], '지게차'), expires: h('input', { type: 'date', 'aria-label': '유효기간' }), note: h('input', { placeholder: '비고', 'aria-label': '비고' }) };
      const add = async () => {
        try { await Api.call('licenseSave', { name: f.name.value, dept: f.dept.value, kind: f.kind.value, expires: f.expires.value, note: f.note.value }); UI.toast('저장했습니다.'); load(); }
        catch (e) { UI.toast(e.message, true); }
      };
      fill(body,
        d.canEdit && licenseImportBox(load, d.rows),
        d.canEdit && h('div', { class: 'toolbar wrap-row' }, f.name, f.dept, f.kind, f.expires, f.note, h('button', { class: 'btn', type: 'button', onclick: add }, '추가')),
        h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, ['성명', '소속', '면허종류', '유효기간', '비고', ''].map((x) => h('th', null, x)))),
          h('tbody', null, d.rows.map((r) => h('tr', null, [0, 1, 2, 3, 4].map((i) => h('td', null, r.v[i])),
            h('td', null, d.canEdit && h('button', { class: 'link', type: 'button', onclick: async () => {
              try { await Api.call('licenseDelete', { rowNo: r.rowNo }); load(); } catch (e) { UI.toast(e.message, true); }
            } }, '삭제'))))))));
    }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    app.replaceChildren(UI.hero('장비면허 명부'), pcNotice(), h('section', { class: 'section' }, body));
    load();
  });

  Router.add('/admin/targets', (params, app, alive) => {
    if (!UI.hasAny(['ADMIN', 'KPI_TEAM', 'VIEW_EXEC'])) { app.replaceChildren(UI.placeholder('권한이 없습니다')); return; }
    const body = h('div', { class: 'wrap wide' }, UI.skeleton(8));
    const load = () => Api.call('targetsGet', {}).then((d) => {
      if (!alive()) return;
      const inputs = [];
      const cell = (rowIdx, field, value) => {
        if (!d.canEdit) return h('td', null, value);
        const el = h('input', { value, 'aria-label': field, class: 'cell' });
        inputs.push({ rowIdx, field, el });
        return h('td', null, el);
      };
      const save = async () => {
        const map = {};
        inputs.forEach(({ rowIdx, field, el }) => { (map[rowIdx] = map[rowIdx] || { code: d.rows[rowIdx][0], dept: d.rows[rowIdx][1] })[field] = el.value; });
        try { await Api.call('targetSave', { rows: Object.values(map) }); UI.toast('저장했습니다.'); load(); } catch (e) { UI.toast(e.message, true); }
      };
      fill(body,
        d.canEdit && h('div', { class: 'row-btns' }, h('button', { class: 'btn', type: 'button', onclick: save }, '목표 저장'),
          h('span', { class: 'sub' }, 'GREEN 기준: 달성률(1 = 100%), ZERO = 0건, LE = 목표 이하. 비우면 판정하지 않습니다.')),
        h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, ['지표', '직', '단위', '방향', '전년실적', '월목표', 'GREEN', 'YELLOW', '설명'].map((x) => h('th', null, x)))),
          h('tbody', null, d.rows.map((r, i) => h('tr', null, h('td', null, r[0]), h('td', null, r[1]), h('td', null, r[2]), h('td', null, r[3]),
            cell(i, 'prior', r[4]), cell(i, 'target', r[5]), cell(i, 'green', r[6]), cell(i, 'yellow', r[7]), cell(i, 'desc', r[8])))))),
        h('h2', { class: 'block-h' }, '선택지'),
        d.options.map((o) => {
          const input = h('input', { value: o[2], disabled: !d.canEdit, 'aria-label': o[1] });
          return UI.field(o[0] + ' ' + o[1], h('div', { class: 'toolbar' }, input, d.canEdit && h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
            try { await Api.call('optionSave', { code: o[0], name: o[1], values: input.value }); UI.toast('저장했습니다.'); App.refreshInit(); } catch (e) { UI.toast(e.message, true); }
          } }, '저장')));
        }));
    }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    app.replaceChildren(UI.hero('목표·평가기준'), pcNotice(), h('section', { class: 'section' }, body));
    load();
  });

  function logs() {
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    const ymd = (x) => x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
    const from = h('input', { type: 'date', value: ymd(new Date(d.getTime() - 29 * 86400000)), 'aria-label': '시작일' });
    const to = h('input', { type: 'date', value: ymd(d), 'aria-label': '종료일' });
    const q = h('input', { type: 'search', placeholder: '성명, 동작, 내용 검색', 'aria-label': '검색' });
    const body = h('div', null, UI.skeleton(5));
    let page = 1;
    const load = () => Api.call('logList', { from: from.value, to: to.value, q: q.value, page }).then((r) => {
      fill(body, h('p', { class: 'sub' }, r.from + ' ~ ' + r.to + ', ' + r.total + '건'),
        r.items.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, ['일시', '성명', '동작', '대상', '내용'].map((t) => h('th', null, t)))),
          h('tbody', null, r.items.map((x) => h('tr', null, h('td', null, x.at), h('td', null, x.name ? x.name + ' (' + x.empNo + ')' : x.empNo),
            h('td', null, x.action), h('td', null, x.target), h('td', { class: 'pre' }, x.content)))))) : h('p', { class: 'sub' }, '기록이 없습니다.'),
        UI.pager(r.page, r.size, r.total, (n) => { page = n; load(); }) || '');
    }, (e) => body.replaceChildren(UI.error(e.message, load)));
    const form = h('form', { class: 'toolbar wrap-row', onsubmit: (e) => { e.preventDefault(); page = 1; load(); } }, from, to, q, h('button', { class: 'btn ghost', type: 'submit' }, '조회'));
    load();
    return h('div', null, h('h2', { class: 'block-h' }, '작업 기록'), form, body);
  }

  function qrImportBox() {
    let rows = [];
    const info = h('p', { class: 'sub' }, '장비를 추가하거나 주소가 바뀌었을 때만 올립니다. 올리면 기존 목록이 새 파일 내용으로 바뀝니다.');
    const btn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: async () => {
      btn.disabled = true;
      info.textContent = '등록하는 중입니다.';
      try { const r = await Api.call('qrImport', { rows }); info.textContent = '완료: 장비 ' + r.count + '대를 등록했습니다.'; }
      catch (e) { info.textContent = e.message; btn.disabled = false; }
    } }, '장비 목록 등록');
    const input = h('input', { type: 'file', accept: '.csv,text/csv', onchange: async () => {
      const file = input.files[0];
      if (!file) return;
      const grid = await readCsv(file);
      const head = grid[0] || [];
      const at = (name) => head.indexOf(name);
      if (['장비ID', '장비명', '장비군', '주소'].some((n) => at(n) < 0)) { info.textContent = '파일 머리글이 올바르지 않습니다.'; btn.disabled = true; return; }
      rows = grid.slice(1).filter((r) => r[at('장비ID')]).map((r) => ({ id: r[at('장비ID')], name: r[at('장비명')], group: r[at('장비군')], url: r[at('주소')] }));
      info.textContent = '장비 ' + rows.length + '대를 읽었습니다. 장비 목록 등록을 눌러 주세요.';
      btn.disabled = false;
    } });
    const download = async () => {
      try {
        const d = await Api.call('qrList');
        const rows = [];
        d.groups.forEach((g) => g.items.forEach((x) => rows.push([x.id, x.name, g.group, g.dept, x.url])));
        if (!rows.length) { UI.toast('등록된 장비가 없습니다.', true); return; }
        downloadCsv('QR장비_import_' + today() + '.csv', ['장비ID', '장비명', '장비군', '소속', '주소'], rows);
      } catch (e) { UI.toast(e.message, true); }
    };
    return h('div', { class: 'narrow' },
      steps('현재 목록을 내려받아 엑셀에서 고칩니다.', '저장할 때 파일 형식은 CSV UTF-8 또는 CSV(쉼표로 분리)를 고릅니다.', '고친 파일을 올리고 장비 목록 등록을 누릅니다.'),
      h('button', { class: 'btn ghost', type: 'button', onclick: download }, '현재 목록 내려받기'),
      UI.field('CSV 파일 (QR장비_import.csv)', input), info, btn);
  }

  /* 이관 실적 파일(JSON): 월별 숫자와 건별 이력을 한 번에 올린다. 같은 월을 다시 올리면 그 월 내용이 바뀐다. */
  function historyBox() {
    let payload = null;
    const info = h('p', { class: 'sub' }, '월별 실적 파일을 올립니다. 같은 월을 다시 올리면 그 월 이관 실적이 새 파일 내용으로 바뀝니다.');
    const btn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: async () => {
      const months = [...new Set(payload.overlay.map((r) => r[0]))].sort();
      if (!confirm(months.join(', ') + ' 월의 이관 실적을 올립니다. 해당 월은 파일 내용으로 계산됩니다. 계속할까요?')) return;
      btn.disabled = true;
      info.textContent = '올리는 중입니다. 잠시 기다려 주세요.';
      try {
        const r = await Api.call('historyImport', payload);
        info.textContent = '완료: ' + r.months.length + '개월, 숫자 ' + r.overlay + '행, 건별 ' + r.activities + '건, 이상발생 ' + r.abnormal + '건. 작성자를 사용자 명단에서 못 찾은 건별 이력 ' + r.unmatched + '건';
        UI.toast('올렸습니다.');
      } catch (e) { info.textContent = e.message; btn.disabled = false; }
    } }, '이관 실적 올리기');
    const input = h('input', { type: 'file', accept: '.json,application/json', onchange: async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const d = JSON.parse(await file.text());
        if (!d.year || !Array.isArray(d.overlay)) throw new Error('형식');
        payload = { year: String(d.year), overlay: d.overlay, activities: d.activities || [], abnormal: d.abnormal || [] };
        info.textContent = d.year + '년 파일을 읽었습니다: 숫자 ' + payload.overlay.length + '행, 건별 ' + payload.activities.length + '건, 이상발생 ' + payload.abnormal.length + '건. 이관 실적 올리기를 눌러 주세요.';
        btn.disabled = false;
      } catch (e) { info.textContent = '파일 형식이 올바르지 않습니다.'; btn.disabled = true; }
    } });
    return h('div', { class: 'narrow' }, UI.field('이관 실적 파일 (history_2026_01-09.json)', input), info, btn);
  }

  function dataAdmin(box) {
    let year = '';
    const load = () => Api.call('dataInfo', { year }).then((d) => {
      year = d.year;
      const ysel = UI.select('year', d.years, d.year);
      ysel.onchange = () => { year = ysel.value; load(); };
      const months = Array.from({ length: 12 }, (_, i) => d.year + '-' + String(i + 1).padStart(2, '0'));
      const reopen = (ym) => async () => {
        if (!confirm(ym + ' 월 마감을 해제할까요? 해제하면 다시 수정할 수 있고 실적이 다시 계산됩니다.')) return;
        try { await Api.call('kpiReopen', { ym }); UI.toast('마감을 해제했습니다.'); load(); } catch (e) { UI.toast(e.message, true); }
      };
      const newYear = async () => {
        if (!confirm(d.nextYear + '년 KPI 파일을 만들까요? 올해 목표·판정 기준, 선택지, 업로드 열 위치, 장비면허 명부를 옮기고 올해 실적은 전년실적으로 기록합니다.')) return;
        try { const r = await Api.call('kpiNewYear', { year: d.nextYear }); UI.toast('만들었습니다. 목표 ' + r.targets + '행, 선택지 ' + r.options + '행, 면허명부 ' + r.license + '행'); load(); }
        catch (e) { UI.toast(e.message, true); }
      };
      const b = d.backup;
      fill(box,
        h('h2', { class: 'block-h' }, '월 마감 해제'),
        h('div', { class: 'toolbar' }, ysel),
        h('div', { class: 'month-grid' }, months.map((ym) => {
          const closed = d.closed.includes(ym);
          return h('div', { class: 'month-cell' + (closed ? ' closed' : '') }, h('strong', null, Number(ym.slice(5)) + '월'),
            h('span', { class: 'sub' }, closed ? '마감' : '열림'), closed && h('button', { class: 'link', type: 'button', onclick: reopen(ym) }, '마감 해제'));
        })),
        h('h2', { class: 'block-h' }, '신년도 KPI 파일'),
        d.nextExists ? h('p', { class: 'sub' }, d.nextYear + '년 파일이 준비되어 있습니다. 1월 1일부터 자동으로 새 파일을 씁니다.')
          : h('div', { class: 'row-btns' }, h('button', { class: 'btn', type: 'button', onclick: newYear }, d.nextYear + '년 KPI 파일 만들기'),
            h('span', { class: 'sub' }, '12월 중에 한 번 눌러 주세요. 실적은 비어 있는 상태로 시작합니다.')),
        h('h2', { class: 'block-h' }, '이관 실적 올리기 (과거 월·월별 파일)'),
        historyBox(),
        h('h2', { class: 'block-h' }, 'QR장비점검 장비 목록'),
        qrImportBox(),
        h('h2', { class: 'block-h' }, '자동 백업'),
        h('p', null, d.backupTrigger ? '매주 일요일 새벽 3시에 자동 백업합니다(파일마다 최근 8개 보관).' : '자동 백업이 아직 예약되지 않았습니다.'),
        h('p', { class: 'sub' }, b ? '마지막 백업: ' + b.at + ' / ' + (b.ok ? '정상' : '실패') + ' / ' + b.message : '아직 백업한 기록이 없습니다.'));
    }, (e) => box.replaceChildren(UI.error(e.message, load)));
    load();
  }

  Router.add('/admin/data', (params, app) => {
    if (!UI.hasAny(['ADMIN', 'VIEW_EXEC'])) { app.replaceChildren(UI.placeholder('권한이 없습니다')); return; }
    const top = h('div');
    if (UI.has('ADMIN')) { top.append(UI.skeleton(4)); dataAdmin(top); }
    app.replaceChildren(UI.hero('데이터 관리', UI.has('ADMIN') ? '월 마감 해제, 신년도 파일, 백업 상태, 작업 기록' : '작업 기록 열람'), pcNotice(),
      h('section', { class: 'section' }, h('div', { class: 'wrap wide' }, top, logs())));
  });

  /* ---------- 관리자 대시보드 ---------- */
  const SIDE = [['#/admin', 'home', '대시보드', () => true], ['#/admin/users', 'people', '사용자 관리', () => UI.has('ADMIN')],
    ['#/kpi/team', 'chart', 'KPI 팀 현황', () => UI.has('KPI_VIEW_ALL')], ['#/suggest/all', 'chat', '건의사항 관리', () => UI.hasAny(['SUGGEST_VIEW', 'SUGGEST_READ'])],
    ['#/award', 'trophy', '우수사원 관리', () => true], ['#/admin/license', 'lock', '장비면허 명부', () => UI.hasAny(['KPI_MANAGER', 'VIEW_EXEC'])],
    ['#/admin/targets', 'list', '목표·평가기준', () => UI.hasAny(['ADMIN', 'KPI_TEAM', 'VIEW_EXEC'])], ['#/admin/data', 'gear', '데이터 관리', () => UI.hasAny(['ADMIN', 'VIEW_EXEC'])]];

  Router.add('/admin', (params, app, alive) => {
    if (!UI.hasAny(['ADMIN', 'VIEW_EXEC', 'KPI_TEAM'])) { app.replaceChildren(UI.placeholder('권한이 없습니다')); return; }
    const main = h('div', { class: 'admin-main' }, UI.skeleton(8));
    const side = h('nav', { class: 'admin-side', 'aria-label': '관리자 메뉴' }, h('p', { class: 'admin-side-h' }, UI.icon('gear'), '관리자 메뉴'),
      SIDE.filter((x) => x[3]()).map(([href, icon, label]) => h('a', { class: href === '#/admin' ? 'on' : '', href }, UI.icon(icon), label)));
    const stat = (href, icon, label, value, tone) => h('a', { class: 'stat ' + (tone || ''), href }, h('span', { class: 'stat-ico' }, UI.icon(icon)),
      h('div', null, h('p', null, label), h('strong', null, value)), h('span', { class: 'more' }, '바로가기', UI.icon('arrow')));
    const load = () => Api.call('adminDash').then((d) => {
      if (!alive()) return;
      const canvas = h('canvas');
      const depts = Object.keys(d.kpi);
      fill(main, pcNotice(),
        h('div', { class: 'admin-head' }, h('div', null, h('h1', null, '관리자 대시보드'), h('p', { class: 'sub' }, '처리할 일과 운영 현황을 한눈에 확인합니다.')), h('span', { class: 'date-pill' }, UI.icon('clock'), d.today)),
        h('div', { class: 'stat-grid' },
          stat('#/kpi/team', 'todo', 'KPI 확인 대기', d.pending + '건', d.pending ? 'warn' : ''),
          stat('#/suggest/all', 'chat', '답변 전 건의', d.suggestOpen + '건', d.suggestOpen ? 'warn' : ''),
          stat('#/award', 'trophy', '개선 제안 결정 대기', d.proposals === null ? '-' : d.proposals + '건', d.proposals ? 'warn' : ''),
          stat('#/admin/users', 'people', '사용 중 직원', d.users.active + '명', d.users.locked ? 'bad' : '')),
        d.users.locked ? h('p', { class: 'note' }, '로그인 잠금 상태 직원이 ' + d.users.locked + '명 있습니다. 사용자 관리에서 잠금을 풀 수 있습니다.') : null,
        h('div', { class: 'panel-grid' },
          h('div', { class: 'panel' }, UI.cardHead('chart', '직별 이번 달 KPI 달성 비율', '#/kpi/team'), h('div', { class: 'chart-area' }, canvas)),
          h('div', { class: 'panel' }, UI.cardHead('chat', '최근 건의사항', '#/suggest/all'),
            d.recent.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data click' }, h('thead', null, h('tr', null, ['분류', '제목', '등록일', '상태'].map((x) => h('th', null, x)))),
              h('tbody', null, d.recent.map((r) => h('tr', { onclick: () => { location.hash = '#/suggest/view/' + r.id; } },
                h('td', null, r.category), h('td', { class: 'c-title' }, r.title), h('td', null, UI.dateOnly(r.created)),
                h('td', null, h('span', { class: 'chip ' + ({ 검토중: 'warn', 답변완료: 'good' }[r.status] || '') }, r.status)))))))
              : UI.empty('등록된 건의가 없습니다.', 'feedback', true))));
      const pct = (k) => { const t = k.G + k.Y + k.R; return t ? Math.round(k.G / t * 100) : 0; };
      const s = document.createElement('script');
      const draw = () => new window.Chart(canvas, { type: 'bar', data: { labels: depts, datasets: [{ label: '달성 비율(%)', data: depts.map((x) => pct(d.kpi[x])), backgroundColor: '#0b2282', borderRadius: 6, maxBarThickness: 48 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } } } } });
      if (window.Chart) draw();
      else { s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'; s.onload = draw; document.head.append(s); }
    }, (e) => { if (alive()) main.replaceChildren(UI.error(e.message, load)); });
    app.replaceChildren(h('div', { class: 'admin-shell' }, side, main));
    load();
  });
})();
