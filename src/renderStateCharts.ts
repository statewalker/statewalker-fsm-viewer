import type { FsmProcess } from "@statewalker/fsm";
import type { StateGraphEdge, StateGraphNode } from "@statewalker/fsm-charts";
import { isStateTransitionEnabled } from "@statewalker/fsm";
import { newProcessCharts } from "./newProcessCharts.js";
import { _addStateRenderer } from "./_addStateRenderer.js";

export function renderStateCharts({
  process,
  direction = "tb",
  lodash,
  onStateClick,
  onEventClick,
  renderer,
}: {
  process: FsmProcess;
  direction?: "tb" | "bt" | "lr" | "rl";
  lodash: unknown;
  onStateClick?: (statesStack: StateGraphNode[]) => void;
  onEventClick?: (edge: StateGraphEdge) => void;
  renderer?: (statesStack: StateGraphNode[]) => undefined | HTMLElement;
}) {
  const charts = newProcessCharts({
    config: process.config,
    renderer,
    onStateClick,
    onEventClick: async (edge) => {
      const { event } = edge;
      if (isStateTransitionEnabled(process, event)) {
        process.dispatch(event);
      }
      if (onEventClick) {
        onEventClick(edge);
      }
    },
    direction: direction || "tb",
    lodash,
  });
  // const invalidation = getInvalidation(charts);
  _addStateRenderer(
    process,
    (stack) => {
      return charts.selectState(stack);
    },
    // invalidation,
  );
  return charts;
}
