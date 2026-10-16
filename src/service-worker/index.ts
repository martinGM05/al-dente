import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { resolve } from '$app/paths';
import { self } from '$app/service-worker';

const CACHE = `al-dente-${version}`;
const APP_SHELL = resolve('/');
const ASSETS = [
	...immutable.map((asset) => resolve(asset.path)),
	...assets.map((asset) => resolve(asset.path)),
	...prerendered.map((asset) => resolve(asset.path))
];
const PRECACHE = [...new Set([...ASSETS, APP_SHELL])];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
		)
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			if (ASSETS.includes(url.pathname)) {
				return (await cache.match(url.pathname)) ?? fetch(event.request);
			}

			try {
				const response = await fetch(event.request);
				if (response.ok && event.request.mode === 'navigate') void cache.put(event.request, response.clone());
				return response;
			} catch {
				return (await cache.match(event.request)) ?? (await cache.match(APP_SHELL)) ?? Response.error();
			}
		})()
	);
});
