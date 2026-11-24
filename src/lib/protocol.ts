export interface Library {
   name: string;
   bytes: Uint8Array;
}

export interface PluginSource {
   name: string;
   source: string;
}

export interface FridaScript {
   name: string;
   code: string;
}

export interface Frida {
   gadget: Uint8Array;
   bootstrap: string;
   scripts: FridaScript[];
}

/** `plugins` is null with the runtime off, which leaves only the access patches. */
export interface PatchRequest {
   apks: Uint8Array[];
   libraries: Library[];
   plugins: PluginSource[] | null;
   frida: Frida | null;
   packageName: string;
   label: string | null;
}

export type PatchReply =
   | { kind: 'log'; line: string }
   | { kind: 'apk'; apk: Blob }
   | { kind: 'error'; message: string };
