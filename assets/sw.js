// public/sw.js
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);
 
  const data = event.data ? event.data.json() : {};
 
  const title = data.title || 'Player Joined! 🎲';
  const options = {
    body: data.body || 'A player joined the game',
    icon: '/gameAssets/logo.png',
    badge: '/gameAssets/badge.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'player-join',
    data: {
      url: data.url || '/'
    },
    requireInteraction: false,
    silent: false,
  };
 
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
 
// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();
 
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
 
 