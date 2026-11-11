const CACHE_NAME = 'catatanku-v3';
const ESSENTIAL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

const OPTIONAL_ASSETS = [
    './icons/icon-72.png',
    './icons/icon-96.png',
    './icons/icon-128.png',
    './icons/icon-144.png',
    './icons/icon-152.png',
    './icons/icon-384.png'
];

// Install — cache asset utama agar bisa offline secara tangguh
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Caching asset utama untuk offline...');
            // Asset penting harus tersimpan
            await cache.addAll(ESSENTIAL_ASSETS);
            // Asset opsional dicache tanpa menggagalkan proses install jika ada yang absen
            await Promise.allSettled(
                OPTIONAL_ASSETS.map((asset) => cache.add(asset).catch(() => {}))
            );
        })
    );
    // Langsung aktifkan tanpa menunggu
    self.skipWaiting();
});

// Activate — hapus cache lama jika versi baru
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Menghapus cache lama:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Ambil alih semua halaman yang terbuka
    self.clients.claim();
});

// Fetch — Cache First strategy (offline-first)
// Selalu ambil dari cache dulu, kalau tidak ada baru dari network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Ada di cache — langsung return (offline-ready)
                return cachedResponse;
            }

            // Tidak ada di cache — coba fetch dari network
            return fetch(event.request).then((networkResponse) => {
                // Cache response baru untuk offline nanti
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Offline dan tidak ada di cache — return fallback untuk navigasi
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// Background Sync — untuk reminder notifications
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CHECK_REMINDERS') {
        // Terima data reminder dari app
        console.log('[SW] Reminder check received');
    }
});

// Push notification handler (untuk pengingat)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Fokus ke window yang sudah terbuka
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Buka window baru jika belum ada
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});
