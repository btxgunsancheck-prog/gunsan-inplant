/* 휴대폰 알림을 받아 화면에 띄우는 파일(서비스 워커). 알림에는 제목과 한 줄만 들어 있다. */
importScripts('firebase-config.js');
if (self.FIREBASE_CONFIG && self.FIREBASE_CONFIG.projectId) {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  firebase.initializeApp(self.FIREBASE_CONFIG);
  firebase.messaging().onBackgroundMessage((payload) => {
    const d = (payload && payload.data) || {};
    return self.registration.showNotification(d.title || '사내물류팀', {
      body: d.body || '', icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', data: { link: d.link || '#/' }
    });
  });
}
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '#/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if ('focus' in c) { c.postMessage({ link }); return c.focus(); }
    }
    return self.clients.openWindow(self.registration.scope + link);
  }));
});
