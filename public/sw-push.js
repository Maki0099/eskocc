// Push notification handler for service worker

// Badge API helper - set app badge count
const updateBadge = async (count) => {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
};

// Listen for messages from the main app to update badge
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    updateBadge(event.data.count);
  }
  
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    updateBadge(0);
  }
});

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.body || '',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-64x64.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: [
        {
          action: 'open',
          title: 'Otevřít'
        },
        {
          action: 'close',
          title: 'Zavřít'
        }
      ],
      tag: data.data?.eventId || 'esko-notification',
      renotify: true
    };

    // Update badge when push received
    const badgeCount = data.data?.unreadCount || 1;
    updateBadge(badgeCount);

    event.waitUntil(
      self.registration.showNotification(data.title || 'Esko.cc', options)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification click:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const url = event.notification.data?.url || '/events';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Clear badge when all notifications are dismissed
self.addEventListener('notificationclose', (event) => {
  // Get all active notifications
  event.waitUntil(
    self.registration.getNotifications().then((notifications) => {
      if (notifications.length === 0) {
        updateBadge(0);
      }
    })
  );
});
