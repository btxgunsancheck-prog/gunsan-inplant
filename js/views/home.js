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
  if (UI.has('UPLOAD_ABNORMAL')) {
    tasks.push(h('a', { class: 'task', href: '#/kpi/upload' }, h('span', null, '오늘 이상발생 업로드'), h('strong', null, home.abnormalToday ? '완료' : '미업로드')));
  }
  if (UI.has('UPLOAD_INVENTORY')) {
    tasks.push(h('a', { class: 'task', href: '#/kpi/upload' }, h('span', null, '이번 달 순환재고 업로드'), h('strong', null, home.inventoryThisMonth ? '완료' : '미업로드')));
  }
  if (UI.has('KPI_TEAM')) {
    tasks.push(h('a', { class: 'task', href: '#/kpi/team' }, h('span', null, '이번 달 월 마감'), h('strong', null, home.closedThisMonth ? '완료' : '미완료')));
  }
  const kpi = home.kpiHome || {};
  const kpiRows = Object.keys(kpi).filter((d) => d !== '팀').map((d) => h('li', null, h('a', { href: '#/kpi/' + d.charAt(2) }, d),
    h('span', { class: 'sum' }, h('span', { class: 'good' }, '달성 ' + kpi[d].G), h('span', { class: 'warn' }, '주의 ' + kpi[d].Y), h('span', { class: 'bad' }, '미달 ' + kpi[d].R))));
  app.replaceChildren(
    UI.hero('군산 사내물류팀', '오늘의 현장을 함께 기록합니다.'),
    h('section', { class: 'tiles' },
      h('div', { class: 'tile' }, h('h2', null, '이번 달 KPI'), kpiRows.length ? h('ul', { class: 'tile-list' }, kpiRows) : h('p', { class: 'sub' }, '표시할 KPI가 없습니다.')),
      h('div', { class: 'tile' }, h('h2', null, '최신 공지'), list(home.notices, '#/board/notice/', '등록된 공지가 없습니다.')),
      h('div', { class: 'tile' }, h('h2', null, '내 할 일'), tasks.length ? tasks : h('p', { class: 'sub' }, '지금 처리할 일이 없습니다.')),
      h('div', { class: 'tile' }, h('h2', null, '업무 게시판'), list(home.works, '#/board/work/', '등록된 글이 없습니다.'))));
});
