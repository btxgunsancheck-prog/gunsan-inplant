/* 상단 메뉴(PC 롤오버 패널, 모바일 전체 화면 메뉴)와 직원 사진. */
const Nav = (() => {
  const OPEN_DELAY = 200;
  const CLOSE_DELAY = 300;
  let openTimer = null;
  let closeTimer = null;
  let current = null;
  let items = [];

  const link = (label, href) => ({ label, href });

  function menus() {
    const u = App.user;
    const notices = (App.home.notices || []).map((n) => link(n.title, '#/board/notice/' + n.id));
    const viewAll = UI.has('KPI_VIEW_ALL');
    const kpiFirst = [];
    if (viewAll) kpiFirst.push(link('팀 전체 현황', '#/kpi/team'));
    ['1', '2', '3', '4'].forEach((n) => {
      if (viewAll || u.dept === '물류' + n + '직') kpiFirst.push(link('물류' + n + '직', '#/kpi/' + n));
    });
    const quick = [];
    if (!UI.has('VIEW_EXEC')) quick.push(link('실적 작성', '#/kpi/write'));
    if (u.perms.some((p) => p.startsWith('KPI_CHECK:'))) quick.push(link('확인 대기', '#/kpi/pending'));
    if (!UI.has('VIEW_EXEC') && UI.has('KPI_MANAGER') || u.perms.some((p) => p.startsWith('KPI_CHECK:'))) quick.push(link('월 입력', '#/kpi/monthly'));
    if (viewAll) quick.push(link('미팅용 보기', '#/kpi/meeting'));
    if (UI.hasAny(['UPLOAD_ABNORMAL', 'UPLOAD_INVENTORY', 'ADMIN'])) quick.push(link('실적 업로드', '#/kpi/upload'));
    if (UI.hasAny(['UPLOAD_ABNORMAL', 'UPLOAD_INVENTORY', 'ADMIN', 'VIEW_EXEC'])) quick.push(link('업로드 이력', '#/kpi/upload'));
    const suggest = [link('건의하기', '#/suggest')];
    if (!UI.has('VIEW_EXEC')) suggest.push(link('내 건의', '#/suggest/mine'));
    if (!UI.has('VIEW_EXEC') && (UI.hasAny(['SUGGEST_VIEW', 'SUGGEST_READ']) || u.perms.some((p) => p.startsWith('KPI_CHECK:')))) suggest.push(link('전체 건의', '#/suggest/all'));
    const admin = [];
    if (UI.hasAny(['ADMIN', 'VIEW_EXEC', 'KPI_TEAM'])) admin.push(link('대시보드', '#/admin'));
    if (UI.has('ADMIN')) admin.push(link('사용자 관리', '#/admin/users'));
    if (UI.hasAny(['KPI_MANAGER', 'VIEW_EXEC'])) admin.push(link('장비면허 명부', '#/admin/license'));
    if (UI.hasAny(['ADMIN', 'KPI_TEAM', 'VIEW_EXEC'])) admin.push(link('목표·평가기준', '#/admin/targets'));
    if (UI.hasAny(['ADMIN', 'VIEW_EXEC'])) admin.push(link('데이터 관리', '#/admin/data'));
    const list = [
      { key: 'board', label: '게시판', first: [link('공지사항', '#/board/notice'), link('업무 게시판', '#/board/work')],
        groups: [{ title: '바로가기', links: UI.has('VIEW_EXEC') ? [] : [link('글쓰기', '#/board/work/new')] }, { title: '최신 공지', links: notices }] },
      { key: 'kpi', label: 'KPI', first: kpiFirst, groups: [{ title: '바로가기', links: quick }, { title: '이번 달 내 직', links: myKpi() }] },
      { key: 'suggest', label: '건의사항', first: suggest, groups: [] },
      { key: 'award', label: '우수사원', first: [link('우수사원 평가', '#/award')], groups: [] }
    ];
    list.push({ key: 'qr', label: 'QR장비점검', first: [link('장비 점검', '#/qr')], groups: [] });
    if (admin.length) list.push({ key: 'admin', label: '관리자', first: admin, groups: [] });
    return list;
  }

  function myKpi() {
    const d = (App.home.kpiHome || {})[App.user.dept];
    if (!d) return [];
    const to = /^물류[1-4]직$/.test(App.user.dept) ? '#/kpi/' + App.user.dept.charAt(2) : '#/kpi/team';
    return [link('달성 ' + d.G + ' · 주의 ' + d.Y + ' · 미달 ' + d.R, to)];
  }

  const panel = () => document.getElementById('nav-panel');
  const inner = () => document.getElementById('nav-panel-inner');
  const scrim = () => document.getElementById('nav-scrim');

  function fillPanel(item) {
    fill(inner(),
      h('div', { class: 'panel-col' }, item.first.map((l) => h('a', { class: 'panel-big', href: l.href }, l.label))),
      item.groups.filter((g) => g.links.length).map((g) => h('div', { class: 'panel-col' },
        h('p', { class: 'panel-title' }, g.title),
        g.links.map((l) => h('a', { class: 'panel-link', href: l.href }, l.label))))
    );
  }

  function show(key) {
    clearTimeout(closeTimer);
    const item = items.find((m) => m.key === key);
    if (!item) return;
    current = key;
    fillPanel(item);
    panel().style.height = inner().offsetHeight + 'px';
    panel().classList.add('open');
    scrim().classList.add('open');
    document.querySelectorAll('.nav-item').forEach((b) => {
      const on = b.dataset.key === key;
      b.setAttribute('aria-expanded', String(on));
    });
  }

  function hide() {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    current = null;
    panel().style.height = '0px';
    panel().classList.remove('open');
    scrim().classList.remove('open');
    document.querySelectorAll('.nav-item').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  const scheduleClose = () => { clearTimeout(openTimer); clearTimeout(closeTimer); closeTimer = setTimeout(hide, CLOSE_DELAY); };

  function drawAvatar() {
    const u = App.user;
    const btn = document.getElementById('avatar-btn');
    btn.replaceChildren(u.photo
      ? h('img', { src: 'data:image/jpeg;base64,' + u.photo, alt: '' })
      : h('span', { class: 'avatar-letter' }, String(u.name || '').charAt(0)));
    const menu = document.getElementById('avatar-menu');
    const fileIn = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      const f = fileIn.files[0];
      if (!f) return;
      try {
        const res = await Api.call('photoSelf', { photo: await ImageTool.square(f) });
        App.user.photo = res.photo;
        drawAvatar();
        setAvatar(true);
        UI.toast('사진을 변경했습니다.');
      } catch (err) { UI.toast(err.message || '사진을 올리지 못했습니다.', true); }
    } });
    const big = u.photo
      ? h('img', { class: 'card-photo', src: 'data:image/jpeg;base64,' + u.photo, alt: '' })
      : h('span', { class: 'card-photo card-letter' }, String(u.name || '').charAt(0));
    menu.replaceChildren(
      big,
      h('strong', { class: 'card-name' }, u.name),
      h('span', { class: 'card-sub' }, u.dept + ' / ' + u.rank),
      h('div', { class: 'card-actions' },
        h('button', { type: 'button', onclick: () => fileIn.click() }, h('span', { class: 'card-ico' }, '✎'), '사진 변경'),
        h('a', { href: '#/account/password', onclick: () => setAvatar(false) }, h('span', { class: 'card-ico' }, '⚿'), '비밀번호'),
        h('button', { type: 'button', onclick: () => App.logout() }, h('span', { class: 'card-ico' }, '⇥'), '로그아웃')),
      fileIn);
  }

  function setAvatar(open) {
    document.getElementById('avatar-menu').hidden = !open;
    document.getElementById('avatar-btn').setAttribute('aria-expanded', String(open));
  }

  function drawMobile() {
    const root = document.getElementById('mobile-menu');
    const list = h('div', { class: 'm-list' }, items.map((m, i) => h('button', {
      class: 'm-big', type: 'button', style: 'animation-delay:' + i * 40 + 'ms', onclick: () => drawSub(m)
    }, m.label)));
    root.replaceChildren(list);
  }

  function drawSub(m) {
    const root = document.getElementById('mobile-menu');
    const sub = h('div', { class: 'm-list m-sub' },
      h('button', { class: 'm-back', type: 'button', onclick: drawMobile, 'aria-label': '뒤로' }, '뒤로'),
      m.first.map((l) => h('a', { class: 'm-big', href: l.href }, l.label)),
      m.groups.filter((g) => g.links.length).map((g) => [h('p', { class: 'panel-title' }, g.title),
        g.links.map((l) => h('a', { class: 'm-link', href: l.href }, l.label))]));
    root.replaceChildren(sub);
  }

  function setMobile(open) {
    const root = document.getElementById('mobile-menu');
    root.hidden = !open;
    document.getElementById('menu-btn').setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('no-scroll', open);
    if (open) drawMobile();
  }

  function draw() {
    items = menus();
    const links = document.getElementById('nav-links');
    links.replaceChildren(...items.map((m) => h('button', {
      class: 'nav-item', type: 'button', dataset: { key: m.key }, 'aria-expanded': 'false',
      onmouseenter: () => {
        clearTimeout(closeTimer); clearTimeout(openTimer);
        if (current) show(m.key); else openTimer = setTimeout(() => show(m.key), OPEN_DELAY);
      },
      onmouseleave: scheduleClose,
      onclick: () => { if (current === m.key) hide(); else show(m.key); }
    }, m.label)));
    drawAvatar();
    drawTabbar();
  }

  function kpiHref() {
    const u = App.user;
    return UI.has('KPI_VIEW_ALL') || !/^물류[1-4]직$/.test(u.dept) ? '#/kpi/team' : '#/kpi/' + u.dept.charAt(2);
  }
  function drawTabbar() {
    const bar = document.getElementById('tabbar');
    const exec = UI.has('VIEW_EXEC');
    const tab = (key, href, icon, label) => h('a', { class: 'tab-item', href, dataset: { tab: key } }, UI.icon(icon), h('span', null, label));
    bar.replaceChildren(
      tab('home', '#/', 'home', '홈'),
      exec ? tab('notice', '#/board/notice', 'megaphone', '공지') : tab('write', '#/kpi/write', 'edit', '작성'),
      tab('qr', '#/qr', 'qr', 'QR점검'),
      tab('kpi', kpiHref(), 'chart', 'KPI'),
      h('button', { class: 'tab-item', type: 'button', 'aria-label': '전체 메뉴', onclick: () => setMobile(document.getElementById('mobile-menu').hidden) }, UI.icon('list'), h('span', null, '전체')));
    bar.hidden = false;
    markTab();
  }
  function markTab() {
    const bar = document.getElementById('tabbar');
    if (!bar || bar.hidden) return;
    const p = Router.path().split('?')[0];
    const key = p === '/' ? 'home' : p.startsWith('/kpi/write') ? 'write' : p.startsWith('/board/notice') ? 'notice' : p === '/qr' ? 'qr' : p.startsWith('/kpi') ? 'kpi' : '';
    bar.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('on', a.dataset.tab === key));
  }

  function bind() {
    const nav = document.getElementById('nav');
    panel().addEventListener('mouseenter', () => clearTimeout(closeTimer));
    panel().addEventListener('mouseleave', scheduleClose);
    scrim().addEventListener('click', hide);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hide(); setAvatar(false); } });
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) hide();
      if (!e.target.closest('.avatar-wrap')) setAvatar(false);
    });
    document.getElementById('avatar-btn').addEventListener('click', () => setAvatar(document.getElementById('avatar-menu').hidden));
    document.getElementById('menu-btn').addEventListener('click', () => setMobile(document.getElementById('mobile-menu').hidden));
  }

  return { draw, bind, closeAll() { hide(); setAvatar(false); setMobile(false); markTab(); } };
})();
