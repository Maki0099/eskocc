// Push notification and Share Target handler for service worker

const SHARE_CACHE_NAME = 'shared-files-cache';

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

// Share Target handler - intercept POST requests to /share-target
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle POST requests to /share-target
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const gpxFile = formData.get('gpx');
    
    if (!gpxFile || !(gpxFile instanceof File)) {
      console.error('No GPX file found in share target request');
      return Response.redirect('/events', 303);
    }
    
    // Generate unique share ID
    const shareId = `share-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Store file in cache
    const cache = await caches.open(SHARE_CACHE_NAME);
    const response = new Response(gpxFile, {
      headers: {
        'Content-Type': gpxFile.type || 'application/gpx+xml',
        'X-File-Name': encodeURIComponent(gpxFile.name),
        'X-Share-Id': shareId,
      }
    });
    
    await cache.put(`/${shareId}`, response);
    
    console.log('Shared GPX file cached with ID:', shareId);
    
    // Redirect to share target page with the share ID
    return Response.redirect(`/share-target?shareId=${shareId}`, 303);
    
  } catch (error) {
    console.error('Error handling share target:', error);
    return Response.redirect('/events', 303);
  }
}

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
