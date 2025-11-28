// Service Worker для PWA
const CACHE_NAME = 'dailymoney-v1';

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened');
        // Кэшируем основные файлы
        return cache.addAll([
          '/',
          '/index.html'
        ]).catch((err) => {
          console.log('Service Worker: Cache addAll failed', err);
        });
      })
  );
  // Принудительно активируем новый service worker
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Берем контроль над всеми страницами сразу
  return self.clients.claim();
});

// Перехват запросов (стратегия: Network First, Fallback to Cache)
self.addEventListener('fetch', (event) => {
  // Игнорируем запросы не-GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Проверяем, что ответ валидный
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Клонируем ответ для кэша
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        // Если сеть недоступна, возвращаем из кэша
        return caches.match(event.request).then((response) => {
          // Если нет в кэше, возвращаем index.html для SPA роутинга
          if (!response && event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return response;
        });
      })
  );
});

