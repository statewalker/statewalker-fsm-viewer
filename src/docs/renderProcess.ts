import { prepareStateDescriptions, renderStateCharts } from "../index.js";
import { type FsmProcessConfig, newProcess } from "@statewalker/fsm";

export * from "@statewalker/fsm-viewer";

export * from "@statewalker/fsm";

import _ from "lodash";

export function renderProcess(
  processConfig: FsmProcessConfig,
  {
    element,
    invalidation,
    direction = "lr",
  }: {
    element?: HTMLElement;
    invalidation?: Promise<void>;
    direction?: "lr" | "rl" | "tb" | "bt";
  } = {},
) {
  const renderer: (stateStack: string[]) => undefined | HTMLElement = element
    ? prepareStateDescriptions({
        element,
        rootStateKey: processConfig.key,
      })
    : () => undefined;

  const process = newProcess(processConfig, {
    print: console.warn,
    prefix: `[${processConfig.key}:${Date.now()}]`,
  });
  // const description = renderStateDescription({ process, renderer });
  const charts = renderStateCharts({
    process,
    renderer: (nodesStack) => {
      const statesStack = nodesStack.map((node) => node.key);
      return renderer(statesStack);
    },
    direction,
    lodash: _,
  });
  invalidation?.then(() => {
    process.shutdown("exit");
    // description.remove();
    charts.remove();
  });
  return {
    // description,
    charts,
    process,
  };
}
