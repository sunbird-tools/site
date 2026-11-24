// Cloudflare Worker: CORS pass-through for the Discord APK tracker, which redirects to Google's
// CDN (no CORS headers). Only /tracker/index and /tracker/download/<versionCode>/<split> are allowed.
// Splits of a given versionCode never change, so they are kept in the edge cache (Cache API, per
// data center) for a year and marked immutable for browsers; the index is cached for 5 minutes.
// Deploy: `npx wrangler deploy worker/proxy.ts --name phoenix-apk-proxy --compatibility-date 2026-11-01`
const UPSTREAM = 'https://tracker.vendetta.rocks';
const CORS = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Methods': 'GET, OPTIONS',
   'Access-Control-Expose-Headers': 'Content-Length, X-Cache',
};
const SPLIT = /^\/tracker\/download\/\d{6,9}\/(base|config\.[A-Za-z0-9_]+)$/;

type CacheState = 'HIT' | 'MISS';

function withHeaders(response: Response, state: CacheState): Response {
   const headers = new Headers(response.headers);
   for (const [name, value] of Object.entries(CORS)) headers.set(name, value);
   headers.set('X-Cache', state);
   return new Response(response.body, { status: response.status, headers });
}

export default {
   async fetch(request, _env, context) {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
      const { pathname } = new URL(request.url);
      const isSplit = SPLIT.test(pathname);

      if (request.method !== 'GET' || !(isSplit || pathname === '/tracker/index')) {
         return new Response('not found', { status: 404, headers: CORS });
      }

      const cache = caches.default;
      const key = new Request(`https://phoenix-apk-proxy.cache${pathname}`);
      const hit = await cache.match(key);
      if (hit) return withHeaders(hit, 'HIT');

      const upstream = await fetch(UPSTREAM + pathname, { redirect: 'follow' });
      const headers = new Headers({
         'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
      });
      const length = upstream.headers.get('Content-Length');
      if (length) headers.set('Content-Length', length);
      // 404s (e.g. a density the tracker doesn't mirror) are cached briefly too
      headers.set(
         'Cache-Control',
         upstream.ok && isSplit ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
      );

      const response = new Response(upstream.body, {
         status: upstream.status,
         headers,
      });
      if (upstream.ok || upstream.status === 404)
         context.waitUntil(cache.put(key, response.clone()));
      return withHeaders(response, 'MISS');
   },
} satisfies ExportedHandler;
