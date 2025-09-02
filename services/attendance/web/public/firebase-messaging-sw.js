// Firebase Messaging Service Worker
// This file handles background push notifications

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

// Initialize Firebase in service worker
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)

  const notificationTitle = payload.notification?.title || 'Attendance Notification'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/icons/notification-icon-192x192.png',
    badge: payload.notification?.badge || '/icons/notification-badge-72x72.png',
    image: payload.notification?.image,
    tag: payload.notification?.tag || 'attendance-notification',
    data: {
      ...payload.data,
      click_action: payload.notification?.click_action || '/',
      timestamp: Date.now()
    },
    actions: payload.notification?.actions || [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ],
    requireInteraction: payload.notification?.requireInteraction || false,
    silent: payload.notification?.silent || false,
    vibrate: payload.notification?.vibrate || [200, 100, 200],
    renotify: true,
    timestamp: Date.now()
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)

  const notification = event.notification
  const action = event.action
  const data = notification.data || {}

  notification.close()

  // Handle different actions
  let urlToOpen = '/'

  switch (action) {
    case 'view':
      urlToOpen = data.click_action || data.url || '/'
      break
    case 'dismiss':
      // Just close the notification
      return
    default:
      // Default click action
      urlToOpen = data.click_action || data.url || '/'
      break
  }

  // Open the app or focus existing tab
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          if (urlToOpen !== '/') {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: urlToOpen,
              data: data
            })
          }
          return
        }
      }

      // If app is not open, open it
      return clients.openWindow(urlToOpen)
    })
  )

  // Track notification click
  if ('indexedDB' in self) {
    trackNotificationEvent('click', {
      notificationId: data.notificationId,
      action,
      timestamp: Date.now(),
      url: urlToOpen
    })
  }
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event)

  const notification = event.notification
  const data = notification.data || {}

  // Track notification close
  if ('indexedDB' in self) {
    trackNotificationEvent('close', {
      notificationId: data.notificationId,
      timestamp: Date.now()
    })
  }
})

// Push event handler (fallback)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)

  if (!event.data) {
    console.log('Push event has no data')
    return
  }

  try {
    const payload = event.data.json()
    console.log('Push payload:', payload)

    const title = payload.notification?.title || 'DOT Attendance'
    const options = {
      body: payload.notification?.body || 'You have a new notification',
      icon: payload.notification?.icon || '/icons/notification-icon-192x192.png',
      badge: '/icons/notification-badge-72x72.png',
      tag: payload.notification?.tag || 'default',
      data: payload.data || {},
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    }

    event.waitUntil(
      self.registration.showNotification(title, options)
    )
  } catch (error) {
    console.error('Error parsing push data:', error)
  }
})

// Background sync for offline notification tracking
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag)

  if (event.tag === 'notification-tracking') {
    event.waitUntil(syncNotificationEvents())
  }
})

// Function to track notification events locally
function trackNotificationEvent(eventType, eventData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NotificationTracking', 1)
    
    request.onerror = () => reject(request.error)
    
    request.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction(['events'], 'readwrite')
      const store = transaction.objectStore('events')
      
      const eventRecord = {
        type: eventType,
        data: eventData,
        timestamp: Date.now(),
        synced: false
      }
      
      const addRequest = store.add(eventRecord)
      addRequest.onsuccess = () => resolve()
      addRequest.onerror = () => reject(addRequest.error)
    }
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('events')) {
        const store = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('synced', 'synced', { unique: false })
      }
    }
  })
}

// Function to sync notification events with server
function syncNotificationEvents() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NotificationTracking', 1)
    
    request.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction(['events'], 'readwrite')
      const store = transaction.objectStore('events')
      const index = store.index('synced')
      
      const getAllRequest = index.getAll(false) // Get unsynced events
      
      getAllRequest.onsuccess = () => {
        const events = getAllRequest.result
        
        if (events.length === 0) {
          resolve()
          return
        }
        
        // Send events to server
        fetch('/api/notification-tracking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ events })
        })
        .then(response => response.json())
        .then(result => {
          if (result.success) {
            // Mark events as synced
            const updateTransaction = db.transaction(['events'], 'readwrite')
            const updateStore = updateTransaction.objectStore('events')
            
            events.forEach(event => {
              event.synced = true
              updateStore.put(event)
            })
            
            resolve()
          } else {
            reject(new Error('Failed to sync events'))
          }
        })
        .catch(reject)
      }
    }
    
    request.onerror = () => reject(request.error)
  })
}

// Install event
self.addEventListener('install', (event) => {
  console.log('Service worker installing...')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service worker activated')
  event.waitUntil(clients.claim())
})