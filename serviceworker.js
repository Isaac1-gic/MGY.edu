const CACHE_NAME = 'mgy-v1-06-2026-8';
const CACHE_EXTERNAL_NAME = 'external-assets-cache-v5';
const STUDY_TAG = 'Daily-edu-updates';

const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/pages/app.js',
  '/style.css',
  '/pages/class.js',
  '/manifest.json',
  '/img/mwflag.png',
  '/img/mgy.jpg',
  '/img/apple-touch-icon.png',
  '/img/favicon-32x32.png',
  '/img/favicon-16x16.png',
  '/img/android-chrome-192x192.png',
  '/img/android-chrome-512x512.png',
  '/img/poster.png',
 
  '/img/mgyG.jpg',
  "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js",
  "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js",
  "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js",
  "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js",
  "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js",
  "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
  'https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js'
];

const EXTERNAL_HOSTS = [
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'res.cloudinary.com'
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
          return caches.match('/index.html') || caches.match('/');
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
    data.title,
    {
      body: data.body,
      tag: 'mgy-chat-notification' + data.id,
      badge: '/img/android-chrome-192x192.png',
      icon: '/img/android-chrome-512x512.png',
      image: data.cover,
      renotify: true,
      data: { url: '/?'+data.quary }
    }
  );
}


self.addEventListener('notificationclick', event => {
  event.notification.close();

  // Use the path from the data
  const targetPath = event.notification.data.url; 

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      for (let client of clientList) {
        // Check if the client's URL path ends with your target path
        // This is much safer than matching the full string
        if (client.url.includes(targetPath) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open the window using the path
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
    })
  );
});


self.addEventListener('periodicsync', event => {
  if (event.tag === STUDY_TAG) {
    event.waitUntil(
      showLocalNotification({
        title: 'Daily Educational Updates',
        body: 'Check out whats new today',
        tag: 'Updates',
        badge: '/img/android-chrome-192x192.png',
        icon: '/img/android-chrome-512x512.png',
        image: '/img/poster.png',
        data: { url: '/' },
        renotify: true
      })
    );
  }
});


try {
  importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

  const firebaseConfig = {
		  apiKey: "AIzaSyC7nmIZQO78vUvOmQshCfLfL03xQGIZRoA",
		  authDomain: "msce-g-studies-tracker-baa6f.firebaseapp.com",
		  databaseURL: "https://msce-g-studies-tracker-baa6f-default-rtdb.europe-west1.firebasedatabase.app",
		  projectId: "msce-g-studies-tracker-baa6f",
		  storageBucket: "msce-g-studies-tracker-baa6f.firebasestorage.app",
		  messagingSenderId: "1082032866052",
		  appId: "1:1082032866052:web:8b8f1041f696a10ec70651",
		  measurementId: "G-2DBK08C244"
		};
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {

      self.registration.showNotification(
          payload.notification?.title || 'MGY',
          {
              body: payload.notification?.body || '',
              badge: '/img/android-chrome-192x192.png',
              icon: '/img/android-chrome-512x512.png',
              image: '/img/poster.png',
              data: {
                  url: payload.data.url
                }
            }
      );

  });

} catch (err) {
  console.log('FCM unavailable', err);
}
