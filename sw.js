/**
 * ImgOpti Service Worker
 * Enables offline functionality and caching
 */

const CACHE_NAME = 'imgopti-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/modules/stateManager.js',
    '/js/modules/utils.js',
    '/js/modules/imageLoader.js',
    '/js/modules/imageProcessor.js',
    '/js/modules/imageCompressor.js',
    '/js/modules/formatConverter.js',
    '/js/modules/downloadManager.js',
    '/js/modules/uiManager.js',
    '/js/modules/imageEditor.js',
    '/js/modules/watermark.js',
    '/js/modules/historyManager.js',
    '/js/modules/presets.js',
    '/js/modules/comparisonSlider.js',
    '/js/modules/smartCompression.js',
    '/js/modules/cropTool.js',
    '/js/modules/adjustments.js',
    '/js/modules/imageInfo.js',
    '/js/modules/keyboardShortcuts.js',
    '/js/modules/drawingTools.js',
    '/js/modules/blurTool.js',
    '/js/modules/borderFrame.js',
    '/js/modules/collageMaker.js',
    '/js/modules/colorPicker.js',
    '/js/modules/straightenTool.js',
    '/js/modules/dragReorder.js',
    '/js/modules/backgroundRemoval.js',
    '/js/modules/textRecognition.js',
    '/js/modules/recentFiles.js',
    '/js/modules/customPresets.js',
    '/js/modules/onboarding.js',
    '/manifest.json'
];

// External resources to cache
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                // Cache static assets
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Cache error:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                // Take control of all clients
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip CDN resources that need to be fresh (Tailwind, libraries)
    if (url.hostname === 'cdn.tailwindcss.com' ||
        url.hostname === 'cdn.jsdelivr.net') {
        event.respondWith(networkFirst(request));
        return;
    }

    // For same-origin requests, use cache-first strategy
    if (url.origin === self.location.origin) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // For external resources (fonts), use stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request));
});

/**
 * Cache-first strategy
 * Try cache, fall back to network
 */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        // Return offline page if available
        return caches.match('/index.html');
    }
}

/**
 * Network-first strategy
 * Try network, fall back to cache
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

/**
 * Stale-while-revalidate strategy
 * Return cache immediately, update in background
 */
async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);

    const fetchPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                const cache = caches.open(CACHE_NAME);
                cache.then((c) => c.put(request, response.clone()));
            }
            return response;
        })
        .catch(() => cached);

    return cached || fetchPromise;
}

// Handle share target (receiving shared images)
self.addEventListener('fetch', (event) => {
    if (event.request.method === 'POST' &&
        new URL(event.request.url).pathname === '/') {

        event.respondWith(
            (async () => {
                const formData = await event.request.formData();
                const files = formData.getAll('images');

                // Store files temporarily
                const cache = await caches.open('shared-images');
                for (let i = 0; i < files.length; i++) {
                    await cache.put(`/shared/${i}`, new Response(files[i]));
                }

                // Redirect to app
                return Response.redirect('/?shared=true', 303);
            })()
        );
    }
});

// Message handling for cache management
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data === 'clearCache') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[SW] Cache cleared');
        });
    }
});

console.log('[SW] Service worker loaded');
