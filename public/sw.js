self.addEventListener('push', function(event) {
  let data = { title: 'New Notification', body: 'You have a new update.', url: '/' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=192&h=192&fit=crop', // Highly-focused educational PNG for robust mobile compatibility
    badge: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=96&h=96&fit=crop',
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
