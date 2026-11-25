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
      scope.postMessage({ kind: 'ipa', ipa: build.patch(request.ipa) });
   } catch (error) {
      scope.postMessage({
         kind: 'error',
         message: error instanceof Error ? error.message : String(error),
      });
   } finally {
      build.free();
   }
};
