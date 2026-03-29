const CACHE = 'jejum-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600&family=Playfair+Display:ital,wght@0,700;1,400&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

// Notificações agendadas via postMessage da app
const scheduledTimers = [];

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE_NOTIF') {
    const { delay, title, body, tag } = e.data;
    if (delay <= 0) return;
    const timer = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        vibrate: [200, 100, 200],
        tag: tag || 'jejum-progress',
        renotify: true
      });
    }, delay);
    scheduledTimers.push(timer);
  }

  if (e.data.type === 'CANCEL_NOTIFS') {
    scheduledTimers.forEach(t => clearTimeout(t));
    scheduledTimers.length = 0;
  }

  if (e.data.type === 'SCHEDULE_REMINDER') {
    const { delay, label } = e.data;
    if (delay <= 0) return;
    setTimeout(() => {
      self.registration.showNotification('Jejum', {
        body: label || 'Hora do teu jejum!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        vibrate: [100, 50, 100],
        tag: 'jejum-reminder',
        renotify: true
      });
    }, delay);
  }
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Jejum', body: 'Lembrete de jejum' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      vibrate: [200, 100, 200],
      tag: 'jejum-notif',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('index.html') || c.url.endsWith('/'));
      if (existing) return existing.focus();
      return clients.openWindow('/');
    })
  );
});
