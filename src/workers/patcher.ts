import init, { Build } from '../pkg/patcher_web.js';
import type { PatchReply, PatchRequest } from '../lib/protocol';

// tsconfig carries the DOM lib for the page, whose postMessage wants a target origin.
const scope = self as unknown as {
   onmessage: ((event: MessageEvent<PatchRequest>) => void) | null;
   postMessage(reply: PatchReply): void;
};

const ready = init();

/** The splits arrive transferred and get copied into wasm memory once. The APK leaves as a Blob built from views of that memory, before anything else calls into wasm. */
scope.onmessage = async ({ data: request }) => {
   await ready;
   const build = new Build();

   try {
      for (const apk of request.apks) build.addApk(apk);

      if (request.plugins) {
         for (const { name, bytes } of request.libraries) build.addLibrary(name, bytes);
         for (const { name, source } of request.plugins) build.addPlugin(name, source);
      }

      if (request.frida) {
         for (const { name, code } of request.frida.scripts) build.addFridaScript(name, code);
         build.setFrida(request.frida.gadget, request.frida.bootstrap);
      }

      const parts = build.merge(request.packageName, request.label, (line: string) =>
         scope.postMessage({ kind: 'log', line }),
      );
      scope.postMessage({
         kind: 'apk',
         apk: new Blob(parts, {
            type: 'application/vnd.android.package-archive',
         }),
      });
   } catch (error) {
      scope.postMessage({
         kind: 'error',
         message: error instanceof Error ? error.message : String(error),
      });
   } finally {
      build.free();
   }
};
