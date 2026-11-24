export function byId<T extends HTMLElement>(id: string, kind: new () => T): T {
   const element = document.getElementById(id);
   if (!(element instanceof kind)) throw new Error(`#${id} is not a ${kind.name}`);
   return element;
}

export function query<T extends Element>(root: ParentNode, selector: string, kind: new () => T): T {
   const element = root.querySelector(selector);
   if (!(element instanceof kind)) throw new Error(`${selector} is not a ${kind.name}`);
   return element;
}
