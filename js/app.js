/* 시작과 세션 관리. */
const App = {
  user: null,
  home: {},
  authed() { return !!Store.get('token'); },
  closeMenus() { Nav.closeAll(); },

  apply(data) {
    App.user = data.user;
    App.home = data;
    Store.set('init', data);
    document.getElementById('nav').hidden = false;
    Nav.draw();
  },

  async refreshInit() {
    const data = await Api.call('init');
    App.apply(data);
    return data;
  },

  async startSession(login, remember) {
    const ret = Store.draftGet('return');
    Store.clearAll();
    Store.setRemember(remember);
    Store.set('token', login.token);
    if (login.init) App.apply(login.init); else await App.refreshInit();
    Router.go(App.user.mustChange ? '/account/password' : (ret && ret !== '/login' ? ret : '/'));
    Router.render();
  },

  expired() {
    if (!App.authed()) return;
    App.reset();
    UI.toast('다시 로그인해 주세요.', true);
  },

  reset() {
    Store.clearAll();
    App.user = null;
    App.home = {};
    document.getElementById('nav').hidden = true;
    Router.go('/login');
    Router.render();
  },

  async logout() {
    try { await Api.call('logout'); } catch (e) { /* 서버 실패와 관계없이 화면 데이터는 지운다 */ }
    App.reset();
  },

  boot() {
    Nav.bind();
    if (!App.authed()) { Router.render(); return; }
    const cached = Store.get('init');
    if (cached) { App.apply(cached); Router.render(); } else { document.getElementById('app').replaceChildren(UI.skeleton(6)); }
    App.refreshInit().then(() => {
      if (!cached) Router.render();
      else if (App.user.mustChange) Router.render();
    }).catch((e) => {
      if (e.code !== 'AUTH_EXPIRED' && !cached) document.getElementById('app').replaceChildren(UI.error(e.message, () => location.reload()));
    });
  }
};

Router.add('/login', (params, app) => { Router.go('/'); });
App.boot();

/* 새 버전 확인. 홈 화면 앱은 예전 화면을 오래 들고 있으므로 version.json을 캐시 없이 확인한다.
   켤 때 바뀌었으면 바로 새로 열고, 쓰는 도중에 다시 볼 때는 안내 막대만 띄운다(입력 중인 내용 보호). */
(function () {
  const mine = document.documentElement.dataset.ver || '';
  let shown = false;
  const latest = () => fetch('version.json?nc=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()).then((j) => j.v || '').catch(() => '');
  const open = (v) => location.replace(location.pathname + '?v=' + encodeURIComponent(v) + location.hash);
  latest().then((v) => {
    if (!v || v === mine) return;
    try { if (sessionStorage.getItem('gi_ver_try') === v) return; sessionStorage.setItem('gi_ver_try', v); } catch (e) { return; }
    open(v);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || shown) return;
    latest().then((v) => {
      if (!v || v === mine || shown) return;
      shown = true;
      document.body.append(h('div', { class: 'update-bar', role: 'status' }, h('span', null, '새 버전이 나왔습니다.'),
        h('button', { class: 'btn', type: 'button', onclick: () => open(v) }, '새로 열기')));
    });
  });
})();
