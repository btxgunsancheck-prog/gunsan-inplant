/* 자료실(2026-11-17 작업표준서, 2026-11-23 분류 확대): 작업표준서, 회사 규정·지침, 안전·교육, 양식.
   파일은 비공개로 보관하고 로그인한 직원에게만 내려준다. 한 파일 10MB까지.
   올리기: 작업표준서는 그 직 직장과 KPI 관리자(올리면 표준서 제/개정 Q1 실적에도 반영), 나머지는 자료실 등록 권한자(LIB_WRITE)와 관리자. */
(() => {
  const DEPTS = ['물류1직', '물류2직', '물류3직', '물류4직'];
  const TIS = '작업표준서';
  const MAX = 10 * 1048576;
  const NEW_DAYS = 7;
  const ACCEPT = '.pdf,.xlsx,.xlsm,.xls,.xlsb,.docx,.doc,.hwp,.hwpx,.pptx,.ppt,.jpg,.jpeg,.png';
  const TYPES_TEXT = 'PDF, 엑셀, 워드, 한글, 파워포인트, 사진(jpg·png)';
  const overMsg = (f) => '파일이 10MB를 넘습니다(지금 ' + UI.size(f.size) + '). PDF로 저장하거나 사진 크기를 줄여 10MB 이하로 다시 올려 주세요.';

  /* 일반 자료 올리기(작업표준서 외) */
  function generalUpload(cats, onDone) {
    const cat = UI.select('category', cats, cats[0]);
    const title = h('input', { maxlength: 200, placeholder: '비워 두면 파일 이름으로 올립니다', 'aria-label': '제목' });
    const file = h('input', { type: 'file', accept: ACCEPT, 'aria-label': '올릴 파일' });
    const msg = h('p', { class: 'sub' });
    const btn = h('button', { class: 'btn', type: 'button', disabled: true }, '올리기');
    file.onchange = () => {
      const f = file.files[0];
      msg.className = 'sub';
      msg.textContent = '';
      btn.disabled = !f;
      if (!f) return;
      if (f.size > MAX) { msg.className = 'form-error'; msg.textContent = overMsg(f); btn.disabled = true; return; }
      msg.textContent = f.name + ' (' + UI.size(f.size) + ')';
      if (!title.value) title.placeholder = f.name.replace(/\.[a-z0-9]+$/i, '');
    };
    btn.onclick = async () => {
      const f = file.files[0];
      if (!f) { UI.toast('올릴 파일을 골라 주세요.', true); return; }
      if (f.size > MAX) { UI.toast(overMsg(f), true); return; }
      btn.disabled = true;
      msg.className = 'sub';
      msg.textContent = '올리는 중입니다(' + UI.size(f.size) + '). 큰 파일은 1분 가까이 걸릴 수 있습니다.';
      try {
        await Api.call('libraryUpload', { category: cat.value, title: title.value, name: f.name, data: await UI.fileBase64(f) });
        UI.toast('자료실에 올렸습니다.');
        file.value = ''; title.value = ''; msg.textContent = '';
        onDone(cat.value);
      } catch (e) { msg.className = 'form-error'; msg.textContent = e.message; btn.disabled = false; }
    };
    return h('div', { class: 'lib-general-up' },
      h('div', { class: 'mh-capa-row' }, UI.field('분류', cat), UI.field('제목', title)),
      UI.field('파일', file, '한 파일 10MB까지 · ' + TYPES_TEXT), msg, h('div', { class: 'row-btns' }, btn),
      h('p', { class: 'sub' }, '급여명세, 인사기록, 주민번호가 있는 명단처럼 개인정보가 든 파일은 올리지 마세요. 같은 제목으로 다시 올리면 예전 파일은 "이전 판"으로 남습니다.'));
  }

  Router.add('/library', (params, app, alive) => {
    const q = new URLSearchParams(Router.path().split('?')[1] || '');
    let cat = q.get('cat') || '';
    const mine = DEPTS.includes(App.user.dept) ? App.user.dept : '';
    let dept = mine;
    let term = '';
    const tabs = h('div', { class: 'seg lib-tabs' });
    const seg = h('div', { class: 'seg' });
    const search = h('input', { type: 'search', placeholder: '제목, 파일 이름 검색', 'aria-label': '자료 검색', oninput: (e) => { term = e.target.value.trim().toLowerCase(); draw(); } });
    const list = h('div', { class: 'lib-list' }, UI.skeleton(4));
    const upBox = h('div');
    const delBox = h('div');
    let data = null;

    /* 큰 파일은 1.5MB 조각으로 나눠 3개씩 동시에 받아 이어 붙인다(서버 한 번에 보내는 양이 줄어 빠르다) */
    const PART = 1572864;
    const download = async (it, btn) => {
      btn.disabled = true;
      const old = btn.textContent;
      btn.textContent = '받는 중';
      try {
        const parts = Math.max(1, Math.ceil(it.size / PART));
        let done = 0;
        const got = await Promise.all(Array.from({ length: parts }, (_, i) => Api.call('libraryFile', parts > 1 ? { id: it.id, part: i, parts } : { id: it.id, part: 0, parts: 1 }).then((r) => {
          done++;
          if (parts > 1) btn.textContent = '받는 중 ' + Math.round(done / parts * 100) + '%';
          return r;
        })));
        UI.saveBytes(got.map((r) => UI.fromBase64(r.data)), got[0].name, got[0].type);
      } catch (e) { UI.toast(e.message, true); }
      btn.disabled = false;
      btn.textContent = old;
    };
    const daysAgo = (at) => {
      const t = Date.parse(String(at).slice(0, 10) + 'T00:00:00+09:00');
      const n = Date.parse((App.home.today || '') + 'T00:00:00+09:00');
      return isFinite(t) && isFinite(n) ? (n - t) / 86400000 : 99;
    };
    /* 같은 분류에서 같은 직(작업표준서) 또는 같은 제목(그 밖)이면 가장 최근 것만 '최신' */
    const keyOf = (it) => it.category + '|' + (it.category === TIS ? it.dept : it.title);

    function draw() {
      tabs.replaceChildren(...[['', '전체']].concat(data.categories.map((c) => [c, c])).map(([k, label]) => h('button', {
        type: 'button', class: 'seg-btn' + (k === cat ? ' on' : ''), onclick: () => { cat = k; draw(); }
      }, label, k ? h('span', { class: 'lib-count' }, String(data.items.filter((it) => it.category === k).length)) : null)));
      seg.hidden = cat !== TIS;
      seg.replaceChildren(...[['', '전체']].concat(DEPTS.map((d) => [d, d])).map(([k, label]) => h('button', {
        type: 'button', class: 'seg-btn' + (k === dept ? ' on' : ''), onclick: () => { dept = k; draw(); }
      }, label)));
      const items = data.items.filter((it) => (!cat || it.category === cat) && (cat !== TIS || !dept || it.dept === dept)
        && (!term || (it.title + ' ' + it.name).toLowerCase().includes(term)));
      const latest = {};
      data.items.forEach((it) => { const k = keyOf(it); if (!latest[k]) latest[k] = it.id; });
      list.replaceChildren(...(items.length ? items.map((it) => {
        const btn = h('button', { class: 'btn', type: 'button' }, UI.icon('download'), '내려받기');
        btn.onclick = () => download(it, btn);
        const isLatest = latest[keyOf(it)] === it.id;
        return h('article', { class: 'lib-item' },
          h('span', { class: 'lib-ico' }, UI.icon('file')),
          h('div', { class: 'lib-main' },
            h('p', { class: 'lib-title' }, daysAgo(it.at) < NEW_DAYS ? h('span', { class: 'chip new mini' }, '새 자료') : null, it.title,
              isLatest ? h('span', { class: 'chip good mini' }, '최신') : h('span', { class: 'chip mini' }, '이전 판')),
            h('p', { class: 'sub' }, [it.category, it.category === TIS ? it.dept : '', UI.size(it.size), UI.dateOnly(it.at), '등록 ' + it.by].filter(Boolean).join(' · ')),
            h('p', { class: 'sub lib-name' }, it.name)),
          h('div', { class: 'row-btns' }, btn,
            it.canDelete && h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
              if (!confirm(it.name + ' 파일을 자료실에서 지울까요? 지운 자료는 아래 "지운 자료"에서 되살릴 수 있습니다.' + (it.category === TIS ? ' 표준서 실적은 바뀌지 않습니다.' : ''))) return;
              try { await Api.call('libraryDelete', { id: it.id }); UI.toast('지웠습니다.'); load(); } catch (e) { UI.toast(e.message, true); }
            } }, '삭제')));
      }) : [UI.empty(term ? '검색 결과가 없습니다.' : (cat ? cat + ' 자료가 없습니다.' : '등록된 자료가 없습니다.'), 'data')]));
      delBox.replaceChildren(...(data.deleted.length ? [h('details', { class: 'config' }, h('summary', null, '지운 자료 ' + data.deleted.length + '개'),
        h('ul', { class: 'mh-hidden' }, data.deleted.map((x) => h('li', null, h('span', null, x.category + ' · ' + x.title + ' (' + x.name + ')'),
          h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
            try { await Api.call('libraryRestore', { id: x.id }); UI.toast('되살렸습니다.'); load(); } catch (e) { UI.toast(e.message, true); }
          } }, '되살리기')))))] : []));
    }

    const load = () => Api.call('libraryList', {}).then((d) => {
      if (!alive()) return;
      data = d;
      draw();
      if (!upBox.childNodes.length) {
        if (d.canUploadCats.length) {
          upBox.append(h('details', { class: 'config lib-up', open: !d.items.some((x) => x.category !== TIS) },
            h('summary', null, '자료 올리기 (회사 규정·지침, 안전·교육, 양식)'),
            generalUpload(d.canUploadCats, (c) => { cat = c; load(); })));
        }
        if (d.canUpload.length) {
          upBox.append(h('details', { class: 'config lib-up', open: !d.items.some((x) => x.category === TIS) && !d.canUploadCats.length },
            h('summary', null, '작업표준서 올리기'),
            h('p', { class: 'sub' }, 'TIS 시트만 남긴 직별 작업표준서 엑셀을 올립니다(10MB까지). 새 공정은 표준서 제정, 고친 공정은 개정으로 KPI(Q1)에도 반영됩니다.'),
            window.TisUpload({ depts: d.canUpload, dept: mine, onDone: (x) => { cat = TIS; dept = x; load(); } })));
        }
      }
    }, (e) => { if (alive()) list.replaceChildren(UI.error(e.message, load)); });

    app.replaceChildren(UI.hero('자료실', '작업표준서, 회사 규정·지침, 안전·교육 자료, 양식을 내려받을 수 있습니다.'),
      h('section', { class: 'section' }, h('div', { class: 'wrap' }, upBox, tabs, seg, h('div', { class: 'toolbar' }, search), list, delBox)));
    load();
  });
})();
