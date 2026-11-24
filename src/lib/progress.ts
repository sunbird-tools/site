import { byId, query } from './dom';

export const megabytes = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

/** One row of the progress list, cloned from the template in Progress.astro. */
export class Step {
   readonly #row: HTMLLIElement;
   readonly #state: HTMLElement;
   readonly #bar: HTMLElement;

   constructor(label: string) {
      const template = byId('step', HTMLTemplateElement);
      const row = template.content.firstElementChild?.cloneNode(true);
      if (!(row instanceof HTMLLIElement)) throw new Error('#step has no <li>');
      query(row, '.label', HTMLElement).textContent = label;
      this.#row = row;
      this.#state = query(row, '.state', HTMLElement);
      this.#bar = query(row, '.bar i', HTMLElement);
      byId('steps', HTMLOListElement).append(row);
   }

   progress(fraction: number, text = `${Math.round(fraction * 100)}%`) {
      this.#bar.style.width = `${Math.round(fraction * 100)}%`;
      this.#state.textContent = text;
   }

   done(text = 'done') {
      this.#row.classList.add('done');
      this.#bar.style.width = '100%';
      this.#state.textContent = text;
   }

   fail(text = 'failed') {
      this.#row.classList.add('fail');
      this.#state.textContent = text;
   }
}

export function log(line: string) {
   const output = byId('log', HTMLPreElement);
   output.textContent += `${line}\n`;
   output.scrollTop = output.scrollHeight;
}

export function resetProgress() {
   byId('steps', HTMLOListElement).replaceChildren();
   byId('log', HTMLPreElement).textContent = '';
   byId('progress', HTMLElement).hidden = false;
}
