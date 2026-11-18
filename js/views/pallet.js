/* 팔레트 실적(Q3, 2026-11-17): 전담 작업자가 사진과 작업 내용을 등록하면 바로 팀 전체 KPI(팔레트 개선/보수)에 반영된다.
   구분은 신규제작, 개선(개조), 보수. 팀장·과장·공장은 잘못된 건을 집계에서 빼거나 되돌린다. 열람은 전원(외부 열람 제외). */
(() => {
  const KINDS = ['신규제작', '개선(개조)', '보수'];
  const KIND_CLASS = { 신규제작: 'good', '개선(개조)': 'warn', 보수: '' };
  const PAGE = 20;
  const canWrite = () => !UI.has('VIEW_EXEC') && UI.hasAny(['PALLET_WRITE', 'ADMIN']);

  const photoRow = (ids) => (ids.length ? h('div', { class: 'thumbs' }, ids.map((id) => UI.thumb(id))) : h('p', { class: 'sub' }, '사진 없음'));

  Router.add('/pallet', (params, app, alive) => {
    const thisYear = new Date().getFullYear();
    let year = thisYear, month = '', kind = '', page = 1, data = null;
    const ySel = UI.select('year', [String(thisYear), String(thisYear - 1)], String(year));
    const mSel = h('select', { 'aria-label': '월' }, h('option', { value: '' }, '전체 월'), Array.from({ length: 12 }, (_, i) => h('option', { value: String(i + 1).padStart(2, '0') }, (i + 1) + '월')));
    const seg = h('div', { class: 'seg small' });
    const sum = h('div', { class: 'pal-sum' });
    const list = h('div', { class: 'pal-list' }, UI.skeleton(5));
    const pager = h('div');

    function card(it, no) {
      const judge = async (exclude) => {
        let reason = '';
        if (exclude) {
          reason = prompt('집계에서 빼는 사유를 입력해 주세요.') || '';
          if (!reason.trim()) return;
        } else if (!confirm('이 건을 다시 집계에 넣을까요?')) return;
        try { await Api.call('palletJudge', { id: it.id, exclude, reason }); UI.toast(exclude ? '집계에서 뺐습니다.' : '집계에 다시 넣었습니다.'); load(); }
        catch (e) { UI.toast(e.message, true); }
      };
      const out = it.status === '제외';
      return h('article', { class: 'pal-card' + (out ? ' out' : '') },
        h('header', { class: 'pal-head' },
          h('strong', null, 'No.' + no), h('span', { class: 'chip ' + (KIND_CLASS[it.kind] || '') }, it.kind),
          h('span', { class: 'sub' }, it.date + (it.category ? ' · ' + it.category : '') + (it.process ? ' · ' + it.process : '') + (it.product ? ' · ' + it.product : '')),
          out ? h('span', { class: 'chip bad' }, '집계 제외') : null),
        out && it.reason ? h('p', { class: 'sub' }, '제외 사유: ' + it.reason) : null,
        h('div', { class: 'pal-cols' },
          h('div', null, h('h4', null, '개선 전'), h('p', { class: 'pre' }, it.before || '-'), photoRow(it.beforePhotos)),
          h('div', null, h('h4', null, '개선 후'), h('p', { class: 'pre' }, it.after || '-'), photoRow(it.afterPhotos))),
        h('p', { class: 'sub' }, [it.owner && '담당 ' + it.owner, it.proposer && '제안 ' + it.proposer, it.doneDate && '완료 ' + it.doneDate, it.progress, '등록 ' + it.author].filter(Boolean).join(' · ')),
        (it.canEdit || data.canJudge) ? h('div', { class: 'row-btns no-print' },
          it.canEdit ? h('a', { class: 'btn ghost', href: '#/pallet/edit/' + it.id }, '수정') : null,
          data.canJudge ? h('button', { class: 'btn ghost', type: 'button', onclick: () => judge(!out) }, out ? '집계에 다시 넣기' : '집계에서 빼기') : null) : null);
    }

    function draw() {
      seg.replaceChildren(...[''].concat(KINDS).map((k) => h('button', { type: 'button', class: 'seg-btn' + (k === kind ? ' on' : ''), onclick: () => { kind = k; page = 1; draw(); } }, k || '전체')));
      const shown = data.items.filter((it) => !kind || it.kind === kind);
      const counts = {};
      KINDS.forEach((k) => { counts[k] = data.items.filter((it) => it.kind === k && it.status === '확인').length; });
      sum.replaceChildren(...KINDS.map((k) => h('div', { class: 'pal-stat' }, h('span', { class: 'sub' }, k), h('strong', null, counts[k] + '건'))),
        h('div', { class: 'pal-stat' }, h('span', { class: 'sub' }, '합계(집계 반영)'), h('strong', null, KINDS.reduce((s, k) => s + counts[k], 0) + '건')));
      const total = shown.length;
      const slice = shown.slice((page - 1) * PAGE, page * PAGE);
      list.replaceChildren(...(slice.length ? slice.map((it, i) => card(it, total - ((page - 1) * PAGE + i))) : [UI.empty('등록된 팔레트 실적이 없습니다.', 'data')]));
      fill(pager, UI.pager(page, PAGE, total, (p) => { page = p; draw(); window.scrollTo(0, 0); }));
    }

    const load = () => Api.call('palletList', { year: String(year), month: month ? year + '-' + month : '' }).then((d) => {
      if (!alive()) return;
      data = d;
      draw();
    }, (e) => { if (alive()) list.replaceChildren(UI.error(e.message, load)); });
    ySel.onchange = () => { year = Number(ySel.value); page = 1; load(); };
    mSel.onchange = () => { month = mSel.value; page = 1; load(); };
    app.replaceChildren(UI.hero('팔레트 실적', '팔레트 신규제작, 개선(개조), 보수 실적입니다. 등록하면 팀 전체 KPI에 바로 반영됩니다.'),
      h('section', { class: 'section print-page' }, h('div', { class: 'wrap wide' },
        h('div', { class: 'toolbar no-print wrap-row' }, ySel, mSel,
          canWrite() ? h('a', { class: 'btn', href: '#/pallet/new' }, '실적 등록') : null,
          h('a', { class: 'btn ghost', href: '#/kpi/team/Q3' }, 'KPI 보기'),
          h('button', { class: 'btn ghost pc-only', type: 'button', onclick: () => window.print() }, '인쇄')),
        h('div', { class: 'no-print' }, seg), sum, list, pager)));
    load();
  });

  /* 등록·수정 화면 */
  function formView(app, alive, id) {
    if (!canWrite()) { app.replaceChildren(UI.placeholder('팔레트 실적을 등록할 권한이 없습니다')); return; }
    const body = h('div', { class: 'wrap' }, UI.skeleton(6));
    app.replaceChildren(UI.hero(id ? '팔레트 실적 수정' : '팔레트 실적 등록', '사진과 작업 내용을 입력하면 팀 전체 KPI에 바로 반영됩니다.'), h('section', { class: 'section' }, body));
    const year = id ? id.split('-')[0] : String(new Date().getFullYear());
    Api.call('palletList', { year }).then((d) => {
      if (!alive()) return;
      const it = id ? d.items.find((x) => x.id === id) : null;
      if (id && (!it || !it.canEdit)) { body.replaceChildren(UI.empty('고칠 수 있는 건을 찾지 못했습니다.', 'notfound')); return; }
      const v = it || Store.draftGet('pallet') || {};
      let kind = v.kind && KINDS.includes(v.kind) ? v.kind : '';
      const kindSeg = h('div', { class: 'tabs', role: 'tablist', 'aria-label': '구분' });
      const catBox = h('div');
      const catVal = () => (catBox.querySelector('[name=category]') || {}).value || val('category');
      const drawCat = (reset) => {
        const cur = reset ? '' : catVal();
        const list = (d.options && d.options[kind]) || [];
        const opts = list.includes(cur) || !cur ? list : list.concat([cur]);
        catBox.replaceChildren(UI.field('분류', opts.length ? UI.select('category', opts, cur, '선택') : h('input', { name: 'category', value: cur })));
      };
      const drawKind = (reset) => { drawCat(reset); kindSeg.replaceChildren(...KINDS.map((k) => h('button', { type: 'button', class: 'tab' + (k === kind ? ' on' : ''), role: 'tab', 'aria-selected': String(k === kind), onclick: () => { if (k === kind) return; kind = k; drawKind(true); saveDraft(); } }, k))); };
      const val = (k) => v[k] || '';
      drawKind();
      const form = h('form', { class: 'narrow write-form' });
      const keepBefore = it ? it.beforePhotos.slice() : [], keepAfter = it ? it.afterPhotos.slice() : [];
      const before = PhotoPicker(Math.max(0, 3 - keepBefore.length), '개선 전 사진');
      const after = PhotoPicker(Math.max(0, 3 - keepAfter.length), '개선 후 사진');
      const kept = (ids, kindName) => (ids.length ? h('div', { class: 'field' }, h('span', { class: 'field-label' }, '등록된 ' + (kindName === 'before' ? '개선 전' : '개선 후') + ' 사진'),
        h('div', { class: 'picker-row' }, ids.map((fid) => h('div', { class: 'picker-item' }, h('img', { src: UI.thumbUrl(fid), alt: '등록된 사진' }),
          h('button', { type: 'button', class: 'picker-x', 'aria-label': '사진 빼기', onclick: async () => {
            if (!confirm('이 사진을 뺄까요?')) return;
            try { await Api.call('palletPhotoDelete', { id, kind: kindName, fileId: fid }); UI.toast('사진을 뺐습니다.'); formView(app, alive, id); } catch (e) { UI.toast(e.message, true); }
          } }, '×'))))) : null);
      const submit = h('button', { class: 'btn wide', type: 'submit' }, id ? '저장' : '등록');
      const progress = h('div');
      fill(form,
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, '구분'), kindSeg),
        UI.field('일자', h('input', { name: 'date', type: 'date', required: true, max: App.home.today, value: val('date') || App.home.today })),
        h('div', { class: 'best-grid' },
          UI.field('공정', h('input', { name: 'process', value: val('process'), placeholder: '예: 23A60' })),
          UI.field('품목', h('input', { name: 'product', value: val('product'), placeholder: '예: 타이어' })),
          catBox),
        UI.field('개선 전 내용', h('textarea', { name: 'before', rows: 3, required: true, value: val('before'), placeholder: '예: 굴착기 엔진 투입대차 바퀴 불량' })),
        kept(keepBefore, 'before'), before.el,
        UI.field('개선 후 내용', h('textarea', { name: 'after', rows: 3, value: val('after'), placeholder: '예: 불량 바퀴 교체 완료' })),
        kept(keepAfter, 'after'), after.el,
        h('details', { class: 'optional', open: window.innerWidth >= 834 || ['owner', 'proposer', 'doneDate', 'progress'].some((k) => val(k)) },
          h('summary', null, '담당자·제안자·완료일 (선택)'),
          h('div', { class: 'best-grid' },
            UI.field('담당자', h('input', { name: 'owner', value: val('owner') })),
            UI.field('제안자', h('input', { name: 'proposer', value: val('proposer') })),
            UI.field('완료일', h('input', { name: 'doneDate', type: 'date', value: val('doneDate') })),
            UI.field('현황', UI.select('progress', ['진행중', '완료'], val('progress'), '선택')))),
        h('div', { class: 'submit-bar' }, submit), progress);
      const collect = () => { const o = { kind }; new FormData(form).forEach((x, k) => { o[k] = x; }); return o; };
      const saveDraft = () => { if (!id) Store.draftSet('pallet', collect()); };
      form.addEventListener('input', saveDraft);
      form.addEventListener('change', saveDraft);
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (!kind) { UI.toast('구분(신규제작, 개선(개조), 보수)을 골라 주세요.', true); return; }
        submit.disabled = true;
        submit.textContent = '저장 중';
        let res;
        try { res = await Api.call('palletSave', Object.assign(collect(), id ? { id } : {})); }
        catch (err) { UI.toast(err.message, true); submit.disabled = false; submit.textContent = id ? '저장' : '등록'; return; }
        if (!id) Store.draftClear('pallet');
        const finish = () => { UI.toast(id ? '저장했습니다.' : '등록했습니다. 팀 KPI에 반영됩니다.'); location.hash = '#/pallet'; };
        const jobs = before.files.map((file) => ({ file, kind: 'before' })).concat(after.files.map((file) => ({ file, kind: 'after' })));
        if (jobs.length) sendPhotos(jobs, res.ticket, ProgressBox(progress), finish); else finish();
      };
      body.replaceChildren(form);
    }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, () => formView(app, alive, id))); });
  }
  Router.add('/pallet/new', (params, app, alive) => formView(app, alive, ''));
  Router.add('/pallet/edit/:id', (params, app, alive) => formView(app, alive, params.id));
})();
