/* KPI 건별 작성과 직장 일일 확인. 나머지 KPI 화면은 2단계에서 만든다. */
(() => {
  const CODES = [
    ['S1', '사고발생'], ['S2', '위험요소 적출'], ['Q2', '납입이상 적출'], ['Q3', '팔레트 개선/보수'], ['C1', '개선사항'], ['CP', '개선 제안']
  ];
  const nameOf = (code) => CODES.find((c) => c[0] === code)[1];
  const DEPTS = ['물류1직', '물류2직', '물류3직', '물류4직'];
  const opt = (code, key) => ((App.home.options || {})[code] || {})[key] || [];
  const LABELS = {
    process: '공정', counter: '대책', owner: '담당자', targetDate: '개선목표일', doneDate: '완료일', progress: '현황', note: '비고',
    kind: '구분', finder: '발굴자', effect: '기대효과', judge: '직장 판정', item: '항목', category: '구분', partNo: '품번', product: '품목', proposer: '제안자', period: '활동기간', amount: '효과금액(백만원)'
  };

  function extras(code, v) {
    const text = (name, label, def) => UI.field(label, h('input', { name, value: v[name] !== undefined ? v[name] : (def || '') }));
    const sel = (name, label, values) => UI.field(label, UI.select(name, values, v[name], '선택'));
    switch (code) {
      case 'S1': return [sel('kind', '발생구분', opt('S1', '발생구분'))];
      case 'S2': return [text('finder', '발굴자', App.user.name)];
      case 'Q2': return [sel('item', '항목', opt('Q2', '항목')), sel('category', '구분', opt('Q2', '구분')), text('partNo', '품번')];
      case 'Q3': return [sel('kind', '개선/보수', opt('Q3', '구분')), text('product', '품목'), sel('category', '분류', opt('Q3', '분류')), text('proposer', '제안자')];
      case 'CP': return [];
      default: return [sel('category', '분류', opt('C1', '분류')), text('period', '활동기간'),
        UI.field('효과금액(백만원)', h('input', { name: 'amount', inputmode: 'decimal', value: v.amount || '' }))];
    }
  }

  Router.add('/kpi/write', (params, app) => {
    if (UI.has('VIEW_EXEC')) { app.replaceChildren(UI.placeholder('열람 전용 계정은 작성할 수 없습니다')); return; }
    const saved = Store.draftGet('kpi') || {};
    let code = saved.code || 'S1';
    let values = saved.values || {};
    let issuePicker, counterPicker;
    const body = h('div');
    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    const form = h('form', { class: 'narrow' });
    const collect = () => {
      const out = {};
      new FormData(form).forEach((v, k) => { out[k] = v; });
      return out;
    };
    const save = () => Store.draftSet('kpi', { code, values: collect() });
    const isManager = UI.has('KPI_MANAGER');

    function draw() {
      tabs.replaceChildren(...CODES.map(([c, n]) => h('button', {
        type: 'button', class: 'tab' + (c === code ? ' on' : ''), role: 'tab', 'aria-selected': String(c === code),
        onclick: () => { values = collect(); code = c; draw(); save(); }
      }, n)));
      issuePicker = PhotoPicker(3, '문제 사진');
      counterPicker = PhotoPicker(3, '대책 사진');
      const val = (n) => values[n] || '';
      const today = App.home.today;
      const submit = h('button', { class: 'btn wide', type: 'submit' }, '저장');
      const progress = h('div');
      fill(form,
        UI.field('일자', h('input', { name: 'date', type: 'date', required: true, max: today, value: val('date') || today })),
        isManager
          ? UI.field('소속 직', UI.select('dept', DEPTS, val('dept') || (DEPTS.includes(App.user.dept) ? App.user.dept : ''), '선택'))
          : UI.field('소속 직', h('input', { value: App.user.dept, disabled: true })),
        UI.field('작성자', h('input', { value: App.user.name, disabled: true })),
        extras(code, values),
        UI.field('공정', h('input', { name: 'process', value: val('process') })),
        UI.field(code === 'CP' ? '제안 내용(낭비 제거, 업무 효율)' : '문제(ISSUE)', h('textarea', { name: 'issue', rows: 4, required: true, value: val('issue') })),
        code === 'CP' && UI.field('기대효과', h('input', { name: 'effect', value: val('effect') })),
        code === 'S1' && h('p', { class: 'hint' }, '사고발생 사진은 비공개로 저장됩니다.'),
        issuePicker.el,
        UI.field('대책(COUNTERMEASURE)', h('textarea', { name: 'counter', rows: 3, value: val('counter') })),
        counterPicker.el,
        UI.field('담당자', h('input', { name: 'owner', value: val('owner') })),
        UI.field('개선목표일', h('input', { name: 'targetDate', type: 'date', value: val('targetDate') })),
        UI.field('완료일', h('input', { name: 'doneDate', type: 'date', value: val('doneDate') })),
        UI.field('현황', UI.select('progress', ['진행중', '완료'], val('progress'), '선택')),
        UI.field('비고', h('input', { name: 'note', value: val('note') })),
        submit, progress);
      form.onsubmit = async (e) => {
        e.preventDefault();
        submit.disabled = true;
        let ticket;
        try {
          ticket = (await Api.call('kpiSave', Object.assign(collect(), { code }))).ticket;
        } catch (err) { UI.toast(err.message, true); submit.disabled = false; return; }
        Store.draftClear('kpi');
        const box = ProgressBox(progress);
        const finish = () => { UI.toast('저장했습니다.'); values = {}; App.refreshInit(); draw(); };
        const jobs = issuePicker.files.map((file) => ({ file, kind: 'issue' }))
          .concat(counterPicker.files.map((file) => ({ file, kind: 'counter' })));
        if (jobs.length) sendPhotos(jobs, ticket, box, finish); else finish();
      };
    }
    form.addEventListener('input', save);
    form.addEventListener('change', save);
    body.append(tabs, form);
    draw();
    app.replaceChildren(UI.hero('실적 작성', '문제와 사진만 입력해도 저장됩니다.'), h('section', { class: 'section' }, h('div', { class: 'wrap' }, body)));
  });

  async function privatePhoto(item, kind, index) {
    try {
      const res = await Api.call('kpiPhoto', { id: item.id, kind, index });
      UI.lightbox('data:image/jpeg;base64,' + res.data);
    } catch (e) { UI.toast(e.message, true); }
  }

  function photosOf(item, kind, ids, count) {
    if (!count) return null;
    if (!item.privatePhoto) return h('div', { class: 'thumbs' }, ids.map((f) => UI.thumb(f)));
    return h('div', { class: 'row-btns' }, h('span', { class: 'sub' }, '사진 있음'),
      Array.from({ length: count }, (_, i) => h('button', { class: 'btn ghost', type: 'button', onclick: () => privatePhoto(item, kind, i) }, '확대 ' + (i + 1))));
  }

  Router.add('/kpi/pending', (params, app, alive) => {
    if (!App.user.perms.some((p) => p.startsWith('KPI_CHECK:'))) { app.replaceChildren(UI.placeholder('확인 권한이 없습니다')); return; }
    const list = h('div', { class: 'wrap' }, UI.skeleton(6));
    const selected = new Set();
    const forms = {};
    const bar = h('div', { class: 'bulk-bar', hidden: true });

    const patchOf = (id) => {
      const out = {};
      new FormData(forms[id]).forEach((v, k) => { out[k] = v; });
      return out;
    };
    const confirmItems = async (ids) => {
      const patches = {};
      ids.forEach((id) => { patches[id] = patchOf(id); });
      try {
        await Api.call('kpiConfirm', { ids, patches });
        UI.toast(ids.length + '건을 확인했습니다.');
        App.refreshInit();
        load();
      } catch (e) { UI.toast(e.message, true); }
    };
    const drawBar = () => {
      bar.hidden = selected.size === 0;
      bar.replaceChildren(h('span', null, selected.size + '건 선택'),
        h('button', { class: 'btn', type: 'button', onclick: () => confirmItems([...selected]) }, '한 번에 확인'));
    };

    function card(item) {
      const d = item.detail;
      const facts = Object.keys(LABELS).filter((k) => d[k] && !['counter', 'owner', 'targetDate', 'doneDate', 'progress'].includes(k));
      const check = h('input', { type: 'checkbox', 'aria-label': '선택', onchange: () => {
        if (check.checked) selected.add(item.id); else selected.delete(item.id);
        drawBar();
      } });
      const form = h('form', { class: 'card-form' },
        UI.field('대책', h('textarea', { name: 'counter', rows: 2, value: d.counter || '' })),
        UI.field('담당자', h('input', { name: 'owner', value: d.owner || '' })),
        UI.field('개선목표일', h('input', { name: 'targetDate', type: 'date', value: d.targetDate || '' })),
        UI.field('완료일', h('input', { name: 'doneDate', type: 'date', value: d.doneDate || '' })),
        UI.field('현황', UI.select('progress', ['진행중', '완료'], d.progress, '선택')),
        item.code === 'CP' && UI.field('직장 판정', UI.select('judge', ['합리적', '불합리적'], d.judge, '선택')),
        UI.field('코멘트', h('input', { name: 'comment' })));
      forms[item.id] = form;
      const counter = PhotoPicker(Math.max(0, 3 - item.counterCount), '대책 사진 추가');
      const reason = h('input', { placeholder: '집계 제외 사유(필수)', 'aria-label': '집계 제외 사유' });
      const confirmOne = async () => {
        if (counter.files.length) {
          const jobs = counter.files.map((file, i) => ({ file, kind: 'counter', seq: i + 1 }));
          try {
            const { ticket } = await Api.call('photoTicket', { id: item.id });
            const { done, failed } = await uploadPhotos(jobs, ticket, () => {});
            if (done.length) await Api.call('photoAttach', { ticket, files: done });
            if (failed.length) {
              counter.files.splice(0, counter.files.length, ...failed.map((j) => j.file));
              UI.toast('사진 ' + failed.length + '장을 올리지 못했습니다. 다시 시도해 주세요.', true);
              return;
            }
          } catch (e) { UI.toast(e.message, true); return; }
        }
        confirmItems([item.id]);
      };
      return h('article', { class: 'card' },
        h('header', { class: 'card-head' }, check,
          h('span', { class: 'tag' }, item.code + ' ' + nameOf(item.code)),
          h('span', { class: 'sub' }, item.dept + ' · ' + item.date + ' · ' + item.author)),
        h('p', { class: 'pre card-issue' }, d.issue),
        facts.length ? h('dl', { class: 'facts' }, facts.map((k) => [h('dt', null, LABELS[k]), h('dd', null, d[k])])) : null,
        photosOf(item, 'issue', item.issuePhotos, item.issueCount),
        photosOf(item, 'counter', item.counterPhotos, item.counterCount),
        form, counter.el,
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn', type: 'button', onclick: confirmOne }, '확인'),
          reason,
          h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
            if (!reason.value.trim()) { UI.toast('집계 제외 사유를 입력해 주세요.', true); return; }
            try { await Api.call('kpiExclude', { id: item.id, reason: reason.value }); UI.toast('집계에서 제외했습니다.'); App.refreshInit(); load(); }
            catch (e) { UI.toast(e.message, true); }
          } }, '집계 제외')));
    }

    function load() {
      Api.call('kpiPending').then((data) => {
        if (!alive()) return;
        selected.clear();
        drawBar();
        list.replaceChildren(...(data.items.length ? data.items.map(card) : [h('p', { class: 'sub center' }, '확인할 건이 없습니다.')]));
      }, (e) => { if (alive()) list.replaceChildren(UI.error(e.message, load)); });
    }
    app.replaceChildren(UI.hero('확인 대기', '확인한 건만 월 실적에 반영됩니다.'), h('section', { class: 'section' }, list), bar);
    load();
  });

  const later = (title) => (params, app) => app.replaceChildren(UI.placeholder(title));
  Router.add('/suggest', later('건의하기'));
  Router.add('/suggest/mine', later('내 건의'));
  Router.add('/suggest/all', later('전체 건의'));
})();
