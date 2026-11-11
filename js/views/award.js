/* 우수사원: 분기 평가(KPI 자동 점수 + 다면평가), 반기 수상 결과. */
(() => {
  const ITEMS = [
    ['k1', '업무지식', '납입이상 적출'], ['k2', '수행능력', '이상발생·비가동'], ['k3', '협조능력', '개선 제안'],
    ['m1', '조직기여도', '동료 협조·도움'], ['m2', '성실성', '지각·조퇴·결근 없음'], ['m3', '책임감', '맡은 일 끝까지 수행'], ['k4', '적극성', '위험요소·개선 제안']
  ];
  const label = (key) => { const it = ITEMS.find((x) => x[0] === key); return h('span', { class: 'th2' }, it[1], h('small', null, '(' + it[2] + ')')); };
  const ROLE_NAME = { self: '본인', chief: '직장', plant: '공장', lead: '팀장' };
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const curQ = now.getFullYear() + '-Q' + (Math.floor(now.getMonth() / 3) + 1);
  const quarters = () => { const out = []; for (let q = Math.floor(now.getMonth() / 3) + 1; q >= 1; q--) out.push(now.getFullYear() + '-Q' + q); return out; };
  const halves = () => { const y = now.getFullYear(); return now.getMonth() >= 6 ? [y + '-H2', y + '-H1'] : [y + '-H1']; };
  const fmt = (v) => (v === null || v === undefined ? '-' : String(Math.round(v * 100) / 100));
  const scoreSel = (name, value) => h('select', { name, 'aria-label': name }, h('option', { value: '' }, '-'), [5, 4, 3, 2, 1].map((n) => h('option', { value: String(n), selected: String(value) === String(n) }, String(n))));

  function rules() {
    return h('details', { class: 'config rules' }, h('summary', null, '평가 기준과 가산점'),
      h('ul', { class: 'rule-list' },
        h('li', null, '분기마다 7개 항목을 5점 만점으로 평가하고, 두 분기 평균으로 반기 수상자(직별 1명)를 정합니다.'),
        h('li', null, '업무지식(납입이상 적출): 분기 월평균 2건 이상 5점, 1건 4점, 0건 3점.'),
        h('li', null, '수행능력(이상발생/비가동): 5점에서 월별 건수에 따라 감점. 물류1·2직은 4건 이상 -3, 3건 -2, 2건 -1. 물류3·4직은 3건 이상 -3, 2건 -2, 1건 -1. 직장이 -2~+1점 조정(사고 시 -2 포함).'),
        h('li', null, '협조능력(개선 제안): 합리적 제안 5점, 불합리적 제안 4점, 제안 없음 3점. 직장이 고르고 팀장이 회의를 거쳐 최종 결정합니다.'),
        h('li', null, '적극성(위험요소 적출, 개선 제안): 개선 제안이 있으면 5점. 없으면 위험요소 적출 월평균 2건 이상 5점, 1건 4점, 0건 3점.'),
        h('li', null, '조직기여도, 성실성, 책임감: 다면평가(본인 10%, 직장 40%, 공장 30%, 팀장 20%). 평가하지 않은 사람은 비율에서 빠집니다.'),
        h('li', { class: 'bonus' }, '가산점: 개선 제안 1건당 +0.5점(분기 최대 +2점), 위험요소 적출이 목표(월 2건)를 넘은 1건당 +0.5점(분기 최대 +2점). 실적이 적은 협조능력과 적극성을 북돋우기 위한 점수입니다.')));
  }

  function myResult(me, selfRating, quarter, reload) {
    const sel = { m1: scoreSel('m1', selfRating && selfRating.m1), m2: scoreSel('m2', selfRating && selfRating.m2), m3: scoreSel('m3', selfRating && selfRating.m3) };
    const save = async () => {
      try { await Api.call('awardRate', { quarter, empNo: App.user.empNo, as: 'self', m1: sel.m1.value, m2: sel.m2.value, m3: sel.m3.value }); UI.toast('자기평가를 저장했습니다.'); reload(); }
      catch (e) { UI.toast(e.message, true); }
    };
    return h('div', null, h('h2', { class: 'block-h' }, '내 평가 결과'),
      h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
        h('thead', null, h('tr', null, ITEMS.map((it) => h('th', { class: 'num' }, label(it[0]))), h('th', { class: 'num' }, '가산점'), h('th', { class: 'num' }, '합계'))),
        h('tbody', null, h('tr', null, ITEMS.map((it) => h('td', { class: 'num' }, fmt(me[it[0]]))), h('td', { class: 'num' }, fmt(me.bonus)), h('td', { class: 'num' }, h('strong', null, fmt(me.total))))))),
      h('p', { class: 'sub' }, '이번 분기 실적: 납입이상 ' + me.counts.q2 + '건, 위험요소 ' + me.counts.s2 + '건, 개선 제안 ' + me.counts.cp + '건, 이상발생 ' + me.counts.abnormal + '건'),
      h('h2', { class: 'block-h' }, '자기평가 (본인 10%)'),
      h('div', { class: 'toolbar wrap-row' }, UI.field(label('m1'), sel.m1), UI.field(label('m2'), sel.m2), UI.field(label('m3'), sel.m3), h('button', { class: 'btn', type: 'button', onclick: save }, '저장')));
  }

  function rateTable(data, reload) {
    const isChief = data.rateAs === 'chief';
    const rows = data.targets.map((t) => {
      const m = t.mine || {};
      const s = { m1: scoreSel('m1', m.m1), m2: scoreSel('m2', m.m2), m3: scoreSel('m3', m.m3) };
      const adj = isChief && h('select', { 'aria-label': '수행능력 조정' }, ['', '1', '0', '-1', '-2'].map((v) => h('option', { value: v, selected: String(m.adjust) === v }, v === '' ? '-' : (Number(v) > 0 ? '+' : '') + v)));
      const save = async () => {
        try {
          await Api.call('awardRate', { quarter: data.quarter, empNo: t.empNo, m1: s.m1.value, m2: s.m2.value, m3: s.m3.value, adjust: adj ? adj.value : '' });
          UI.toast(t.name + ' 평가를 저장했습니다.');
          reload();
        } catch (e) { UI.toast(e.message, true); }
      };
      return h('tr', null, h('td', null, t.dept), h('td', null, t.name), h('td', { class: 'num' }, t.k1), h('td', { class: 'num' }, fmt(t.k2)), h('td', { class: 'num' }, t.k3), h('td', { class: 'num' }, t.k4),
        h('td', { class: 'num' }, s.m1), h('td', { class: 'num' }, s.m2), h('td', { class: 'num' }, s.m3), isChief ? h('td', { class: 'num' }, adj) : null,
        h('td', null, h('button', { class: 'btn ghost', type: 'button', onclick: save }, m.m1 ? '수정' : '저장')));
    });
    return h('div', null, h('h2', { class: 'block-h' }, ROLE_NAME[data.rateAs] + ' 평가 입력 (' + { chief: '40%', plant: '30%', lead: '20%' }[data.rateAs] + ')'),
      h('p', { class: 'sub' }, '업무지식, 수행능력, 협조능력, 적극성은 실적으로 자동 계산된 점수입니다.'),
      h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
        h('thead', null, h('tr', null, ['직', '성명'].map((x) => h('th', null, x)), ['k1', 'k2', 'k3', 'k4'].map((k) => h('th', { class: 'num' }, label(k))), ['m1', 'm2', 'm3'].map((k) => h('th', { class: 'num' }, label(k))), isChief ? h('th', { class: 'num' }, '수행능력 조정') : null, h('th', null, ''))),
        h('tbody', null, rows))));
  }

  function proposals(data, reload) {
    if (!data.proposals || !data.proposals.length) return h('div', null, h('h2', { class: 'block-h' }, '개선 제안 최종 결정'), h('p', { class: 'sub' }, '이번 분기 개선 제안이 없습니다.'));
    return h('div', null, h('h2', { class: 'block-h' }, '개선 제안 최종 결정'),
      h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
        h('thead', null, h('tr', null, ['직', '제안자', '상태', '직장 판정', '최종 결정', ''].map((x) => h('th', null, x)))),
        h('tbody', null, data.proposals.map((p) => {
          const sel = UI.select('final', ['합리적', '불합리적'], p.final, '직장 판정 따름');
          return h('tr', null, h('td', null, p.dept), h('td', null, p.name), h('td', null, p.status), h('td', null, p.judge || '-'), h('td', null, sel),
            h('td', null, h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
              try { await Api.call('awardProposal', { id: p.id, finalJudge: sel.value }); UI.toast('저장했습니다.'); reload(); } catch (e) { UI.toast(e.message, true); }
            } }, '저장')));
        })))));
  }

  function results(host) {
    const sel = UI.select('half', halves(), halves()[0]);
    const box = h('div', null, UI.skeleton(4));
    const load = () => Api.call('awardResults', { half: sel.value }).then((d) => {
      const rows = d.rows.slice().sort((a, b) => (a.dept < b.dept ? -1 : a.dept > b.dept ? 1 : a.rank - b.rank));
      box.replaceChildren(h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
        h('thead', null, h('tr', null, ['직', '순위', '성명', d.quarters[0] + ' 합계', d.quarters[1] + ' 합계', '반기 평균', ''].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map((r) => h('tr', { class: r.winner ? 'winner' : '' }, h('td', null, r.dept), h('td', { class: 'num' }, r.rank), h('td', null, r.name),
          h('td', { class: 'num' }, fmt(r.q1 && r.q1.total)), h('td', { class: 'num' }, fmt(r.q2 && r.q2.total)), h('td', { class: 'num' }, h('strong', null, fmt(r.avg))),
          h('td', null, r.winner ? h('span', { class: 'chip good' }, '우수사원') : '')))))));
    }, (e) => box.replaceChildren(UI.error(e.message, load)));
    sel.onchange = load;
    host.replaceChildren(h('h2', { class: 'block-h' }, '반기 수상 결과'), h('p', { class: 'sub' }, '팀장과 사업부장만 볼 수 있습니다.'), h('div', { class: 'toolbar' }, sel), box);
    load();
  }

  Router.add('/award', (params, app, alive) => {
    let quarter = curQ;
    const body = h('div', { class: 'wrap' }, UI.skeleton(6));
    const qSel = UI.select('quarter', quarters(), quarter);
    const resultBox = h('div');
    const load = () => Api.call('awardInfo', { quarter }).then((d) => {
      if (!alive()) return;
      fill(body,
        h('div', { class: 'toolbar center-tools' }, qSel), rules(),
        d.me && myResult(d.me, d.selfRating, quarter, load),
        d.targets && d.targets.length && rateTable(d, load),
        d.role.lead && proposals(d, load),
        d.role.results && resultBox,
        !d.me && !d.targets && !d.role.results && h('p', { class: 'sub center' }, '우수사원 평가 대상이 아닙니다.'));
      if (d.role.results && !resultBox.childNodes.length) results(resultBox);
    }, (e) => { if (alive()) body.replaceChildren(UI.error(e.message, load)); });
    qSel.onchange = () => { quarter = qSel.value; load(); };
    app.replaceChildren(UI.hero('우수사원', 'KPI 참여도를 반영한 분기 평가와 반기 수상'), h('section', { class: 'section' }, body));
    load();
  });
})();
