/* 화면 도구. 사용자 입력은 항상 textContent로만 넣는다. */
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  });
  children.flat(Infinity).forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return el;
}

/* 자식 요소를 바꾼다. 배열은 펼치고 빈 값은 건너뛴다. */
function fill(el, ...children) {
  el.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false && c !== ''));
}


/* 선 아이콘(24px 기준). 고정 문자열만 쓰므로 안전하다. 아이콘: Tabler Icons(MIT, tabler.io/icons). 선 속성은 UI.icon이 svg에 한 번 준다. */
(() => {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const run = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const to = Number(el.dataset.count), suffix = el.dataset.suffix || '';
    if (reduced || document.hidden || !(to > 0)) return;
    const t0 = performance.now(), dur = 800;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0' + suffix;
    requestAnimationFrame(step);
    setTimeout(() => { el.textContent = to + suffix; }, dur + 150);
  };
  new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    if (n.matches('.count')) run(n);
    n.querySelectorAll('.count').forEach(run);
  }))).observe(document.documentElement, { childList: true, subtree: true });
})();

const ICONS = {
  calendar: '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M16 3v4M8 3v4M4 11h16"/><path d="M8 15h2v2H8z"/>',
  chart: '<path d="M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm12-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM4 20h14"/>',
  megaphone: '<path d="M18 8a3 3 0 0 1 0 6m-8-6v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-5"/><path d="m12 8l4.524-3.77A.9.9 0 0 1 18 4.922v12.156a.9.9 0 0 1-1.476.692L12 14H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>',
  todo: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2m0 9l2 2l4-4"/>',
  board: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2m0 7h.01M13 12h2m-6 4h.01M13 16h2"/>',
  edit: '<path d="M4 20h4L18.5 9.5a2.828 2.828 0 1 0-4-4L4 16zm9.5-13.5l4 4"/>',
  chat: '<path d="M12 11v.01M8 11v.01m8-.01v.01M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5l-5 3v-3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"/>',
  qr: '<path d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zm3 12v.01M14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM7 7v.01M4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zm13-8v.01M14 14h3m3 0v.01M14 14v3m0 3h3m0-3h3m0 0v3"/>',
  people: '<path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-17.87a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"/>',
  gear: '<path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0"/>',
  trophy: '<path d="M8 21h8m-4-4v4M7 4h10m0 0v8a5 5 0 0 1-10 0V4M3 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0m14 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/>',
  bell: '<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6M9 17v1a3 3 0 0 0 6 0v-1"/>',
  photo: '<path d="M15 8h.01M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="m3 16l5-5c.928-.893 2.072-.893 3 0l5 5"/><path d="m14 14l1-1c.928-.893 2.072-.893 3 0l3 3"/>',
  pin: '<path d="m15 4.5l-4 4L7 10l-1.5 1.5l7 7L14 17l1.5-4l4-4M9 15l-4.5 4.5M14.5 4L20 9.5"/>',
  warn: '<path d="M12 9v4m-1.637-9.409L2.257 17.125a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87L13.637 3.59a1.914 1.914 0 0 0-3.274 0M12 16h.01"/>',
  check: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0"/><path d="m9 12l2 2l4-4"/>',
  clock: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0"/><path d="M12 7v5l3 3"/>',
  arrow: '<path d="m9 6l6 6l-6 6"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  lock: '<path d="M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0m-3-5V7a4 4 0 1 1 8 0v4"/>',
  home: '<path d="M5 12H3l9-9l9 9h-2M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01"/>',
  folder: '<path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"/>',
  box: '<path d="m12 3l8 4.5v9L12 21l-8-4.5v-9zm0 9l8-4.5M12 12v9m0-9L4 7.5"/>',
  download: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5l5-5m-5-9v14"/>',
  file: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2M9 13l6 4m-6 0l6-4"/>'
};

