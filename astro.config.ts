import { defineConfig } from 'astro/config';

export default defineConfig({
   site: 'https://sunbird.tools',
   // The patcher worker imports the wasm-bindgen module, which needs an ES module worker.
   vite: { worker: { format: 'es' } },
});
