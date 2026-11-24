/* 공지사항과 업무 게시판. */
(() => {
  const NAMES = { notice: '공지사항', work: '업무 게시판', plan: '생산계획' };
  /* 업무 게시판은 관리자 직급만 글을 쓰고(직원 의견은 건의사항), 생산계획은 전용 권한(PLAN_UPLOAD)이 있는 사람만 올린다. */
  const canWrite = (board) => !UI.has('VIEW_EXEC') && (board === 'work' ? UI.isManager() : board === 'plan' ? UI.has('PLAN_UPLOAD') : UI.has('NOTICE_WRITE'));

  function listView(board, app, alive) {
    let page = 1;
    let q = '';
    const body = h('div', { class: 'wrap' }, UI.skeleton(6));
    const search = h('input', { type: 'search', placeholder: '제목 검색', 'aria-label': '제목 검색' });
    const draw = (data) => {
      if (!alive()) return;
      fill(body,
        data.items.length
          ? [h('ul', { class: 'post-cards m-only' }, data.items.map((p) => h('li', { class: p.pinned ? 'pinned' : '' },
            h('a', { href: '#/board/' + board + '/' + p.id },
              h('span', { class: 'pc-title' }, p.read === false ? h('span', { class: 'chip mini new' }, '새 글') : null, p.pinned ? h('span', { class: 'chip mini bad' }, board === 'notice' ? '중요' : '고정') : null, p.title),
              h('span', { class: 'sub pc-meta' }, [p.author, UI.dateOnly(p.created), p.photoCount ? '사진 ' + p.photoCount : ''].filter(Boolean).join(' · ')))))),
          h('table', { class: 'data board-table pc-only' },
            h('thead', null, h('tr', null, h('th', { class: 'c-no' }, '번호'), h('th', { class: 'c-kind' }, '구분'), h('th', null, '제목'),
              h('th', { class: 'c-who' }, '작성자'), h('th', { class: 'c-date' }, '등록일'), h('th', { class: 'c-att' }, '첨부'))),
            h('tbody', null, data.items.map((p, i) => h('tr', { class: p.pinned ? 'pinned' : '', onclick: () => { location.hash = '#/board/' + board + '/' + p.id; } },
              h('td', { class: 'c-no' }, p.pinned ? UI.icon('pin') : String(data.total - (data.page - 1) * data.size - i)),
              h('td', { class: 'c-kind' }, h('span', { class: 'chip ' + (p.pinned ? 'bad' : '') }, p.pinned ? (board === 'notice' ? '중요' : '고정') : '일반')),
              h('td', { class: 'c-title' }, p.read === false ? h('span', { class: 'chip mini new' }, '새 글') : null, h('a', { href: '#/board/' + board + '/' + p.id }, p.title)),
              h('td', { class: 'c-who' }, p.author),
              h('td', { class: 'c-date' }, UI.dateOnly(p.created)),
              h('td', { class: 'c-att' }, p.photoCount ? h('span', { class: 'att', title: '사진 ' + p.photoCount + '장' }, UI.icon('photo'), p.photoCount) : '')))))]
          : UI.empty(q ? '검색 결과가 없습니다.' : '등록된 글이 없습니다.', q ? 'data' : 'board'),
        UI.pager(data.page, data.size, data.total, (n) => { page = n; load(); }) || '');
    };
    const load = () => {
      const key = q || page > 1 ? null : 'board_' + board;
      const fetcher = () => Api.call('boardList', { board, page, q });
      const onErr = (e) => body.replaceChildren(UI.error(e.message, load));
      if (key) loadThenRefresh(key, fetcher, draw, onErr);
      else fetcher().then(draw, onErr);
    };
    fill(app, UI.hero(NAMES[board]),
      h('section', { class: 'section' }, h('div', { class: 'wrap' },
        h('form', { class: 'toolbar', onsubmit: (e) => { e.preventDefault(); q = search.value.trim(); page = 1; load(); } }, search,
          h('button', { class: 'btn ghost', type: 'submit' }, '검색'),
          canWrite(board) && h('a', { class: 'btn desktop-only', href: '#/board/' + board + '/new' }, '글쓰기'))),
      board === 'work' && !canWrite('work') && !UI.has('VIEW_EXEC') ? h('div', { class: 'wrap' }, h('p', { class: 'sub work-note' }, '업무 게시판 글쓰기는 관리자만 할 수 있습니다. 개선 의견은 건의사항에 남겨 주세요.')) : null,
      body),
      canWrite(board) && h('a', { class: 'fab', href: '#/board/' + board + '/new' }, '작성'));
    load();
  }

  /* 공지 읽음 현황: 읽은 사람 수와, 직별로 묶은 읽은 사람·아직 안 읽은 사람 명단. */
  function readsPanel(r) {
    const pct = r.total ? Math.round(r.done.length / r.total * 100) : 0;
    const group = (list) => {
      const by = {};
      list.forEach((x) => { (by[UI.deptName(x.dept) || '소속 없음'] = by[UI.deptName(x.dept) || '소속 없음'] || []).push(x.name); });
      return h('ul', { class: 'reads-list' }, Object.keys(by).map((d) => h('li', null, h('strong', null, d), h('span', null, by[d].join(', ')))));
    };
    return h('div', { class: 'reads' },
      h('h2', { class: 'comment-h' }, '읽음 확인 ' + r.done.length + ' / ' + r.total + '명'),
      h('div', { class: 'reads-bar', role: 'img', 'aria-label': '읽은 비율 ' + pct + '%' }, h('span', { style: 'width:' + pct + '%' })),
      h('details', { open: r.missing.length > 0 && r.missing.length <= 30 }, h('summary', null, '아직 안 읽은 사람 ' + r.missing.length + '명'),
        r.missing.length ? group(r.missing) : h('p', { class: 'sub' }, '모두 읽었습니다.')),
      h('details', null, h('summary', null, '읽은 사람 ' + r.done.length + '명'), r.done.length ? group(r.done) : h('p', { class: 'sub' }, '아직 없습니다.')),
      h('p', { class: 'sub' }, '글을 열어 본 시점을 기준으로 합니다. 외부 열람·열람 전용 계정은 대상에서 뺍니다.'));
  }

  function detailView(board, id, app, alive) {
    app.replaceChildren(UI.skeleton(8));
    const load = async () => {
      let p;
      try { p = await Api.call('boardGet', { id }); } catch (e) { if (alive()) app.replaceChildren(UI.error(e.message, load)); return; }
      if (!alive()) return;
      const remove = async () => {
        if (!confirm('이 글을 삭제할까요?')) return;
        try { await Api.call('boardDelete', { id }); UI.toast('삭제했습니다.'); App.refreshInit(); Router.go('/board/' + board); }
        catch (e) { UI.toast(e.message, true); }
      };
      const input = h('textarea', { rows: 2, placeholder: '댓글을 입력해 주세요', 'aria-label': '댓글' });
      const commentForm = !UI.has('VIEW_EXEC') && h('form', { class: 'comment-form', onsubmit: async (e) => {
        e.preventDefault();
        if (!input.value.trim()) return;
        try { await Api.call('commentAdd', { postId: id, body: input.value }); load(); } catch (err) { UI.toast(err.message, true); }
      } }, input, h('button', { class: 'btn', type: 'submit' }, '등록'));
      app.replaceChildren(h('article', { class: 'section' }, h('div', { class: 'wrap' },
        h('a', { class: 'back', href: board === 'plan' ? '#/plan' : '#/board/' + board }, NAMES[board]),
        h('h1', { class: 'post-h' }, p.title),
        h('p', { class: 'sub' }, p.author + ' · ' + p.created + (p.updated ? ' (수정됨)' : '')),
        p.canEdit && h('div', { class: 'row-btns' },
          h('a', { class: 'btn ghost', href: '#/board/' + board + '/' + id + '/edit' }, '수정'),
          h('button', { class: 'btn ghost', type: 'button', onclick: remove }, '삭제')),
        h('div', { class: 'post-body' }, p.body),
        p.plan ? h('div', { class: 'plan-post' }, Plan.calendar(p.plan),
          h('p', { class: 'sub' }, '원본 ' + p.plan.file + (p.plan.dist ? ' · 배포 ' + p.plan.dist : ''))) : null,
        p.photos.length ? h('div', { class: 'thumbs' }, p.photos.map((f) => UI.thumb(f))) : null,
        p.reads ? readsPanel(p.reads) : null,
        h('h2', { class: 'comment-h' }, '댓글 ' + p.comments.length),
        h('ul', { class: 'comments' }, p.comments.map((c) => h('li', null,
          h('p', { class: 'sub' }, c.author + ' · ' + c.created), h('p', { class: 'pre' }, c.body),
          c.canDelete && !UI.has('VIEW_EXEC') && h('button', { class: 'link', type: 'button', onclick: async () => {
            try { await Api.call('commentDelete', { id: c.id }); load(); } catch (err) { UI.toast(err.message, true); }
          } }, '삭제')))),
        commentForm)));
    };
    load();
  }

  async function formView(board, id, app, alive) {
    let cur = null;
    if (id) {
      app.replaceChildren(UI.skeleton(6));
      try { cur = await Api.call('boardGet', { id }); } catch (e) { if (alive()) app.replaceChildren(UI.error(e.message)); return; }
      if (!alive()) return;
    }
    const title = h('input', { required: true, maxlength: 200, value: cur ? cur.title : '' });
    const body = h('textarea', { rows: 10, required: true, value: cur ? cur.body : '' });
    const pinned = h('input', { type: 'checkbox', checked: !!(cur && cur.pinned) });
    const existing = cur ? cur.photos.slice() : [];
    const removed = [];
    const left = 5 - existing.length;
    const picker = PhotoPicker(left, '사진');
    const keep = h('div', { class: 'thumbs' });
    const drawKeep = () => keep.replaceChildren(...existing.filter((x) => !removed.includes(x)).map((x) => h('div', { class: 'picker-item' },
      h('img', { src: UI.thumbUrl(x), alt: '첨부 사진' }),
      h('button', { type: 'button', class: 'picker-x', 'aria-label': '사진 빼기', onclick: () => { removed.push(x); drawKeep(); } }, '×'))));
    drawKeep();
    const btn = h('button', { class: 'btn wide', type: 'submit' }, cur ? '수정' : '등록');

    /* 생산계획 올리기(전용 권한). 엑셀은 이 화면에서 읽어 집계하고, 서버에는 집계 결과만 보낸다. */
    const planOn = board === 'plan' && !id && UI.has('PLAN_UPLOAD');
    let parsed = null;
    let planSum = null;
    let fileName = '';
    let autoTitle = '';
    let autoBody = '';
    const planBox = h('div', { class: 'plan-up' });
    if (planOn) {
      const today = (App.home.today || '').slice(0, 7) || new Date().toISOString().slice(0, 7);
      const shift = (n) => { const [y, m] = today.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
      const mSel = h('select', { 'aria-label': '대상월' }, h('option', { value: '' }, '대상월 선택'),
        [-1, 0, 1, 2].map((n) => h('option', { value: shift(n) }, shift(n).slice(0, 4) + '년 ' + Number(shift(n).slice(5)) + '월')));
      const fileIn = h('input', { type: 'file', accept: '.xlsx,.xlsm', 'aria-label': '생산계획표 엑셀', hidden: true });
      const fileName2 = h('span', { class: 'sub plan-file' }, '선택된 파일 없음');
      const pick = h('button', { class: 'btn ghost', type: 'button', onclick: () => fileIn.click() }, UI.icon('calendar'), h('span', null, '생산계획표(엑셀) 선택'));
      const status = h('p', { class: 'sub' }, '생산계획표(xlsx)를 올리거나 이 상자 안으로 끌어다 놓고 대상월을 고르면 달력으로 집계합니다.');
      const preview = h('div', { class: 'plan-preview' });
      const refresh = () => {
        planSum = null;
        preview.replaceChildren();
        if (!parsed || !mSel.value) return;
        const sum = Plan.summarize(parsed, mSel.value);
        if (!sum.total) { status.textContent = '선택한 달에 해당하는 계획이 없습니다. 대상월을 다시 확인해 주세요.'; return; }
        planSum = sum;
        const mon = Number(mSel.value.slice(5)) + '월';
        status.textContent = mon + ' 합계 ' + sum.total + '대 (' + Plan.LINES.map((l, i) => l.label + ' ' + sum.totals[i]).join(', ') + '). 확정발주 ' + sum.kinds['확정발주'] + '대, 예시오더 ' + sum.kinds['예시오더'] + '대.';
        const t = mon + ' 생산계획';
        if (!title.value || title.value === autoTitle) { title.value = t; autoTitle = t; }
        const b = mSel.value.slice(0, 4) + '년 ' + mon + ' 생산계획' + (sum.dist ? ' (배포 ' + sum.dist + ')' : '') + '\n' +
          Plan.LINES.map((l, i) => l.label + ' ' + sum.totals[i] + '대').join(' / ') + ' / 합계 ' + sum.total + '대\n원본: ' + fileName;
        if (!body.value || body.value === autoBody) { body.value = b; autoBody = b; }
        preview.append(Plan.calendar(sum));
      };
      fileIn.onchange = async () => {
        const f = fileIn.files[0];
        parsed = null;
        planSum = null;
        preview.replaceChildren();
        fileName2.textContent = f ? f.name : '선택된 파일 없음';
        if (!f) return;
        fileName = f.name;
        try {
          status.textContent = '파일을 읽는 중입니다. 크기에 따라 몇 초 걸립니다.';
          const [XLSX, data] = await Promise.all([Plan.loadLib(), f.arrayBuffer()]);
          await new Promise((r) => setTimeout(r, 60));
          parsed = Plan.parse(XLSX, data);
          if (parsed.errors.length) { status.textContent = '생산계획표 형식을 확인해 주세요. ' + parsed.errors.join(' '); parsed = null; return; }
          status.textContent = '읽었습니다.' + (parsed.dist ? ' 배포일자 ' + parsed.dist + '.' : '') + ' 대상월을 골라 주세요.';
          refresh();
        } catch (e) { status.textContent = e.message || '파일을 읽지 못했습니다.'; parsed = null; }
      };
      mSel.onchange = refresh;
      planBox.append(h('h2', { class: 'block-h' }, '생산계획표 올리기'), h('div', { class: 'plan-pick' }, pick, fileName2, fileIn), h('div', { class: 'plan-month' }, h('span', { class: 'sub' }, '대상월'), mSel), status, preview);
    }
    const form = h('form', { class: 'narrow write-form', onsubmit: async (e) => {
      e.preventDefault();
      if (planOn && !planSum) { UI.toast(parsed ? '대상월을 선택해 주세요.' : '생산계획표(엑셀) 파일을 먼저 선택해 주세요.', true); return; }
      btn.disabled = true;
      let postId = id;
      let ticket = '';
      let calMsg = '';
      try {
        const res = await Api.call('boardSave', Object.assign({ id: id || null, board, title: title.value, body: body.value, pinned: pinned.checked, removePhotos: removed },
          planSum ? { plan: { ym: planSum.ym, days: planSum.days, dist: planSum.dist, file: fileName, off: Object.keys(Plan.HOLIDAYS).filter((d) => d.indexOf(planSum.ym + '-') === 0) } } : {}));
        postId = res.id;
        ticket = res.ticket;
        calMsg = res.calendar ? (res.calendar.ok ? ' QR장비점검 근무캘린더(' + Number(res.calendar.ym.slice(5)) + '월)에도 반영했습니다' + (res.calendar.special ? '(특근 ' + res.calendar.special + '일).' : '.') : ' QR장비점검 근무캘린더에는 반영하지 못했습니다. 관리자에게 알려 주세요.') : '';
        const mhr = res.calendar && res.calendar.mh;
        if (mhr) calMsg += ' 공수 현황에 ' + Number(mhr.ym.slice(5)) + '월 생산 ' + mhr.prod + '대' + (mhr.contract !== null && mhr.contract !== undefined ? ', 계약 인원 ' + mhr.contract + '명(' + mhr.label + ')을 반영했습니다.' : '을 반영했습니다(계약 인원표를 올리면 계약 인원도 채워집니다).');
      } catch (err) { UI.toast(err.message, true); btn.disabled = false; return; }
      const finish = () => { UI.toast('저장했습니다.' + calMsg, !!calMsg && calMsg.indexOf('못했습니다') >= 0); App.refreshInit(); Router.go('/board/' + board + '/' + postId); };
      const jobs = picker.files.map((file) => ({ file }));
      if (jobs.length) sendPhotos(jobs, ticket, progress, finish); else finish();
    } },
      planOn ? planBox : null, UI.field('제목', title), UI.field('내용', body),
      board === 'notice' && UI.has('NOTICE_WRITE') && h('label', { class: 'check' }, pinned, h('span', null, '상단 고정')),
      existing.length ? keep : null, board === 'plan' ? null : picker.el, h('div', { class: 'submit-bar' }, btn));
    const progress = ProgressBox(form);
    app.replaceChildren(UI.hero(cur ? '글 수정' : board === 'plan' ? '생산계획 올리기' : NAMES[board] + ' 글쓰기'), h('section', { class: 'section' }, form));
  }

  ['notice', 'work', 'plan'].forEach((board) => {
    /* 생산계획은 목록 대신 생산계획 화면(달력)을 쓴다. */
    Router.add('/board/' + board, (p, app, alive) => (board === 'plan' ? Router.go('/plan') : listView(board, app, alive)));
    Router.add('/board/' + board + '/new', (p, app, alive) => {
      if (!canWrite(board)) { app.replaceChildren(UI.placeholder('글을 쓸 권한이 없습니다')); return; }
      formView(board, null, app, alive);
    });
    Router.add('/board/' + board + '/:id', (p, app, alive) => detailView(board, p.id, app, alive));
    Router.add('/board/' + board + '/:id/edit', (p, app, alive) => formView(board, p.id, app, alive));
  });
})();
