import { ABIS, DENSITIES, FRIDA, PACKAGE, type Abi, type Density } from './discord';
import { byId } from './dom';
import { fetchOk } from './download';
import { Step, log, megabytes } from './progress';
import type { Frida, FridaScript, PluginSource } from './protocol';

export interface Splits {
   code: number;
   abi: Abi;
   density: Density;
   language: string | null;
}

export function readSplits(): Splits {
   const name = byId('dpi', HTMLSelectElement).value;
   const density = DENSITIES.find((candidate) => candidate.name === name);
   if (!density) throw new Error(`unknown density ${name}`);
   const abiName = byId('abi', HTMLSelectElement).value;
   const abi = ABIS.find((candidate) => candidate.name === abiName);
   if (!abi) throw new Error(`unknown architecture ${abiName}`);
   const language = byId('lang', HTMLSelectElement).value;
   return {
      code: Number(byId('ver', HTMLSelectElement).value),
      abi,
      density,
      language: language === 'none' ? null : `config.${language}`,
   };
}

const PACKAGE_NAME = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

/** "Replace Discord" keeps com.discord, "Next to Discord" takes the typed name. */
export function chosenPackage(): string {
   return byId('mode', HTMLSelectElement).value === 'replace'
      ? PACKAGE
      : byId('pkg', HTMLInputElement).value.trim();
}

export function checkPackage(): boolean {
   const name = byId('pkg', HTMLInputElement).value.trim();
   const side = byId('mode', HTMLSelectElement).value === 'side';
   const bad = side && (!PACKAGE_NAME.test(name) || name === PACKAGE || name.length > 127);
   byId('pkg', HTMLInputElement).setAttribute('aria-invalid', String(bad));
   return !bad;
}

const readFiles = (input: HTMLInputElement) =>
   Promise.all(
      [...(input.files ?? [])].map(async (file) => ({
         file,
         text: await file.text(),
      })),
   );

/** Null with the runtime off. */
export async function readPlugins(): Promise<PluginSource[] | null> {
   if (!byId('runtime', HTMLInputElement).checked) return null;

   const picked = [
      ...document.querySelectorAll<HTMLInputElement>('#jsp-bundled input:checked'),
   ].map((input) => input.value);
   const plugins = await Promise.all(
      picked.map(async (name) => ({
         name,
         source: await (await fetchOk(`/plugins/${name}.js`)).text(),
      })),
   );

   for (const { file, text } of await readFiles(byId('jsp-files', HTMLInputElement))) {
      plugins.push({ name: file.name.replace(/\.[^.]*$/, ''), source: text });
   }

   const code = byId('jsp-code', HTMLTextAreaElement).value.trim();
   if (code) plugins.push({ name: 'my-plugin', source: code });
   return plugins;
}

/** Null with Frida off. A typo fails the build here instead of showing up only in the app's console. */
export async function readFrida(): Promise<Frida | null> {
   if (!byId('frida-on', HTMLInputElement).checked) return null;

   const scripts: FridaScript[] = (await readFiles(byId('frida-files', HTMLInputElement))).map(
      ({ file, text }) => ({ name: file.name, code: text }),
   );
   const code = byId('frida-code', HTMLTextAreaElement).value.trim();
   if (code) scripts.push({ name: 'editor.js', code });

   for (const { name, code: source } of scripts) {
      try {
         new Function(source);
      } catch (error) {
         throw new Error(`${name}: ${error instanceof Error ? error.message : error}`);
      }
   }

   const bootstrap = await (await fetchOk(FRIDA.bootstrap)).text();
   const step = new Step('Download frida-gadget');
   const response = await fetch(FRIDA.gadget);

   if (!response.ok) {
      step.fail(`HTTP ${response.status}`);
      throw new Error(`frida-gadget: HTTP ${response.status}`);
   }

   const gadget = new Uint8Array(await response.arrayBuffer());
   step.done(megabytes(gadget.length));
   log(`Frida: ${scripts.map((script) => script.name).join(', ')}`);
   return { gadget, bootstrap, scripts };
}
