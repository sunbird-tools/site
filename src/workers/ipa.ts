import init, { IpaBuild } from '../pkg/patcher_web.js';
import type { IpaReply, IpaRequest } from '../lib/protocol';

const scope = self as unknown as {
   onmessage: ((event: MessageEvent<IpaRequest>) => void) | null;
   postMessage(reply: IpaReply): void;
};

const ready = init();

scope.onmessage = async ({ data: request }) => {
   await ready;
   const build = new IpaBuild();

   try {
      build.setLoader(request.loader);
      for (const { name, source } of request.plugins) build.addPlugin(name, source);
      // `patch` returns a copy in its own ArrayBuffer, never a view of wasm memory.
      const ipa = build.patch(request.ipa) as Uint8Array<ArrayBuffer>;
      scope.postMessage({
         kind: 'ipa',
         ipa: new Blob([ipa], { type: 'application/octet-stream' }),
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
