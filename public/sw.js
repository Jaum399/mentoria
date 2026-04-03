self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Mentoria', body: 'Nova notificação' };
  const options = {
    body: data.body || 'Nova notificação de estudos',
    icon: '/icon.png',
    badge: '/icon.png',
    data: { url: '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window' }).then(clientList => {
    for (const client of clientList) {
      if (client.url === '/' && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow('/');
  }));
});