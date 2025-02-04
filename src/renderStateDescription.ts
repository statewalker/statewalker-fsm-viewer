import type { FsmProcess } from "@statewalker/fsm";
import { _addStateRenderer } from "./_addStateRenderer.js";

export function renderStateDescription({
  process,
  renderer,
}: {
  process: FsmProcess;
  renderer: (statesStack: string[]) => undefined | HTMLElement;
}) {
  const div = document.createElement("div");
  _addStateRenderer(process, async (stack) => {
    const view = renderer(stack);
    view && div.appendChild(view);
    return () => view?.remove();
  });
  return div;
}
