// Local test server: serves the built site in dist/ and stands in for the proxy using split files from a folder.
// usage: pnpm build && node tools/dev-server.ts <dir with base.apk, config.*.apk> [port]
// open http://localhost:8787/?proxy=http://localhost:8787 ; POST /upload saves a body to upload.apk
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const [splitArg, port = '8787'] = process.argv.slice(2);
if (!splitArg) throw new Error('usage: node tools/dev-server.ts <dir with the splits> [port]');
const splits = resolve(splitArg);
const types: Record<string, string> = {
   '.html': 'text/html',
   '.css': 'text/css',
   '.js': 'text/javascript',
   '.wasm': 'application/wasm',
   '.apk': 'application/vnd.android.package-archive',
};

createServer((request, response) => {
   const url = new URL(request.url ?? '/', 'http://x');
   response.setHeader('Access-Control-Allow-Origin', '*');
   response.setHeader('Access-Control-Expose-Headers', 'Content-Length');

   if (request.method === 'POST' && url.pathname === '/upload') {
      request.pipe(createWriteStream('upload.apk')).on('finish', () => response.end('ok'));
      return;
   }

   const split = url.pathname.match(/^\/tracker\/download\/\d+\/([\w.]+)$/)?.[1];
   const file = split
      ? join(splits, `${split}.apk`)
      : join(root, normalize(url.pathname === '/' ? '/index.html' : url.pathname));

   if (
      !file.startsWith(split ? splits : root) ||
      !existsSync(file) ||
      statSync(file).isDirectory()
   ) {
      response.statusCode = 404;
      response.end('not found');
      return;
   }

   response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
   response.setHeader('Content-Length', statSync(file).size);
   createReadStream(file).pipe(response);
}).listen(Number(port), () =>
   console.log(`http://localhost:${port}/?proxy=http://localhost:${port}`),
);
