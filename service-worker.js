/**
 * Service Worker for Smart Weather Station PWA
 * Enables offline functionality and faster loading
 */

const CACHE_NAME = 'sws-cache-v1';
const urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/voice-assistant.js',
  // Add any other static files you want cached
];

// Install service worker and cache files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip WebSocket and AWS requests (always need network)
  if (event.request.url.includes('ws://') ||
      event.request.url.includes('wss://') ||
      event.request.url.includes('amazonaws.com') ||
      event.request.url.includes('openai.com') ||
      event.request.url.includes('elevenlabs.io')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseClone = response.clone();

        // Cache the fetched response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then((response) => {
          return response || new Response('Offline - Please check your connection', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');

  let data = {
    title: 'Smart Weather Station',
    body: 'You have a new alert!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'sws-alert',
    requireInteraction: true
  };

  // Parse notification data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || 'Smart Weather Station Alert',
        body: payload.body || payload.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.tag || 'sws-alert',
        data: payload.data || {},
        requireInteraction: payload.critical || false,
        vibrate: [200, 100, 200]
      };
    } catch (e) {
      console.error('Error parsing notification data:', e);
      data.body = event.data.text();
    }
  }

  const promiseChain = self.registration.showNotification(data.title, data);
  event.waitUntil(promiseChain);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (let client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});