const UI = {
  toast(message, isError) {
    const t = document.getElementById('toast');
    t.textContent = message;
    t.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(UI._t);
    UI._t = setTimeout(() => { t.className = 'toast'; }, 3200);
  },
  skeleton(lines) {
    return h('div', { class: 'section' }, h('div', { class: 'wrap' },
      Array.from({ length: lines || 5 }, () => h('div', { class: 'skeleton' }))));
  },
  error(message, retry) {
    return h('div', { class: 'section' }, h('div', { class: 'wrap center' },
      h('p', { class: 'sub' }, message),
      retry && h('button', { class: 'btn', type: 'button', onclick: retry }, '다시 시도')));
  },
  hero(title, sub) {
    const key = Router.path().split('?')[0].split('/')[1] || '';
    const art = ['board', 'kpi', 'suggest', 'award', 'admin', 'account', 'qr'].indexOf(key) >= 0 ? key : key === 'manhour' ? 'admin' : '';
    return h('section', { class: 'hero', style: art ? '--hero-img:url(../assets/hero-' + art + '.svg)' : null },
      h('h1', null, title), sub && h('p', null, sub));
  },
  field(label, control, hint) {
    return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint && h('span', { class: 'hint' }, hint));
  },
  select(name, values, current, placeholder) {
    return h('select', { name }, placeholder && h('option', { value: '' }, placeholder),
      values.map((v) => h('option', { value: v, selected: v === current }, v)));
  },
  thumbUrl(id, size) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (size || 480); },
  thumb(id) {
    const img = h('img', { class: 'thumb', src: UI.thumbUrl(id), loading: 'lazy', alt: '첨부 사진' });
    let tried = false;
    img.addEventListener('error', () => {
      if (!tried) { tried = true; setTimeout(() => { img.src = UI.thumbUrl(id) + '&retry=1'; }, 800); }
      else { img.classList.add('thumb-failed'); img.removeAttribute('src'); }
    });
    img.addEventListener('click', () => UI.lightbox(UI.thumbUrl(id, 1600)));
    return img;
  },
  lightbox(src) {
    const close = () => box.remove();
    const box = h('div', { class: 'lightbox', onclick: close, role: 'dialog', 'aria-label': '사진 크게 보기' },
      h('img', { src, alt: '확대 사진' }));
    document.body.append(box);
  },
  /* 영상 보기: 눌렀을 때만 영상을 불러온다. 닫기 버튼, 바깥 누르기, Esc로 닫는다. */
  videoModal(src, poster, label) {
    const video = h('video', { src, poster, controls: true, autoplay: true, playsinline: true, preload: 'metadata', 'aria-label': label || '영상' });
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const close = () => { video.pause(); video.removeAttribute('src'); video.load(); box.remove(); document.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); };
    const box = h('div', { class: 'vmodal', role: 'dialog', 'aria-modal': 'true', 'aria-label': label || '영상', onclick: (e) => { if (e.target === box) close(); } },
      h('button', { class: 'vmodal-x', type: 'button', 'aria-label': '닫기', onclick: close }, '×'), video);
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    document.body.append(box);
    const p = video.play(); if (p && p.catch) p.catch(() => { /* 자동 재생이 막히면 재생 버튼으로 시작 */ });
  },
  pager(page, size, total, go) {
    const pages = Math.ceil(total / size);
    if (pages < 2) return null;
    return h('div', { class: 'pager' },
      h('button', { class: 'btn ghost', type: 'button', disabled: page <= 1, onclick: () => go(page - 1) }, '이전'),
      h('span', { class: 'sub' }, page + ' / ' + pages),
      h('button', { class: 'btn ghost', type: 'button', disabled: page >= pages, onclick: () => go(page + 1) }, '다음'));
  },
  placeholder(title, sub) {
    return h('div', null, UI.hero(title, sub || ''));
  },
  /* KPI 숫자: 화면에 나올 때 0부터 올라간다. '동작 줄이기' 설정이면 바로 최종 값. */
  num(value, suffix) {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) return h('span', null, '-');
    return h('span', { class: 'count', 'data-count': String(value), 'data-suffix': suffix || '' }, value + (suffix || ''));
  },
  /* 내용이 없을 때 보여 주는 그림과 안내. name: board, done, data, feedback, notfound */
  empty(text, name, small) {
    const file = { board: 'pin-to-board', done: 'completed-task', data: 'no-data', feedback: 'feedback', notfound: 'page-not-found' }[name] || 'no-data';
    return h('div', { class: 'empty-state' + (small ? ' small' : '') },
      h('img', { src: 'assets/illust/' + file + '.svg', alt: '', loading: 'lazy', decoding: 'async', width: 160, height: 120 }),
      h('p', { class: 'sub' }, text));
  },
  has(perm) { return ((App.user && App.user.perms) || []).includes(perm); },
  hasAny(perms) { return perms.some(UI.has); },
  /* 관리자 직급(팀장, 과장, 주임, 공장, 직장, 반장). 업무 게시판 글쓰기와 개선사항 작성이 직급으로 자동 적용된다. 서버도 같은 기준으로 막는다. */
  isManager() { return ['팀장', '과장', '주임', '공장', '직장', '반장'].includes(String((App.user && App.user.rank) || '').trim()); },
  /* 실적 업로드 권한자(관제) */
  isUploader() { return UI.hasAny(['UPLOAD_ABNORMAL', 'UPLOAD_INVENTORY', 'ADMIN']); },
  /* 개선사항(C1) 등록: 관제와 관리자 직급(2026-11-17). 서버도 같은 기준. */
  canWriteBest() { return !UI.has('VIEW_EXEC') && (UI.isManager() || UI.isUploader()); },
  /* 직장(확인 권한)이 있는 직 */
  checkDepts() { return ((App.user && App.user.perms) || []).filter((p) => p.startsWith('KPI_CHECK:')).map((p) => p.slice(10)); },
  /* 서버에서 받은 파일(Base64)을 내려받는다. 큰 파일도 되도록 Blob 주소를 쓴다. */
  saveFile(base64, name, type) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: type || 'application/octet-stream' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
  /* 파일을 Base64로 읽는다(큰 파일은 나눠서 바꾼다). */
  async fileBase64(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    return btoa(bin);
  },
  size(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; },
  icon(name, cls) {
    const t = document.createElement('template');
    t.innerHTML = '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
    return t.content.firstChild;
  },
  /* 카드 머리: 아이콘 + 제목 + (더보기) */
  cardHead(icon, title, more) {
    return h('div', { class: 'card-h' }, h('span', { class: 'ch-ico' }, UI.icon(icon)), h('h2', null, title),
      more && h('a', { class: 'more', href: more }, '더보기', UI.icon('arrow')));
  },
  pct(n, d) { return d ? Math.round(n / d * 100) : null; },
  dateOnly(s) { return String(s || '').slice(0, 10); }
};
