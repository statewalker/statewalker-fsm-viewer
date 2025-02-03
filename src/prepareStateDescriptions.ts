import { getStateDescriptionRenderer } from "./deps/@statewalker/fsm-charts.js";

export function prepareStateDescriptions({
  element,
  rootStateKey,
}: {
  element: HTMLElement;
  rootStateKey: string;
}): (statesStack: string[]) => undefined | HTMLElement {
  const renderer = getStateDescriptionRenderer({
    element,
    rootStateKey,
  });
  return (statesStack: string[]) => {
    return renderer(statesStack);
  };
}
