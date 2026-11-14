/* 홈 화면. 데이터는 로그인 직후 받은 init 결과를 쓴다. */

/* 메뉴 아래 3D 창고 영상. 3D 장면(js/lib/warehouse3d.js)을 고화질로 녹화한 60초 반복 영상이다.
   먼저 정지 사진을 보여 주고, 화면 폭에 맞는 크기의 영상을 받는다. 움직임 줄이기 설정이면 사진만 보여 준다. */
const Home3D = (() => {
  let host = null;
  const V = 'assets/video/';
  const VER = '?v=5'; /* 영상을 다시 만들면 올린다 */
  return {
    element() {
      if (host) return host;
      const small = Math.max(window.innerWidth, screen.width || 0) < 1000;
      const size = small ? '960' : '1920';
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const video = h('video', { class: 'scene-video', poster: V + 'warehouse-poster.jpg' + VER, muted: true, loop: true, playsinline: true, preload: reduced ? 'none' : 'auto', 'aria-hidden': 'true', tabindex: '-1' },
        h('source', { src: V + 'warehouse-' + size + '.webm' + VER, type: 'video/webm' }),
        h('source', { src: V + 'warehouse-' + size + '.mp4' + VER, type: 'video/mp4' }));
      video.muted = true;
      if (!reduced) video.autoplay = true;
      /* 화면 밖으로 나가면 멈추고 다시 보이면 이어서 재생한다(전력 절약) */
      new IntersectionObserver((e) => {
        if (reduced || !video.isConnected) return;
        if (e[0].isIntersecting) video.play().catch(() => {});
        else if (!video.paused) video.pause();
      }).observe(video);
      host = h('div', { class: 'scene3d' }, video);
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

  const top = h('section', { class: 'home-banner' },
    Home3D.element(),
    h('div', { class: 'hb-text' }, h('h1', null, '군산 사내물류팀'), h('p', null, '오늘의 현장을 ', h('em', { class: 'hand' }, '함께'), ' 기록합니다.')),
    h('p', { class: 'hb-slogan', lang: 'en' }, 'Together', h('br'), 'for a Better Tomorrow'));
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
