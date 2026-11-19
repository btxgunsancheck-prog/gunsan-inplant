/* 로그인과 비밀번호 변경 화면. */
const Views = {};

/* 2026-11-19: 새 로그인 디자인은 PC(폭 834px 이상)에만 쓴다. 휴대폰은 따로 만들 예정이라 이전 화면을 그대로 둔다.
   창 크기가 기준을 넘나들면 로그인 화면을 다시 그린다. */
const LOGIN_PC = window.matchMedia('(min-width: 834px)');
LOGIN_PC.addEventListener('change', () => { if (document.querySelector('.login-split')) Views.login(); });

Views.login = function () {
  const pc = LOGIN_PC.matches;
  document.getElementById('nav').hidden = true;
  document.getElementById('tabbar').hidden = true;
  const app = document.getElementById('app');
  const msg = h('p', { class: 'form-error', role: 'alert' });
  const emp = h('input', { name: 'empNo', placeholder: pc ? '사번을 입력하세요' : null, autocomplete: 'username', autocapitalize: 'characters', spellcheck: 'false', required: true });
  const pw = h('input', { name: 'password', type: 'password', placeholder: pc ? '비밀번호를 입력하세요' : null, autocomplete: 'current-password', required: true });
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
  /* 2026-11-19 로그인 화면 개편(사용자 시안): 왼쪽은 현장 사진과 단체 사진(대각선으로 나눔), 문구, 아래 가치 3개.
     오른쪽은 곡선으로 파고든 흰 패널에 로그인. 휴대폰에서는 위에 현장 사진 띠, 아래 로그인 순서로 쌓인다.
     단체 사진은 직원 얼굴이 보이지만 사용자(팀장)가 그대로 쓰기로 결정했다(2026-11-19). */
  const svg = (inner, cls, vb, extra) => { const el = h('span', { class: cls, 'aria-hidden': 'true' }); el.innerHTML = '<svg viewBox="' + vb + '"' + (extra || '') + '>' + inner + '</svg>'; return el; };
  const ico = (paths) => svg(paths, 'la-ico', '0 0 24 24', ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"');
  const values = [
    [ico('<path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3"/><path d="M9 12l2 2l4 -4"/>'), '안전한 현장'],
    [svg('<path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-7.37-4.89,8,8,0,0,1,0-6.22A8,8,0,0,1,192,112a24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.84,8,57,57,0,0,0-98.16,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z"/>', 'la-ico', '0 0 256 256', ' fill="currentColor"'), '함께하는 팀'],
    [ico('<path d="M4 21v-4"/><path d="M9 21v-7"/><path d="M14 21v-9"/><path d="M19 21v-12"/><path d="M3 12l6 -5l4 3l7 -7"/><path d="M16 3h4v4"/>'), '더 나은 내일']
  ];
  if (!pc) {
    /* 휴대폰: 이전 화면(물류 그림과 소개 위, 로그인 카드 아래) */
    app.replaceChildren(h('div', { class: 'login login-split' },
      h('section', { class: 'login-art' },
        h('p', { class: 'login-tag', lang: 'en' }, 'Together for a Better Tomorrow'),
        h('h2', null, '오늘의 현장을 ', h('em', { class: 'hand' }, '함께'), ' 기록합니다.'),
        h('img', { src: 'assets/illust/logistics.svg', alt: '', class: 'login-illust', width: 400, height: 203, decoding: 'async' })),
      h('section', { class: 'login-card' },
        h('img', { src: 'assets/logo.png', alt: 'BTRIPLE', class: 'login-logo', width: 172, height: 32 }),
        h('h1', null, '군산 사내물류팀'), form, guestBox)));
    return;
  }
  app.replaceChildren(h('div', { class: 'login login-split login-v2' },
    h('section', { class: 'login-art' },
      h('div', { class: 'la-photo la-field' }), h('div', { class: 'la-photo la-group' }),
      h('div', { class: 'la-bar' }),
      h('div', { class: 'la-line-glow' }, h('div', { class: 'la-line' })), h('div', { class: 'la-line-glow la-glow-bar' }, h('div', { class: 'la-line la-line-bar' })),
      h('div', { class: 'la-brand' }, h('img', { src: 'assets/login/logo-white.png', alt: 'BTRIPLE', width: 483, height: 90 }), h('span', null, '군산 사내물류팀')),
      h('h2', { class: 'la-head' }, '오늘의 현장을', h('br'), h('span', { class: 'la-hand' }, '함께'), ' 만들어갑니다.',
        h('img', { class: 'la-hamkke', src: 'assets/login/hamkke.png', alt: '', width: 176, height: 80 }),
        svg('<path d="M17.6 55.8 L20.3 55.1 L24.0 54.1 L28.3 52.9 L33.2 51.6 L38.2 50.3 L43.4 49.0 L48.7 47.8 L54.5 46.4 L60.6 45.1 L66.8 43.7 L73.0 42.4 L79.1 41.1 L85.0 40.0 L90.9 38.8 L96.9 37.8 L102.9 36.7 L108.8 35.7 L114.8 34.7 L120.8 33.7 L126.7 32.8 L132.7 31.8 L138.7 30.9 L144.6 30.1 L150.6 29.3 L156.5 28.5 L162.5 27.8 L168.4 27.1 L174.4 26.4 L180.4 25.8 L186.3 25.3 L192.3 24.8 L198.2 24.3 L204.2 23.9 L210.2 23.5 L216.2 23.1 L222.2 22.8 L228.1 22.5 L234.1 22.2 L240.1 21.9 L246.1 21.7 L252.1 21.5 L258.1 21.2 L264.1 21.0 L270.1 20.8 L276.1 20.6 L282.0 20.4 L288.0 20.3 L294.0 20.2 L300.0 20.1 L305.9 20.2 L311.9 20.2 L317.9 20.3 L323.9 20.4 L329.9 20.6 L336.0 20.7 L342.3 20.9 L348.7 21.2 L354.8 21.4 L360.6 21.6 L365.9 21.9 L370.6 22.1 L374.7 22.3 L378.5 22.5 L382.1 22.8 L385.9 23.0 L389.9 23.4 L394.5 23.8 L399.7 24.3 L404.9 24.8 L409.8 25.4 L414.0 25.8 L417.0 26.0 L417.0 26.0 L414.0 25.4 L409.9 24.7 L405.1 23.9 L399.9 23.1 L394.7 22.3 L390.1 21.6 L386.1 21.1 L382.3 20.7 L378.7 20.3 L374.9 19.9 L370.7 19.5 L366.1 19.1 L360.8 18.7 L355.0 18.2 L348.8 17.7 L342.5 17.3 L336.2 16.8 L330.1 16.4 L324.1 16.1 L318.1 15.8 L312.1 15.5 L306.1 15.2 L300.0 15.0 L294.0 14.8 L288.0 14.7 L282.0 14.7 L275.9 14.7 L269.9 14.7 L263.9 14.7 L257.9 14.8 L251.9 14.8 L245.9 14.8 L239.9 14.9 L233.9 15.0 L227.9 15.1 L221.8 15.2 L215.8 15.4 L209.8 15.6 L203.8 15.8 L197.8 16.1 L191.7 16.4 L185.7 16.7 L179.6 17.1 L173.6 17.6 L167.6 18.0 L161.5 18.6 L155.5 19.1 L149.4 19.7 L143.4 20.4 L137.3 21.1 L131.3 21.9 L125.3 22.6 L119.2 23.5 L113.2 24.3 L107.2 25.1 L101.1 26.0 L95.1 26.9 L89.1 27.9 L83.0 28.8 L76.9 29.9 L70.8 31.0 L64.5 32.2 L58.2 33.4 L52.0 34.6 L46.1 35.8 L40.6 37.0 L35.3 38.1 L30.1 39.4 L25.2 40.5 L20.8 41.6 L17.1 42.5 L14.4 43.2 L13.5 43.5 L11.4 44.9 L10.0 47.0 L9.5 49.5 L10.0 52.0 L11.4 54.1 L13.5 55.5 Z" fill="#f66e14"/>', 'la-swoosh', '0 0 430 65')),
      h('ul', { class: 'la-values' }, values.map(([i, t]) => h('li', null, i, h('span', null, t))))),
    h('section', { class: 'login-card' },
      svg('<defs><linearGradient id="lcg" x1="1" y1="0" x2="0.35" y2="0.55"><stop offset="0" stop-color="#bcd3fb"/><stop offset="0.2" stop-color="#e2ecfd"/><stop offset="0.45" stop-color="#f4f7fe"/><stop offset="1" stop-color="#f9fafe"/></linearGradient></defs>'
        + '<path d="M148 0 C 110 90, 30 200, 0 300 L0 1000 L1000 1000 L1000 0 Z" fill="url(#lcg)"/>'
        + '<defs><linearGradient id="lcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9c6fb" stop-opacity=".75"/><stop offset="1" stop-color="#cfe0fd" stop-opacity="0"/></linearGradient></defs>'
        + '<path d="M774 0 L835 0 L655 165 L600 150 Z" fill="#ffffff" opacity=".4"/><path d="M860 0 L1000 0 L1000 40 L885 145 L735 120 Z" fill="url(#lcb)"/>'
        + '<path d="M148 0 C 110 90, 30 200, 0 300 L0 1000" fill="none" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"/>', 'lc-shape', '0 0 1000 1000', ' preserveAspectRatio="none"'),
      /* 하단 사선 장식: 시안(1672x941) 오른쪽 아래를 열마다 색을 재서 그린 층(연하늘, 하늘, 파랑, 남색, 주황). 화면이 넓어도 비율 고정, 왼쪽 끝까지 이어짐 */
      svg('<path d="M600 941 L600 900 L985 900 L1150 924 L1195 925 L1300 909 L1592 833 L1672 748 L1672 941 Z" fill="#c3d7fa"/><path d="M1185 941 L1195 925 L1300 909 L1592 833 L1672 812 L1672 941 Z" fill="#a6c3f7"/><path d="M1118 941 L1170 929 L1228 941 Z" fill="#7ca8f2"/><path d="M1528 941 L1528 884 L1592 833 L1672 809 L1672 941 Z" fill="#7ca8f2"/><path d="M1222 941 L1450 896 L1672 860 L1672 941 Z" fill="#1550bb"/><path d="M1305 941 L1672 846 L1672 941 Z" fill="#012675"/><path d="M1440 941 L1672 856 L1672 873 L1465 941 Z" fill="#fc7a00"/>', 'lc-deco lc-bottom', '600 740 1072 201', ' preserveAspectRatio="xMaxYMax meet"'),
      h('div', { class: 'lc-body' },
        h('img', { src: 'assets/logo.png', alt: 'BTRIPLE', class: 'login-logo', width: 483, height: 90 }),
        h('h1', null, '군산 사내물류팀'), form, guestBox))));
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
