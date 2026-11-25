/* 로그인과 비밀번호 변경 화면. */
const Views = {};

/* 2026-11-19: 새 로그인 디자인은 PC(폭 834px 이상)에만 쓴다. 휴대폰은 따로 만들 예정이라 이전 화면을 그대로 둔다.
   창 크기가 기준을 넘나들면 로그인 화면을 다시 그린다. */
const LOGIN_PC = window.matchMedia('(min-width: 834px)');
LOGIN_PC.addEventListener('change', () => { if (document.querySelector('.login-split')) Views.login(); });

let LOGIN_SIGNUP = false;

Views.login = function () {
  const pc = LOGIN_PC.matches;
  document.getElementById('nav').hidden = true;
  document.getElementById('tabbar').hidden = true;
  const app = document.getElementById('app');
  const msg = h('p', { class: 'form-error', role: 'alert' });
  const emp = h('input', { name: 'empNo', placeholder: '사번을 입력하세요', autocomplete: 'username', autocapitalize: 'characters', spellcheck: 'false', required: true });
  const pw = h('input', { name: 'password', type: 'password', placeholder: '비밀번호를 입력하세요', autocomplete: 'current-password', required: true });
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
  /* 2026-11-25 기타부서 가입: 사번 형식과 관리자가 정한 가입 코드가 맞으면 기타부서 계정이 만들어지고 바로 로그인된다. */
  const switchTo = (on) => { LOGIN_SIGNUP = on; Views.login(); };
  const sEmp = h('input', { name: 'empNo', placeholder: '사번을 입력하세요', autocomplete: 'username', autocapitalize: 'characters', spellcheck: 'false', required: true });
  const sCode = h('input', { name: 'code', placeholder: '안내받은 가입 코드', autocomplete: 'off', spellcheck: 'false', required: true });
  const sPw = h('input', { name: 'password', type: 'password', placeholder: '6자 이상, 사번과 다르게', autocomplete: 'new-password', required: true, minlength: 6 });
  const sPw2 = h('input', { name: 'password2', type: 'password', placeholder: '한 번 더 입력', autocomplete: 'new-password', required: true, minlength: 6 });
  const sMsg = h('p', { class: 'form-error', role: 'alert' });
  const sBtn = h('button', { class: 'btn wide', type: 'submit' }, '가입하고 들어가기');
  const signupForm = h('form', { class: 'login-form signup-form', onsubmit: async (e) => {
    e.preventDefault();
    sMsg.textContent = '';
    if (sPw.value !== sPw2.value) { sMsg.textContent = '비밀번호가 서로 다릅니다.'; return; }
    sBtn.disabled = true;
    sBtn.textContent = '가입 중';
    try {
      const data = await Api.call('signupOther', { empNo: sEmp.value, code: sCode.value, password: sPw.value, device: navigator.userAgent.slice(0, 120) });
      LOGIN_SIGNUP = false;
      await App.startSession(data, false);
    } catch (err) {
      sMsg.textContent = err.message;
      sBtn.disabled = false;
      sBtn.textContent = '가입하고 들어가기';
    }
  } },
    h('h2', { class: 'signup-h' }, '기타부서 가입'),
    h('p', { class: 'sub' }, '처음 한 번만 하면 됩니다. 다음부터는 사번과 비밀번호로 로그인합니다.'),
    UI.field('사번', sEmp),
    UI.field('가입 코드', sCode, '사내 공지나 안내문으로 받은 코드입니다.'),
    UI.field('비밀번호', sPw), UI.field('비밀번호 확인', sPw2),
    sMsg, sBtn,
    h('p', { class: 'login-switch' }, '이미 가입했나요? ', h('button', { class: 'link', type: 'button', onclick: () => switchTo(false) }, '로그인')));
  const signupLink = h('p', { class: 'login-switch' }, '기타부서 직원이세요? ', h('button', { class: 'link', type: 'button', onclick: () => switchTo(true) }, '처음 가입하기'));
  /* 가입 화면에서 로고를 누르면 처음(로그인) 화면으로 돌아간다 */
  const logoHome = (img) => { if (LOGIN_SIGNUP) { img.classList.add('logo-home'); img.title = '처음 화면으로'; img.onclick = () => switchTo(false); } return img; };
  const mainBody = LOGIN_SIGNUP ? [signupForm] : [form, guestBox, signupLink];
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
    /* 2026-11-20 휴대폰 로그인(사용자 시안 941x1672를 실측해 맞춤): 위 단체 사진과 남색·주황 곡선, 로고, 문구, 로그인, 아래 현장 사진, 남색 띠의 가치 3개.
       --m은 시안 1px 크기(화면 폭 / 941). 화면이 시안보다 길면 아래 현장 사진이 늘어난다. 단체 사진은 사용자가 쓰기로 결정한 사진(2026-11-19)을 휴대폰용으로 자른 것. */
    app.replaceChildren(h('div', { class: 'login login-split login-m' + (LOGIN_SIGNUP ? ' is-signup' : '') },
      h('div', { class: 'lm-stage' },
        h('div', { class: 'lm-field' }),
        h('div', { class: 'lm-top' }, svg('<defs><linearGradient id="lmb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a45b0" stop-opacity="0"/><stop offset=".45" stop-color="#1a45b0" stop-opacity=".55"/><stop offset="1" stop-color="#173f9f" stop-opacity=".92"/></linearGradient>'
          + '<linearGradient id="lmf" x1="0" y1="0" x2="0" y2="560" gradientUnits="userSpaceOnUse"><stop offset=".912" stop-color="#f5f8fe"/><stop offset="1" stop-color="#f5f8fe" stop-opacity="0"/></linearGradient><linearGradient id="lmw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d6e3fa" stop-opacity="0"/><stop offset="1" stop-color="#c9daf8"/></linearGradient></defs>'
          + '<path d="M600 404 C 700 398, 820 384, 941 368 L941 466 C 830 432, 720 410, 600 404 Z" fill="url(#lmb)"/>'
          + '<path d="M835 374 L880 368 L790 452 L752 440 Z" fill="#ffffff" opacity=".14"/>'
          + '<path d="M0 334 C 150 368, 330 392, 470 400 L 610 402 L 470 401 C 330 410, 150 450, 0 500 Z" fill="#0b2c7d"/>'
          + '<path d="M0 500 C 150 450, 330 410, 470 400 Q 560 395, 640 403 L 611 404 C 360 412, 150 460, 0 526 Z" fill="#f98003"/>'
          + '<path d="M0 526 C 150 460, 360 412, 611 404 C 720 410, 830 432, 941 466 L941 560 L0 560 Z" fill="url(#lmf)"/>'
          + '<path d="M690 414 C 800 428, 880 446, 941 466 L941 540 C 880 500, 790 448, 690 414 Z" fill="url(#lmw)" opacity=".75"/>', 'lm-curve', '0 0 941 560', ' preserveAspectRatio="none"')),
        logoHome(h('img', { src: 'assets/logo.png', alt: 'BTRIPLE', class: 'lm-logo', width: 483, height: 90 })),
        h('h1', { class: 'lm-team' }, '군산 사내물류팀'),
        h('h2', { class: 'lm-head' }, h('span', { class: 'lm-l1' }, '오늘의 현장을'),
          h('img', { class: 'lm-hamkke', src: 'assets/login/hamkke.png', alt: '함께', width: 176, height: 80 }),
          h('span', { class: 'lm-l2' }, ' 만들어갑니다.'),
          svg('<path d="M17.6 55.8 L20.3 55.1 L24.0 54.1 L28.3 52.9 L33.2 51.6 L38.2 50.3 L43.4 49.0 L48.7 47.8 L54.5 46.4 L60.6 45.1 L66.8 43.7 L73.0 42.4 L79.1 41.1 L85.0 40.0 L90.9 38.8 L96.9 37.8 L102.9 36.7 L108.8 35.7 L114.8 34.7 L120.8 33.7 L126.7 32.8 L132.7 31.8 L138.7 30.9 L144.6 30.1 L150.6 29.3 L156.5 28.5 L162.5 27.8 L168.4 27.1 L174.4 26.4 L180.4 25.8 L186.3 25.3 L192.3 24.8 L198.2 24.3 L204.2 23.9 L210.2 23.5 L216.2 23.1 L222.2 22.8 L228.1 22.5 L234.1 22.2 L240.1 21.9 L246.1 21.7 L252.1 21.5 L258.1 21.2 L264.1 21.0 L270.1 20.8 L276.1 20.6 L282.0 20.4 L288.0 20.3 L294.0 20.2 L300.0 20.1 L305.9 20.2 L311.9 20.2 L317.9 20.3 L323.9 20.4 L329.9 20.6 L336.0 20.7 L342.3 20.9 L348.7 21.2 L354.8 21.4 L360.6 21.6 L365.9 21.9 L370.6 22.1 L374.7 22.3 L378.5 22.5 L382.1 22.8 L385.9 23.0 L389.9 23.4 L394.5 23.8 L399.7 24.3 L404.9 24.8 L409.8 25.4 L414.0 25.8 L417.0 26.0 L417.0 26.0 L414.0 25.4 L409.9 24.7 L405.1 23.9 L399.9 23.1 L394.7 22.3 L390.1 21.6 L386.1 21.1 L382.3 20.7 L378.7 20.3 L374.9 19.9 L370.7 19.5 L366.1 19.1 L360.8 18.7 L355.0 18.2 L348.8 17.7 L342.5 17.3 L336.2 16.8 L330.1 16.4 L324.1 16.1 L318.1 15.8 L312.1 15.5 L306.1 15.2 L300.0 15.0 L294.0 14.8 L288.0 14.7 L282.0 14.7 L275.9 14.7 L269.9 14.7 L263.9 14.7 L257.9 14.8 L251.9 14.8 L245.9 14.8 L239.9 14.9 L233.9 15.0 L227.9 15.1 L221.8 15.2 L215.8 15.4 L209.8 15.6 L203.8 15.8 L197.8 16.1 L191.7 16.4 L185.7 16.7 L179.6 17.1 L173.6 17.6 L167.6 18.0 L161.5 18.6 L155.5 19.1 L149.4 19.7 L143.4 20.4 L137.3 21.1 L131.3 21.9 L125.3 22.6 L119.2 23.5 L113.2 24.3 L107.2 25.1 L101.1 26.0 L95.1 26.9 L89.1 27.9 L83.0 28.8 L76.9 29.9 L70.8 31.0 L64.5 32.2 L58.2 33.4 L52.0 34.6 L46.1 35.8 L40.6 37.0 L35.3 38.1 L30.1 39.4 L25.2 40.5 L20.8 41.6 L17.1 42.5 L14.4 43.2 L13.5 43.5 L11.4 44.9 L10.0 47.0 L9.5 49.5 L10.0 52.0 L11.4 54.1 L13.5 55.5 Z" fill="#f66e14"/>', 'lm-swoosh', '0 0 430 65')),
        h('div', { class: 'lm-body' }, ...mainBody)),
      h('ul', { class: 'lm-values' }, values.map(([i, t]) => h('li', null, i, h('span', null, t.slice(0, t.lastIndexOf(' ')), h('br'), t.slice(t.lastIndexOf(' ') + 1)))))));
    return;
  }
  app.replaceChildren(h('div', { class: 'login login-split login-v2' + (LOGIN_SIGNUP ? ' is-signup' : '') },
    h('section', { class: 'login-art' },
      h('div', { class: 'la-photo la-field' }), h('div', { class: 'la-photo la-group' }),
      h('div', { class: 'la-bar' }),
      h('div', { class: 'la-line-glow' }, h('div', { class: 'la-line' })), h('div', { class: 'la-line-glow la-glow-bar' }, h('div', { class: 'la-line la-line-bar' })),
      h('div', { class: 'la-brand' }, logoHome(h('img', { src: 'assets/login/logo-white.png', alt: 'BTRIPLE', width: 483, height: 90 })), h('span', null, '군산 사내물류팀')),
      h('h2', { class: 'la-head' }, '오늘의 현장을', h('br'), h('span', { class: 'la-hand' }, '함께'), ' 만들어갑니다.',
        h('img', { class: 'la-hamkke', src: 'assets/login/hamkke.png', alt: '', width: 176, height: 80 }),
        svg('<path d="M17.6 55.8 L20.3 55.1 L24.0 54.1 L28.3 52.9 L33.2 51.6 L38.2 50.3 L43.4 49.0 L48.7 47.8 L54.5 46.4 L60.6 45.1 L66.8 43.7 L73.0 42.4 L79.1 41.1 L85.0 40.0 L90.9 38.8 L96.9 37.8 L102.9 36.7 L108.8 35.7 L114.8 34.7 L120.8 33.7 L126.7 32.8 L132.7 31.8 L138.7 30.9 L144.6 30.1 L150.6 29.3 L156.5 28.5 L162.5 27.8 L168.4 27.1 L174.4 26.4 L180.4 25.8 L186.3 25.3 L192.3 24.8 L198.2 24.3 L204.2 23.9 L210.2 23.5 L216.2 23.1 L222.2 22.8 L228.1 22.5 L234.1 22.2 L240.1 21.9 L246.1 21.7 L252.1 21.5 L258.1 21.2 L264.1 21.0 L270.1 20.8 L276.1 20.6 L282.0 20.4 L288.0 20.3 L294.0 20.2 L300.0 20.1 L305.9 20.2 L311.9 20.2 L317.9 20.3 L323.9 20.4 L329.9 20.6 L336.0 20.7 L342.3 20.9 L348.7 21.2 L354.8 21.4 L360.6 21.6 L365.9 21.9 L370.6 22.1 L374.7 22.3 L378.5 22.5 L382.1 22.8 L385.9 23.0 L389.9 23.4 L394.5 23.8 L399.7 24.3 L404.9 24.8 L409.8 25.4 L414.0 25.8 L417.0 26.0 L417.0 26.0 L414.0 25.4 L409.9 24.7 L405.1 23.9 L399.9 23.1 L394.7 22.3 L390.1 21.6 L386.1 21.1 L382.3 20.7 L378.7 20.3 L374.9 19.9 L370.7 19.5 L366.1 19.1 L360.8 18.7 L355.0 18.2 L348.8 17.7 L342.5 17.3 L336.2 16.8 L330.1 16.4 L324.1 16.1 L318.1 15.8 L312.1 15.5 L306.1 15.2 L300.0 15.0 L294.0 14.8 L288.0 14.7 L282.0 14.7 L275.9 14.7 L269.9 14.7 L263.9 14.7 L257.9 14.8 L251.9 14.8 L245.9 14.8 L239.9 14.9 L233.9 15.0 L227.9 15.1 L221.8 15.2 L215.8 15.4 L209.8 15.6 L203.8 15.8 L197.8 16.1 L191.7 16.4 L185.7 16.7 L179.6 17.1 L173.6 17.6 L167.6 18.0 L161.5 18.6 L155.5 19.1 L149.4 19.7 L143.4 20.4 L137.3 21.1 L131.3 21.9 L125.3 22.6 L119.2 23.5 L113.2 24.3 L107.2 25.1 L101.1 26.0 L95.1 26.9 L89.1 27.9 L83.0 28.8 L76.9 29.9 L70.8 31.0 L64.5 32.2 L58.2 33.4 L52.0 34.6 L46.1 35.8 L40.6 37.0 L35.3 38.1 L30.1 39.4 L25.2 40.5 L20.8 41.6 L17.1 42.5 L14.4 43.2 L13.5 43.5 L11.4 44.9 L10.0 47.0 L9.5 49.5 L10.0 52.0 L11.4 54.1 L13.5 55.5 Z" fill="#f66e14"/>', 'la-swoosh', '0 0 430 65')),
      h('ul', { class: 'la-values' }, values.map(([i, t]) => h('li', null, i, h('span', null, t))))),
    h('section', { class: 'login-card' },
      svg('<defs><linearGradient id="lcg" x1="1" y1="0" x2="0.35" y2="0.55"><stop offset="0" stop-color="#bcd3fb"/><stop offset="0.2" stop-color="#e2ecfd"/><stop offset="0.45" stop-color="#f4f7fe"/><stop offset="1" stop-color="#f9fafe"/></linearGradient></defs>'
        + '<path d="M148 0 C 110 90, 30 200, 0 300 L0 1000 L1000 1000 L1000 0 Z" fill="url(#lcg)"/>'
        + '<defs><linearGradient id="lcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9c6fb" stop-opacity=".75"/><stop offset="1" stop-color="#cfe0fd" stop-opacity="0"/></linearGradient></defs>'
        + '<path d="M774 0 L835 0 L655 165 L600 150 Z" fill="#ffffff" opacity=".4"/><path d="M860 0 L1000 0 L1000 40 L885 145 L735 120 Z" fill="url(#lcb)"/>'
        + '<defs><clipPath id="lcp"><path d="M148 0 C 110 90, 30 200, 0 300 L0 1000 L1000 1000 L1000 0 Z"/></clipPath><linearGradient id="lce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9dcfb"/><stop offset=".5" stop-color="#eef4ff"/><stop offset="1" stop-color="#f8f9fe"/></linearGradient></defs>'
        + '<g clip-path="url(#lcp)"><path d="M176.0 -80.0 L148.0 0.0 L142.0 13.6 L135.4 27.6 L128.4 41.7 L120.9 56.2 L113.1 70.8 L104.9 85.6 L96.6 100.6 L88.1 115.7 L79.6 130.9 L71.0 146.2 L62.5 161.7 L54.1 177.1 L45.9 192.6 L38.0 208.1 L30.4 223.6 L23.3 239.0 L16.6 254.4 L10.4 269.7 L4.9 284.9 L0.0 300.0 L0.0 300.0 L7.9 284.9 L16.5 269.7 L25.7 254.4 L35.5 239.0 L45.7 223.6 L56.3 208.1 L67.3 192.6 L78.5 177.1 L89.9 161.7 L101.5 146.2 L113.1 130.9 L124.7 115.7 L136.2 100.6 L147.6 85.6 L158.8 70.8 L169.7 56.2 L180.2 41.7 L190.3 27.6 L199.9 13.6 L209.0 0.0 L240.0 -80.0 Z" fill="url(#lce)"/></g>', 'lc-shape', '0 0 1000 1000', ' preserveAspectRatio="none"'),
      /* 하단 사선 장식: 시안(1672x941) 오른쪽 아래를 열마다 색을 재서 그린 층(연하늘, 하늘, 파랑, 남색, 주황). 화면이 넓어도 비율 고정, 왼쪽 끝까지 이어짐 */
      /* 왼쪽 아래 모서리: 남색 띠의 사선을 이어받는 연한 하늘색 삼각형(#C3D7FA). 남색 띠의 위쪽 가장자리 기울기와 같다 */
      svg('<path d="M0 0 L0 100 L100 100 Z" fill="#c3d7fa"/>', 'lc-corner', '0 0 100 100', ' preserveAspectRatio="none"'),
      /* 하단 사선 장식(시안 1672x941 기준 좌표): 연하늘, 비스듬한 사각형(#A6C3F9)과 겹침(#7EABF8), 하늘, 파랑 사각형(#124CB9), 남색 삼각형(#002572), 주황 선 */
      svg('<path d="M1209 941 L1195 925 L1300 909 L1592 833 L1672 748 L1672 941 Z" fill="#c3d7fa"/><path d="M1130 941 L1175 930 L1300 909 L1255 941 Z" fill="#a6c3f9"/><path d="M1156 941 L1672 809 L1672 941 Z" fill="#a6c3f7"/><path d="M1156 941 L1211 927 L1270 941 Z" fill="#7daaf8"/><path d="M1528 941 L1528 884 L1592 833 L1672 809 L1672 941 Z" fill="#7ca8f2"/><path d="M1222 941 L1300 918 L1450 896 L1672 860 L1672 885 L1500 941 Z" fill="#124cb9"/><path d="M1305 941 L1672 846 L1672 941 Z" fill="#002572"/><path d="M1440 941 L1672 856 L1672 873 Z" fill="#fc7a00"/>', 'lc-deco lc-bottom', '600 740 1072 201', ' preserveAspectRatio="xMaxYMax meet"'),
      h('div', { class: 'lc-body' },
        logoHome(h('img', { src: 'assets/logo.png', alt: 'BTRIPLE', class: 'login-logo', width: 483, height: 90 })),
        h('h1', null, '군산 사내물류팀'), ...mainBody))));
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

