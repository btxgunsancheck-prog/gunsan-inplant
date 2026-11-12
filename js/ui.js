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


/* 선 아이콘(24px 기준). 고정 문자열만 쓰므로 안전하다. */
const ICONS = {
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1z"/><path d="M15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14"/>',
  todo: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M8 12l2.5 2.5L16 9"/>',
  board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 10h8M8 13h5"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2A5 5 0 0 1 21.5 20"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4v4h-4z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 21h4"/>',
  photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
  pin: '<path d="M9 3h6l-1 6 3 3H7l3-3-1-6zM12 12v9"/>',
  warn: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M9 6l6 6-6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'
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
    const art = ['board', 'kpi', 'suggest', 'award', 'admin', 'account', 'qr'].indexOf(key) >= 0 ? key : '';
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
  pager(page, size, total, go) {
    const pages = Math.ceil(total / size);
    if (pages < 2) return null;
    return h('div', { class: 'pager' },
      h('button', { class: 'btn ghost', type: 'button', disabled: page <= 1, onclick: () => go(page - 1) }, '이전'),
      h('span', { class: 'sub' }, page + ' / ' + pages),
      h('button', { class: 'btn ghost', type: 'button', disabled: page >= pages, onclick: () => go(page + 1) }, '다음'));
  },
  placeholder(title) {
    return h('div', null, UI.hero(title, '이 화면은 다음 제작 단계에서 제공됩니다.'));
  },
  has(perm) { return ((App.user && App.user.perms) || []).includes(perm); },
  hasAny(perms) { return perms.some(UI.has); },
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
