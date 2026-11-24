import { defineConfig } from 'astro/config';

export default defineConfig({
   site: 'https://sunbird.tools',
   // CI restores this between runs, so the GitHub loaders have stored data to fall back on.
   cacheDir: '.cache',
   // The patcher worker imports the wasm-bindgen module, which needs an ES module worker.
   vite: { worker: { format: 'es' } },
});
