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

  ['license', 'targets', 'data'].forEach((p) => Router.add('/admin/' + p, (params, app) => app.replaceChildren(UI.placeholder('관리자 메뉴'))));
})();
