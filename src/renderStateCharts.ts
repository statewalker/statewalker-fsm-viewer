import { FsmProcess, FsmState } from "./deps/@statewalker/fsm.js";
import { isStateTransitionEnabled } from "./deps/@statewalker/fsm.js";
import { newProcessCharts } from "./newProcessCharts.js";
import { getInvalidation } from "./trackDomNode.js";
import { _addStateRenderer } from "./_addStateRenderer.js";
import type {
  StateGraphEdge,
  StateGraphNode,
} from "./deps/@statewalker/fsm-charts.js";

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
  const invalidation = getInvalidation(charts);
  _addStateRenderer(
    process,
    (stack) => {
      return charts.selectState(stack);
    },
    invalidation,
  );
  return charts;
}
