/* 저장소와 서버 통신. 동시 요청 3개, BUSY와 통신 오류는 1, 2, 4초 간격으로 재시도한다. */
const PREFIX = 'gi_';

const Store = {
  backend() {
    try { return localStorage.getItem(PREFIX + 'remember') === '1' ? localStorage : sessionStorage; } catch (e) { return null; }
  },
  get(key) {
    try { const v = Store.backend().getItem(PREFIX + key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  },
  set(key, value) {
    try { Store.backend().setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* 저장 공간 부족은 무시한다 */ }
  },
  remove(key) { try { Store.backend().removeItem(PREFIX + key); } catch (e) { /* 무시 */ } },
  setRemember(on) {
    try {
      if (on) localStorage.setItem(PREFIX + 'remember', '1');
      else localStorage.removeItem(PREFIX + 'remember');
    } catch (e) { /* 무시 */ }
  },
  clearAll() {
    [localStorage, sessionStorage].forEach((s) => {
      try { Object.keys(s).filter((k) => k.startsWith(PREFIX)).forEach((k) => s.removeItem(k)); } catch (e) { /* 무시 */ }
    });
  },
  draftGet(key) { try { return JSON.parse(localStorage.getItem(PREFIX + 'draft_' + key)); } catch (e) { return null; } },
  draftSet(key, v) { try { localStorage.setItem(PREFIX + 'draft_' + key, JSON.stringify(v)); } catch (e) { /* 무시 */ } },
  draftClear(key) { try { localStorage.removeItem(PREFIX + 'draft_' + key); } catch (e) { /* 무시 */ } }
};

class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const Api = (() => {
  const MAX = 3;
  const DELAYS = [1000, 2000, 4000];
  let active = 0;
  const queue = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function once(action, payload) {
    const res = await fetch(window.APP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: Store.get('token'), payload: payload || {} })
    });
    return res.json();
  }

  async function attempt(action, payload) {
    for (let i = 0; ; i++) {
      let json = null;
      try { json = await once(action, payload); } catch (e) { json = null; }
      if (json && json.ok) return json.data;
      if (json && json.code !== 'BUSY') {
        if (json.code === 'AUTH_EXPIRED') App.expired();
        throw new ApiError(json.code, json.message);
      }
      if (i >= DELAYS.length) {
        throw new ApiError(json ? 'BUSY' : 'ERROR', json ? json.message : '통신이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.');
      }
      await sleep(DELAYS[i]);
    }
  }

  function pump() {
    while (active < MAX && queue.length) {
      const job = queue.shift();
      active++;
      attempt(job.action, job.payload).then(job.resolve, job.reject).finally(() => { active--; pump(); });
    }
  }

  return {
    call(action, payload) {
      return new Promise((resolve, reject) => { queue.push({ action, payload, resolve, reject }); pump(); });
    }
  };
})();

/* 보관한 데이터를 먼저 그린 뒤 새로 받아 바뀐 경우에만 다시 그린다. */
async function loadThenRefresh(key, fetcher, draw, onError) {
  const cached = Store.get('c_' + key);
  if (cached) draw(cached.v);
  try {
    const fresh = await fetcher();
    if (!cached || JSON.stringify(cached.v) !== JSON.stringify(fresh)) {
      Store.set('c_' + key, { t: Date.now(), v: fresh });
      draw(fresh);
    }
  } catch (e) {
    if (e.code !== 'AUTH_EXPIRED' && !cached) onError(e);
  }
}
