/* 직원 건의사항. 작성자는 누구에게도 보이지 않는다(익명). 건의 내용은 화면 저장소에 보관하지 않는다. */
(() => {
  const STATUS = ['접수', '검토중', '답변완료'];
  const CATS = ['업무개선', '장비/설비', '안전', '기타'];
  const chipClass = { 접수: '', 검토중: 'warn', 답변완료: 'good' };
  const canRead = () => !UI.has('VIEW_EXEC') && (UI.hasAny(['SUGGEST_VIEW', 'SUGGEST_READ']) || ((App.user && App.user.perms) || []).some((p) => p.startsWith('KPI_CHECK:')));

  function list(items, empty) {
    if (!items.length) return UI.empty(empty, 'feedback');
    return h('ul', { class: 'post-list' }, items.map((s) => h('li', null,
      h('a', { href: '#/suggest/view/' + s.id },
        h('span', { class: 'post-title' }, h('span', { class: 'chip mini ' + chipClass[s.status] }, s.status), h('span', { class: 'tag' }, s.category || '기타'), s.title),
        h('span', { class: 'sub' }, UI.dateOnly(s.created) + (s.photoCount ? ' · 사진 ' + s.photoCount : ''))))));
  }

  function catPicker() {
    let value = '';
    const box = h('div', { class: 'chips-pick', role: 'radiogroup', 'aria-label': '분류' });
    const paint = () => box.replaceChildren(...CATS.map((c) => h('button', { type: 'button', class: 'pick' + (c === value ? ' on' : ''), role: 'radio', 'aria-checked': String(c === value), onclick: () => { value = c; paint(); } }, c)));
    paint();
    return { el: box, get value() { return value; } };
  }

  function statusBox() {
    let items = [];
    let filter = '';
    const tabs = h('div', { class: 'seg small' });
    const listBox = h('div', null, UI.skeleton(4));
    const paint = () => {
      tabs.replaceChildren(...[''].concat(STATUS).map((st) => h('button', { type: 'button', class: 'seg-btn' + (st === filter ? ' on' : ''), onclick: () => { filter = st; paint(); } }, st || '전체')));
      const shown = items.filter((x) => !filter || x.status === filter).slice(0, 8);
      listBox.replaceChildren(list(shown, '해당하는 건의가 없습니다.'));
    };
    Api.call('suggestMine').then((d) => { items = d.items; paint(); }, (e) => listBox.replaceChildren(h('p', { class: 'sub' }, e.message)));
    paint();
    return h('div', { class: 'panel' }, UI.cardHead('list', '내 건의 처리 현황', '#/suggest/mine'), tabs, listBox);
  }

  Router.add('/suggest', (params, app) => {
    if (UI.has('VIEW_EXEC')) {
      app.replaceChildren(UI.hero('건의사항', '열람 전용 계정은 건의를 등록할 수 없습니다.'));
      return;
    }
    const title = h('input', { required: true, maxlength: 200, placeholder: '제목을 입력해 주세요' });
    const body = h('textarea', { rows: 8, required: true, maxlength: 5000, placeholder: '내용을 입력해 주세요' });
    const cat = catPicker();
    const picker = PhotoPicker(3, '사진');
    const btn = h('button', { class: 'btn', type: 'submit' }, '건의 등록');
    const form = h('form', { class: 'form-grid write-form', onsubmit: async (e) => {
      e.preventDefault();
      if (!cat.value) { UI.toast('분류를 골라 주세요.', true); return; }
      btn.disabled = true;
      let res;
      try { res = await Api.call('suggestSave', { category: cat.value, title: title.value, body: body.value }); }
      catch (err) { UI.toast(err.message, true); btn.disabled = false; return; }
      const finish = () => { UI.toast('건의를 등록했습니다.'); Router.go('/suggest/view/' + res.id); };
      const jobs = picker.files.map((file) => ({ file }));
      if (jobs.length) sendPhotos(jobs, res.ticket, progress, finish); else finish();
    } },
      UI.field('제목', title), h('div', { class: 'field' }, h('span', { class: 'field-label' }, '분류'), cat.el), UI.field('내용', body), picker.el,
      h('div', { class: 'form-foot submit-bar' }, h('p', { class: 'sub' }, '작성자는 누구에게도 표시되지 않습니다.'), btn));
    const progress = ProgressBox(form);
    app.replaceChildren(UI.hero('건의사항', '더 나은 업무 환경을 위해 의견을 남겨 주세요. 익명으로 전달됩니다.'),
      h('section', { class: 'section' }, h('div', { class: 'wrap wide split' },
        h('div', { class: 'panel' }, UI.cardHead('edit', '건의 등록'), form),
        h('div', { class: 'side' }, statusBox(),
          h('div', { class: 'panel tip' }, UI.icon('bell', 'tip-ico'), h('p', null, h('strong', null, '여러분의 의견이'), h('br'), '더 나은 BTRIPLE을 만듭니다.'))))));
  });

  Router.add('/suggest/mine', (params, app, alive) => {
    const body = h('div', { class: 'wrap' }, UI.skeleton(5));
    const load = () => Api.call('suggestMine').then((d) => { if (alive()) fill(body, list(d.items, '등록한 건의가 없습니다.')); },
      (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    app.replaceChildren(UI.hero('내 건의', '내가 등록한 건의와 답변'), h('section', { class: 'section' }, body));
    load();
  });

  Router.add('/suggest/all', (params, app, alive) => {
    if (!canRead()) { app.replaceChildren(UI.placeholder('권한이 없습니다')); return; }
    let page = 1;
    const status = UI.select('status', STATUS, '', '전체 상태');
    const category = UI.select('category', CATS, '', '전체 분류');
    const info = h('p', { class: 'sub' });
    const body = h('div', null, UI.skeleton(6));
    const load = () => Api.call('suggestAll', { status: status.value, category: category.value, page }).then((d) => {
      if (!alive()) return;
      info.textContent = (d.scope === 'all' ? '전체 건의' : d.scope + ' 건의') + ' ' + d.total + '건';
      fill(body, list(d.items, '건의가 없습니다.'), UI.pager(d.page, d.size, d.total, (n) => { page = n; load(); }) || '');
    }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    status.onchange = () => { page = 1; load(); };
    category.onchange = () => { page = 1; load(); };
    app.replaceChildren(UI.hero('전체 건의'), h('section', { class: 'section' }, h('div', { class: 'wrap' }, h('div', { class: 'toolbar' }, status, category), info, body)));
    load();
  });

  function photos(id, count) {
    const box = h('div', { class: 'thumbs' });
    for (let i = 0; i < count; i++) {
      const slot = h('div', { class: 'thumb skeleton-box' });
      box.append(slot);
      Api.call('suggestPhoto', { id, index: i }).then((r) => {
        const src = 'data:image/jpeg;base64,' + r.data;
        slot.replaceWith(h('img', { class: 'thumb', src, alt: '첨부 사진', onclick: () => UI.lightbox(src) }));
      }, () => { slot.classList.add('thumb-failed'); });
    }
    return box;
  }

  function answerForm(d, reload) {
    const st = UI.select('status', STATUS, d.status);
    const text = h('textarea', { rows: 5, maxlength: 5000, value: d.answer || '' });
    const btn = h('button', { class: 'btn', type: 'submit' }, '저장');
    return h('form', { class: 'narrow answer-form', onsubmit: async (e) => {
      e.preventDefault();
      btn.disabled = true;
      try { await Api.call('suggestAnswer', { id: d.id, status: st.value, answer: text.value }); UI.toast('저장했습니다.'); reload(); }
      catch (err) { UI.toast(err.message, true); btn.disabled = false; }
    } }, h('h2', { class: 'comment-h' }, '답변 작성'), UI.field('상태', st), UI.field('답변', text, '답변완료로 바꾸려면 답변을 입력해 주세요.'), btn);
  }

  Router.add('/suggest/view/:id', (params, app, alive) => {
    const load = () => {
      app.replaceChildren(UI.skeleton(6));
      Api.call('suggestGet', { id: params.id }).then((d) => {
        if (!alive()) return;
        fill(app, UI.hero(d.title, '익명 · ' + d.created),
          h('section', { class: 'section' }, h('div', { class: 'wrap narrow-read' },
            h('p', null, h('span', { class: 'chip ' + chipClass[d.status] }, d.status), ' ', h('span', { class: 'tag' }, d.category || '기타')),
            h('div', { class: 'post-body' }, d.body),
            d.photoCount ? photos(d.id, d.photoCount) : null,
            h('div', { class: 'answer' }, h('h2', { class: 'comment-h' }, '답변'),
              d.answer ? [h('p', { class: 'sub' }, d.answerBy + ' · ' + d.answeredAt), h('div', { class: 'post-body' }, d.answer)] : h('p', { class: 'sub' }, '아직 답변이 없습니다.')),
            d.canAnswer && answerForm(d, load))));
      }, (e) => { if (alive()) app.replaceChildren(UI.error(e.message, load)); });
    };
    load();
  });
})();
