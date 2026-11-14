/* KPI 현황: 직별 화면, 지표 상세, 팀 전체 현황, 미팅용 보기. 차트 수치는 집계 결과만 쓴다. */
const KpiData = (() => {
  const CHART_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  const DEPTS = ['물류1직', '물류2직', '물류3직', '물류4직'];
  const TEAM = '팀';
  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const SUM = new Set(['S1', 'S1_사고', 'S1_아차', 'S2', 'Q2', 'Q3_개선', 'Q3_보수', 'D1', 'D2', 'C1_팔레트', 'C1_Lay-out', 'C1_운영']);
  const PCT = new Set(['P1', 'P3', 'C2_품목', 'C2_금액']);
  const JUDGE = { G: ['달성', 'good'], Y: ['주의', 'warn'], R: ['미달', 'bad'] };
  const COLORS = ['#0B2282', '#E0651E', '#0F9D8A', '#9A5BC4'];
  const DEPT_COLORS = { 물류1직: '#2F5BD0', 물류2직: '#E0651E', 물류3직: '#0F9D8A', 물류4직: '#9A5BC4' };
  const GRAY = '#3a3a3c';

  const TABS = { S: 'Safety', P: 'People', Q: 'Quality', D: 'Delivery', C: 'Cost' };
  const METRICS = [
    { tab: 'S', code: 'S1', name: '사고발생(아차사고 포함)', keys: [['S1', '']] },
    { tab: 'S', code: 'S2', name: '위험요소 적출', keys: [['S2', '']] },
    { tab: 'P', code: 'P1', name: '다기능 습숙도', keys: [['P1', '']] },
    { tab: 'P', code: 'P2', name: '장비면허 취득현황', keys: [['P2_지게차', '지게차'], ['P2_건설기계', '건설기계']] },
    { tab: 'P', code: 'P3', name: '교육이행 실적', keys: [['P3', '']] },
    { tab: 'Q', code: 'Q1', name: '표준서 제/개정', keys: [['Q1', '']] },
    { tab: 'Q', code: 'Q2', name: '납입이상 적출', keys: [['Q2', '']] },
    { tab: 'Q', code: 'Q3', name: '팔레트 개선/보수', keys: [['Q3_개선', '개선'], ['Q3_보수', '보수']] },
    { tab: 'D', code: 'D1', name: '이상발생', keys: [['D1', '']] },
    { tab: 'D', code: 'D2', name: '비가동', keys: [['D2', '']] },
    { tab: 'C', code: 'C1', name: '개선사항', teamOnly: true, keys: [['C1_팔레트', '팔레트'], ['C1_Lay-out', 'Lay-out'], ['C1_운영', '운영']] },
    { tab: 'C', code: 'C2', name: '순환재고 일치율', teamOnly: true, keys: [['C2_품목', '품목기준'], ['C2_금액', '금액기준'], ['C3_재고보정', '재고보정'], ['C3_클레임', '클레임']] }
  ];
  const v = (key, label, extra) => Object.assign({ t: 'line', src: 'value', key, label }, extra);
  const rate = (key, label, tkey, extra) => Object.assign({ t: 'bar', src: 'rate', key, tkey, label }, extra);
  const tg = (key, label, tkey, extra) => Object.assign({ t: 'line', src: 'target', key, tkey, label, dash: true, gray: true }, extra);
  const y1 = { y1: true };
  const CHARTS = {
    S1: { title: '[ 사고발생 현황 ]', annual: ['S1_사고', 'S1_아차'], series: [v('S1_사고', '사고발생', { t: 'bar' }), v('S1_아차', '아차사고', { t: 'bar' }), tg('S1_사고', '목표 사고발생'), tg('S1_아차', '목표 아차사고')], team: { key: 'S1', t: 'line' } },
    S2: { title: '[ 위험요소 적출현황 ]', annual: ['S2'], series: [rate('S2', '달성률'), tg('S2', '목표', null, y1), v('S2', '실적', y1)], team: { key: 'S2', t: 'bar', target: 'S2' } },
    P1: { title: '[ 다기능습숙 현황 ]', annual: ['P1'], series: [rate('P1_A', '달성률 공정당', 'P1_TA'), rate('P1_B', '달성률 인당', 'P1_TB'), tg('P1_TA', '목표 공정당', null, y1), tg('P1_TB', '목표 인당', null, y1), v('P1_A', '실적 공정당', y1), v('P1_B', '실적 인당', y1)], team: { key: 'P1', t: 'bar', pct: true } },
    P2: { title: '[ 장비면허 취득 현황 ]', annual: ['P2_지게차', 'P2_건설기계'], series: [rate('P2_지게차', '달성률 지게차'), rate('P2_건설기계', '달성률 건설기계'), tg('P2_지게차', '목표 지게차', null, y1), tg('P2_건설기계', '목표 건설기계', null, y1), v('P2_지게차', '실적 지게차', y1), v('P2_건설기계', '실적 건설기계', y1)] },
    P3: { title: '[ 직무교육현황 ]', annual: ['P3'], series: [rate('P3', '달성률'), tg('P3', '목표', null, y1)], team: { key: 'P3', t: 'bar', pct: true } },
    Q1: { title: '[ 표준서 제 / 개정 현황 ]', annual: ['Q1'], series: [rate('Q1', '달성률'), tg('Q1', '목표', null, y1), v('Q1', '제정', y1), v('Q1_개정', '개정', y1)], team: { key: 'Q1', t: 'bar' } },
    Q2: { title: '[ 납입이상적출 현황 ]', annual: ['Q2'], series: [v('Q2', '실적')] },
    Q3: { title: '[ 파레트 개선 / 보수 현황 ]', annual: ['Q3_개선', 'Q3_보수'], series: [v('Q3_개선', '개선'), v('Q3_보수', '보수')] },
    D1: { title: '[ 이상발생 / 비가동 현황 ]', annual: ['D1', 'D2'], series: [rate('D1', '달성률 이상발생'), tg('D1', '목표 이상발생', null, y1), tg('D2', '목표 비가동', null, y1), v('D1', '실적 이상발생', y1), v('D2', '실적 비가동', y1)], team: { key: 'D1', t: 'bar', sumLine: 'D1' } },
    C1: { title: '[ 개선 현황 ]', annual: ['C1_팔레트', 'C1_Lay-out', 'C1_운영'], annualTitle: '[ 개선 비용절감액 ] (단위: 백만원)', series: [v('C1n_팔레트', '팔레트(건)'), v('C1n_Lay-out', 'Lay-out(건)'), v('C1n_운영', '운영(건)')] },
    C2: { title: '[ 순환재고 일치율 ]', annual: ['C2_품목', 'C2_금액'], series: [v('C2_품목', '일치율 품목', { t: 'bar' }), v('C2_금액', '일치율 금액', { t: 'bar' }), tg('C2_품목', '목표 품목'), tg('C2_금액', '목표 금액'), v('C3_재고보정', '재고보정(백만원)', y1), v('C3_클레임', '클레임(백만원)', y1)] }
  };
  CHARTS.D2 = CHARTS.D1;

  let charts = [];
  const destroyCharts = () => { charts.forEach((c) => c.destroy()); charts = []; };
  let chartLib = null;
  const loadChart = () => chartLib || (chartLib = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHART_URL; s.onload = resolve; s.onerror = (e) => { chartLib = null; reject(e); };
    document.head.append(s);
  }));

  function index(d) {
    const m = {};
    d.rows.forEach(([ym, dept, key, val, j]) => {
      const id = dept + '|' + key;
      (m[id] = m[id] || {})[Number(ym.slice(5))] = { v: Number(val), j };
    });
    return m;
  }
  function tools(d) {
    const m = index(d);
    const val = (dept, key, mon) => { const c = m[dept + '|' + key]; return c && c[mon] ? c[mon].v : null; };
    const judge = (dept, key, mon) => { const c = m[dept + '|' + key]; return c && c[mon] ? c[mon].j : ''; };
    const t = (dept, key) => d.targets[dept + '|' + key] || null;
    const target = (dept, key, mon) => {
      const x = t(dept, key);
      if (x) return Number(x.target);
      return val(dept, key, mon);
    };
    const curMon = Number(d.today.slice(5, 7));
    const yearVal = (dept, key) => {
      const list = MONTHS.map((x) => val(dept, key, x)).filter((x) => x !== null);
      if (!list.length) return null;
      if (SUM.has(key)) return list.reduce((a, b) => a + b, 0);
      if (PCT.has(key)) return list.reduce((a, b) => a + b, 0) / list.length;
      return list[list.length - 1];
    };
    const annualTarget = (dept, key) => {
      const x = t(dept, key);
      if (!x) return null;
      return SUM.has(key) ? Number(x.target) * 12 : Number(x.target);
    };
    return { m, val, judge, t, target, curMon, yearVal, annualTarget };
  }
  const round = (n, p) => { const f = 10 ** p; return Math.round(n * f) / f; };
  function show(key, n) {
    if (n === null || n === undefined || n === '' || isNaN(n)) return '-';
    if (PCT.has(key)) return round(n * 100, 2) + '%';
    return String(round(n, 2));
  }
  const chip = (j) => (JUDGE[j] ? h('span', { class: 'chip ' + JUDGE[j][1] }, JUDGE[j][0]) : h('span', { class: 'chip' }, '-'));

  function load(alive, draw, box) {
    const year = new Date().getFullYear();
    loadThenRefresh('kpi_sum_' + year, () => Api.call('kpiSummary', {}), (d) => { if (alive()) draw(d); }, (e) => { if (alive()) box.replaceChildren(UI.error(e.message, () => load(alive, draw, box))); });
  }

  const baseOpts = (hasY1) => ({
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: Object.assign({
      x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#ececf0' }, ticks: { font: { size: 10 } } }
    }, hasY1 ? { y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { font: { size: 10 } } } } : {})
  });

  function dataset(s, data, i) {
    const color = s.color || (s.gray ? GRAY : COLORS[i % COLORS.length]);
    return {
      type: s.t, label: s.label, data, yAxisID: s.y1 ? 'y1' : 'y', borderColor: color, backgroundColor: s.t === 'bar' ? color : 'transparent',
      borderWidth: 2, pointRadius: s.t === 'line' ? 2 : 0, borderDash: s.dash ? [5, 4] : [], borderRadius: s.t === 'bar' ? 3 : 0, spanGaps: true, order: s.t === 'line' ? 1 : 2
    };
  }

  function chartBox(title) {
    const canvas = h('canvas');
    return { el: h('figure', { class: 'chart-box' }, h('figcaption', null, title), h('div', { class: 'chart-area' }, canvas)), canvas };
  }

  function monthlySeries(T, dept, def) {
    let colorIndex = 0;
    return def.series.map((s) => {
      const data = MONTHS.map((mon) => {
        if (s.src === 'value') return T.val(dept, s.key, mon);
        const tk = s.tkey || s.key;
        const tv = T.target(dept, tk, mon);
        if (s.src === 'target') return tv;
        const a = T.val(dept, s.key, mon);
        return a === null ? null : (tv ? round(a / tv * 100, 1) : 0);
      });
      return dataset(s, data, s.gray ? 0 : colorIndex++);
    });
  }

  function drawCharts(host, T, dept, code) {
    const def = CHARTS[code];
    if (!def) return;
    const labels = MONTHS.map((x) => x + '월');
    const out = [];
    const annual = chartBox(def.annualTitle || def.title + ' 연간 비교');
    const annualSets = def.annual.map((key, i) => {
      const x = T.t(dept, key);
      return dataset({ t: 'bar', label: key.split('_')[1] || '실적' }, [x ? Number(x.prior) : null, T.annualTarget(dept, key), T.yearVal(dept, key)], i);
    });
    out.push({ c: annual, cfg: { type: 'bar', data: { labels: ['전년 실적', '올해 목표', '올해 누계'], datasets: annualSets }, options: baseOpts(false) } });

    if (dept === TEAM && def.team) {
      const box = chartBox(def.title + ' 직별');
      const sets = DEPTS.map((d) => dataset({ t: def.team.t, label: d, color: DEPT_COLORS[d] }, MONTHS.map((mon) => {
        const a = T.val(d, def.team.key, mon);
        return def.team.pct && a !== null ? round(a * 100, 1) : a;
      })));
      if (def.team.target) sets.push(dataset({ t: 'line', label: '목표', dash: true, gray: true }, MONTHS.map((mon) => T.target(TEAM, def.team.target, mon))));
      if (def.team.sumLine) sets.push(dataset({ t: 'line', label: '합계', gray: true }, MONTHS.map((mon) => T.val(TEAM, def.team.sumLine, mon))));
      out.push({ c: box, cfg: { type: 'bar', data: { labels, datasets: sets }, options: baseOpts(false) } });
    } else {
      const box = chartBox(def.title);
      const sets = monthlySeries(T, dept, def);
      out.push({ c: box, cfg: { type: 'bar', data: { labels, datasets: sets }, options: baseOpts(def.series.some((s) => s.y1)) } });
    }
    const add = cumulative(T, dept, code);
    if (add) out.push(add);
    host.replaceChildren(...out.map((o) => o.c.el));
    loadChart().then(() => { out.forEach((o) => charts.push(new window.Chart(o.c.canvas, o.cfg))); }).catch(() => UI.toast('차트를 불러오지 못했습니다.', true));
  }

  function cumulative(T, dept, code) {
    const prefix = { S2: 'S2|p|', Q2: 'Q2|p|', Q3: 'Q3|p|', C1: 'C1|p|', D1: 'D|p|', D2: 'D|p|', P1: 'P1p|' }[code];
    if (!prefix) return null;
    const isTeam = dept === TEAM;
    const totals = {};
    const kinds = new Set();
    (isTeam ? DEPTS : [dept]).forEach((d) => {
      const want = d + '|' + prefix;
      Object.keys(T.m).filter((id) => id.startsWith(want)).forEach((id) => {
        const parts = id.slice(want.length).split('|');
        const name = isTeam ? d : parts[0], kind = parts[1] || '누적';
        if (code === 'P1' && isTeam) return;
        kinds.add(kind);
        const cells = Object.entries(T.m[id]);
        const value = code === 'P1' ? cells.sort((a, b) => a[0] - b[0]).pop()[1].v : cells.reduce((s, [, c]) => s + c.v, 0);
        const row = (totals[name] = totals[name] || {});
        row[kind] = (row[kind] || 0) + value;
      });
    });
    if (code === 'P1' && isTeam) return null;
    const names = isTeam ? DEPTS.filter((d) => totals[d]) : Object.keys(totals).sort((a, b) => sumOf(totals[b]) - sumOf(totals[a])).slice(0, 15);
    if (!names.length) return null;
    const base = { S2: '2026 누적 위험요소 적출 현황', Q2: '2026 누적 납입이상 적출 현황', Q3: '2026 누적 팔레트 개선 / 보수 현황', C1: '2026 누적 개선 효과금액 (백만원)', D1: '누적 이상발생 현황', D2: '누적 이상발생 현황', P1: '인원별 습숙도 진행현황' }[code];
    const box = chartBox(base + (isTeam ? ' (직별)' : ' (작업자별)'));
    const sets = [...kinds].map((k, i) => dataset({ t: 'bar', label: k }, names.map((n) => totals[n][k] || 0), i));
    const opts = baseOpts(false);
    if (['Q2', 'Q3', 'C1', 'D1', 'D2'].includes(code)) { opts.scales.x.stacked = true; opts.scales.y.stacked = true; }
    opts.scales.x.ticks.font.size = 9;
    return { c: box, cfg: { type: 'bar', data: { labels: names, datasets: sets }, options: opts } };
  }
  const sumOf = (o) => Object.values(o).reduce((a, b) => a + b, 0);

  function descTable(T, dept, metric) {
    const head = h('tr', null, h('th', null, '구분'), h('th', null, '항목'), h('th', { class: 'num' }, '전년'), h('th', { class: 'num' }, '올해목표'), MONTHS.map((x) => h('th', { class: 'num' }, x + '월')));
    const rows = [];
    metric.keys.forEach(([key, label]) => {
      const x = T.t(dept, key);
      const unitPct = PCT.has(key);
      rows.push(h('tr', null, h('th', { rowspan: 3 }, label || metric.name), h('td', null, '목표'), h('td', { class: 'num' }, '-'),
        h('td', { class: 'num' }, show(key, T.annualTarget(dept, key))), MONTHS.map(() => h('td', { class: 'num' }, x ? show(key, Number(x.target)) : '-'))));
      rows.push(h('tr', null, h('td', null, '실적'), h('td', { class: 'num' }, x ? show(key, Number(x.prior)) : '-'),
        h('td', { class: 'num' }, show(key, T.yearVal(dept, key))), MONTHS.map((mon) => {
          const j = T.judge(dept, key, mon);
          return h('td', { class: 'num ' + (JUDGE[j] ? JUDGE[j][1] : '') }, show(key, T.val(dept, key, mon)));
        })));
      rows.push(h('tr', null, h('td', null, '달성률'), h('td', { class: 'num' }, '-'), h('td', { class: 'num' }, '-'), MONTHS.map((mon) => {
        const a = T.val(dept, key, mon);
        const tv = x ? Number(x.target) : 0;
        return h('td', { class: 'num' }, a !== null && tv ? round((unitPct ? a / tv : a / tv) * 100, 1) + '%' : '-');
      })));
    });
    return h('div', { class: 'table-wrap' }, h('table', { class: 'data' }, h('thead', null, head), h('tbody', null, rows)));
  }

  /* ---------- 직별 화면 ---------- */
  const deptOf = (n) => (n === 'team' ? TEAM : '물류' + n + '직');

  function metricCard(T, dept, n, m) {
    const mon = T.curMon;
    return h('a', { class: 'metric', href: '#/kpi/' + n + '/' + m.code },
      h('p', { class: 'metric-name' }, m.code + ' ' + m.name),
      m.keys.map(([key, label]) => {
        const x = T.t(dept, key);
        return h('div', { class: 'metric-row' }, label && h('span', { class: 'sub' }, label),
          h('strong', null, show(key, T.val(dept, key, mon))),
          h('span', { class: 'sub' }, '목표 ' + (x ? show(key, Number(x.target)) : '-')), chip(T.judge(dept, key, mon)));
      }));
  }

  /* 달성 비율 집계: 지정 월에 판정이 있는 지표 중 달성·주의·미달 비율 */
  function judgeCount(T, dept, mon, tab) {
    const c = { G: 0, Y: 0, R: 0 };
    METRICS.filter((m) => !m.teamOnly && (!tab || m.tab === tab)).forEach((m) => m.keys.forEach(([key]) => {
      const j = T.judge(dept, key, mon);
      if (c[j] !== undefined) c[j]++;
    }));
    return c;
  }
  function summaryCards(c) {
    const total = c.G + c.Y + c.R;
    const card = (k, icon, label) => h('div', { class: 'sum-card ' + JUDGE[k][1] }, h('span', { class: 'sum-ico' }, UI.icon(icon)),
      h('div', null, h('p', null, label), h('strong', null, total ? UI.pct(c[k], total) + '%' : '-'), h('span', { class: 'sub' }, c[k] + '개 지표')));
    return h('div', { class: 'sum-cards' }, card('G', 'trophy', '달성'), card('Y', 'warn', '주의'), card('R', 'clock', '미달'));
  }
  function trendChart(host, T, dept) {
    const months = MONTHS.filter((x) => x <= T.curMon);
    const data = months.map((mon) => { const c = judgeCount(T, dept, mon); const t = c.G + c.Y + c.R; return t ? Math.round(c.G / t * 100) : null; });
    const canvas = h('canvas');
    host.replaceChildren(h('div', { class: 'chart-area' }, canvas));
    loadChart().then(() => {
      charts.push(new window.Chart(canvas, { type: 'line', data: { labels: months.map((x) => x + '월'), datasets: [{ label: '달성 비율(%)', data, borderColor: '#0b2282', backgroundColor: 'rgba(11,34,130,0.08)', fill: true, tension: 0.3, pointRadius: 4, spanGaps: true }] },
        options: Object.assign(baseOpts(false), { scales: { x: { grid: { display: false } }, y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' }, grid: { color: '#ececf0' } } } }) }));
    }).catch(() => {});
  }
  function tabBars(T, dept) {
    return h('div', { class: 'bar-list' }, ['S', 'P', 'Q', 'D'].map((k) => {
      const c = judgeCount(T, dept, T.curMon, k);
      const pct = UI.pct(c.G, c.G + c.Y + c.R);
      return h('div', { class: 'rate-row' }, h('span', { class: 'rate-name' }, TABS[k]), h('span', { class: 'rate-bar' }, h('span', { style: 'width:' + (pct || 0) + '%' })), h('strong', { class: 'rate-val' }, pct === null ? '-' : pct + '%'));
    }));
  }

  Router.add('/kpi/:team', (params, app, alive) => {
    if (!/^[1-4]$/.test(params.team)) { app.replaceChildren(UI.placeholder('페이지를 찾을 수 없습니다')); return; }
    const dept = deptOf(params.team);
    const body = h('div', { class: 'wrap wide' }, UI.skeleton(6));
    let tab = 'S';
    const tabs = h('div', { class: 'tabs center-tabs' });
    const grid = h('div', { class: 'metric-grid' });
    const draw = (d) => {
      if (!d.depts.includes(dept)) { body.replaceChildren(h('p', { class: 'sub center' }, '이 직의 KPI를 볼 권한이 없습니다.')); return; }
      destroyCharts();
      const T = tools(d);
      const paint = () => {
        tabs.replaceChildren(...Object.keys(TABS).map((k) => h('button', { class: 'tab' + (k === tab ? ' on' : ''), type: 'button', onclick: () => { tab = k; paint(); } }, TABS[k])));
        const list = METRICS.filter((m) => m.tab === tab && !m.teamOnly);
        grid.replaceChildren(...(list.length ? list.map((m) => metricCard(T, dept, params.team, m)) : [h('p', { class: 'sub center' }, 'Cost 지표는 팀 전체 현황에서 확인합니다.')]));
      };
      paint();
      const deptTabs = d.depts.filter((x) => /^물류[1-4]직$/.test(x));
      const trend = h('div');
      fill(body,
        deptTabs.length > 1 ? h('div', { class: 'seg' }, deptTabs.map((x) => h('a', { class: 'seg-btn' + (x === dept ? ' on' : ''), href: '#/kpi/' + x.charAt(2) }, x))) : null,
        summaryCards(judgeCount(T, dept, T.curMon)),
        h('div', { class: 'panel-grid' },
          h('div', { class: 'panel' }, UI.cardHead('chart', '월별 달성 비율 추이'), trend),
          h('div', { class: 'panel' }, UI.cardHead('list', T.curMon + '월 항목별 달성 비율'), tabBars(T, dept))),
        h('h2', { class: 'block-h' }, '지표별 실적'), tabs, grid);
      trendChart(trend, T, dept);
    };
    app.replaceChildren(UI.hero(dept + ' KPI', new Date().getMonth() + 1 + '월 실적 · 판정이 나온 지표 중 달성 비율'), h('section', { class: 'section' }, body));
    load(alive, draw, body);
  });

  /* ---------- 지표 상세 ---------- */
  const STATUS = ['등록', '확인', '제외'];
  const LISTED = ['S1', 'S2', 'Q2', 'Q3', 'C1'];

  function activityList(host, dept, code, alive) {
    const month = h('select', { 'aria-label': '월 선택' }, h('option', { value: '' }, '전체 월'), MONTHS.map((x) => h('option', { value: String(x).padStart(2, '0') }, x + '월')));
    const status = h('select', { 'aria-label': '상태 선택' }, h('option', { value: '' }, '전체 상태'), STATUS.map((x) => h('option', { value: x }, x)));
    const list = h('div', null, UI.skeleton(3));
    const year = new Date().getFullYear();
    const load2 = () => {
      Api.call('kpiList', { year, dept, code, month: month.value ? year + '-' + month.value : '', status: status.value }).then((d) => {
        if (!alive()) return;
        list.replaceChildren(...(d.items.length ? d.items.map(row) : [h('p', { class: 'sub center' }, '내역이 없습니다.')]));
      }, (e) => { if (alive()) list.replaceChildren(UI.error(e.message, load2)); });
    };
    const row = (it) => h('article', { class: 'item' },
      h('p', { class: 'sub' }, it.date + ' · ' + it.dept + ' · ' + it.author + ' · ', h('span', { class: 'tag' }, it.status)),
      h('p', { class: 'pre' }, it.detail.issue),
      it.detail.counter && h('p', { class: 'pre sub' }, '대책: ' + it.detail.counter),
      it.reason && h('p', { class: 'sub' }, '제외 사유: ' + it.reason),
      it.privatePhoto ? (it.issueCount + it.counterCount ? h('p', { class: 'sub' }, '사진 있음') : null)
        : (it.issuePhotos.length + it.counterPhotos.length ? h('div', { class: 'thumbs' }, it.issuePhotos.concat(it.counterPhotos).map((f) => UI.thumb(f))) : null));
    month.onchange = load2; status.onchange = load2;
    host.replaceChildren(h('h2', { class: 'block-h' }, '건별 목록'), h('div', { class: 'toolbar no-print' }, month, status), list);
    load2();
  }

  function standardTable(host, dept, alive) {
    Api.call('standardList', { dept }).then((d) => {
      if (!alive()) return;
      host.replaceChildren(h('h2', { class: 'block-h' }, '표준서 목록'), h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
        h('thead', null, h('tr', null, ['번호', '공정', '제목', '구분', '일자'].map((x) => h('th', null, x)))),
        h('tbody', null, d.rows.map((r) => h('tr', null, [0, 2, 3, 4, 5].map((i) => h('td', null, r.v[i]))))))));
    }, () => {});
  }

  Router.add('/kpi/:team/:code', (params, app, alive) => {
    const dept = deptOf(params.team);
    const metric = METRICS.find((m) => m.code === params.code);
    if (!metric || (params.team !== 'team' && !/^[1-4]$/.test(params.team))) { app.replaceChildren(UI.placeholder('페이지를 찾을 수 없습니다')); return; }
    const body = h('div', { class: 'wrap' }, UI.skeleton(8));
    destroyCharts();
    const charts2 = h('div', { class: 'chart-grid' });
    const extra = h('div');
    let listed = false;
    const draw = (d) => {
      if (!d.depts.includes(dept)) { body.replaceChildren(h('p', { class: 'sub center' }, '이 KPI를 볼 권한이 없습니다.')); return; }
      destroyCharts();
      const T = tools(d);
      const x = T.t(dept, metric.keys[0][0]);
      body.replaceChildren(
        h('a', { class: 'back no-print', href: params.team === 'team' ? '#/kpi/team' : '#/kpi/' + params.team }, dept === TEAM ? '팀 전체 현황' : dept),
        h('h1', { class: 'post-h' }, metric.code + ' ' + metric.name),
        h('p', { class: 'sub' }, dept + (x && x.desc ? ' · ' + x.desc : '')),
        h('div', { class: 'row-btns no-print' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => window.print() }, '인쇄')),
        charts2, descTable(T, dept, metric), extra);
      drawCharts(charts2, T, dept, metric.code);
      if (!listed) {
        listed = true;
        if (LISTED.includes(metric.code)) activityList(extra, dept, metric.code, alive);
        else if (metric.code === 'Q1' && dept !== TEAM) standardTable(extra, dept, alive);
      }
    };
    app.replaceChildren(h('section', { class: 'section print-page' }, body));
    load(alive, draw, body);
  });

  /* ---------- 팀 전체 현황 ---------- */
  const TEAM_ROWS = [];
  METRICS.forEach((m) => {
    if (m.teamOnly || m.code === 'P2' || m.code === 'Q3') m.keys.forEach(([key, label]) => TEAM_ROWS.push({ m, key, label, dept: TEAM }));
    else DEPTS.concat([TEAM]).forEach((d) => TEAM_ROWS.push({ m, key: m.keys[0][0], label: d, dept: d }));
  });

  Router.add('/kpi/team', (params, app, alive) => {
    if (!UI.has('KPI_VIEW_ALL')) { app.replaceChildren(UI.placeholder('권한이 없습니다')); return; }
    const body = h('div', { class: 'wrap wide' }, UI.skeleton(10));
    const draw = (d) => {
      const T = tools(d);
      const closedSet = new Set(d.closed);
      const year = d.year;
      const ymOf = (x) => year + '-' + String(x).padStart(2, '0');
      const closeBox = h('div', { class: 'toolbar no-print' });
      const cur = T.curMon;
      const sel = h('select', { 'aria-label': '마감 월' }, MONTHS.filter((x) => x <= cur).map((x) => h('option', { value: ymOf(x), selected: x === cur }, x + '월')));
      const act = async (name) => {
        try { await Api.call(name, { ym: sel.value }); UI.toast('처리했습니다.'); Router.render(); } catch (e) { UI.toast(e.message, true); }
      };
      if (UI.has('KPI_TEAM') || UI.has('ADMIN')) {
        closeBox.append(h('span', { class: 'sub' }, '마감할 월'), sel);
        if (UI.has('KPI_TEAM')) closeBox.append(h('button', { class: 'btn', type: 'button', onclick: () => act('kpiClose') }, '월 확인(마감)'));
        if (UI.has('ADMIN')) closeBox.append(h('button', { class: 'btn ghost', type: 'button', onclick: () => act('kpiReopen') }, '마감 해제'));
      }
      let prev = '';
      const rows = TEAM_ROWS.map((r) => {
        const first = r.m.code !== prev;
        prev = r.m.code;
        return h('tr', { class: first ? 'group-top' : '', onclick: () => { location.hash = '#/kpi/team/' + r.m.code; } },
          h('th', null, first ? r.m.code + ' ' + r.m.name : ''), h('td', null, r.label),
          MONTHS.map((mon) => {
            const j = T.judge(r.dept, r.key, mon);
            return h('td', { class: 'num ' + (JUDGE[j] ? JUDGE[j][1] : '') }, show(r.key, T.val(r.dept, r.key, mon)));
          }));
      });
      const deptCards = h('div', { class: 'sum-cards four no-print' }, d.depts.filter((x) => /^물류[1-4]직$/.test(x)).map((x) => {
        const c = judgeCount(T, x, cur);
        const pct = UI.pct(c.G, c.G + c.Y + c.R);
        return h('a', { class: 'sum-card good', href: '#/kpi/' + x.charAt(2) }, h('span', { class: 'sum-ico' }, UI.icon('chart')),
          h('div', null, h('p', null, x + ' ' + cur + '월'), h('strong', null, pct === null ? '-' : pct + '%'), h('span', { class: 'sub' }, '달성 ' + c.G + ' · 주의 ' + c.Y + ' · 미달 ' + c.R)));
      }));
      fill(body, deptCards,
        h('div', { class: 'row-btns no-print' }, h('a', { class: 'btn ghost', href: '#/kpi/meeting' }, '미팅용 보기'), h('button', { class: 'btn ghost', type: 'button', onclick: () => window.print() }, '인쇄')),
        closeBox.childNodes.length ? closeBox : null,
        h('div', { class: 'table-wrap' }, h('table', { class: 'data click' },
          h('thead', null, h('tr', null, h('th', null, '지표'), h('th', null, '구분'), MONTHS.map((x) => h('th', { class: 'num' }, x + '월', closedSet.has(ymOf(x)) ? h('span', { class: 'closed' }, '마감') : '')))),
          h('tbody', null, rows))));
    };
    app.replaceChildren(UI.hero('팀 전체 현황', new Date().getFullYear() + '년 ScoreCard'), h('section', { class: 'section' }, body));
    load(alive, draw, body);
  });

  /* ---------- 미팅용 보기 ---------- */
  Router.add('/kpi/meeting', (params, app, alive) => {
    if (!UI.has('KPI_VIEW_ALL')) { app.replaceChildren(UI.placeholder('권한이 없습니다')); return; }
    const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const today = new Date();
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const range = h('select', { 'aria-label': '기간' }, ['이번 주', '이번 달', '직접 지정'].map((x) => h('option', { value: x, selected: x === '이번 달' }, x)));
    const from = h('input', { type: 'date', value: iso(new Date(today.getFullYear(), today.getMonth(), 1)), 'aria-label': '시작일' });
    const to = h('input', { type: 'date', value: iso(today), 'aria-label': '종료일' });
    const code = h('select', { 'aria-label': '지표' }, h('option', { value: '' }, '전체 지표'), LISTED.map((c) => h('option', { value: c }, c)));
    const dept = h('select', { 'aria-label': '직' }, h('option', { value: '' }, '전체 직'), DEPTS.map((d) => h('option', { value: d }, d)));
    const box = h('div', null, UI.skeleton(4));
    const load2 = () => {
      if (range.value === '이번 주') { from.value = iso(monday); to.value = iso(today); }
      if (range.value === '이번 달') { from.value = iso(new Date(today.getFullYear(), today.getMonth(), 1)); to.value = iso(today); }
      Api.call('kpiList', { year: from.value.slice(0, 4), from: from.value, to: to.value, code: code.value, dept: dept.value }).then((d) => {
        if (!alive()) return;
        box.replaceChildren(h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, ['일자', '직', '지표', '작성자', '문제', '대책', '담당', '현황', '상태'].map((x) => h('th', null, x)))),
          h('tbody', null, d.items.map((it) => h('tr', null, [it.date, it.dept, it.code, it.author, it.detail.issue, it.detail.counter, it.detail.owner, it.detail.progress, it.status].map((v2) => h('td', { class: 'pre' }, v2 || ''))))))));
      }, (e) => { if (alive()) box.replaceChildren(UI.error(e.message, load2)); });
    };
    [range, from, to, code, dept].forEach((c) => { c.onchange = load2; });
    app.replaceChildren(UI.hero('미팅용 보기'), h('section', { class: 'section print-page' }, h('div', { class: 'wrap wide' },
      h('div', { class: 'toolbar no-print wrap-row' }, range, from, to, code, dept, h('button', { class: 'btn ghost', type: 'button', onclick: () => window.print() }, '인쇄')), box)));
    load2();
  });

  return { DEPTS, MONTHS };
})();
