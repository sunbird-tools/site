import { IOS_IPA, IOS_LOADER } from '../lib/discord';
import { byId } from '../lib/dom';
import { downloadFile, fetchBytes, sha256 } from '../lib/download';
import { readPlugins } from '../lib/inputs';
import { Step, megabytes, resetProgress } from '../lib/progress';
import type { IpaReply, IpaRequest } from '../lib/protocol';

const input = byId('ipa-file', HTMLInputElement);
const label = byId('ipa-label', HTMLElement);
const go = byId('ipa-go', HTMLButtonElement);
const warning = byId('ipa-warn', HTMLParagraphElement);
const failure = byId('ipa-err', HTMLParagraphElement);
const unselected = label.textContent;
let ipaUrl: string | null = null;

input.addEventListener('change', () => {
   const file = input.files?.[0];
   label.textContent = file ? `${file.name} (${megabytes(file.size)})` : unselected;
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

function warn(text: string) {
   warning.textContent = text;
   warning.hidden = false;
}

/** The mirror's IPA is refused on a mismatch. A picked one is patched anyway, since it is the user's own file. */
async function source(file: File | undefined): Promise<Blob | null> {
   const bytes = file
      ? new Uint8Array(await file.arrayBuffer())
      : await downloadFile(IOS_IPA.url, `Discord ${IOS_IPA.version}`);
   const step = new Step('Check SHA-256');
   step.progress(0.5, 'hashing…');

   if ((await sha256(bytes)) === IOS_IPA.sha256) {
      step.done(`Discord ${IOS_IPA.version}`);
      return file ?? new Blob([bytes]);
   }

   step.fail('mismatch');

   if (file) {
      warn(
         `This IPA does not match the Discord ${IOS_IPA.version} build the patcher was checked against. It is patched anyway and may not work.`,
      );
      return file;
   }

   warn(
      `The IPA from ${new URL(IOS_IPA.url).host} does not match its known SHA-256, so it may have been changed. It was not patched. Select your own decrypted IPA instead.`,
   );
   return null;
}

go.onclick = async () => {
   go.disabled = true;
   warning.hidden = true;
   failure.hidden = true;
   byId('ipa-result', HTMLElement).hidden = true;
   resetProgress();

   try {
      const ipa = await source(input.files?.[0]);
      if (!ipa) return;

      const plugins = (await readPlugins()) ?? [];
      const loader = await fetchBytes(IOS_LOADER);
      const step = new Step('Patch IPA');
      step.progress(0.5, 'working…');
      const patched = await patch({ ipa, loader, plugins });
      step.done(megabytes(patched.size));

      const link = byId('ipa-dl', HTMLAnchorElement);
      if (ipaUrl) URL.revokeObjectURL(ipaUrl);
      ipaUrl = URL.createObjectURL(patched);
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
