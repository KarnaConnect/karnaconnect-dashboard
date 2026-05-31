importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAKFrbgo5o2YuXu-kF1HP5JexWs9G3RRkE",
  authDomain: "mash-notifications.firebaseapp.com",
  projectId: "mash-notifications",
  storageBucket: "mash-notifications.firebasestorage.app",
  messagingSenderId: "719234440936",
  appId: "1:719234440936:web:e91f6e7d382c414b6f735d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const { title, body, icon } = payload.notification;
  
  self.registration.showNotification(title, {
    body,
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data,
    actions: [
      { action: 'view', title: 'View Call' }
    ]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || 'https://dashboard.mashai.com.au';
  event.waitUntil(clients.openWindow(url));
});
