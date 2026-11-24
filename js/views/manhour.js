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


  /* ---------- 대시보드(맨 위) ----------
     연도와 항목을 눌러 켜고 끈다(여러 개 동시에). 연도를 안 고르면 연도별 연평균, 한 해 이상 고르면 월별 선.
     항목: 일 생산CAPA, 월 생산량, 운영인원, 계약인원, 계약대비 차이(계약-운영). */
  const ITEMS = [
    { key: 'capa', label: '일 생산CAPA', axis: 'yL', line: '#378ADD', bg: 'rgba(55,138,221,0.10)', txt: '#185FA5', unit: '' },
    { key: 'prod', label: '월 생산량', axis: 'yR', line: '#1D9E75', bg: 'rgba(29,158,117,0.10)', txt: '#0F6E56', unit: '대' },
    { key: 'staff', label: '운영인원', axis: 'yL', line: '#D85A30', bg: 'rgba(216,90,48,0.10)', txt: '#993C1D', unit: '명' },
    { key: 'contract', label: '계약인원', axis: 'yL', line: '#C58A00', bg: 'rgba(197,138,0,0.10)', txt: '#8A6100', unit: '명' },
    { key: 'diff', label: '계약대비 차이', axis: 'yL', line: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', txt: '#5B21B6', unit: '명' }
  ];
  const YEAR_COLORS = ['#378ADD', '#D85A30', '#1D9E75', '#8B5CF6', '#C58A00', '#0E7C86', '#B83280'];
  const YEAR_DASH = [[], [8, 4], [2, 3], [10, 3, 2, 3], [4, 4], [1, 4], [6, 2]];
  const has = (v) => v !== '' && v !== null && v !== undefined;
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const r1 = (v) => (v === null ? null : Math.round(v * 10) / 10);
  const WD_LABEL = (ym) => ym.slice(0, 4) + '년 ' + Number(ym.slice(5)) + '월';
  const fmtVal = (key, v) => (v === null || v === undefined ? '-' : key === 'prod' ? Math.round(v).toLocaleString('ko-KR') : MH.fmt(v, 1));

  function dashboard(d) {
    const rows = d.dash.months.map((m) => {
      const o = { ym: m.ym, y: m.ym.slice(0, 4), m: Number(m.ym.slice(5)) };
      ['capa', 'prod', 'staff', 'contract'].forEach((k) => { o[k] = has(m[k]) ? Number(m[k]) : null; });
      o.diff = o.contract !== null && o.staff !== null ? Math.round((o.contract - o.staff) * 100) / 100 : null;
      return o;
    });
    const years = Array.from(new Set(rows.map((r) => r.y))).sort();
    const sel = { years: [], items: ['capa', 'prod', 'staff', 'contract'] };
    const byYear = (y) => rows.filter((r) => r.y === y);
    const yearAvg = (y, k) => { const v = byYear(y).map((r) => r[k]).filter((x) => x !== null); return v.length ? mean(v) : null; };
    let chart = null;
    const cards = h('div', { class: 'mhd-cards' });
    const yearBar = h('div', { class: 'mhd-row' });
    const itemBar = h('div', { class: 'mhd-row' });
    const title = h('span', { class: 'mhd-title' });
    const legend = h('div', { class: 'mhd-legend' });
    const canvas = h('canvas', { role: 'img', 'aria-label': '공수 현황 그래프' });
    const tableBox = h('div');
    const focusYear = () => (sel.years.length ? sel.years[sel.years.length - 1] : (years[years.length - 1] || ''));

    function drawCards() {
      const y = focusYear();
      const sub = y ? y + '년 월평균' : '';
      cards.replaceChildren(...ITEMS.map((it) => {
        const v = y ? (it.key === 'prod' ? yearAvg(y, 'prod') : yearAvg(y, it.key)) : null;
        const shown = v === null ? '-' : (it.key === 'diff' && v > 0 ? '+' : '') + fmtVal(it.key, v) + it.unit;
        return h('button', { type: 'button', class: 'mhd-card' + (sel.items.includes(it.key) ? ' on' : ''), 'aria-pressed': String(sel.items.includes(it.key)),
          onclick: () => toggleItem(it.key) },
          h('span', { class: 'mhd-accent', style: 'background:' + it.line }), h('span', { class: 'mhd-label' }, it.label),
          h('strong', { style: 'color:' + it.txt }, shown), h('span', { class: 'sub' }, sub));
      }));
    }
    function drawBars() {
      yearBar.replaceChildren(h('span', { class: 'mhd-ctrl' }, '연도'),
        h('button', { type: 'button', class: 'mhd-pill' + (!sel.years.length ? ' on' : ''), 'aria-pressed': String(!sel.years.length), onclick: () => { sel.years = []; render(); } }, '전체'),
        ...years.map((y) => h('button', { type: 'button', class: 'mhd-pill' + (sel.years.includes(y) ? ' on' : ''), 'aria-pressed': String(sel.years.includes(y)), onclick: () => toggleYear(y) }, y)));
      itemBar.replaceChildren(h('span', { class: 'mhd-ctrl' }, '항목'),
        ...ITEMS.map((it) => h('button', { type: 'button', class: 'mhd-pill item' + (sel.items.includes(it.key) ? ' on' : ''), 'aria-pressed': String(sel.items.includes(it.key)), onclick: () => toggleItem(it.key),
          style: sel.items.includes(it.key) ? 'background:' + it.line + ';border-color:' + it.line : '' }, it.label)));
    }
    function toggleYear(y) {
      sel.years = sel.years.includes(y) ? sel.years.filter((x) => x !== y) : sel.years.concat(y).sort();
      render();
    }
    function toggleItem(k) {
      if (sel.items.includes(k)) { if (sel.items.length === 1) { UI.toast('항목은 하나 이상 켜 두어야 합니다.'); return; } sel.items = sel.items.filter((x) => x !== k); }
      else sel.items = sel.items.concat(k);
      render();
    }

    function datasets() {
      const items = ITEMS.filter((it) => sel.items.includes(it.key));
      const sets = [];
      if (!sel.years.length) {
        const labels = years.map((y) => y + '년');
        items.forEach((it) => sets.push(mk(it, it.label, years.map((y) => r1(yearAvg(y, it.key)) === null ? null : (it.key === 'prod' ? Math.round(yearAvg(y, it.key)) : r1(yearAvg(y, it.key)))), it.line, it.key === 'staff' ? [6, 3] : [])));
        return { labels, sets, title: years.length ? '연도별 월평균 추이 (' + years[0] + '–' + years[years.length - 1] + ')' : '연도별 추이' };
      }
      const labels = Array.from({ length: 12 }, (_, i) => (i + 1) + '월');
      sel.years.forEach((y, yi) => items.forEach((it) => {
        const data = labels.map((_, i) => { const r = rows.find((x) => x.y === y && x.m === i + 1); return r ? r[it.key] : null; });
        const color = items.length === 1 ? YEAR_COLORS[years.indexOf(y) % YEAR_COLORS.length] : it.line;
        const dash = sel.years.length > 1 ? YEAR_DASH[yi % YEAR_DASH.length] : (it.key === 'staff' ? [6, 3] : []);
        sets.push(mk(it, (sel.years.length > 1 ? y + ' ' : '') + it.label, data, color, dash));
      }));
      return { labels, sets, title: sel.years.length === 1 ? sel.years[0] + '년 월별 상세' : sel.years.join('·') + '년 월별 비교' };
    }
    function mk(it, label, data, color, dash) {
      return { label, data, borderColor: color, backgroundColor: it.bg, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 7, tension: 0.35, fill: false, yAxisID: it.axis, borderDash: dash, spanGaps: false, itemKey: it.key };
    }
    function drawLegend(sets) {
      legend.replaceChildren(...sets.map((s) => h('span', { class: 'mhd-leg' },
        h('span', { class: 'mhd-sq', style: s.borderDash && s.borderDash.length ? 'border-top:2.5px dashed ' + s.borderColor : 'background:' + s.borderColor }),
        s.label + (s.yAxisID === 'yR' ? ' (우축)' : ' (좌축)'))));
    }
    function drawTable() {
      const list = sel.years.length ? rows.filter((r) => sel.years.includes(r.y)) : rows.slice(-12);
      if (!list.length) { tableBox.replaceChildren(); return; }
      tableBox.replaceChildren(h('details', { class: 'config' }, h('summary', null, sel.years.length ? '월별 숫자 보기' : '최근 12개월 숫자 보기'),
        h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, ['연월', '일 생산CAPA', '월 생산량', '운영인원', '계약인원', '계약대비 차이'].map((x, i) => h('th', { class: i ? 'num' : '' }, x)))),
          h('tbody', null, list.map((r) => h('tr', null, h('td', null, WD_LABEL(r.ym)),
            ['capa', 'prod', 'staff', 'contract', 'diff'].map((k) => h('td', { class: 'num' + (k === 'diff' && r.diff !== null && r.diff < 0 ? ' bad' : '') }, r[k] === null ? '-' : (k === 'diff' && r.diff > 0 ? '+' : '') + fmtVal(k, r[k]))))))))));
    }
    function render() {
      drawCards();
      drawBars();
      const ds = datasets();
      title.textContent = ds.title;
      drawLegend(ds.sets);
      drawTable();
      const useR = ds.sets.some((s) => s.yAxisID === 'yR'), useL = ds.sets.some((s) => s.yAxisID === 'yL');
      const build = () => {
        if (!canvas.isConnected) return;
        if (chart) chart.destroy();
        chart = new window.Chart(canvas.getContext('2d'), { type: 'line', data: { labels: ds.labels, datasets: ds.sets }, options: {
          responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(255,255,255,0.97)', borderColor: 'rgba(0,0,0,0.1)', borderWidth: 1, titleColor: '#333', bodyColor: '#555', padding: 10,
            callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + (c.parsed.y === null ? '-' : fmtVal(c.dataset.itemKey, c.parsed.y)) } } },
          scales: {
            x: { ticks: { font: { size: 13 }, autoSkip: false, maxRotation: 45, color: '#888' }, grid: { color: 'rgba(0,0,0,0.05)' } },
            yL: { display: useL, position: 'left', title: { display: true, text: 'CAPA / 인원', color: '#888' }, ticks: { color: '#888' }, grid: { color: 'rgba(0,0,0,0.05)' } },
            yR: { display: useR, position: 'right', title: { display: true, text: '월 생산량(대)', color: '#888' }, ticks: { color: '#888' }, grid: { drawOnChartArea: false } }
          } } });
      };
      if (window.Chart) build();
      else if (!render.loading) {
        render.loading = true;
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
        s.onload = () => { render.loading = false; build(); };
        document.head.append(s);
      }
    }
    const now = d.dash.now;
    const note = !d.dash.tableReady
      ? h('p', { class: 'work-note' }, '계약 인원표가 아직 없습니다.' + (d.canEdit ? ' 아래 "월별 기록·계약 인원 관리"에서 엑셀을 올리면 생산계획을 올릴 때 계약 인원이 자동으로 채워집니다.' : ' 공수 관리 권한자가 올리면 계약 인원이 표시됩니다.'))
      : (now ? h('p', { class: 'note' }, '계약 인원: ' + WD_LABEL(now.ym) + ' 생산계획 ' + now.prod + '대 → ' + now.label + ' 구간 ' + MH.fmt(now.total, 1) + '명 (' + Object.keys(now.groups).map((g) => g + ' ' + MH.fmt(now.groups[g], 1)).join(', ') + ')' + (now.below ? ' · 첫 구간보다 적어 첫 구간 기준' : '')) : null);
    const el = h('section', { class: 'mhd' },
      h('div', { class: 'mhd-head' }, h('h2', { class: 'mhd-main' }, '군산 사내물류팀 물동량 대비 인력 운영현황'), h('span', { class: 'sub' }, '연도·항목을 눌러 켜고 끄면 그래프가 바뀝니다. 여러 개를 함께 켤 수 있습니다.')),
      cards, h('div', { class: 'mhd-ctrls' }, yearBar, itemBar), note,
      h('div', { class: 'mhd-chart-head' }, title, legend), h('div', { class: 'mhd-chart' }, canvas), tableBox);
    if (!rows.length) el.append(h('p', { class: 'sub' }, '월별 기록이 아직 없습니다. 생산계획을 올리거나 월 CAPA를 저장하면 쌓이기 시작합니다.' + (d.canEdit ? ' 지난 실적은 "월별 기록·계약 인원 관리"에서 한 번에 올릴 수 있습니다.' : '')));
    render();
    return el;
  }

  /* 월별 기록·계약 인원 관리(공수 관리 권한자) */
  function adminBox(d, reload) {
    const parseFile = async (file, fn) => { const [X, data] = await Promise.all([Plan.loadLib(), file.arrayBuffer()]); return fn(X, data); };
    /* 1) 계약 인원표 */
    const cFile = h('input', { type: 'file', accept: '.xlsx,.xlsm,.xls', 'aria-label': '월 생산대수별 계약 인원 엑셀' });
    const cMsg = h('div');
    cFile.onchange = async () => {
      cMsg.replaceChildren();
      const f = cFile.files[0];
      if (!f) return;
      cMsg.append(h('p', { class: 'sub' }, '파일을 읽는 중입니다.'));
      try {
        const p = await parseFile(f, MH.parseContract);
        if (p.errors.length) { cMsg.replaceChildren(h('p', { class: 'form-error' }, p.errors.join(' '))); return; }
        const btn = h('button', { class: 'btn', type: 'button', onclick: async () => {
          if (!confirm('지금 사이트의 계약 인원표가 이 엑셀 내용으로 바뀝니다. 올릴까요?')) return;
          btn.disabled = true;
          try {
            const r = await Api.call('mhContractImport', { file: f.name, brackets: p.brackets, groups: p.groups });
            UI.toast('계약 인원표를 올렸습니다(구간 ' + r.brackets + '개, 직 ' + r.groups + '개)' + (r.filled ? '. 계약 인원이 비어 있던 ' + r.filled + '개월을 채웠습니다.' : '.'));
            reload();
          } catch (e) { UI.toast(e.message, true); btn.disabled = false; }
        } }, '이 계약 인원표로 올리기');
        cMsg.replaceChildren(
          h('p', { class: p.same ? 'note' : 'work-note' }, '시트 "' + p.sheet + '" 에서 구간 ' + p.brackets.length + '개, 직 ' + p.groups.length + '개를 읽었습니다.' + (p.fileTotals ? (p.same ? ' 엑셀 총계와 일치합니다.' : ' 엑셀 총계와 다른 구간이 있습니다. 확인해 주세요.') : '')),
          h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
            h('thead', null, h('tr', null, [h('th', null, '직')].concat(p.brackets.map((l, k) => h('th', { class: 'num' }, l + (k === p.brackets.length - 1 ? '대~' : '대~' + (p.brackets[k + 1] - 1))))))),
            h('tbody', null, p.groups.map((g) => h('tr', null, h('td', null, g.name), g.values.map((v) => h('td', { class: 'num' }, MH.fmt(v, 2))))),
              h('tr', { class: 'mh-total' }, h('td', null, '합계'), p.sums.map((v) => h('td', { class: 'num' }, MH.fmt(v, 2))))))), btn);
      } catch (e) { cMsg.replaceChildren(h('p', { class: 'form-error' }, e.message || '파일을 읽지 못했습니다.')); }
    };
    /* 2) 지난 월별 기록 CSV */
    const hFile = h('input', { type: 'file', accept: '.csv,.txt', 'aria-label': '월별 기록 CSV' });
    const hMsg = h('div');
    hFile.onchange = async () => {
      hMsg.replaceChildren();
      const f = hFile.files[0];
      if (!f) return;
      try {
        const p = MH.parseMonthCsv(await f.text());
        if (p.errors.length && !(p.rows || []).length) { hMsg.replaceChildren(h('p', { class: 'form-error' }, p.errors.join(' '))); return; }
        const btn = h('button', { class: 'btn', type: 'button', disabled: p.errors.length > 0, onclick: async () => {
          btn.disabled = true;
          try {
            const r = await Api.call('mhMonthImport', { file: f.name, rows: p.rows });
            UI.toast(r.months + '개월을 올렸습니다' + (r.filled ? '. 계약인원이 비어 있던 ' + r.filled + '개월은 계약 인원표로 채웠습니다.' : '.'));
            reload();
          } catch (e) { UI.toast(e.message, true); btn.disabled = false; }
        } }, p.rows.length + '개월 올리기');
        hMsg.replaceChildren(p.errors.length ? h('div', { class: 'form-error' }, h('p', null, '고쳐야 할 줄이 있습니다.'), h('ul', null, p.errors.slice(0, 8).map((x) => h('li', null, x)))) : h('p', { class: 'note' }, p.rows.length + '개월(' + p.rows[0].ym + ' ~ ' + p.rows[p.rows.length - 1].ym + ')을 읽었습니다. 빈칸은 기존 값을 그대로 둡니다. 계약인원이 비어 있고 월 생산량이 있으면 계약 인원표 구간으로 채웁니다.'), btn);
      } catch (e) { hMsg.replaceChildren(h('p', { class: 'form-error' }, e.message || '파일을 읽지 못했습니다.')); }
    };
    const sample = h('button', { class: 'btn ghost', type: 'button', onclick: () => UI.saveBytes([new TextEncoder().encode(MH.MONTH_CSV_SAMPLE)], '공수_월별기록_양식.csv', 'text/csv;charset=utf-8') }, '양식(CSV) 내려받기');
    /* 3) 한 달 직접 입력 */
    const f = {};
    const ymIn = h('input', { type: 'month', value: d.thisMonth, 'aria-label': '연월' });
    [['capa', '일 생산CAPA'], ['prod', '월 생산량(대)'], ['staff', '운영인원(명)'], ['contract', '계약인원(명)']].forEach(([k, label]) => { f[k] = h('input', { type: 'number', step: 'any', min: '0', inputmode: 'decimal', 'aria-label': label }); });
    const one = h('form', { class: 'mh-capa-form', onsubmit: async (e) => {
      e.preventDefault();
      const row = { ym: ymIn.value };
      ['capa', 'prod', 'staff', 'contract'].forEach((k) => { row[k] = f[k].value; });
      if (!row.ym || !['capa', 'prod', 'staff', 'contract'].some((k) => row[k] !== '')) { UI.toast('연월과 넣을 값을 하나 이상 입력해 주세요.', true); return; }
      try { await Api.call('mhMonthImport', { rows: [row] }); UI.toast(row.ym + ' 기록을 저장했습니다.'); reload(); } catch (err) { UI.toast(err.message, true); }
    } }, h('div', { class: 'mh-capa-row' }, UI.field('연월', ymIn), UI.field('일 생산CAPA', f.capa), UI.field('월 생산량(대)', f.prod), UI.field('운영인원(명)', f.staff), UI.field('계약인원(명)', f.contract)),
      h('p', { class: 'sub' }, '빈칸은 그대로 둡니다. 월 생산량·계약인원은 생산계획을 올리면 자동으로 채워지고, 이번 달 운영인원은 사용 중인 직원 수로 자동 갱신됩니다(사용자 등록·사용 중지 때 바로 반영).'),
      h('button', { class: 'btn', type: 'submit' }, '저장'));
    return h('details', { class: 'config mh-admin', open: !d.dash.tableReady || !d.dash.months.length },
      h('summary', null, '월별 기록·계약 인원 관리'),
      h('h3', { class: 'block-h' }, '1. 계약 인원표 (월 생산대수 구간별)'),
      h('p', { class: 'sub' }, '"월 생산대수별 계약 인원" 엑셀의 사내물류팀 시트를 올립니다. 생산계획을 올릴 때 그 달 생산량에 맞는 구간의 인원이 계약인원으로 들어갑니다.' + (d.dash.tableReady ? ' 지금 ' + d.dash.brackets.length + '개 구간이 등록되어 있습니다.' : '')),
      h('div', { class: 'toolbar wrap-row' }, cFile, h('span', { class: 'sub' }, '파일을 끌어다 놓아도 됩니다')), cMsg,
      h('h3', { class: 'block-h' }, '2. 지난 월별 기록 올리기'),
      h('p', { class: 'sub' }, '연월, 일CAPA, 월생산량, 운영인원, 계약인원 순서의 CSV(엑셀 복사본)를 올립니다. 그래프의 예전 연도 자료가 됩니다.'),
      h('div', { class: 'toolbar wrap-row' }, hFile, sample, h('span', { class: 'sub' }, '파일을 끌어다 놓아도 됩니다')), hMsg,
      h('h3', { class: 'block-h' }, '3. 한 달 직접 입력·수정'), one);
  }

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
        const capaTotal = h('input', { type: 'number', step: 'any', min: '0', max: '200', inputmode: 'decimal', 'aria-label': '일 생산 CAPA 전체', placeholder: '비우면 4개 합계', value: (d.dash.months.find((m) => m.ym === d.thisMonth) || {}).capa || '' });
        MH.MODELS.forEach((m) => { ins[m] = h('input', { type: 'number', step: '0.01', min: '0', max: '100', inputmode: 'decimal', value: c ? c[m] : '', 'aria-label': m + ' CAPA' }); });
        const btn = h('button', { class: 'btn', type: 'submit' }, '저장');
        const form = h('form', { class: 'mh-capa-form', onsubmit: async (e) => {
          e.preventDefault();
          if (MH.MODELS.some((m) => ins[m].value === '')) { UI.toast('기종 4개 CAPA를 모두 넣어 주세요.', true); return; }
          btn.disabled = true;
          try {
            await Api.call('mhCapaSave', Object.assign({ ym: ym.value, date: date.value, capaTotal: capaTotal.value }, ...MH.MODELS.map((m) => ({ [m]: Number(ins[m].value) }))));
            UI.toast(ymLabel(ym.value) + ' CAPA를 저장했습니다. 모든 업무 공수를 다시 계산했습니다.');
            App.refreshInit();
            load();
          } catch (err) { UI.toast(err.message, true); btn.disabled = false; }
        } }, h('div', { class: 'mh-capa-row' }, UI.field('대상월', ym), UI.field('기준일', date)),
          h('div', { class: 'mh-capa-row' }, MH.MODELS.map((m) => UI.field(m, ins[m]))),
          UI.field('일 생산 CAPA (대시보드용, 대/일)', capaTotal, '그래프의 "일 생산CAPA"입니다. 비워 두면 위 4개 기종 합계를 씁니다.'), btn);
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
        dashboard(d),
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
        history(d),
        canEdit() ? adminBox(d, load) : null);
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
    const status = h('p', { class: 'sub' }, '물류공수 종합 엑셀(종합 시트 + 업무별 STS 시트)을 고르거나 이 화면에 끌어다 놓으면 내용을 미리 보여 드립니다. 확인 후 올리면 사이트의 공수 내용이 모두 이 엑셀 내용으로 바뀝니다.');
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
