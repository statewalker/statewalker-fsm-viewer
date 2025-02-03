import { FsmProcess } from "./deps/@statewalker/fsm.js";
import { getInvalidation } from "./trackDomNode.js";
import { _addStateRenderer } from "./_addStateRenderer.js";

export function renderStateDescription({
  process,
  renderer,
}: {
  process: FsmProcess;
  renderer: (statesStack: string[]) => undefined | HTMLElement;
}) {
  const div = document.createElement("div");
  const invalidation = getInvalidation(div);
  _addStateRenderer(
    process,
    async (stack) => {
      const view = renderer(stack);
      view && div.appendChild(view);
      return () => view?.remove();
    },
    invalidation,
  );
  return div;
}
