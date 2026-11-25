import { PACKAGE, type Abi } from '../lib/discord';
import { byId } from '../lib/dom';
import {
   PROXY,
   download,
   downloadDensity,
   fetchBytes,
   trackerUrl,
   tryDownload,
} from '../lib/download';
import {
   checkPackage,
   chosenLabel,
   chosenPackage,
   readFrida,
   readPlugins,
   readSplits,
   type Splits,
} from '../lib/inputs';
import { Step, log, megabytes, resetProgress } from '../lib/progress';
import type { Library, PatchReply, PatchRequest } from '../lib/protocol';

const go = byId('go', HTMLButtonElement);
const failure = byId('err', HTMLParagraphElement);
let apkUrl: string | null = null;

function setBusy(busy: boolean) {
   go.disabled = busy;
   go.textContent = busy ? 'Patching…' : 'Patch Discord';
}

function patch(request: PatchRequest): Promise<Blob> {
   return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('../workers/patcher.ts', import.meta.url), {
         type: 'module',
      });

      worker.onmessage = ({ data: reply }: MessageEvent<PatchReply>) => {
         if (reply.kind === 'log') return log(reply.line);
         worker.terminate();
         if (reply.kind === 'apk') resolve(reply.apk);
         else reject(new Error(reply.message));
      };

      worker.onerror = (event) => {
         worker.terminate();
         reject(new Error(event.message));
      };

      const buffers = [
         ...request.apks,
         ...request.libraries.map((library) => library.bytes),
         ...(request.frida ? [request.frida.gadget] : []),
      ];
      worker.postMessage(
         request,
         buffers.map((bytes) => bytes.buffer),
      );
   });
}

async function patchAndOffer(code: number, abi: Abi, apks: Uint8Array[]) {
   const plugins = await readPlugins();
   const frida = await readFrida();
   const step = new Step('Patch and sign');
   step.progress(0.5, 'working…');

   const packageName = chosenPackage();
   const side = packageName !== PACKAGE;
   const libraries: Library[] = plugins
      ? await Promise.all(
           Object.entries(abi.libraries).map(async ([name, url]) => ({
              name,
              bytes: await fetchBytes(url),
           })),
        )
      : [];

   const apk = await patch({
      apks,
      libraries,
      plugins,
      frida,
      packageName,
      label: chosenLabel(side),
   });
   step.done(megabytes(apk.size));

   byId('note-side', HTMLElement).hidden = !side;
   byId('note-replace', HTMLElement).hidden = side;
   const link = byId('dl', HTMLAnchorElement);
   if (apkUrl) URL.revokeObjectURL(apkUrl);
   apkUrl = URL.createObjectURL(apk);
   link.href = apkUrl;
   link.download = `discord-${code}-sunbird${side ? '-side' : ''}.apk`;
   byId('result', HTMLElement).hidden = false;
   link.scrollIntoView({ behavior: 'smooth' });
}

function fail(error: unknown) {
   console.error(error);
   failure.textContent = `Patch failed: ${error instanceof Error ? error.message : String(error)}`;
   failure.hidden = false;
   setBusy(false);
}

/** The user downloads the splits, and the patcher tells them apart by content. */
function showManual(splits: Splits) {
   const names = [
      'base',
      splits.abi.split,
      `config.${splits.density.name}`,
      splits.language,
   ].filter((name) => name !== null);

   byId('links', HTMLUListElement).replaceChildren(
      ...names.map((name) => {
         const link = Object.assign(document.createElement('a'), {
            href: trackerUrl(splits.code, name),
            target: '_blank',
            rel: 'noopener',
            textContent: `${name}.apk`,
         });
         const item = document.createElement('li');
         item.append(link);
         return item;
      }),
   );

   byId('manual', HTMLElement).hidden = false;
   setBusy(false);

   byId('files', HTMLInputElement).onchange = async ({ target }) => {
      try {
         setBusy(true);
         const files = [...((target as HTMLInputElement).files ?? [])];
         await patchAndOffer(
            splits.code,
            splits.abi,
            await Promise.all(files.map(async (file) => new Uint8Array(await file.arrayBuffer()))),
         );
         setBusy(false);
      } catch (error) {
         fail(error);
      }
   };
}

go.onclick = async () => {
   if (!checkPackage()) {
      failure.textContent = 'Use a valid package name like com.discord.phoenix (not com.discord).';
      failure.hidden = false;
      byId('pkg', HTMLInputElement).focus();
      return;
   }

   const splits = readSplits();
   setBusy(true);
   failure.hidden = true;
   byId('manual', HTMLElement).hidden = true;
   byId('result', HTMLElement).hidden = true;
   resetProgress();
   if (!PROXY) return showManual(splits);

   try {
      const base = await download(splits.code, 'base');
      const abi = await download(splits.code, splits.abi.split);
      const density = await downloadDensity(splits.code, splits.density);
      const language = splits.language ? await tryDownload(splits.code, splits.language) : null;
      await patchAndOffer(splits.code, splits.abi, [
         base,
         abi,
         density,
         ...(language ? [language] : []),
      ]);
      setBusy(false);
   } catch (error) {
      // fetch throws TypeError when CORS or the network blocks the proxy.
      if (!(error instanceof TypeError)) return fail(error);
      log(`download blocked (${error.message}); switching to manual mode`);
      showManual(splits);
   }
};
