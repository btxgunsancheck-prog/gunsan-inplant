/* QR장비점검 바로가기. 장비별 주소는 로그인한 직원에게만 서버가 내려준다. */
(() => {
  Router.add('/qr', (params, app, alive) => {
    const body = h('div', { class: 'wrap' }, UI.skeleton(5));
    const load = () => Api.call('qrList').then((d) => {
      if (!alive()) return;
      const mine = App.user.dept;
      const groups = d.groups.slice().sort((a, b) => (b.dept === mine) - (a.dept === mine));
      const open = (url) => h('a', { class: 'qr-item', href: url, target: '_blank', rel: 'noopener noreferrer' });
      fill(body,
        d.admin ? h('div', { class: 'qr-admin' },
          h('div', null, h('strong', null, '관리자 로그인'), h('p', { class: 'sub' }, '직장·공장·팀장·사업부장은 사번과 PIN으로 로그인해 점검 현황을 확인합니다.')),
          h('a', { class: 'btn', href: d.admin, target: '_blank', rel: 'noopener noreferrer' }, 'QR장비점검 열기')) : null,
        groups.length ? groups.map((g) => h('div', { class: 'qr-group' },
          h('h2', { class: 'block-h' }, g.group + ' ', h('span', { class: 'sub' }, g.dept + ' 담당 · ' + g.items.length + '대')),
          h('div', { class: 'qr-grid' }, g.items.map((it) => {
            const a = open(it.url);
            a.append(h('strong', null, it.name), h('span', { class: 'sub' }, '점검 화면 열기'));
            return a;
          })))) : h('p', { class: 'sub center' }, '내 직(' + App.user.dept + ')에 등록된 장비가 없습니다.'));
    }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    app.replaceChildren(UI.hero('QR장비점검', '장비를 골라 점검 화면으로 이동합니다.'), h('section', { class: 'section' }, body));
    load();
  });
})();
