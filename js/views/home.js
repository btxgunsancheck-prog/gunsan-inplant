/* 홈 화면. 데이터는 로그인 직후 받은 init 결과를 쓴다. */
Router.add('/', (params, app) => {
  const home = App.home;
  const list = (items, base, empty) => (items && items.length
    ? h('ul', { class: 'tile-list' }, items.map((n) => h('li', null, h('a', { href: base + n.id }, n.title), h('span', { class: 'sub' }, UI.dateOnly(n.created)))))
    : h('p', { class: 'sub' }, empty));
  const tasks = [];
  if (App.user.perms.some((p) => p.startsWith('KPI_CHECK:'))) {
    tasks.push(h('a', { class: 'task', href: '#/kpi/pending' }, h('span', null, '확인 대기'), h('strong', null, (home.pending || 0) + '건')));
  }
  app.replaceChildren(
    UI.hero('군산 사내물류팀', '오늘의 현장을 함께 기록합니다.'),
    h('section', { class: 'tiles' },
      h('div', { class: 'tile' }, h('h2', null, '이번 달 KPI'), h('p', { class: 'sub' }, 'KPI 집계는 다음 제작 단계에서 표시됩니다.')),
      h('div', { class: 'tile' }, h('h2', null, '최신 공지'), list(home.notices, '#/board/notice/', '등록된 공지가 없습니다.')),
      h('div', { class: 'tile' }, h('h2', null, '내 할 일'), tasks.length ? tasks : h('p', { class: 'sub' }, '지금 처리할 일이 없습니다.')),
      h('div', { class: 'tile' }, h('h2', null, '업무 게시판'), list(home.works, '#/board/work/', '등록된 글이 없습니다.'))));
});
