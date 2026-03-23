const CACHE_NAME = 'mgy';
const CACHE_EXTERNAL_NAME = 'external-assets-cache-v14';
const STUDY_TAG = 'Daily-Study-Reminder';

const OFFLINE_URLS = [
  './',
  'index.html',
  'pages/app.js',
  'pages/style.css',
  'pages/site.webmanifest',
  'img/mwflag.png',
  'img/mgy.jpg',
  'img/apple-touch-icon.png',
  'img/favicon-32x32.png',
  'img/favicon-16x16.png',
  'img/android-chrome-192x192.png',
  'img/android-chrome-512x512.png',
  'favicon.icon',
  'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js',
  'https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js',
  'img/mgyG.jpg'
];

const EXTERNAL_HOSTS = [
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// --- 1. INSTALL: Force caching of all critical files ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use addAll for reliability; it ensures all core files are stored
      return cache.addAll(OFFLINE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// --- 2. ACTIVATE: Clean old caches ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => (k !== CACHE_NAME && k !== CACHE_EXTERNAL_NAME) ? caches.delete(k) : null)
    )).then(() => self.clients.claim())
  );
});

// --- 3. FETCH: THE OFFLINE-FIRST STRATEGY (CRITICAL FIX) ---
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Return from cache if found
      if (cachedResponse) return cachedResponse;

      // 2. If not in cache, try network
      return fetch(event.request).then(networkResponse => {
        // Cache external assets (Tailwind/Fonts) on the fly
        if (EXTERNAL_HOSTS.includes(url.hostname)) {
          return caches.open(CACHE_EXTERNAL_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
       
        if (event.request.mode === 'navigate') {
          return caches.match('index.html') || caches.match('./');
        }
      });
    })
  );
});




self.addEventListener('sync', event => {
  if (event.tag === 'study-sync') {
    event.waitUntil(runBackgroundSync());
  }
});


async function runBackgroundSync() {
  
}



self.addEventListener('message', event => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    showLocalNotification(event.data.payload);
  }
});

function showLocalNotification(data) {
  self.registration.showNotification(
    data.title || 'Study Tracker',
    {
      body: data.body || 'Reminder',
      tag: data.id || 'study',
      renotify: true,
      icon: data.icon,
      badge: data.badge,
      image: data.img,
      data: { url: './' }
    }
  );
}


`self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});`


self.addEventListener('periodicsync', event => {
  if (event.tag === STUDY_TAG) {
    event.waitUntil(
      showLocalNotification({
        title: 'Daily Study Plan',
        body: 'Check your timetable'
      })
    );
  }
});