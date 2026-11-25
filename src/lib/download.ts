import { DENSITIES, TRACKER, type Density } from './discord';
import { Step, megabytes } from './progress';

const DEFAULT_PROXY = 'https://phoenix-apk-proxy.mantikafasi.workers.dev';

/** The CORS proxy in front of the tracker (worker/proxy.ts). `?proxy=` overrides it, and an empty one means manual mode. */
export const PROXY = (new URLSearchParams(location.search).get('proxy') ?? DEFAULT_PROXY).replace(
   /\/$/,
   '',
);

export const trackerUrl = (code: number, split: string) =>
   `${TRACKER}/tracker/download/${code}/${split}`;

export async function fetchOk(url: string): Promise<Response> {
   const response = await fetch(url);
   if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
   return response;
}

export const fetchBytes = async (url: string) =>
   new Uint8Array(await (await fetchOk(url)).arrayBuffer());

/** Reads into one buffer sized by Content-Length, so a 170 MB split is not copied again. */
async function read(response: Response, step: Step): Promise<Uint8Array<ArrayBuffer>> {
   if (!response.body) throw new Error(`${response.url}: no body`);
   const total = Number(response.headers.get('Content-Length')) || 0;
   const reader = response.body.getReader();
   let buffer = new Uint8Array(total || 1 << 24);
   let length = 0;

   for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      if (length + value.length > buffer.length) {
         const grown = new Uint8Array(Math.max(buffer.length * 2, length + value.length));
         grown.set(buffer.subarray(0, length));
         buffer = grown;
      }

      buffer.set(value, length);
      length += value.length;
      step.progress(
         total ? length / total : 0,
         total ? `${megabytes(length)} / ${megabytes(total)}` : megabytes(length),
      );
   }

   step.done(megabytes(length));
   return length === buffer.length ? buffer : buffer.slice(0, length);
}

export async function downloadFile(url: string, label: string): Promise<Uint8Array<ArrayBuffer>> {
   const step = new Step(`Download ${label}`);
   const response = await fetch(url);

   if (!response.ok) {
      step.fail(`HTTP ${response.status}`);
      throw new Error(`${label}: HTTP ${response.status}`);
   }

   return read(response, step);
}

export async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
   const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
   return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const download = (code: number, split: string) =>
   downloadFile(`${PROXY}/tracker/download/${code}/${split}`, split);

export async function tryDownload(code: number, split: string): Promise<Uint8Array | null> {
   const step = new Step(`Download ${split}`);
   const response = await fetch(`${PROXY}/tracker/download/${code}/${split}`);
   if (response.ok) return read(response, step);
   step.done('not available');
   return null;
}

/** The tracker mirrors only some densities per build (356207 has hdpi and xxhdpi), and Android scales any of them. */
export async function downloadDensity(code: number, wanted: Density): Promise<Uint8Array> {
   const nearest = [...DENSITIES].sort(
      (left, right) =>
         Math.abs(left.dpi - wanted.dpi) - Math.abs(right.dpi - wanted.dpi) || right.dpi - left.dpi,
   );

   for (const density of nearest) {
      const bytes = await tryDownload(code, `config.${density.name}`);
      if (bytes) return bytes;
   }

   throw new Error('this build has no density split on the tracker');
}
