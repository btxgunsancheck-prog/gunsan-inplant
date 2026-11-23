/* 공수 현황(2026-11-23). 엑셀 '물류공수 종합'과 같은 표와 계산.
   보기: 사원 외 직급(관리자 전부). 수정: 공수 관리 권한(MANHOUR_EDIT). 계산은 js/lib/manhour.js(서버와 같은 식). */
(() => {
  const f2 = (v) => MH.fmt(v, 2);
  const blank = (v) => v === '' || v === null || v === undefined;
  const diff = (a, b) => (blank(a) && blank(b) ? '' : (Number(a) || 0) - (Number(b) || 0));
  const tone = (v) => (blank(v) || Math.abs(v) < 0.005 ? '' : v < 0 ? 'bad' : '');
  const canEdit = () => UI.has('MANHOUR_EDIT') && !UI.has('VIEW_EXEC');
  const deny = (app) => app.replaceChildren(UI.placeholder('권한이 없습니다', '공수 현황은 관리자(사원 외 직급)만 볼 수 있습니다.'));
  const ymLabel = (ym) => (ym ? ym.slice(0, 4) + '년 ' + Number(ym.slice(5, 7)) + '월' : '');
  const shiftYm = (ym, k) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + k, 1)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); };

  /* ---------- 종합 ---------- */
  Router.add('/manhour', (params, app, alive) => {
    if (!App.home.mhView) { deny(app); return; }
    const body = h('div', { class: 'wrap wide' }, UI.skeleton(10));
    app.replaceChildren(UI.hero('공수 현황', '생산 CAPA 기준 업무별 산출 공수와 계약·현재 인원을 비교합니다.'), h('section', { class: 'section' }, body));
    const load = () => Api.call('mhGet').then((d) => { if (alive()) draw(d); }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });

    function capaBox(d) {
      const c = d.capa;
      const vals = h('div', { class: 'mh-capa-vals' }, MH.MODELS.map((m) => h('div', null, h('span', { class: 'sub' }, m), h('strong', null, c ? f2(c[m]) : '-'))));
      const head = h('p', { class: 'sub' }, c ? '적용 CAPA: ' + ymLabel(c.ym) + (c.date ? ' (기준일 ' + c.date + ')' : '') + (c.ym !== d.thisMonth ? ' · 이번 달 값이 없어 이 값을 씁니다' : '') : '아직 입력한 CAPA가 없습니다.');
      const box = h('div', { class: 'panel mh-capa' }, h('div', { class: 'mh-capa-head' }, h('h2', { class: 'block-h' }, '일생산 CAPA (대/일)'), head), vals);
      if (canEdit()) {
        if (!d.capaDone) box.append(h('p', { class: 'work-note' }, ymLabel(d.thisMonth) + ' CAPA를 아직 넣지 않았습니다. 매월 1일에 넣어 주세요.'));
        const ym = h('select', { 'aria-label': '대상월' }, [-1, 0, 1].map((k) => { const v = shiftYm(d.thisMonth, k); return h('option', { value: v, selected: k === 0 }, ymLabel(v)); }));
        const date = h('input', { type: 'date', value: (App.home.today || ''), 'aria-label': '기준일' });
        const ins = {};
        MH.MODELS.forEach((m) => { ins[m] = h('input', { type: 'number', step: '0.01', min: '0', max: '100', inputmode: 'decimal', value: c ? c[m] : '', 'aria-label': m + ' CAPA' }); });
        const btn = h('button', { class: 'btn', type: 'submit' }, '저장');
        const form = h('form', { class: 'mh-capa-form', onsubmit: async (e) => {
          e.preventDefault();
          if (MH.MODELS.some((m) => ins[m].value === '')) { UI.toast('기종 4개 CAPA를 모두 넣어 주세요.', true); return; }
          btn.disabled = true;
          try {
            await Api.call('mhCapaSave', Object.assign({ ym: ym.value, date: date.value }, ...MH.MODELS.map((m) => ({ [m]: Number(ins[m].value) }))));
            UI.toast(ymLabel(ym.value) + ' CAPA를 저장했습니다. 모든 업무 공수를 다시 계산했습니다.');
            App.refreshInit();
            load();
          } catch (err) { UI.toast(err.message, true); btn.disabled = false; }
        } }, h('div', { class: 'mh-capa-row' }, UI.field('대상월', ym), UI.field('기준일', date)),
          h('div', { class: 'mh-capa-row' }, MH.MODELS.map((m) => UI.field(m, ins[m]))), btn);
        box.append(h('details', { class: 'config', open: !d.capaDone }, h('summary', null, 'CAPA 입력·수정'), form));
      }
      return box;
    }

    function table(d) {
      const s = d.summary;
      const head = h('thead', null, h('tr', null, ['직', '업무', '상세업무', '구분', '계약 인원', '현재 인원', '산출 공수', '계약↔현재', '현재↔공수', '비고'].map((x, i) => h('th', { class: i >= 4 && i <= 8 ? 'num' : '' }, x))));
      const rows = [];
      s.groups.forEach((g) => {
        g.rows.forEach((r, i) => {
          const a = diff(r.contract, r.current), b = diff(r.current, r.mh);
          rows.push(h('tr', { onclick: () => { location.hash = '#/manhour/task/' + r.id; } },
            i === 0 ? h('th', { class: 'mh-group', rowspan: String(g.rows.length + 1), scope: 'rowgroup' }, g.name) : null,
            h('td', null, r.task), h('td', { class: 'mh-detail' }, r.detail), h('td', null, r.kind),
            h('td', { class: 'num' }, f2(r.contract)), h('td', { class: 'num' }, f2(r.current)),
            h('td', { class: 'num' }, f2(r.mh), r.mode === 'STS' ? h('span', { class: 'chip mini mh-sts', title: 'STS 단위작업 ' + r.stsCount + '줄로 계산' }, 'STS') : null),
            h('td', { class: 'num ' + tone(a) }, f2(a)), h('td', { class: 'num ' + tone(b) }, f2(b)), h('td', { class: 'mh-note' }, r.note)));
        });
        rows.push(h('tr', { class: 'mh-sub' }, h('td', { colspan: '3' }, '소계'), h('td', { class: 'num' }, f2(g.contract)), h('td', { class: 'num' }, f2(g.current)),
          h('td', { class: 'num' }, f2(g.mh)), h('td', { class: 'num' }, f2(g.contract - g.current)), h('td', { class: 'num' }, f2(g.current - g.mh)),
          h('td', null, g.eff === null ? '' : '효율 ' + Math.round(g.eff * 100) + '%')));
      });
      const t = s.total;
      rows.push(h('tr', { class: 'mh-total' }, h('td', { colspan: '4' }, '합계'), h('td', { class: 'num' }, f2(t.contract)), h('td', { class: 'num' }, f2(t.current)),
        h('td', { class: 'num' }, f2(t.mh)), h('td', { class: 'num' }, f2(t.contract - t.current)), h('td', { class: 'num' }, f2(t.current - t.mh)),
        h('td', null, t.eff === null ? '' : '효율 ' + Math.round(t.eff * 100) + '% (직별 평균)')));
      return h('div', { class: 'table-wrap mh-table-wrap' }, h('table', { class: 'data click mh-table' }, head, h('tbody', null, rows)));
    }

    function history(d) {
      if (!d.history.length) return null;
      return h('div', { class: 'panel' }, UI.cardHead('calendar', '월별 기록'),
        h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, ['연월', '기준일', 'E1', 'E2', 'L1', 'D1', '계약', '현재', '산출 공수', '효율'].map((x, i) => h('th', { class: i >= 2 ? 'num' : '' }, x)))),
          h('tbody', null, d.history.map((x) => h('tr', null, h('td', null, ymLabel(x.ym)), h('td', null, x.date),
            MH.MODELS.map((m) => h('td', { class: 'num' }, f2(x[m]))),
            h('td', { class: 'num' }, x.snap ? f2(x.snap.total.contract) : ''), h('td', { class: 'num' }, x.snap ? f2(x.snap.total.current) : ''),
            h('td', { class: 'num' }, x.snap ? f2(x.snap.total.mh) : ''), h('td', { class: 'num' }, x.snap && x.snap.total.eff !== null ? Math.round(x.snap.total.eff * 100) + '%' : '')))))),
        h('p', { class: 'sub' }, '이번 달 기록은 CAPA·업무·STS를 고칠 때마다 지금 값으로 바뀝니다. 지난달은 그 달 마지막 값으로 남습니다.'));
    }

    function hiddenBox(d) {
      if (!d.hidden.length) return null;
      return h('details', { class: 'config' }, h('summary', null, '숨긴 업무 ' + d.hidden.length + '개'),
        h('ul', { class: 'mh-hidden' }, d.hidden.map((x) => h('li', null, h('span', null, x.group + ' · ' + x.task + (x.detail ? ' (' + x.detail + ')' : '')),
          h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
            try { await Api.call('mhTaskUse', { id: x.id, use: true }); UI.toast('되살렸습니다.'); load(); } catch (e) { UI.toast(e.message, true); }
          } }, '되살리기')))));
    }

    function draw(d) {
      const t = d.summary.total;
      const card = (label, value, sub) => h('div', { class: 'stat plain' }, h('div', null, h('p', null, label), h('strong', null, value), sub ? h('span', { class: 'sub' }, sub) : null));
      fill(body,
        h('p', { class: 'pc-notice m-only', role: 'note' }, '표가 넓어 PC에서 보시는 것이 편합니다. 휴대폰에서는 표를 옆으로 밀어 보세요.'),
        capaBox(d),
        h('div', { class: 'stat-grid mh-stats' }, card('계약 인원', f2(t.contract) + '명'), card('현재 인원', f2(t.current) + '명', '계약 대비 ' + f2(t.contract - t.current) + '명'),
          card('산출 공수', f2(t.mh), '현재 대비 ' + f2(t.current - t.mh)), card('효율', t.eff === null ? '-' : Math.round(t.eff * 100) + '%', '산출÷현재, 직별 평균')),
        canEdit() ? h('div', { class: 'toolbar wrap-row' },
          h('a', { class: 'btn', href: '#/manhour/task/new' }, '업무 추가'),
          h('a', { class: 'btn ghost', href: '#/manhour/upload' }, '엑셀 통째로 올리기')) : null,
        d.summary.groups.length ? table(d) : UI.empty(canEdit() ? '등록된 업무가 없습니다. 엑셀을 올리거나 업무를 추가해 주세요.' : '등록된 업무가 없습니다.', 'data'),
        h('p', { class: 'sub' }, '줄을 누르면 업무의 STS(단위작업)를 볼 수 있습니다. 빨간 숫자는 모자라거나 넘치는 쪽(음수)입니다.'),
        canEdit() ? hiddenBox(d) : null,
        history(d));
    }
    load();
  });

  /* ---------- 업무 상세(STS) ---------- */
  Router.add('/manhour/task/:id', (params, app, alive) => {
    if (!App.home.mhView) { deny(app); return; }
    app.replaceChildren(UI.skeleton(10));
    const load = () => Api.call('mhTask', { id: params.id }).then((d) => {
      if (!alive()) return;
      const t = d.task;
      const capa = d.capa || {};
      const info = (k, v) => (blank(v) ? null : h('div', null, h('dt', null, k), h('dd', null, String(v))));
      const stsTable = t.mode === 'STS' ? h('div', { class: 'table-wrap' }, h('table', { class: 'data mh-sts-table' },
        h('thead', null, h('tr', null, ['NO.', '단위작업', '적용 기종', '빈도', '편도(m)', '왕복(m)', '이동시간(분)', '작업시간(분)', '소계(분)'].map((x, i) => h('th', { class: i >= 3 ? 'num' : '' }, x)))),
        h('tbody', null, d.rows.map((r, i) => h('tr', null, h('td', null, String(i + 1)), h('td', { class: 'mh-detail' }, r.name, r.timeNote ? h('span', { class: 'sub mh-formula' }, '작업시간 산식 ' + r.timeNote) : null),
          h('td', null, String(r.models).replace(/,/g, '+')), h('td', { class: 'num' }, f2(r.freq)), h('td', { class: 'num' }, f2(r.dist)), h('td', { class: 'num' }, f2(r.dist * 2)),
          h('td', { class: 'num' }, f2(MH.moveMin(r, t))), h('td', { class: 'num' }, f2(r.time)), h('td', { class: 'num' }, f2(MH.rowMin(r, capa, t)))))),
        h('tfoot', null, h('tr', { class: 'mh-sub' }, h('td', { colspan: '8' }, 'TOTAL(분)'), h('td', { class: 'num' }, f2(d.calc.total))),
          h('tr', { class: 'mh-total' }, h('td', { colspan: '8' }, '공수(M/H) = TOTAL ÷ 근무시간 ' + t.work + '분'), h('td', { class: 'num' }, MH.fmt(d.calc.mh, 3)))))) : null;
      app.replaceChildren(UI.hero(t.task, t.detail), h('section', { class: 'section' }, h('div', { class: 'wrap wide' },
        h('a', { class: 'back', href: '#/manhour' }, '공수 현황'),
        h('dl', { class: 'mh-info' }, info('직', t.group), info('구분', t.kind), info('계약 인원', t.contract), info('현재 인원', t.current),
          info('산출 공수', MH.fmt(d.calc.mh, 3) + (t.mode === 'STS' ? ' (STS 계산)' : ' (고정값)')), info('비고', t.note),
          t.mode === 'STS' ? [info('STS', t.sheet), info('담당/공정', t.owner), info('문서 번호', t.docNo), info('근무시간', t.work + '분'), info('이동속도', t.speed + 'km/h'), info('여유율', t.allow)] : null,
          info('적용 CAPA', d.capa ? ymLabel(d.capa.ym) + ' · ' + MH.MODELS.map((m) => m + ' ' + f2(capa[m])).join(', ') : '없음'),
          info('마지막 수정', t.at ? t.at + ' ' + t.by : '')),
        d.canEdit ? h('div', { class: 'row-btns' }, h('a', { class: 'btn', href: '#/manhour/task/' + t.id + '/edit' }, '수정'),
          h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
            if (!confirm('"' + t.task + '" 업무를 숨길까요? 종합표와 합계에서 빠지고, 공수 현황 아래 "숨긴 업무"에서 되살릴 수 있습니다.')) return;
            try { await Api.call('mhTaskUse', { id: t.id, use: false }); UI.toast('숨겼습니다.'); Router.go('/manhour'); } catch (e) { UI.toast(e.message, true); }
          } }, '숨기기')) : null,
        t.mode === 'STS' ? [h('h2', { class: 'block-h' }, '단위작업 (STS)'), d.rows.length ? stsTable : UI.empty('단위작업이 없습니다.', 'data', true),
          h('p', { class: 'sub' }, '소계 = 적용 기종 CAPA 합 × 빈도 × (이동시간 + 작업시간) × 여유율 ' + t.allow + '. 이동시간 = 왕복거리 ÷ ' + t.speed + 'km/h. 고정작업은 CAPA 1로 봅니다.')] : null,
        d.rev.length ? [h('h2', { class: 'block-h' }, '개정 이력'), h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, ['NO', '개정일', '개정 내용', '작성'].map((x) => h('th', null, x)))),
          h('tbody', null, d.rev.map((r) => h('tr', null, h('td', null, String(r.no)), h('td', null, r.date), h('td', { class: 'pre' }, r.text), h('td', null, r.by))))))] : null)));
    }, (e) => { if (alive()) app.replaceChildren(UI.error(e.message, load)); });
    load();
  });

  /* ---------- 업무 추가·수정 ---------- */
  async function editView(id, app, alive) {
    if (!App.home.mhView || !canEdit()) { deny(app); return; }
    app.replaceChildren(UI.skeleton(10));
    let d, base;
    try {
      base = await Api.call('mhGet');
      d = id ? await Api.call('mhTask', { id }) : { task: { group: '', task: '', detail: '', kind: '일반', contract: '', current: '', mode: '고정', fixed: '', note: '', sheet: '', owner: '', docNo: '', work: 550, speed: 3, allow: 1.15 }, rows: [], capa: base.capa };
    } catch (e) { if (alive()) app.replaceChildren(UI.error(e.message)); return; }
    if (!alive()) return;
    const t = d.task;
    const capa = d.capa || {};
    const inp = (v, attrs) => h('input', Object.assign({ value: blank(v) ? '' : String(v) }, attrs || {}));
    const numIn = (v, label, step) => inp(v, { type: 'number', step: step || 'any', min: '0', inputmode: 'decimal', 'aria-label': label });
    const groups = h('datalist', { id: 'mh-groups' }, base.groupNames.map((g) => h('option', { value: g })));
    const f = {
      group: inp(t.group, { list: 'mh-groups', required: true, maxlength: 40, placeholder: '예: 물류 1직' }), task: inp(t.task, { required: true, maxlength: 100 }),
      detail: inp(t.detail, { maxlength: 300 }), kind: inp(t.kind, { list: 'mh-kinds', maxlength: 20 }),
      contract: numIn(t.contract, '계약 인원'), current: numIn(t.current, '현재 인원'), note: inp(t.note, { maxlength: 300 }),
      fixed: numIn(t.fixed, '산출 공수'), sheet: inp(t.sheet, { maxlength: 100 }), owner: inp(t.owner, { maxlength: 200 }), docNo: inp(t.docNo, { maxlength: 50 }),
      work: numIn(t.work, '근무시간'), speed: numIn(t.speed, '이동속도'), allow: numIn(t.allow, '여유율', '0.01'), revText: inp('', { maxlength: 200, placeholder: '예: 7번 단위작업 빈도 1 → 2' })
    };
    const mode = h('select', { 'aria-label': '산출 방식' }, h('option', { value: 'STS', selected: t.mode === 'STS' }, 'STS로 계산'), h('option', { value: '고정', selected: t.mode !== 'STS' }, '고정값 직접 입력'));
    /* 단위작업 편집 표 */
    let rows = d.rows.map((r) => Object.assign({}, r));
    let stsTouched = false;
    const rowBody = h('tbody');
    const totalCell = h('strong');
    const recalc = () => {
      const task = { speed: Number(f.speed.value) || 3, allow: Number(f.allow.value) || 1.15, work: Number(f.work.value) || 550, mode: 'STS' };
      const c = MH.calcTask(task, rows, capa);
      rowBody.querySelectorAll('tr').forEach((tr, i) => { const cell = tr.querySelector('.mh-row-min'); if (cell) cell.textContent = f2(MH.rowMin(rows[i], capa, task)); });
      totalCell.textContent = '합계 ' + f2(c.total) + '분 → 공수 ' + MH.fmt(c.mh, 3);
    };
    const drawRows = () => {
      rowBody.replaceChildren(...rows.map((r, i) => {
        const set = (k) => (e) => { r[k] = k === 'name' ? e.target.value : Number(e.target.value); stsTouched = true; recalc(); };
        const models = String(r.models || '').split(',').filter(Boolean);
        const box = (m) => h('label', { class: 'check mh-model' }, h('input', { type: 'checkbox', checked: models.includes(m), onchange: (e) => {
          let cur = String(r.models || '').split(',').filter(Boolean);
          if (e.target.checked) cur = m === MH.FIXED ? [MH.FIXED] : cur.filter((x) => x !== MH.FIXED).concat(m); else cur = cur.filter((x) => x !== m);
          r.models = cur.join(','); stsTouched = true; drawRows(); recalc();
        } }), h('span', null, m));
        return h('tr', null, h('td', null, String(i + 1)),
          h('td', null, h('input', { class: 'cell mh-name', value: r.name || '', maxlength: 200, 'aria-label': (i + 1) + '번 단위작업', oninput: set('name') })),
          h('td', { class: 'mh-models' }, [MH.FIXED].concat(MH.MODELS).map(box)),
          ['freq', 'dist', 'time'].map((k) => h('td', null, h('input', { class: 'cell', type: 'number', step: 'any', min: '0', inputmode: 'decimal', value: blank(r[k]) ? '' : String(r[k]), 'aria-label': (i + 1) + '번 ' + { freq: '빈도', dist: '편도 거리', time: '작업시간' }[k], oninput: set(k) }))),
          h('td', { class: 'num mh-row-min' }),
          h('td', null, h('button', { class: 'link', type: 'button', 'aria-label': (i + 1) + '번 줄 빼기', onclick: () => { rows.splice(i, 1); stsTouched = true; drawRows(); recalc(); } }, '빼기')));
      }));
    };
    drawRows();
    const stsBox = h('div', { class: 'mh-sts-edit' },
      h('h2', { class: 'block-h' }, 'STS (단위작업)'),
      h('div', { class: 'mh-capa-row' }, UI.field('STS 이름', f.sheet), UI.field('담당/공정', f.owner), UI.field('문서 번호', f.docNo)),
      h('div', { class: 'mh-capa-row' }, UI.field('근무시간(분)', f.work), UI.field('이동속도(km/h)', f.speed, '보행 3, 장비 4·5'), UI.field('여유율', f.allow, '예: 1.15, 1.1')),
      h('div', { class: 'table-wrap' }, h('table', { class: 'data mh-edit-table' },
        h('thead', null, h('tr', null, ['NO.', '단위작업', '적용 기종', '빈도', '편도(m)', '작업시간(분)', '소계(분)', ''].map((x) => h('th', null, x)))), rowBody)),
      h('div', { class: 'toolbar wrap-row' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => { rows.push({ name: '', models: 'E1', freq: 1, dist: 0, time: 0 }); stsTouched = true; drawRows(); recalc(); } }, '줄 추가'), totalCell),
      h('p', { class: 'sub' }, '적용 CAPA ' + (d.capa ? ymLabel(d.capa.ym) + ' ' + MH.MODELS.map((m) => m + ' ' + f2(capa[m])).join(', ') : '없음') + ' 기준으로 미리 계산합니다. 고정작업은 CAPA 1로 봅니다.'),
      id ? UI.field('변경 내용 (STS를 고쳤으면 꼭 적어 주세요, 개정 이력에 남습니다)', f.revText) : null);
    [f.speed, f.allow, f.work].forEach((x) => x.addEventListener('input', recalc));
    const fixedBox = UI.field('산출 공수(고정값)', f.fixed, '예: 직장 1, 안전유도 1, 오링피팅 0.11');
    const sync = () => { stsBox.hidden = mode.value !== 'STS'; fixedBox.hidden = mode.value === 'STS'; };
    mode.onchange = sync;
    const btn = h('button', { class: 'btn wide', type: 'submit' }, id ? '저장' : '추가');
    const form = h('form', { class: 'mh-form', onsubmit: async (e) => {
      e.preventDefault();
      if (mode.value === 'STS' && rows.some((r) => !String(r.name || '').trim())) { UI.toast('이름이 빈 단위작업이 있습니다.', true); return; }
      if (id && mode.value === 'STS' && stsTouched && !f.revText.value.trim()) { UI.toast('STS를 고쳤으면 변경 내용을 적어 주세요.', true); f.revText.focus(); return; }
      btn.disabled = true;
      const p = { id: id || null, mode: mode.value };
      ['group', 'task', 'detail', 'kind', 'contract', 'current', 'note', 'fixed', 'sheet', 'owner', 'docNo', 'work', 'speed', 'allow', 'revText'].forEach((k) => { p[k] = f[k].value; });
      if (mode.value === 'STS' && (stsTouched || !id)) p.rows = rows.map((r) => ({ name: r.name, models: r.models, freq: r.freq || 0, dist: r.dist || 0, time: r.time || 0, timeNote: r.timeNote || '', route: r.route || '' }));
      if (!(mode.value === 'STS' && stsTouched)) p.revText = '';
      try {
        const res = await Api.call('mhTaskSave', p);
        UI.toast('저장했습니다.');
        Router.go('/manhour/task/' + res.id);
      } catch (err) { UI.toast(err.message, true); btn.disabled = false; }
    } },
      groups, h('datalist', { id: 'mh-kinds' }, ['일반', '장비'].map((k) => h('option', { value: k }))),
      h('div', { class: 'mh-capa-row' }, UI.field('직(구분)', f.group, '같은 이름끼리 묶여 소계가 나옵니다'), UI.field('업무', f.task), UI.field('구분', f.kind, '일반 또는 장비')),
      UI.field('상세업무', f.detail),
      h('div', { class: 'mh-capa-row' }, UI.field('계약 인원', f.contract), UI.field('현재 인원', f.current), UI.field('산출 방식', mode)),
      fixedBox, UI.field('비고', f.note), stsBox, h('div', { class: 'submit-bar' }, btn));
    sync();
    recalc();
    app.replaceChildren(UI.hero(id ? '업무 수정' : '업무 추가', id ? t.group + ' · ' + t.task : '종합표에 새 업무를 넣습니다. 같은 직의 맨 아래에 들어갑니다.'),
      h('section', { class: 'section' }, h('div', { class: 'wrap wide' }, h('a', { class: 'back', href: id ? '#/manhour/task/' + id : '#/manhour' }, id ? '업무 상세' : '공수 현황'), form)));
  }
  Router.add('/manhour/task/new', (p, app, alive) => editView(null, app, alive));
  Router.add('/manhour/task/:id/edit', (p, app, alive) => editView(p.id, app, alive));

  /* ---------- 엑셀 통째로 올리기 ---------- */
  Router.add('/manhour/upload', (params, app, alive) => {
    if (!App.home.mhView || !canEdit()) { deny(app); return; }
    let parsed = null, fileName = '';
    const fileIn = h('input', { type: 'file', accept: '.xlsx,.xlsm', hidden: true, 'aria-label': '물류공수 종합 엑셀' });
    const status = h('p', { class: 'sub' }, '물류공수 종합 엑셀(종합 시트 + 업무별 STS 시트)을 고르면 내용을 미리 보여 드립니다. 확인 후 올리면 사이트의 공수 내용이 모두 이 엑셀 내용으로 바뀝니다.');
    const preview = h('div');
    const pick = h('button', { class: 'btn', type: 'button', onclick: () => fileIn.click() }, UI.icon('file'), h('span', null, '엑셀 고르기'));
    fileIn.onchange = async () => {
      const file = fileIn.files[0];
      parsed = null;
      preview.replaceChildren();
      if (!file) return;
      fileName = file.name;
      status.textContent = '파일을 읽는 중입니다. 시트가 많아 몇 초 걸릴 수 있습니다.';
      try {
        const [XLSX, data] = await Promise.all([Plan.loadLib(), file.arrayBuffer()]);
        await new Promise((r) => setTimeout(r, 50));
        const p = MH.parse(XLSX, data);
        if (!alive()) return;
        if (p.errors.length) { status.textContent = p.errors.join(' '); return; }
        parsed = p;
        status.textContent = file.name + ' 을(를) 읽었습니다. 아래 내용을 확인해 주세요.';
        drawPreview();
      } catch (e) { status.textContent = e.message || '파일을 읽지 못했습니다.'; }
    };
    function drawPreview() {
      const p = parsed;
      const same = p.fileTotal !== null && Math.abs(p.fileTotal - p.siteTotal) < 0.001;
      const useCapa = h('input', { type: 'checkbox', checked: !!p.capa });
      const ym = (App.home.today || '').slice(0, 7);
      const btn = h('button', { class: 'btn wide', type: 'button', onclick: async () => {
        if (!confirm('지금 사이트의 공수 업무·STS·개정 이력이 모두 이 엑셀 내용으로 바뀝니다. 사이트에서 고친 내용이 있으면 사라집니다. 올릴까요?')) return;
        btn.disabled = true;
        try {
          const r = await Api.call('mhImport', { file: fileName, tasks: MH.payload(p), capa: useCapa.checked && p.capa ? Object.assign({ ym }, p.capa) : null });
          UI.toast('올렸습니다. 업무 ' + r.tasks + '개, 단위작업 ' + r.sts + '줄' + (r.capa ? ', ' + ymLabel(r.capa) + ' CAPA 저장' : '') + '.');
          App.refreshInit();
          Router.go('/manhour');
        } catch (e) { UI.toast(e.message, true); btn.disabled = false; }
      } }, '이 내용으로 올리기');
      fill(preview,
        h('div', { class: 'stat-grid' },
          [['직(구분)', p.groups.length + '개'], ['업무', p.tasks.length + '개'], ['STS 업무', p.stsCount + '개'], ['단위작업', p.rowCount + '줄']].map(([a, b]) => h('div', { class: 'stat plain' }, h('div', null, h('p', null, a), h('strong', null, b))))),
        h('p', { class: same ? 'note' : 'work-note' }, '산출 공수 합계: 엑셀 ' + (p.fileTotal === null ? '-' : MH.fmt(p.fileTotal, 3)) + ' / 사이트 계산 ' + MH.fmt(p.siteTotal, 3) + (same ? ' (일치)' : ' (다름, 아래 내용을 확인해 주세요)')),
        p.mismatch.length ? h('div', { class: 'work-note' }, h('strong', null, '계산이 엑셀과 다른 STS'), h('ul', null, p.mismatch.map((x) => h('li', null, x)))) : null,
        p.warnings.length ? h('details', { class: 'config' }, h('summary', null, '확인할 점 ' + p.warnings.length + '개'), h('ul', null, p.warnings.map((x) => h('li', null, x)))) : null,
        p.capa ? h('label', { class: 'check' }, useCapa, h('span', null, '엑셀의 CAPA(' + MH.MODELS.map((m) => m + ' ' + f2(p.capa[m])).join(', ') + (p.capa.date ? ', 기준일 ' + p.capa.date : '') + ')를 ' + ymLabel(ym) + ' CAPA로 저장')) : h('p', { class: 'sub' }, '엑셀에서 CAPA를 찾지 못했습니다. 올린 뒤 직접 넣어 주세요.'),
        h('div', { class: 'table-wrap' }, h('table', { class: 'data' }, h('thead', null, h('tr', null, ['직', '업무', '상세업무', '계약', '현재', '산출', '방식'].map((x) => h('th', null, x)))),
          h('tbody', null, p.tasks.map((t) => h('tr', null, h('td', null, t.group), h('td', null, t.task), h('td', { class: 'mh-detail' }, t.detail), h('td', { class: 'num' }, f2(t.contract)), h('td', { class: 'num' }, f2(t.current)),
            h('td', { class: 'num' }, MH.fmt(MH.calcTask(t, t.rows, p.capa || {}).mh, 3)), h('td', null, t.mode === 'STS' ? 'STS ' + t.rows.length + '줄' : '고정')))))),
        btn);
    }
    app.replaceChildren(UI.hero('공수 엑셀 올리기', '종합 시트와 업무별 STS 시트를 한 번에 읽어 바꿉니다.'), h('section', { class: 'section' }, h('div', { class: 'wrap wide' },
      h('a', { class: 'back', href: '#/manhour' }, '공수 현황'), h('div', { class: 'plan-pick' }, pick, fileIn), status, preview)));
  });
})();
