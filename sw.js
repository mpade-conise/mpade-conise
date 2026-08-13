// Service Worker for WhatsApp Call Global Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification click when user is outside app or browser tab is hidden
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If window/tab is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || '📲 WhatsApp Incoming Call';
    const options = {
      body: data.body || 'Tap to answer incoming call...',
      icon: data.icon || '/favicon.svg',
      tag: 'whatsapp-call-incoming',
      requireInteraction: true,
      data: data
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("SW Push parsing error:", err);
  }
});