/* 글자 크기. 이 기기에만 적용되고(로그아웃해도 유지), 로그인 화면은 그대로 둔다. 화면 전체를 키우는 방식이라 표와 버튼도 함께 커진다. */
Router.add('/account/font', (params, app, alive) => {
  const LEVELS = [['0', '보통', '지금 크기입니다.'], ['1', '크게', '15% 키웁니다.'], ['2', '아주 크게', '30% 키웁니다.']];
  const cur = () => document.documentElement.dataset.fs || '0';
  const box = h('div', { class: 'fs-opts' });
  const draw = () => {
    if (!alive()) return;
    box.replaceChildren(...LEVELS.map(([v, name, note]) => h('button', {
      class: 'fs-opt' + (cur() === v ? ' on' : ''), type: 'button', 'aria-pressed': String(cur() === v),
      onclick: () => {
        if (v === '0') delete document.documentElement.dataset.fs; else document.documentElement.dataset.fs = v;
        try { if (v === '0') localStorage.removeItem('fontscale'); else localStorage.setItem('fontscale', v); } catch (e) { /* 저장하지 못해도 지금 화면에는 적용된다 */ }
        draw();
      }
    }, h('strong', null, name), h('span', { class: 'sub' }, note))));
  };
  app.replaceChildren(UI.hero('글자 크기', '눈이 편한 크기를 골라 주세요. 이 기기에만 적용됩니다.'),
    h('div', { class: 'section' }, h('div', { class: 'narrow' }, box,
      h('p', { class: 'fs-sample' }, '이 글자 크기로 공지, KPI 표, 게시판이 보입니다. 오늘의 현장을 함께 기록합니다.'),
      h('p', { class: 'sub' }, '로그인 화면은 크기가 바뀌지 않습니다.'))));
  draw();
});
