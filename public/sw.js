// Unified Service Worker — auto-invalidates on every deploy
// No hardcoded cache version; clears ALL caches on activate

let _currentVersion = null;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  // Delete ALL caches to guarantee fresh content
  e.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/~oauth")) return;
  if (url.hostname.includes("supabase")) return;

  const dest = e.request.destination;

  // Network-First for documents, scripts, styles — never serve stale app
  if (dest === "document" || dest === "script" || dest === "style" || dest === "worker") {
    e.respondWith(
      fetch(e.request, { cache: "no-store" }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache images as offline fallback only
  if (dest === "image" && url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open("uhomesales-images").then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
});

// ── Version check: detect new deploys and force update ──
async function checkForUpdate() {
  try {
    const res = await fetch("/version.json?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (_currentVersion === null) {
      _currentVersion = data.v;
      return;
    }
    if (data.v !== _currentVersion) {
      _currentVersion = data.v;
      // New deploy detected — clear caches and reload all clients
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      const allClients = await clients.matchAll({ type: "window" });
      allClients.forEach((client) => client.navigate(client.url));
    }
  } catch {
    // ignore network errors
  }
}

// Check for new version every 3 minutes
setInterval(checkForUpdate, 3 * 60 * 1000);

// ── Push Notifications ──
self.addEventListener("push", (e) => {
  if (!e.data) return;
  try {
    const data = e.data.json();
    const options = {
      body: data.body || "Nova notificação UhomeSales",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      vibrate: [300, 100, 300, 100, 300],
      data: { url: data.url || "/" },
      actions: data.actions || [
        { action: "open", title: "Abrir" },
        { action: "dismiss", title: "Fechar" },
      ],
      tag: data.data?.tag || "uhome-notification",
      renotify: true,
      requireInteraction: true,
      silent: false,
    };
    e.waitUntil(self.registration.showNotification(data.title || "UhomeSales", options));
  } catch (err) {
    console.error("Push event error:", err);
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "dismiss") return;
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
