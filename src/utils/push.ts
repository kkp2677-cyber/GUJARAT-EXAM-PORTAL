export async function subscribeToPushNotifications(token: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push messaging is not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('ServiceWorker registered');

    // Wait for the service worker to become fully active and ready
    await navigator.serviceWorker.ready;
    console.log('ServiceWorker ready');

    // Ask for permission using both modern promise and legacy callback fallback to support all mobile devices
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await new Promise<NotificationPermission>((resolve) => {
        const promise = Notification.requestPermission(resolve);
        if (promise) {
          promise.then(resolve);
        }
      });
    }

    if (permission !== 'granted') {
      console.log('Push permission denied');
      return;
    }

    // Get VAPID public key
    const response = await fetch('/api/notifications/vapid-public-key');
    if (!response.ok) return;
    const data = await response.json();
    const publicVapidKey = data.publicKey;

    function urlBase64ToUint8Array(base64String: string) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }

    // Try to retrieve existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If no active subscription exists, create one
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
    }

    // Send subscription to server
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.status === 423) {
      window.dispatchEvent(new CustomEvent('user-blocked'));
      return;
    }
    console.log('Push subscription successful');
  } catch (error) {
    console.error('Error during service worker registration or push subscription:', error);
  }
}
