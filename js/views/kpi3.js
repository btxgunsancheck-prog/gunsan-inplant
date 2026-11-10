/* 직장 월 입력(P1, P3, Q1), 실적 업로드. */
(() => {
  const SHEETJS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  let sheetLib = null;
  const loadSheet = () => sheetLib || (sheetLib = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SHEETJS; s.onload = resolve; s.onerror = reject;
    document.head.append(s);
  }));
  const pad = (n) => String(n).padStart(2, '0');
  const thisYm = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  const ymOptions = () => {
    const d = new Date(), out = [];
    for (let m = d.getMonth() + 1; m >= 1; m--) out.push(d.getFullYear() + '-' + pad(m));
    return out;
  };
  const inputDepts = () => (UI.has('KPI_MANAGER') ? KpiData.DEPTS : KpiData.DEPTS.filter((x) => UI.has('KPI_CHECK:' + x)));

  function listEditor(label, rows, namePlaceholder) {
    const box = h('div', { class: 'list-edit' });
    const draw = () => {
      box.replaceChildren(...rows.map((r, i) => h('div', { class: 'list-row' },
        h('input', { value: r.name, placeholder: namePlaceholder, 'aria-label': namePlaceholder, oninput: (e) => { r.name = e.target.value; } }),
        h('input', { value: r.count, inputmode: 'numeric', 'aria-label': '수', oninput: (e) => { r.count = e.target.value; } }),
        h('button', { class: 'picker-x', type: 'button', 'aria-label': '행 빼기', onclick: () => { rows.splice(i, 1); draw(); } }, '×'))));
    };
    draw();
    return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), box,
      h('button', { class: 'btn ghost', type: 'button', onclick: () => { rows.push({ name: '', count: '' }); draw(); } }, '행 추가'));
  }

  function p1Form(body, ym, dept, data, alive) {
    const src = data.detail || data.prev || {};
    const processes = (src.processes || []).map((x) => ({ name: x.name, count: x.count }));
    if (!processes.length) processes.push({ name: '', count: '' });
    const known = (src.people || []).map((x) => ({ name: x.name, count: x.count }));
    const people = known.length ? known : data.roster.map((name) => ({ name, count: '' }));
    const btn = h('button', { class: 'btn wide', type: 'button', disabled: data.closed, onclick: async () => {
      btn.disabled = true;
      try {
        await Api.call('kpiMonthlySave', { ym, dept, code: 'P1', detail: { processes: processes.filter((x) => x.name), people: people.filter((x) => x.name) } });
        UI.toast('저장했습니다.');
      } catch (e) { UI.toast(e.message, true); }
      btn.disabled = false;
    } }, '저장');
    body.replaceChildren(h('div', { class: 'narrow' },
      data.closed && h('p', { class: 'sub' }, '마감된 월이라 수정할 수 없습니다.'),
      listEditor('공정별 습숙 인원', processes, '공정'), listEditor('인원별 습숙 공정수', people, '성명'), btn));
  }

  function p3Form(body, ym, dept, data) {
    const rows = ((data.detail && data.detail.rows) || []).map((r) => Object.assign({}, r));
    if (!rows.length) rows.push({ date: ym + '-01', topic: '', target: '', attend: '' });
    const box = h('div', { class: 'list-edit' });
    const draw = () => box.replaceChildren(...rows.map((r, i) => h('div', { class: 'edu-row' },
      h('input', { type: 'date', value: r.date, 'aria-label': '교육일자', oninput: (e) => { r.date = e.target.value; } }),
      h('input', { value: r.topic, placeholder: '주제', 'aria-label': '주제', oninput: (e) => { r.topic = e.target.value; } }),
      h('input', { value: r.target, inputmode: 'numeric', placeholder: '대상인원', 'aria-label': '대상인원', oninput: (e) => { r.target = e.target.value; } }),
      h('input', { value: r.attend, inputmode: 'numeric', placeholder: '참석인원', 'aria-label': '참석인원', oninput: (e) => { r.attend = e.target.value; } }),
      h('button', { class: 'picker-x', type: 'button', 'aria-label': '행 빼기', onclick: () => { rows.splice(i, 1); draw(); } }, '×'))));
    draw();
    const have = ((data.detail && data.detail.photos) || []).length;
    const picker = PhotoPicker(Math.max(0, 3 - have), '교육 사진');
    const btn = h('button', { class: 'btn wide', type: 'button', disabled: data.closed });
    btn.textContent = '저장';
    const wrap = h('div', { class: 'narrow' },
      data.closed ? h('p', { class: 'sub' }, '마감된 월이라 수정할 수 없습니다.') : '',
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '교육 내역'), box),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => { rows.push({ date: ym + '-01', topic: '', target: '', attend: '' }); draw(); } }, '행 추가'),
      picker.el, btn);
    const progress = ProgressBox(wrap);
    btn.onclick = async () => {
      btn.disabled = true;
      let ticket;
      try { ticket = (await Api.call('kpiMonthlySave', { ym, dept, code: 'P3', detail: { rows } })).ticket; }
      catch (e) { UI.toast(e.message, true); btn.disabled = false; return; }
      const finish = () => { UI.toast('저장했습니다.'); btn.disabled = false; };
      const jobs = picker.files.map((file) => ({ file }));
      if (jobs.length) sendPhotos(jobs, ticket, progress, finish); else finish();
    };
    body.replaceChildren(wrap);
  }

  function q1Form(body, dept, alive) {
    const load = () => {
      Api.call('standardList', { dept }).then((d) => {
        if (!alive()) return;
        const today = new Date();
        const no = h('input', { placeholder: '번호', 'aria-label': '번호' });
        const proc = h('input', { placeholder: '공정', 'aria-label': '공정' });
        const title = h('input', { placeholder: '제목', 'aria-label': '제목' });
        const kind = UI.select('kind', ['제정', '개정'], '제정');
        const date = h('input', { type: 'date', 'aria-label': '일자', value: today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate()) });
        const save = async () => {
          try { await Api.call('standardSave', { dept, no: no.value, process: proc.value, title: title.value, kind: kind.value, date: date.value }); UI.toast('저장했습니다.'); load(); }
          catch (e) { UI.toast(e.message, true); }
        };
        fill(body,
          d.canEdit && h('div', { class: 'toolbar wrap-row' }, no, proc, title, kind, date, h('button', { class: 'btn', type: 'button', onclick: save }, '추가')),
          h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
            h('thead', null, h('tr', null, ['번호', '공정', '제목', '구분', '일자', ''].map((x) => h('th', null, x)))),
            h('tbody', null, d.rows.map((r) => h('tr', null, [0, 2, 3, 4, 5].map((i) => h('td', null, r.v[i])),
              h('td', null, d.canEdit && h('button', { class: 'link', type: 'button', onclick: async () => {
                try { await Api.call('standardDelete', { rowNo: r.rowNo }); load(); } catch (e) { UI.toast(e.message, true); }
              } }, '삭제'))))))));
      }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    };
    load();
  }

  Router.add('/kpi/monthly', (params, app, alive) => {
    const depts = inputDepts();
    if (!depts.length || UI.has('VIEW_EXEC')) { app.replaceChildren(UI.placeholder('입력 권한이 없습니다')); return; }
    let code = 'P1';
    const deptSel = UI.select('dept', depts, depts[0]);
    const ymSel = UI.select('ym', ymOptions(), thisYm());
    const tabs = h('div', { class: 'tabs center-tabs' });
    const body = h('div');
    const names = { P1: '다기능 습숙도', P3: '교육이행', Q1: '표준서' };
    const paint = () => {
      tabs.replaceChildren(...Object.keys(names).map((c) => h('button', { type: 'button', class: 'tab' + (c === code ? ' on' : ''), onclick: () => { code = c; paint(); } }, names[c])));
      body.replaceChildren(UI.skeleton(4));
      ymSel.parentElement && (ymSel.disabled = code === 'Q1');
      if (code === 'Q1') { q1Form(body, deptSel.value, alive); return; }
      Api.call('kpiMonthlyGet', { ym: ymSel.value, dept: deptSel.value, code }).then((d) => {
        if (!alive()) return;
        (code === 'P1' ? p1Form : p3Form)(body, ymSel.value, deptSel.value, d, alive);
      }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, paint)); });
    };
    deptSel.onchange = paint; ymSel.onchange = paint;
    app.replaceChildren(UI.hero('월 입력', '직장 입력형 지표'), h('section', { class: 'section' }, h('div', { class: 'wrap' },
      h('div', { class: 'toolbar center-tools' }, deptSel, ymSel), tabs, body)));
    paint();
  });

  /* ---------- 실적 업로드 ---------- */
  const COLUMN_NAMES = { headerRow: '머리글 행', date: '날짜', no: '이상신고No.', kind: '발생구분', dept: '담당직', part: '품번/수량', process: '발생공정', type: '이상유형', issue: '문제', counter: '대책', note: '비고', worker: '작업자' };

  function toDate(v) {
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date) return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
    if (typeof v === 'number') { const c = window.XLSX.SSF.parse_date_code(v); return c ? c.y + '-' + pad(c.m) + '-' + pad(c.d) : ''; }
    const m = String(v).trim().match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    return m ? m[1] + '-' + pad(m[2]) + '-' + pad(m[3]) : '';
  }

  function calendar(info, reload) {
    const [y, m] = info.ym.split('-').map(Number);
    const first = new Date(y, m - 1, 1).getDay();
    const last = new Date(y, m, 0).getDate();
    const days = new Set(info.days), hol = new Set(info.holidays);
    const cells = [];
    ['일', '월', '화', '수', '목', '금', '토'].forEach((d) => cells.push(h('div', { class: 'cal-h' }, d)));
    for (let i = 0; i < first; i++) cells.push(h('div'));
    for (let d = 1; d <= last; d++) {
      const iso = info.ym + '-' + pad(d);
      const state = hol.has(iso) ? 'off' : days.has(iso) ? 'done' : iso <= info.today ? 'miss' : '';
      const label = { off: '휴무', done: '업로드', miss: '미업로드', '': '' }[state];
      cells.push(h(info.canHoliday ? 'button' : 'div', {
        class: 'cal-d ' + state, type: info.canHoliday ? 'button' : null,
        onclick: info.canHoliday ? async () => {
          try { await Api.call('holidaySave', { date: iso, on: !hol.has(iso) }); reload(); } catch (e) { UI.toast(e.message, true); }
        } : null
      }, h('span', null, d), h('small', null, label)));
    }
    return h('div', null, h('h2', { class: 'block-h' }, m + '월 업로드 현황'), h('div', { class: 'calendar' }, cells),
      info.canHoliday && h('p', { class: 'hint' }, '날짜를 누르면 휴무일로 지정하거나 해제합니다.'));
  }

  function abnormalTab(host, info, reload) {
    const today = info.today;
    const mode = UI.select('mode', ['하루 업로드', '기간 업로드'], '하루 업로드');
    const from = h('input', { type: 'date', value: today, max: today, 'aria-label': '시작일' });
    const to = h('input', { type: 'date', value: today, max: today, 'aria-label': '종료일', hidden: true });
    const file = h('input', { type: 'file', accept: '.xlsx,.xls,.xlsb,.csv' });
    const sheetSel = h('select', { 'aria-label': '시트 선택', hidden: true });
    const preview = h('div');
    let workbook = null;
    const c = info.config;
    mode.onchange = () => { to.hidden = mode.value !== '기간 업로드'; if (workbook) build(); };
    from.onchange = () => { if (workbook) build(); };
    to.onchange = () => { if (workbook) build(); };
    sheetSel.onchange = () => build();

    file.onchange = async () => {
      const f = file.files[0];
      if (!f) return;
      preview.replaceChildren(UI.skeleton(3));
      try {
        await loadSheet();
        workbook = window.XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
        sheetSel.replaceChildren(...workbook.SheetNames.map((n) => h('option', { value: n }, n)));
        sheetSel.hidden = false;
        build();
      } catch (e) { preview.replaceChildren(h('p', { class: 'form-error' }, '파일을 읽지 못했습니다. 엑셀 파일인지 확인해 주세요.')); }
    };

    function targetDates() {
      const out = [];
      const end = mode.value === '기간 업로드' ? to.value : from.value;
      for (let d = new Date(from.value + 'T00:00:00'); d <= new Date(end + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
        out.push(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
      }
      return out;
    }

    async function build() {
      const dates = targetDates();
      if (!dates.length || dates.length > 31) { preview.replaceChildren(h('p', { class: 'form-error' }, '기간은 1일 이상 31일 이하로 선택해 주세요.')); return; }
      const X = window.XLSX;
      const grid = X.utils.sheet_to_json(workbook.Sheets[sheetSel.value], { header: 1, raw: true, defval: '' });
      const col = (k) => (c[k] ? X.utils.decode_col(c[k]) : -1);
      const cell = (r, k) => { const i = col(k); return i < 0 ? '' : String(r[i] === undefined ? '' : r[i]).trim(); };
      const set = new Set(dates);
      const rows = grid.slice(c.headerRow).map((r) => ({ date: toDate(r[col('date')]), no: cell(r, 'no'), kind: cell(r, 'kind'), dept: cell(r, 'dept'), part: cell(r, 'part'), process: cell(r, 'process'), type: cell(r, 'type'), issue: cell(r, 'issue'), counter: cell(r, 'counter'), note: cell(r, 'note'), worker: cell(r, 'worker') }))
        .filter((r) => r.date && r.kind && set.has(r.date));
      const byDate = {};
      rows.forEach((r) => { const x = (byDate[r.date] = byDate[r.date] || { total: 0, depts: {} }); x.total++; x.depts[r.dept] = (x.depts[r.dept] || 0) + 1; });
      let existing = [];
      try { existing = (await Api.call('uploadExisting', { dates })).existing; } catch (e) { /* 저장 때 서버에서 다시 확인한다 */ }
      const over = h('input', { type: 'checkbox' });
      const result = h('p', { class: 'sub' });
      const apply = h('button', { class: 'btn', type: 'button', onclick: async () => {
        if (existing.length && !over.checked) { result.textContent = '덮어쓰기에 체크해 주세요.'; return; }
        apply.disabled = true;
        result.textContent = '반영하는 중입니다.';
        try {
          let fileId = '';
          const f = file.files[0];
          if (f.size <= 10485760) {
            const bytes = new Uint8Array(await f.arrayBuffer());
            let bin = '';
            for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
            fileId = (await Api.call('uploadOriginal', { name: f.name, date: dates[0], data: btoa(bin) })).fileId;
          } else UI.toast('10MB를 넘어 원본 파일은 저장하지 않았습니다.');
          const r = await Api.call('uploadSave', { dates, rows, fileId, overwrite: over.checked });
          UI.toast('완료: ' + r.dates + '일, ' + r.rows + '행을 반영했습니다.');
          reload();
        } catch (e) { result.textContent = e.message; apply.disabled = false; }
      } }, '반영');
      fill(preview,
        h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, ['날짜', '건수', '물류1직', '물류2직', '물류3직', '물류4직', '기타', '상태'].map((x) => h('th', null, x)))),
          h('tbody', null, dates.filter((d) => byDate[d] || existing.includes(d)).map((d) => {
            const x = byDate[d] || { total: 0, depts: {} };
            const etc = Object.keys(x.depts).filter((k) => !KpiData.DEPTS.includes(k)).reduce((s, k) => s + x.depts[k], 0);
            return h('tr', null, h('td', null, d), h('td', { class: 'num' }, x.total), KpiData.DEPTS.map((k) => h('td', { class: 'num' }, x.depts[k] || 0)), h('td', { class: 'num' }, etc), h('td', null, existing.includes(d) ? '덮어쓰기' : '신규'));
          })))),
        h('p', { class: 'sub' }, '총 ' + rows.length + '건. 이상발생이 없는 날은 0건으로 처리됩니다.'),
        existing.length && h('label', { class: 'check' }, over, h('span', null, '이미 올라간 ' + existing.length + '일을 덮어씁니다')),
        h('div', { class: 'row-btns' }, apply), result);
    }

    const cfgInputs = {};
    const cfg = h('details', { class: 'config' }, h('summary', null, '열 위치 설정'),
      h('div', { class: 'cfg-grid' }, Object.keys(COLUMN_NAMES).map((k) => { cfgInputs[k] = h('input', { value: c[k], 'aria-label': COLUMN_NAMES[k] }); return UI.field(COLUMN_NAMES[k], cfgInputs[k]); })),
      h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
        const body = {};
        Object.keys(cfgInputs).forEach((k) => { body[k] = cfgInputs[k].value; });
        try { await Api.call('uploadConfigSave', body); UI.toast('저장했습니다.'); reload(); } catch (e) { UI.toast(e.message, true); }
      } }, '열 위치 저장'));
    fill(host, calendar(info, reload),
      h('h2', { class: 'block-h' }, '파일 올리기'),
      h('div', { class: 'toolbar wrap-row' }, mode, from, to),
      UI.field('엑셀 파일', file), sheetSel, preview, cfg);
  }

  function historyTable(info) {
    return h('div', null, h('h2', { class: 'block-h' }, '업로드 이력'), h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
      h('thead', null, h('tr', null, ['대상일자', '업로더', '행 수', '일시', '원본'].map((x) => h('th', null, x)))),
      h('tbody', null, info.history.map((r) => h('tr', null, h('td', null, r.date), h('td', null, r.by), h('td', { class: 'num' }, r.rows), h('td', null, r.at),
        h('td', null, r.hasFile && h('button', { class: 'link', type: 'button', onclick: async () => {
          try {
            const f = await Api.call('uploadFile', { id: r.id });
            const a = h('a', { href: 'data:application/octet-stream;base64,' + f.data, download: f.name });
            a.click();
          } catch (e) { UI.toast(e.message, true); }
        } }, '원본 보기'))))))));
  }

  Router.add('/kpi/upload', (params, app, alive) => {
    if (!UI.hasAny(['UPLOAD_ABNORMAL', 'UPLOAD_INVENTORY', 'ADMIN', 'VIEW_EXEC'])) { app.replaceChildren(UI.placeholder('권한이 없습니다')); return; }
    const body = h('div', { class: 'wrap' }, UI.skeleton(6));
    let tab = '';
    const load = () => {
      Api.call('uploadInfo', {}).then((info) => {
        if (!alive()) return;
        const names = {};
        if (info.tabs.abnormal) names.abnormal = '이상발생·비가동(일별)';
        if (info.tabs.inventory) names.inventory = '순환재고(월별)';
        tab = tab || Object.keys(names)[0] || '';
        const content = h('div');
        fill(body,
          Object.keys(names).length > 1 && h('div', { class: 'tabs center-tabs' }, Object.keys(names).map((k) => h('button', { class: 'tab' + (k === tab ? ' on' : ''), type: 'button', onclick: () => { tab = k; load(); } }, names[k]))),
          content, historyTable(info));
        if (tab === 'abnormal') abnormalTab(content, info, load);
        else if (tab === 'inventory') content.replaceChildren(h('p', { class: 'sub center' }, '순환재고 업로드는 실제 월 파일로 계산식을 확인한 뒤 제공됩니다.'));
      }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    };
    app.replaceChildren(UI.hero('실적 업로드'), h('section', { class: 'section' }, body));
    load();
  });
})();
