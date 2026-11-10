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
      files.length < max ? h('button', { type: 'button', class: 'picker-add', onclick: () => input.click() }, '사진 추가') : ''
    );
  }
  draw();
  return { el: h('div', { class: 'field' }, h('span', { class: 'field-label' }, label + ' (최대 ' + max + '장)'), row, input), files };
}

/* 사진을 1장씩 순서대로 올린다. 실패한 사진은 failed에 남겨 다시 시도할 수 있게 한다. */
async function uploadPhotos(jobs, onProgress) {
  const failed = [];
  for (let i = 0; i < jobs.length; i++) {
    onProgress(i + 1, jobs.length);
    try {
      const data = await ImageTool.compress(jobs[i].file);
      await Api.call('photoUpload', Object.assign({}, jobs[i].meta, { data }));
    } catch (e) {
      failed.push(jobs[i]);
    }
  }
  return failed;
}

function ProgressBox(container) {
  const text = h('p', { class: 'sub' });
  const box = h('div', { class: 'progress', hidden: true }, text);
  container.append(box);
  return {
    box,
    show(i, n) { box.hidden = false; text.textContent = '사진 올리는 중 ' + i + ' / ' + n; },
    failed(n, retry) {
      box.hidden = false;
      text.textContent = '사진 ' + n + '장을 올리지 못했습니다.';
      box.append(h('button', { class: 'btn', type: 'button', onclick: retry }, '실패한 사진 다시 올리기'));
    }
  };
}
