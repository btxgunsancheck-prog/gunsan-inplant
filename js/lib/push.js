/* 휴대폰 알림: 켜기·끄기·기기 등록. Firebase 도구는 알림을 켤 때만 불러온다. */
const Push = (() => {
  const SDK = ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js'];
  const cfg = () => window.FIREBASE_CONFIG || {};
  const configured = () => !!(cfg().projectId && window.FIREBASE_VAPID_KEY);
  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const device = () => (isIos() ? 'iPhone' : /android/i.test(navigator.userAgent) ? 'Android' : 'PC').slice(0, 40);
  let messaging = null;
  let reg = null;

  /* off: 서버·설정이 아직 준비 안 됨 / unsupported / install: 아이폰은 홈 화면에 추가해야 함 / denied / default / granted */
  function status() {
    if (!configured() || !(App.home && App.home.pushReady) || UI.has('GUEST') || UI.has('VIEW_EXEC')) return 'off';
    if (isIos() && !standalone()) return 'install';
    if (!supported()) return 'unsupported';
    return Notification.permission;
  }

  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('알림 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'));
    document.head.append(s);
  });

  async function getMessaging() {
    if (messaging) return messaging;
    for (const src of SDK) await loadScript(src);
    if (!firebase.apps.length) firebase.initializeApp(cfg());
    reg = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    messaging = firebase.messaging();
    return messaging;
  }

  async function token() {
    const m = await getMessaging();
    return m.getToken({ vapidKey: window.FIREBASE_VAPID_KEY, serviceWorkerRegistration: reg });
  }

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error(perm === 'denied' ? '알림이 차단되어 있습니다. 휴대폰 설정에서 이 앱의 알림을 허용해 주세요.' : '알림을 허용하지 않았습니다.');
    const t = await token();
    if (!t) throw new Error('이 기기에서는 알림을 켤 수 없습니다.');
    await Api.call('pushRegister', { token: t, device: device() });
    try { localStorage.setItem('push-sync', String(Date.now())); } catch (e) { /* 저장 불가는 무시 */ }
    return t;
  }

  async function disable() {
    const t = await token();
    if (t) await Api.call('pushUnregister', { token: t });
    if (messaging) await messaging.deleteToken().catch(() => {});
  }

  /* 이미 허용한 기기는 하루 1번 조용히 다시 등록한다(기기 정보가 바뀌었을 때를 대비). */
  async function sync() {
    try {
      if (status() !== 'granted') return;
      const last = Number(localStorage.getItem('push-sync') || 0);
      if (Date.now() - last < 86400000) return;
      const t = await token();
      if (t) { await Api.call('pushRegister', { token: t, device: device() }); localStorage.setItem('push-sync', String(Date.now())); }
    } catch (e) { /* 실패해도 화면에는 영향이 없다 */ }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.link) location.hash = e.data.link; });
  }
  return { status, enable, disable, sync, isIos };
})();
