// sw.js v1792840000000
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        return caches.delete(key);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  // NEVER intercept Firestore, Firebase, Google APIs, or any cross-origin requests
  if (!url.startsWith(self.location.origin) || 
      url.includes('firestore.googleapis.com') || 
      url.includes('googleapis.com') || 
      url.includes('gstatic.com') || 
      url.includes('firebaseio.com') ||
      url.includes('firebase')) {
    return;
  }
  e.respondWith(fetch(e.request));
});
