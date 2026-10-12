/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data: { title: string; body: string; url?: string; reminderId?: string }
  try { data = event.data.json() } catch { data = { title: 'MindTrack', body: event.data.text() } }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.reminderId ?? 'mindtrack',
      data: { url: data.url ?? '/', reminderId: data.reminderId },
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const focused = clients.find(c => c.url.includes(self.location.origin))
      if (focused) { focused.focus(); focused.navigate(url) }
      else self.clients.openWindow(url)
    })
  )
})
