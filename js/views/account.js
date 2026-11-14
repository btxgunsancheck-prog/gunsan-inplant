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
  /* 왼쪽(PC): 물류 그림(unDraw)과 소개, 오른쪽: 로그인 카드. 휴대폰에서는 위아래로 쌓인다. */
  app.replaceChildren(h('div', { class: 'login login-split' },
    h('section', { class: 'login-art' },
      h('p', { class: 'login-tag', lang: 'en' }, 'Together for a Better Tomorrow'),
      h('h2', null, '오늘의 현장을 ', h('em', { class: 'hand' }, '함께'), ' 기록합니다.'),
      h('img', { src: 'assets/illust/logistics.svg', alt: '', class: 'login-illust', width: 400, height: 203, decoding: 'async' })),
    h('section', { class: 'login-card' },
      h('img', { src: 'assets/logo.png', alt: 'BTRIPLE', class: 'login-logo', width: 172, height: 32 }),
      h('h1', null, '군산 사내물류팀'), form)));
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
