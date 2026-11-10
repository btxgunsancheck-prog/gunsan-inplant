/* 관리자 메뉴. 1단계에서는 사용자 일괄 등록만 제공한다. */
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

  Router.add('/admin/users', (params, app) => {
    if (!UI.has('ADMIN')) { app.replaceChildren(UI.placeholder('권한이 없습니다')); return; }
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
    } }, '등록');
    const input = h('input', { type: 'file', accept: '.csv,text/csv', onchange: async () => {
      const file = input.files[0];
      if (!file) return;
      const grid = parseCsv((await file.text()).replace(/^﻿/, ''));
      const head = grid[0] || [];
      const at = (name) => head.indexOf(name);
      if (['사번', '성명', '직급', '소속', '권한', '사진Base64'].some((n) => at(n) < 0)) { info.textContent = '파일 머리글이 올바르지 않습니다.'; btn.disabled = true; return; }
      rows = grid.slice(1).filter((r) => r[at('사번')]).map((r) => ({
        empNo: r[at('사번')], name: r[at('성명')], rank: r[at('직급')], dept: r[at('소속')], perms: r[at('권한')], photo: r[at('사진Base64')]
      }));
      info.textContent = rows.length + '명, 사진 ' + rows.filter((r) => r.photo).length + '장을 읽었습니다. 등록을 눌러 주세요.';
      btn.disabled = false;
    } });
    app.replaceChildren(UI.hero('사용자 관리', 'users_import.csv 파일로 일괄 등록합니다.'),
      h('section', { class: 'section' }, h('div', { class: 'narrow' }, UI.field('CSV 파일', input), info, btn)));
  });

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
        d.canEdit && h('div', { class: 'toolbar wrap-row' }, f.name, f.dept, f.kind, f.expires, f.note, h('button', { class: 'btn', type: 'button', onclick: add }, '추가')),
        h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, ['성명', '소속', '면허종류', '유효기간', '비고', ''].map((x) => h('th', null, x)))),
          h('tbody', null, d.rows.map((r) => h('tr', null, [0, 1, 2, 3, 4].map((i) => h('td', null, r.v[i])),
            h('td', null, d.canEdit && h('button', { class: 'link', type: 'button', onclick: async () => {
              try { await Api.call('licenseDelete', { rowNo: r.rowNo }); load(); } catch (e) { UI.toast(e.message, true); }
            } }, '삭제'))))))));
    }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    app.replaceChildren(UI.hero('장비면허 명부'), h('section', { class: 'section' }, body));
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
    app.replaceChildren(UI.hero('목표·평가기준'), h('section', { class: 'section' }, body));
    load();
  });

  Router.add('/admin/data', (params, app) => app.replaceChildren(UI.placeholder('데이터 관리')));
})();
