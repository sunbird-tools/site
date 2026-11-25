import { IOS_LOADER } from '../lib/discord';
import { byId } from '../lib/dom';
import { fetchBytes } from '../lib/download';
import { readPlugins } from '../lib/inputs';
import { Step, megabytes, resetProgress } from '../lib/progress';
import type { IpaReply, IpaRequest } from '../lib/protocol';

const input = byId('ipa-file', HTMLInputElement);
const label = byId('ipa-label', HTMLElement);
const go = byId('ipa-go', HTMLButtonElement);
const failure = byId('ipa-err', HTMLParagraphElement);
let ipaUrl: string | null = null;

input.addEventListener('change', () => {
   const file = input.files?.[0];
   label.textContent = file ? `${file.name} (${megabytes(file.size)})` : 'No IPA selected';
   go.disabled = !file;
});

function patch(request: IpaRequest): Promise<Blob> {
   return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('../workers/ipa.ts', import.meta.url), { type: 'module' });

      worker.onmessage = ({ data: reply }: MessageEvent<IpaReply>) => {
         worker.terminate();
         if (reply.kind === 'ipa') resolve(reply.ipa);
         else reject(new Error(reply.message));
      };

      worker.onerror = (event) => {
         worker.terminate();
         reject(new Error(event.message));
      };

      worker.postMessage(request, [request.loader.buffer]);
   });
}

go.onclick = async () => {
   const file = input.files?.[0];
   if (!file) return;

   go.disabled = true;
   failure.hidden = true;
   byId('ipa-result', HTMLElement).hidden = true;
   resetProgress();

   try {
      const plugins = (await readPlugins()) ?? [];
      const loader = await fetchBytes(IOS_LOADER);
      const step = new Step('Patch IPA');
      step.progress(0.5, 'working…');
      const ipa = await patch({ ipa: file, loader, plugins });
      step.done(megabytes(ipa.size));

      const link = byId('ipa-dl', HTMLAnchorElement);
      if (ipaUrl) URL.revokeObjectURL(ipaUrl);
      ipaUrl = URL.createObjectURL(ipa);
      link.href = ipaUrl;
      link.download = 'discord-sunbird.ipa';
      byId('ipa-result', HTMLElement).hidden = false;
      link.scrollIntoView({ behavior: 'smooth' });
   } catch (error) {
      console.error(error);
      failure.textContent = `Patch failed: ${error instanceof Error ? error.message : String(error)}`;
      failure.hidden = false;
   } finally {
      go.disabled = false;
   }
};
