export type Cleanup = () => void;
export type Render = (root: HTMLElement) => Cleanup | void;

let cleanup: Cleanup | void;

export function show(render: Render): void {
  const root = document.querySelector<HTMLElement>("#app")!;
  cleanup?.();
  cleanup = undefined;
  root.replaceChildren();
  window.scrollTo(0, 0);
  cleanup = render(root);
}
