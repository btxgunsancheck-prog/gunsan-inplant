/* 홈 화면. 데이터는 로그인 직후 받은 init 결과를 쓴다. */

/* 메뉴 아래 3D 창고 장면. 화면을 먼저 그린 뒤 따로 불러오고, 홈을 다시 열면 같은 장면을 그대로 쓴다. */
const Home3D = (() => {
  let host = null;
  let started = false;
  const load = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.append(s);
  });
  function start() {
    started = true;
    setTimeout(async () => {
      try {
        await load('js/lib/warehouse-layout.js?v=1');
        await load('js/lib/warehouse3d.js?v=10');
        if (!window.Warehouse3D.supported()) { host.hidden = true; return; }
        await window.Warehouse3D.mount(host, { lookZ: -9 });
      } catch (e) {
        host.hidden = true;
      }
    }, 300);
  }
  return {
    element() {
      if (!host) host = h('div', { class: 'scene3d', 'aria-hidden': 'true' });
      if (!started) start();
      return host;
    }
  };
})();
/* 달성 비율 막대 한 줄 */
function rateBar(label, href, k) {
  const total = k.G + k.Y + k.R;
  const pct = UI.pct(k.G, total);
  return h('a', { class: 'rate-row', href },
    h('span', { class: 'rate-name' }, label),
    h('span', { class: 'rate-bar' }, h('span', { style: 'width:' + (pct || 0) + '%' })),
    h('strong', { class: 'rate-val' }, pct === null ? '-' : pct + '%'));
}

Router.add('/', (params, app) => {
  const home = App.home;
  const u = App.user;
  const list = (items, base, empty) => (items && items.length
    ? h('ul', { class: 'tile-list' }, items.map((n) => h('li', null,
      h('a', { href: base + n.id }, n.pinned && h('span', { class: 'chip bad mini' }, '중요'), n.title), h('span', { class: 'sub' }, UI.dateOnly(n.created).slice(5)))))
    : h('p', { class: 'sub empty' }, empty));
  const tasks = [];
  const task = (href, label, value, hot) => h('a', { class: 'task', href }, h('span', null, label), h('strong', { class: hot ? 'hot' : '' }, value));
  if (u.perms.some((p) => p.startsWith('KPI_CHECK:'))) tasks.push(task('#/kpi/pending', 'KPI 확인 대기', (home.pending || 0) + '건', home.pending > 0));
  if (UI.has('UPLOAD_ABNORMAL')) tasks.push(task('#/kpi/upload', '오늘 이상발생 업로드', home.abnormalToday ? '완료' : '미업로드', !home.abnormalToday));
  if (UI.has('UPLOAD_INVENTORY')) tasks.push(task('#/kpi/upload', '이번 달 순환재고 업로드', home.inventoryThisMonth ? '완료' : '미업로드', !home.inventoryThisMonth));
  if (UI.has('KPI_TEAM')) tasks.push(task('#/kpi/team', '이번 달 월 마감', home.closedThisMonth ? '완료' : '미완료', !home.closedThisMonth));

  const kpi = home.kpiHome || {};
  const depts = Object.keys(kpi).filter((d) => d !== '팀');
  const sum = depts.reduce((a, d) => ({ G: a.G + kpi[d].G, Y: a.Y + kpi[d].Y, R: a.R + kpi[d].R }), { G: 0, Y: 0, R: 0 });
  const teamPct = UI.pct(sum.G, sum.G + sum.Y + sum.R);
  const kpiLink = UI.has('KPI_VIEW_ALL') ? '#/kpi/team' : (/^물류[1-4]직$/.test(u.dept) ? '#/kpi/' + u.dept.charAt(2) : '#/kpi/team');

  const quick = [];
  const q = (href, icon, label) => h('a', { class: 'quick', href }, h('span', { class: 'quick-ico' }, UI.icon(icon)), h('span', null, label));
  if (!UI.has('VIEW_EXEC')) quick.push(q('#/kpi/write', 'edit', '실적 작성'));
  if (!UI.has('VIEW_EXEC')) quick.push(q('#/suggest', 'chat', '건의 등록'));
  quick.push(q('#/qr', 'qr', 'QR장비점검'), q(kpiLink, 'chart', 'KPI 현황'), q('#/award', 'trophy', '우수사원'));

  const top = h('div', { class: 'home-top' }, Home3D.element(), UI.hero('군산 사내물류팀', '오늘의 현장을 함께 기록합니다.'));
  top.lastChild.classList.add('hero-over');
  app.replaceChildren(
    top,
    h('section', { class: 'home-grid' },
      h('div', { class: 'tile' }, UI.cardHead('chart', '이번 달 KPI', kpiLink),
        depts.length ? [
          h('p', { class: 'big-rate' }, h('strong', null, teamPct === null ? '-' : teamPct + '%'), h('span', { class: 'sub' }, depts.length > 1 ? '팀 전체 달성 비율' : depts[0] + ' 달성 비율')),
          depts.length > 1 ? h('div', { class: 'rate-list' }, depts.map((d) => rateBar(d, '#/kpi/' + d.charAt(2), kpi[d]))) : null
        ] : h('p', { class: 'sub empty' }, '표시할 KPI가 없습니다.')),
      h('div', { class: 'tile' }, UI.cardHead('megaphone', '최신 공지', '#/board/notice'), list(home.notices, '#/board/notice/', '등록된 공지가 없습니다.')),
      h('div', { class: 'tile' }, UI.cardHead('todo', '내 할 일'), tasks.length ? h('div', { class: 'task-list' }, tasks) : h('p', { class: 'sub empty' }, '지금 처리할 일이 없습니다.')),
      h('div', { class: 'tile' }, UI.cardHead('board', '업무 게시판', '#/board/work'), list(home.works, '#/board/work/', '등록된 글이 없습니다.')),
      h('div', { class: 'tile span3' }, UI.cardHead('list', '주요 업무 바로가기'), h('div', { class: 'quick-grid' }, quick)),
      h('div', { class: 'tile team-tile' }, UI.cardHead('people', '우리 팀 현황'),
        h('p', { class: 'big-rate' }, h('strong', null, (home.teamCount || '-') + '명'), h('span', { class: 'sub' }, '사이트 사용 중인 직원')))));
});
