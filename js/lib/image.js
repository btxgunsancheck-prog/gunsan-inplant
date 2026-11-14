/* 사진을 긴 변 1280px, JPEG 품질 0.75로 줄여 Base64 문자열로 돌려준다. */
const isHeic = (f) => /image\/hei[cf]/i.test(f.type || '') || /\.(heic|heif)$/i.test(f.name || '');
let heicLoader = null;
/* HEIC(아이폰 원본)는 PC 브라우저가 열지 못하므로, 필요할 때만 변환 도구를 불러와 JPEG로 바꾼다. */
const loadHeic = () => {
  if (window.heic2any) return Promise.resolve(window.heic2any);
  if (!heicLoader) {
    heicLoader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js';
      s.onload = () => resolve(window.heic2any);
      s.onerror = () => { heicLoader = null; reject(new Error('HEIC 변환 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.')); };
      document.head.append(s);
    });
  }
  return heicLoader;
};
const ImageTool = {
  async toJpegIfHeic(file) {
    if (!isHeic(file)) return file;
    const convert = await loadHeic();
    const out = await convert({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    const blob = Array.isArray(out) ? out[0] : out;
    return new File([blob], String(file.name || 'photo').replace(/\.(heic|heif)$/i, '') + '.jpg', { type: 'image/jpeg' });
  },
  async compress(file) {
    file = await ImageTool.toJpegIfHeic(file);
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
    } finally {
      URL.revokeObjectURL(url);
    }
  }
};

/* 프로필 사진: 가운데를 정사각형으로 잘라 300px JPEG로 만든다. */
ImageTool.square = async function (file, size = 300) {
  file = await ImageTool.toJpegIfHeic(file);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    canvas.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  } finally { URL.revokeObjectURL(url); }
};

/* 사진 선택 칸. 고른 사진의 미리보기와 삭제를 맡는다.
   preload를 주면 고르는 즉시 뒤에서 미리 올리고, 사진 위에 진행 상태를 보여 준다. */
function PhotoPicker(max, label, preload) {
  const files = [];
  const urls = new Map();
  const row = h('div', { class: 'picker-row' });
  const input = h('input', { type: 'file', accept: 'image/*,.heic,.heif', multiple: true, hidden: true, onchange: async () => {
    const picked = Array.from(input.files);
    input.value = '';
    if (picked.some(isHeic)) UI.toast('HEIC 사진을 JPEG로 바꾸는 중입니다. 잠시만 기다려 주세요.');
    let full = false;
    for (const f0 of picked) {
      if (files.length >= max) { full = true; break; }
      let f;
      try { f = await ImageTool.toJpegIfHeic(f0); } catch (e) { UI.toast(e.message || '사진을 변환하지 못했습니다.', true); continue; }
      if (files.length >= max) { full = true; break; }
      files.push(f);
      if (preload) preload.add(f, draw);
      draw();
    }
    if (full) UI.toast('사진은 최대 ' + max + '장까지 올릴 수 있습니다.');
    draw();
  } });
  const STATE = { wait: '올리는 중', done: '올림', fail: '다시 올림 필요' };
  function draw() {
    fill(row,
      files.map((f, i) => {
        if (!urls.has(f)) urls.set(f, URL.createObjectURL(f));
        const st = preload ? preload.state(f) : '';
        return h('div', { class: 'picker-item' + (st ? ' up-' + st : '') },
          h('img', { src: urls.get(f), alt: '선택한 사진' }),
          st ? h('span', { class: 'picker-state' }, STATE[st]) : null,
          h('button', { type: 'button', class: 'picker-x', 'aria-label': '사진 빼기', onclick: () => { files.splice(i, 1); draw(); } }, '×'));
      }),
      files.length < max ? h('button', { type: 'button', class: 'picker-add', onclick: () => input.click() }, UI.icon('photo'), h('span', null, '사진 추가')) : ''
    );
  }
  draw();
  return { el: h('div', { class: 'field' }, h('span', { class: 'field-label' }, label + ' (최대 ' + max + '장)'), row, input), files, draw };
}

