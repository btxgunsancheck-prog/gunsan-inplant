/* QR장비점검 바로가기. 장비별 주소는 로그인한 직원에게만 서버가 내려준다. */
(() => {
  Router.add('/qr', (params, app, alive) => {
    const body = h('div', { class: 'wrap' }, UI.skeleton(5));
    const load = () => Api.call('qrList').then((d) => {
      if (!alive()) return;
      const mine = App.user.dept;
      const groups = d.groups.slice().sort((a, b) => (b.dept === mine) - (a.dept === mine));
      const open = (url) => h('a', { class: 'qr-item', href: url, target: '_blank', rel: 'noopener noreferrer' });
      /* 2026-11-22: 관리자(직장·공장·팀장·사업부장)는 사이트 로그인으로 QR장비점검에 자동 로그인한다.
         서버가 일회용 표(2분)를 붙인 주소를 주고, 대상이 아니면 일반 로그인 주소를 준다. 팝업 차단을 피하려고 창을 먼저 연다. */
      const openAdmin = h('button', { class: 'btn', type: 'button', onclick: async () => {
        const win = window.open('about:blank', '_blank');
        openAdmin.disabled = true;
        try {
          const r = await Api.call('qrSso');
          if (win) { win.opener = null; win.location.replace(r.url); } else location.href = r.url;
        } catch (err) {
          if (win) win.close();
          UI.toast(err.message, true);
        } finally { openAdmin.disabled = false; }
      } }, 'QR장비점검 열기');
      fill(body,
        d.admin ? h('div', { class: 'qr-admin' },
          h('div', null, h('strong', null, '관리자 화면'), h('p', { class: 'sub' }, '직장·공장·팀장·사업부장은 사이트 로그인으로 바로 들어갑니다(PIN 입력 없음). 처음 한 번은 QR장비점검에서 PIN을 등록해 두어야 합니다.')),
          openAdmin) : null,
        groups.length ? groups.map((g) => h('div', { class: 'qr-group' },
          h('h2', { class: 'block-h' }, g.group + ' ', h('span', { class: 'sub' }, g.dept + ' 담당 · ' + g.items.length + '대')),
          h('div', { class: 'qr-grid' }, g.items.map((it) => {
            const a = open(it.url);
            a.append(h('strong', null, it.name), h('span', { class: 'sub' }, '점검 화면 열기'));
            return a;
          })))) : UI.empty('내 직(' + App.user.dept + ')에 등록된 장비가 없습니다.', 'data'));
    }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    app.replaceChildren(UI.hero('QR장비점검', '장비를 골라 점검 화면으로 이동합니다.'), h('section', { class: 'section' }, body));
    load();
  });
})();
