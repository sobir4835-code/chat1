self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (err) {
    data = { title: 'Tanishuv Chat', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tanishuv Chat', {
      body: data.body || '',
      tag: data.tag,
      data: { url: data.url || '/messages' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/messages';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
