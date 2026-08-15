// Self-unregistering / pass-through service worker for dev & client caching
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
