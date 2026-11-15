/* 로그인과 비밀번호 변경 화면. */
const Views = {};

Views.login = function () {
  document.getElementById('nav').hidden = true;
  document.getElementById('tabbar').hidden = true;
  const app = document.getElementById('app');
  const msg = h('p', { class: 'form-error', role: 'alert' });
  const emp = h('input', { name: 'empNo', autocomplete: 'username', autocapitalize: 'characters', spellcheck: 'false', required: true });
  const pw = h('input', { name: 'password', type: 'password', autocomplete: 'current-password', required: true });
  const remember = h('input', { type: 'checkbox', name: 'remember' });
  const btn = h('button', { class: 'btn wide', type: 'submit' }, '로그인');
  const form = h('form', { class: 'login-form', onsubmit: async (e) => {
    e.preventDefault();
    msg.textContent = '';
    btn.disabled = true;
    btn.textContent = '로그인 중';
    try {
      const data = await Api.call('login', { empNo: emp.value, password: pw.value, remember: remember.checked, device: navigator.userAgent.slice(0, 120) });
      await App.startSession(data, remember.checked);
    } catch (err) {
      msg.textContent = err.message;
      btn.disabled = false;
      btn.textContent = '로그인';
    }
  } },
    UI.field('사번', emp), UI.field('비밀번호', pw),
    h('label', { class: 'check' }, remember, h('span', null, '로그인 상태 유지')),
    msg, btn);
  /* 게스트 입장: 로그인 없이 팀 전체 KPI와 우수개선현황만 본다(고객사·타 부서용). 서버에서 게스트 계정이 꺼져 있으면 입장되지 않는다. */
  const guestBtn = h('button', { class: 'btn ghost wide', type: 'button', onclick: async () => {
    msg.textContent = '';
    guestBtn.disabled = true;
    guestBtn.textContent = '입장 중';
    try {
      const data = await Api.call('guestLogin', {});
      await App.startSession(data, false);
    } catch (err) {
      msg.textContent = err.message;
      guestBtn.disabled = false;
      guestBtn.textContent = '게스트로 둘러보기 (로그인 없이)';
    }
  } }, '게스트로 둘러보기 (로그인 없이)');
  const guestBox = h('div', { class: 'guest-entry' }, guestBtn);
  /* 왼쪽(PC): 물류 그림(unDraw)과 소개, 오른쪽: 로그인 카드. 휴대폰에서는 위아래로 쌓인다. */
  app.replaceChildren(h('div', { class: 'login login-split' },
    h('section', { class: 'login-art' },
      h('p', { class: 'login-tag', lang: 'en' }, 'Together for a Better Tomorrow'),
      h('h2', null, '오늘의 현장을 ', h('em', { class: 'hand' }, '함께'), ' 기록합니다.'),
      h('img', { src: 'assets/illust/logistics.svg', alt: '', class: 'login-illust', width: 400, height: 203, decoding: 'async' })),
    h('section', { class: 'login-card' },
      h('img', { src: 'assets/logo.png', alt: 'BTRIPLE', class: 'login-logo', width: 172, height: 32 }),
      h('h1', null, '군산 사내물류팀'), form, guestBox)));
};

Router.add('/account/password', (params, app) => {
  const forced = App.user.mustChange;
  const msg = h('p', { class: 'form-error', role: 'alert' });
  const cur = h('input', { type: 'password', autocomplete: 'current-password', required: true });
  const next = h('input', { type: 'password', autocomplete: 'new-password', required: true, minlength: 6 });
  const next2 = h('input', { type: 'password', autocomplete: 'new-password', required: true, minlength: 6 });
  const btn = h('button', { class: 'btn wide', type: 'submit' }, '변경');
  app.replaceChildren(UI.hero('비밀번호 변경', forced ? '처음 로그인하셨습니다. 새 비밀번호를 정해 주세요.' : '6자 이상, 사번과 다르게 정해 주세요.'),
    h('div', { class: 'section' }, h('form', { class: 'narrow', onsubmit: async (e) => {
      e.preventDefault();
      msg.textContent = '';
      if (next.value !== next2.value) { msg.textContent = '새 비밀번호가 서로 다릅니다.'; return; }
      btn.disabled = true;
      try {
        await Api.call('changePassword', { current: cur.value, next: next.value });
        UI.toast('비밀번호를 변경했습니다.');
        await App.refreshInit();
        Router.go('/');
      } catch (err) {
        msg.textContent = err.message;
        btn.disabled = false;
      }
    } }, UI.field(forced ? '현재 비밀번호(사번)' : '현재 비밀번호', cur), UI.field('새 비밀번호', next), UI.field('새 비밀번호 확인', next2), msg, btn)));
});

/* 휴대폰 알림 켜기·끄기 */
Router.add('/account/push', (params, app, alive) => {
  const msg = h('p', { class: 'form-error', role: 'alert' });
  const box = h('div', { class: 'narrow' });
  const draw = () => {
    if (!alive()) return;
    const st = Push.status();
    const sayOn = st === 'granted';
    const parts = [];
    if (st === 'off') parts.push(h('p', { class: 'sub' }, '휴대폰 알림은 아직 준비 중이거나 이 계정에서는 쓸 수 없습니다.'));
    else if (st === 'install') parts.push(h('p', { class: 'work-note' }, '아이폰은 홈 화면에 추가한 앱에서만 알림을 받을 수 있습니다. 사파리 하단의 공유 버튼을 누르고 "홈 화면에 추가"를 한 뒤, 홈 화면의 앱으로 다시 들어와 이 화면에서 알림을 켜 주세요. (iOS 16.4 이상)'));
    else if (st === 'unsupported') parts.push(h('p', { class: 'sub' }, '이 브라우저는 알림을 지원하지 않습니다. 크롬이나 홈 화면에 추가한 앱을 이용해 주세요.'));
    else if (st === 'denied') parts.push(h('p', { class: 'work-note' }, '알림이 차단되어 있습니다. 휴대폰 설정에서 이 앱(또는 브라우저)의 알림을 허용한 뒤 다시 들어와 주세요.'));
    else {
      parts.push(h('p', { class: 'sub' }, '알림이 ' + (sayOn ? '켜져 있습니다.' : '꺼져 있습니다.') + ' 새 공지사항, 건의사항, 우수사원 할 일이 생기면 휴대폰으로 알려 드립니다.'));
      const btn = h('button', { class: 'btn' + (sayOn ? ' ghost' : ''), type: 'button', onclick: async () => {
        msg.textContent = '';
        btn.disabled = true;
        try {
          if (sayOn) { await Push.disable(); UI.toast('알림을 껐습니다. (이 기기)'); } else { await Push.enable(); UI.toast('알림을 켰습니다.'); }
        } catch (e) { msg.textContent = e.message; }
        btn.disabled = false;
        draw();
      } }, sayOn ? '이 기기 알림 끄기' : '알림 켜기');
      parts.push(btn);
      if (sayOn) parts.push(h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
        msg.textContent = '';
        try { await Api.call('pushTest', {}); UI.toast('시험 알림을 보냈습니다. 잠시 후 휴대폰을 확인해 주세요.'); } catch (e) { msg.textContent = e.message; }
      } }, '시험 알림 보내기'));
    }
    box.replaceChildren(...parts, msg);
  };
  app.replaceChildren(UI.hero('휴대폰 알림', '공지, 건의, 우수사원 할 일을 휴대폰으로 받습니다.'), h('div', { class: 'section' }, box));
  draw();
});
