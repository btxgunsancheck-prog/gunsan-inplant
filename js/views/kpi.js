/* KPI 건별 작성과 직장 일일 확인. 나머지 KPI 화면은 2단계에서 만든다. */
(() => {
  const CODES = [
    ['S1', '사고발생'], ['S2', '위험요소 적출'], ['Q2', '납입이상 적출'], ['Q3', '팔레트 개선/보수'], ['C1', '개선사항'], ['CP', '개선 제안']
  ];
  const nameOf = (code) => CODES.find((c) => c[0] === code)[1];
  const DEPTS = ['물류1직', '물류2직', '물류3직', '물류4직'];
  const opt = (code, key) => ((App.home.options || {})[code] || {})[key] || [];
  const LABELS = {
    process: '공정(작업장)', counter: '대책', owner: '담당자', targetDate: '개선목표일', doneDate: '완료일', progress: '현황', note: '비고',
    kind: '구분', finder: '발굴자', effect: '기대효과', judge: '직장 판정', item: '항목', category: '구분', partNo: '품번', vendor: '업체명', product: '품목', proposer: '제안자', period: '활동기간', amount: '효과금액(백만원)'
  };

  function extras(code, v) {
    const text = (name, label, def) => UI.field(label, h('input', { name, value: v[name] !== undefined ? v[name] : (def || '') }));
    const sel = (name, label, values) => UI.field(label, UI.select(name, values, v[name], '선택'));
    switch (code) {
      case 'S1': return [sel('kind', '발생구분', opt('S1', '발생구분'))];
      case 'S2': return [text('finder', '발굴자', App.user.name)];
      case 'Q2': return [sel('item', '항목', opt('Q2', '항목')), text('partNo', '품번'), text('vendor', '업체명')];
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
    let issuePicker, counterPicker, pre, issuePre, counterPre;
    const body = h('div');
    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    const form = h('form', { class: 'narrow write-form' });
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
      /* 사진은 고르는 즉시 미리 올린다. 지표를 바꾸면 새로 고른다(사고발생은 비공개 폴더). */
      const drawCode = code;
      pre = PhotoPreload(() => Api.call('photoDraft', { code: drawCode, date: form.elements.date ? form.elements.date.value : '' }).then((r) => r.ticket));
      issuePre = pre.kind('issue');
      counterPre = pre.kind('counter');
      issuePicker = PhotoPicker(3, '문제 사진', issuePre);
      counterPicker = PhotoPicker(3, '대책 사진', counterPre);
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
        UI.field('공정(작업장)', h('input', { name: 'process', value: val('process') })),
        UI.field(code === 'CP' ? '제안 내용(낭비 제거, 업무 효율)' : '문제(ISSUE)', h('textarea', { name: 'issue', rows: 4, required: true, value: val('issue') })),
        code === 'CP' && UI.field('기대효과', h('input', { name: 'effect', value: val('effect') })),
        code === 'S1' && h('p', { class: 'hint' }, '사고발생 사진은 비공개로 저장됩니다.'),
        issuePicker.el,
        UI.field('대책(COUNTERMEASURE)', h('textarea', { name: 'counter', rows: 3, value: val('counter') })),
        counterPicker.el,
        h('details', { class: 'optional', open: window.innerWidth >= 834 || ['owner', 'targetDate', 'doneDate', 'progress', 'note'].some((n) => val(n)) },
          h('summary', null, '담당자·일정·현황 (선택)'),
          UI.field('담당자', h('input', { name: 'owner', value: val('owner') })),
          UI.field('개선목표일', h('input', { name: 'targetDate', type: 'date', value: val('targetDate') })),
          UI.field('완료일', h('input', { name: 'doneDate', type: 'date', value: val('doneDate') })),
          UI.field('현황', UI.select('progress', ['진행중', '완료'], val('progress'), '선택')),
          UI.field('비고', h('input', { name: 'note', value: val('note') }))),
        h('div', { class: 'submit-bar' }, submit), progress);
      form.onsubmit = async (e) => {
        e.preventDefault();
        submit.disabled = true;
        let photos = null;
        let left = [];
        if (issuePicker.files.length || counterPicker.files.length) {
          submit.textContent = '사진 올리는 중';
          const a = await issuePre.collect(issuePicker.files);
          const b = await counterPre.collect(counterPicker.files);
          issuePicker.draw(); counterPicker.draw();
          const done = a.done.concat(b.done);
          left = a.failed.map((file) => ({ file, kind: 'issue' })).concat(b.failed.map((file) => ({ file, kind: 'counter' })));
          if (done.length) photos = { ticket: await pre.ticket(), files: done };
        }
        submit.textContent = '저장 중';
        let ticket;
        try {
          ticket = (await Api.call('kpiSave', Object.assign(collect(), { code }, photos ? { photos } : {}))).ticket;
        } catch (err) { UI.toast(err.message, true); submit.disabled = false; submit.textContent = '저장'; return; }
        Store.draftClear('kpi');
        const box = ProgressBox(progress);
        const finish = () => { UI.toast('저장했습니다.'); values = {}; App.refreshInit(); draw(); };
        /* 미리 올리기에 실패한 사진만 저장 뒤에 다시 올린다. */
        if (left.length) sendPhotos(left, ticket, box, finish); else finish();
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
    const confirmItems = async (ids, photos) => {
      const patches = {};
      ids.forEach((id) => { patches[id] = patchOf(id); });
      try {
        await Api.call('kpiConfirm', Object.assign({ ids, patches }, photos ? { photos } : {}));
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
      /* 대책·판정·코멘트는 늘 보이고, 담당자·일정·현황은 접어 둔다(PC에서는 펼침, 값이 있으면 펼침). */
      const wide = window.innerWidth >= 834;
      const form = h('form', { class: 'card-form' },
        UI.field('대책', h('textarea', { name: 'counter', rows: 2, value: d.counter || '' })),
        item.code === 'CP' && UI.field('직장 판정', UI.select('judge', ['합리적', '불합리적'], d.judge, '선택')),
        UI.field('코멘트', h('input', { name: 'comment' })),
        h('details', { class: 'optional card-more', open: wide || !!(d.owner || d.targetDate || d.doneDate || d.progress) },
          h('summary', null, '담당자·일정·현황'),
          h('div', { class: 'card-form' },
            UI.field('담당자', h('input', { name: 'owner', value: d.owner || '' })),
            UI.field('개선목표일', h('input', { name: 'targetDate', type: 'date', value: d.targetDate || '' })),
            UI.field('완료일', h('input', { name: 'doneDate', type: 'date', value: d.doneDate || '' })),
            UI.field('현황', UI.select('progress', ['진행중', '완료'], d.progress, '선택')))));
      forms[item.id] = form;
      /* 대책 사진은 고르는 즉시 미리 올리고, 확인할 때 함께 붙인다. */
      const pre = PhotoPreload(() => item.ticket || Api.call('photoTicket', { id: item.id }).then((r) => r.ticket));
      const counterPre = pre.kind('counter');
      const counter = PhotoPicker(Math.max(0, 3 - item.counterCount), '대책 사진 추가', counterPre);
      const reason = h('input', { placeholder: '집계 제외 사유(필수)', 'aria-label': '집계 제외 사유' });
      const confirmBtn = h('button', { class: 'btn', type: 'button' }, '확인');
      const confirmOne = async () => {
        confirmBtn.disabled = true;
        try {
          if (!counter.files.length) { await confirmItems([item.id]); return; }
          if (counter.files.some((f) => counterPre.state(f) !== 'done')) UI.toast('사진 올리는 중입니다.');
          const { done, failed } = await counterPre.collect(counter.files);
          counter.draw();
          if (failed.length) { UI.toast('사진 ' + failed.length + '장을 올리지 못했습니다. 사진을 빼거나 다시 눌러 주세요.', true); return; }
          await confirmItems([item.id], { [item.id]: { ticket: await pre.ticket(), files: done } });
        } finally { confirmBtn.disabled = false; }
      };
      confirmBtn.onclick = confirmOne;
      return h('article', { class: 'card' },
        h('header', { class: 'card-head' }, check,
          h('span', { class: 'tag' }, item.code + ' ' + nameOf(item.code)),
          h('span', { class: 'sub' }, item.dept + ' · ' + item.date + ' · ' + item.author)),
        h('p', { class: 'pre card-issue' }, d.issue),
        facts.length ? h('dl', { class: 'facts' }, facts.map((k) => [h('dt', null, LABELS[k]), h('dd', null, d[k])])) : null,
        photosOf(item, 'issue', item.issuePhotos, item.issueCount),
        photosOf(item, 'counter', item.counterPhotos, item.counterCount),
        form, counter.el,
        h('div', { class: 'row-btns confirm-actions' },
          confirmBtn,
          h('details', { class: 'exclude' }, h('summary', null, '집계 제외'),
            h('div', { class: 'row-btns' }, reason,
              h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
                if (!reason.value.trim()) { UI.toast('집계 제외 사유를 입력해 주세요.', true); return; }
                try { await Api.call('kpiExclude', { id: item.id, reason: reason.value }); UI.toast('집계에서 제외했습니다.'); App.refreshInit(); load(); }
                catch (e) { UI.toast(e.message, true); }
              } }, '제외하기')))));
    }

    function load() {
      Api.call('kpiPending').then((data) => {
        if (!alive()) return;
        selected.clear();
        drawBar();
        list.replaceChildren(...(data.items.length ? data.items.map(card) : [UI.empty('확인할 건이 없습니다.', 'done')]));
      }, (e) => { if (alive()) list.replaceChildren(UI.error(e.message, load)); });
    }
    app.replaceChildren(UI.hero('확인 대기', '확인한 건만 월 실적에 반영됩니다.'), h('section', { class: 'section' }, list), bar);
    load();
  });

})();
