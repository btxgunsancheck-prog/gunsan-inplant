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
    await App.refreshInit();
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
