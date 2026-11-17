/* 자료실(2026-11-17): 직별 작업표준서(TIS) 엑셀. 파일은 비공개로 보관하고 로그인한 직원에게만 내려준다.
   올리기는 그 직 직장과 KPI 관리자. 올리면 표준서 제/개정(Q1) 실적에도 반영된다(월 입력(직장) > 표준서와 같은 기능). */
(() => {
  const DEPTS = ['물류1직', '물류2직', '물류3직', '물류4직'];
  Router.add('/library', (params, app, alive) => {
    const mine = DEPTS.includes(App.user.dept) ? App.user.dept : '';
    let dept = mine;
    const seg = h('div', { class: 'seg' });
    const list = h('div', { class: 'lib-list' }, UI.skeleton(4));
    const upBox = h('div');
    let data = null;

    const download = async (it, btn) => {
      btn.disabled = true;
      const old = btn.textContent;
      btn.textContent = '받는 중';
      try {
        const f = await Api.call('libraryFile', { id: it.id });
        UI.saveFile(f.data, f.name, f.type);
      } catch (e) { UI.toast(e.message, true); }
      btn.disabled = false;
      btn.textContent = old;
    };

    function draw() {
      seg.replaceChildren(...[['', '전체']].concat(DEPTS.map((d) => [d, d])).map(([k, label]) => h('button', {
        type: 'button', class: 'seg-btn' + (k === dept ? ' on' : ''), onclick: () => { dept = k; draw(); }
      }, label)));
      const items = data.items.filter((it) => !dept || it.dept === dept);
      const latest = {};
      data.items.forEach((it) => { const k = it.category + '|' + it.dept; if (!latest[k]) latest[k] = it.id; });
      list.replaceChildren(...(items.length ? items.map((it) => {
        const btn = h('button', { class: 'btn', type: 'button' }, UI.icon('download'), '내려받기');
        btn.onclick = () => download(it, btn);
        return h('article', { class: 'lib-item' },
          h('span', { class: 'lib-ico' }, UI.icon('file')),
          h('div', { class: 'lib-main' },
            h('p', { class: 'lib-title' }, it.title, latest[it.category + '|' + it.dept] === it.id ? h('span', { class: 'chip good mini' }, '최신') : h('span', { class: 'chip mini' }, '이전 판')),
            h('p', { class: 'sub' }, [it.dept, it.category, UI.size(it.size), UI.dateOnly(it.at), '등록 ' + it.by].join(' · ')),
            h('p', { class: 'sub lib-name' }, it.name)),
          h('div', { class: 'row-btns' }, btn,
            it.canDelete && h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
              if (!confirm(it.name + ' 파일을 자료실에서 지울까요? 표준서 실적은 바뀌지 않습니다.')) return;
              try { await Api.call('libraryDelete', { id: it.id }); UI.toast('지웠습니다.'); load(); } catch (e) { UI.toast(e.message, true); }
            } }, '삭제')));
      }) : [UI.empty(dept ? dept + ' 자료가 없습니다.' : '등록된 자료가 없습니다.', 'data')]));
    }

    const load = () => Api.call('libraryList', {}).then((d) => {
      if (!alive()) return;
      data = d;
      draw();
      if (d.canUpload.length && !upBox.childNodes.length) {
        upBox.append(h('details', { class: 'config lib-up', open: !d.items.length },
          h('summary', null, '작업표준서 올리기'),
          h('p', { class: 'sub' }, 'TIS 시트만 남긴 직별 작업표준서 엑셀을 올립니다. 새 공정은 표준서 제정, 고친 공정은 개정으로 KPI(Q1)에도 반영됩니다.'),
          window.TisUpload({ depts: d.canUpload, dept: mine, onDone: (x) => { dept = x; load(); } })));
      }
    }, (e) => { if (alive()) list.replaceChildren(UI.error(e.message, load)); });

    app.replaceChildren(UI.hero('자료실', '직별 작업표준서(TIS)를 내려받을 수 있습니다.'),
      h('section', { class: 'section' }, h('div', { class: 'wrap' }, upBox, seg, list)));
    load();
  });
})();
