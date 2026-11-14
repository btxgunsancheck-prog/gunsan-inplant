/* 사진을 긴 변 1280px, JPEG 품질 0.75로 줄여 Base64 문자열로 돌려준다. */
const ImageTool = {
  async compress(file) {
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

/* 사진 선택 칸. 고른 사진의 미리보기와 삭제를 맡는다. */
function PhotoPicker(max, label) {
  const files = [];
  const row = h('div', { class: 'picker-row' });
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: () => {
    Array.from(input.files).forEach((f) => { if (files.length < max) files.push(f); });
    if (input.files.length && files.length >= max) UI.toast('사진은 최대 ' + max + '장까지 올릴 수 있습니다.');
    input.value = '';
    draw();
  } });
  function draw() {
    fill(row,
      files.map((f, i) => h('div', { class: 'picker-item' },
        h('img', { src: URL.createObjectURL(f), alt: '선택한 사진' }),
        h('button', { type: 'button', class: 'picker-x', 'aria-label': '사진 빼기', onclick: () => { files.splice(i, 1); draw(); } }, '×'))),
      files.length < max ? h('button', { type: 'button', class: 'picker-add', onclick: () => input.click() }, UI.icon('photo'), h('span', null, '사진 추가')) : ''
    );
  }
  draw();
  return { el: h('div', { class: 'field' }, h('span', { class: 'field-label' }, label + ' (최대 ' + max + '장)'), row, input), files };
}

/* 사진을 최대 3장씩 동시에 올린다. job: { file, kind, seq } */
async function uploadPhotos(jobs, ticket, onProgress) {
  let next = 0;
  let finished = 0;
  const done = [];
  const failed = [];
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        const data = await ImageTool.compress(job.file);
        const res = await Api.call('photoUpload', { ticket, seq: job.seq, data });
        done.push({ fileId: res.fileId, kind: job.kind || '' });
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
    const { done, failed } = await uploadPhotos(list, ticket, (i, n) => box.show(i, n));
    if (done.length) {
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
