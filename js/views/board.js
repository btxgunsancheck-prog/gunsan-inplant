/* 공지사항과 업무 게시판. */
(() => {
  const NAMES = { notice: '공지사항', work: '업무 게시판' };
  const canWrite = (board) => !UI.has('VIEW_EXEC') && (board === 'work' || UI.has('NOTICE_WRITE'));

  function listView(board, app, alive) {
    let page = 1;
    let q = '';
    const body = h('div', { class: 'wrap' }, UI.skeleton(6));
    const search = h('input', { type: 'search', placeholder: '제목 검색', 'aria-label': '제목 검색' });
    const draw = (data) => {
      if (!alive()) return;
      fill(body,
        data.items.length
          ? h('ul', { class: 'post-list' }, data.items.map((p) => h('li', { class: p.pinned ? 'pinned' : '' },
            h('a', { href: '#/board/' + board + '/' + p.id },
              h('span', { class: 'post-title' }, p.pinned && h('span', { class: 'tag' }, '고정'), p.title),
              h('span', { class: 'sub' }, p.author + ' · ' + UI.dateOnly(p.created) + (p.photoCount ? ' · 사진 ' + p.photoCount : ''))))))
          : h('p', { class: 'sub center' }, q ? '검색 결과가 없습니다.' : '등록된 글이 없습니다.'),
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
      body),
      canWrite(board) && h('a', { class: 'fab', href: '#/board/' + board + '/new' }, '작성'));
    load();
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
        h('a', { class: 'back', href: '#/board/' + board }, NAMES[board]),
        h('h1', { class: 'post-h' }, p.title),
        h('p', { class: 'sub' }, p.author + ' · ' + p.created + (p.updated ? ' (수정됨)' : '')),
        p.canEdit && h('div', { class: 'row-btns' },
          h('a', { class: 'btn ghost', href: '#/board/' + board + '/' + id + '/edit' }, '수정'),
          h('button', { class: 'btn ghost', type: 'button', onclick: remove }, '삭제')),
        h('div', { class: 'post-body' }, p.body),
        p.photos.length ? h('div', { class: 'thumbs' }, p.photos.map((f) => UI.thumb(f))) : null,
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
    const form = h('form', { class: 'narrow', onsubmit: async (e) => {
      e.preventDefault();
      btn.disabled = true;
      let postId = id;
      try {
        const res = await Api.call('boardSave', { id: id || null, board, title: title.value, body: body.value, pinned: pinned.checked, removePhotos: removed });
        postId = res.id;
      } catch (err) { UI.toast(err.message, true); btn.disabled = false; return; }
      const finish = () => { UI.toast('저장했습니다.'); App.refreshInit(); Router.go('/board/' + board + '/' + postId); };
      const send = async (jobs) => {
        const failed = await uploadPhotos(jobs, (i, n) => progress.show(i, n));
        if (failed.length) progress.failed(failed.length, () => send(failed));
        else finish();
      };
      const jobs = picker.files.map((file) => ({ file, meta: { target: 'post', id: postId } }));
      if (jobs.length) send(jobs); else finish();
    } },
      UI.field('제목', title), UI.field('내용', body),
      board === 'notice' && UI.has('NOTICE_WRITE') && h('label', { class: 'check' }, pinned, h('span', null, '상단 고정')),
      existing.length ? keep : null, picker.el, btn);
    const progress = ProgressBox(form);
    app.replaceChildren(UI.hero(cur ? '글 수정' : NAMES[board] + ' 글쓰기'), h('section', { class: 'section' }, form));
  }

  ['notice', 'work'].forEach((board) => {
    Router.add('/board/' + board, (p, app, alive) => listView(board, app, alive));
    Router.add('/board/' + board + '/new', (p, app, alive) => {
      if (!canWrite(board)) { app.replaceChildren(UI.placeholder('글을 쓸 권한이 없습니다')); return; }
      formView(board, null, app, alive);
    });
    Router.add('/board/' + board + '/:id', (p, app, alive) => detailView(board, p.id, app, alive));
    Router.add('/board/' + board + '/:id/edit', (p, app, alive) => formView(board, p.id, app, alive));
  });
})();