/* 미리 올리기. getTicket은 표(ticket)를 돌려주는 함수로, 처음 사진을 고를 때 한 번만 부른다.
   저장할 때 collect로 끝난 결과를 모은다. 실패한 사진은 한 번 더 올려 본다. */
let preloadSeq = 0;
function PhotoPreload(getTicket) {
  const jobs = new Map();
  const states = new Map();
  let ticketP = null;
  const ticket = () => {
    if (!ticketP) ticketP = Promise.resolve().then(getTicket).catch((e) => { ticketP = null; throw e; });
    return ticketP;
  };
  const start = (file, kind, redraw) => {
    states.set(file, 'wait');
    const p = (async () => {
      const t = await ticket();
      const data = await ImageTool.compress(file);
      const res = await Api.call('photoUpload', { ticket: t, seq: ++preloadSeq, data });
      return { fileId: res.fileId, kind };
    })();
    jobs.set(file, p);
    p.then(() => states.set(file, 'done'), () => states.set(file, 'fail')).then(() => { if (redraw) redraw(); });
    return p;
  };
  return {
    ticket,
    /* 사진 칸 하나(kind: issue, counter)에 붙일 미리 올리기 */
    kind(kind) {
      let redraw = null;
      return {
        add(file, draw) { redraw = draw; start(file, kind, draw); },
        state(file) { return states.get(file) || ''; },
        async collect(files) {
          const done = [];
          const failed = [];
          for (const f of files) {
            if (!jobs.has(f)) start(f, kind, redraw);
            let r = await jobs.get(f).catch(() => null);
            if (!r) r = await start(f, kind, redraw).catch(() => null);
            if (r) done.push(r); else failed.push(f);
          }
          return { done, failed };
        }
      };
    }
  };
}

/* 사진을 최대 3장씩 동시에 올린다. job: { file, kind, seq } */
async function uploadPhotos(jobs, ticket, onProgress, attachOne) {
  let next = 0;
  let finished = 0;
  const done = [];
  const failed = [];
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        const data = await ImageTool.compress(job.file);
        const res = await Api.call('photoUpload', Object.assign({ ticket, seq: job.seq, data }, attachOne ? { attach: true, kind: job.kind || '' } : {}));
        done.push({ fileId: res.fileId, kind: job.kind || '', attached: !!res.attached });
      } catch (e) {
        failed.push(job);
      }
      onProgress(++finished, jobs.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return { done, failed };
}

/* 올린 사진을 글에 붙이고, 실패한 사진만 다시 올릴 수 있게 한다. */
function sendPhotos(jobs, ticket, box, finish) {
  jobs.forEach((job, i) => { job.seq = i + 1; });
  const go = async (list) => {
    box.show(0, list.length);
    const { done, failed } = await uploadPhotos(list, ticket, (i, n) => box.show(i, n), list.length === 1);
    if (done.length && !done.every((d) => d.attached)) {
      try {
        await Api.call('photoAttach', { ticket, files: done });
      } catch (e) {
        UI.toast(e.message, true);
        box.failed(list.length, () => go(list));
        return;
      }
    }
    if (failed.length) box.failed(failed.length, () => go(failed));
    else finish();
  };
  return go(jobs);
}

function ProgressBox(container) {
  const text = h('p', { class: 'sub' });
  const retry = h('button', { class: 'btn', type: 'button', hidden: true }, '실패한 사진 다시 올리기');
  const box = h('div', { class: 'progress', hidden: true }, text, retry);
  container.append(box);
  return {
    box,
    show(i, n) { box.hidden = false; retry.hidden = true; text.textContent = '사진 올리는 중 ' + i + ' / ' + n; },
    failed(n, fn) {
      box.hidden = false;
      text.textContent = '사진 ' + n + '장을 올리지 못했습니다.';
      retry.onclick = fn;
      retry.hidden = false;
    }
  };
}
