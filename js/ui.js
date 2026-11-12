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
  dateOnly(s) { return String(s || '').slice(0, 10); }
};
