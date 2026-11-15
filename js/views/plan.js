/* 생산계획: 월별 생산계획표를 달력으로 보여 준다. 업무게시판과 분리된 '생산계획' 게시판의 글이다. */
(() => {
  Router.add('/plan', (params, app, alive) => {
    const body = h('div', { class: 'wrap wide' }, UI.skeleton(6));
    let ym = '';
    const label = (v) => v.slice(0, 4) + '년 ' + Number(v.slice(5)) + '월';
    const canUpload = UI.has('PLAN_UPLOAD') && !UI.has('VIEW_EXEC');
    const uploadBtn = () => (canUpload ? h('a', { class: 'btn', href: '#/board/plan/new' }, '생산계획 올리기') : null);
    const draw = (d) => {
      if (!alive()) return;
      if (!d.months.length) { fill(body, h('div', { class: 'toolbar no-print' }, uploadBtn()), UI.empty('등록된 생산계획이 없습니다.', 'board')); return; }
      const sel = h('select', { 'aria-label': '월 선택' }, d.months.map((m) => h('option', { value: m.ym, selected: d.plan && m.ym === d.plan.ym }, label(m.ym))));
      sel.onchange = () => { ym = sel.value; body.replaceChildren(UI.skeleton(6)); load(); };
      const p = d.plan;
      if (!p) { fill(body, h('div', { class: 'toolbar month-pick no-print' }, sel, uploadBtn()), UI.empty('이 달의 생산계획이 없습니다.', 'board')); return; }
      const totals = Plan.LINES.map((l, i) => Object.values(p.days).reduce((s, v) => s + v[i], 0));
      const all = totals.reduce((a, b) => a + b, 0);
      fill(body,
        h('div', { class: 'toolbar month-pick no-print' }, sel, uploadBtn(), h('a', { class: 'btn ghost', href: '#/board/plan/' + p.postId }, '게시글 보기'), h('button', { class: 'btn ghost pc-only', type: 'button', onclick: () => window.print() }, '인쇄')),
        h('div', { class: 'plan-totals' }, [h('div', { class: 'plan-total all' }, h('span', { class: 'sub' }, '합계'), h('strong', null, all + '대'))]
          .concat(Plan.LINES.map((l, i) => h('div', { class: 'plan-total' }, h('span', { class: 'sub' }, l.label), h('strong', null, totals[i] + '대'))))),
        Plan.calendar(p),
        h('p', { class: 'sub' }, '원본 ' + p.file + (p.dist ? ' · 배포 ' + p.dist : '') + ' · 등록 ' + p.by + ' ' + String(p.at).slice(0, 16)));
    };
    const load = () => Api.call('planGet', ym ? { ym } : {}).then(draw, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    app.replaceChildren(UI.hero('생산계획', '월별 생산계획 달력입니다.'), h('section', { class: 'section print-page' }, body));
    load();
  });
})();
