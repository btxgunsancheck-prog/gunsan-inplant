/* 해시 주소 처리. */
const Router = {
  routes: [],
  add(pattern, view) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:[a-z]+/gi, (m) => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$');
    Router.routes.push({ re, keys, view });
  },
  path() { return (location.hash || '#/').slice(1) || '/'; },
  go(path) {
    if (Router.path() === path) Router.render();
    else location.hash = path;
  },
  render() {
    const path = Router.path().split('?')[0];
    const seq = (Router.seq = (Router.seq || 0) + 1);
    App.closeMenus();
    if (!App.authed()) {
      if (path !== '/login') Store.draftSet('return', Router.path());
      return Views.login();
    }
    if (App.user && App.user.mustChange && path !== '/account/password') { Router.go('/account/password'); return undefined; }
    const app = document.getElementById('app');
    for (const r of Router.routes) {
      const m = path.match(r.re);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        window.scrollTo(0, 0);
        return r.view(params, app, () => seq === Router.seq);
      }
    }
    app.replaceChildren(UI.placeholder('페이지를 찾을 수 없습니다'));
    return undefined;
  }
};
window.addEventListener('hashchange', () => Router.render());
