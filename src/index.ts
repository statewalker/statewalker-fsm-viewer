import {
  getStateDescriptionRenderer,
  buildStatechartCss,
  buildCharts,
  getGraphParamsProvider,
  buildStatechartsPanel,
  RuntimeStatechartApi,
  StateChartIndex,
} from "@statewalker/fsm-charts";

import {
  isStateTransitionEnabled,
  type FsmProcess,
  type FsmState,
} from "@statewalker/fsm";

import { getInvalidation } from "./trackDomNode.js";
import { a } from "vitest/dist/chunks/suite.B2jumIFP.js";

export function prepareStateDescriptions({
  element,
  rootStateKey,
}: {
  element: HTMLElement;
  rootStateKey: string;
}): (statesStack: string[]) => undefined | HTMLElement {
  return getStateDescriptionRenderer({
    element,
    rootStateKey,
  });
}

export function renderStateDescription({
  process,
  renderer,
}: {
  process: FsmProcess;
  renderer: (statesStack: string[]) => undefined | HTMLElement;
}) {
  const div = document.createElement("div");
  const invalidation = getInvalidation(div);
  addStateRenderer(
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

export function renderStateCharts({
  process,
  direction = "tb",
  lodash,
}: {
  process: FsmProcess;
  direction?: "tb" | "bt" | "lr" | "rl";
  lodash: unknown;
}) {
  const charts = newProcessCharts({
    config: process.config,
    onEventClick: async ({ event }) => {
      if (isStateTransitionEnabled(process, event)) {
        process.dispatch(event);
      }
    },
    direction: direction || "tb",
    lodash,
  });
  const invalidation = getInvalidation(charts);
  addStateRenderer(
    process,
    (stack) => {
      return charts.selectState(stack);
    },
    invalidation,
  );
  return charts;
}

function addStateRenderer(
  process: FsmProcess,
  renderer: (
    stack: string[],
    event?: string,
  ) => void | (() => void) | Promise<void | (() => void)>,
  invalidation?: Promise<unknown>,
) {
  async function callHandlerOnState(state?: FsmState) {
    if (!state) return;
    const stack: string[] = [];
    for (let s: FsmState | undefined = state; s; s = s.parent) {
      stack.unshift(s.key);
    }
    const event = state.process.event;
    let cleanup = await renderer(stack, event);
    state.onExit(async () => cleanup?.());
  }
  callHandlerOnState(process.state);
  const cleanup = process.onStateCreate((state: FsmState) => {
    state.onEnter(callHandlerOnState);
  });
  invalidation?.then(cleanup);
  return cleanup;
}

function newIdGenerator(idCounter = 0) {
  return function newId(prefix = "id") {
    const id = (idCounter = (idCounter || 0) + 1);
    return `${prefix}_${id}`;
  };
}

export const newId = newIdGenerator(0);

export function renderCss(rootSelector: string = ":root") {
  const css = buildStatechartCss({ prefix: rootSelector });
  const style = document.createElement("style");
  style.innerHTML = `
  ${css}
  ${rootSelector} {
    --transition-active-background-color: #eee;
    --transition-active-border-color: none;
    --transition-active-border-width: 0;
    --transition-active-line-color: blue;
    --transition-active-line-width: 1px;
    --transition-active-label-color: blue;
    --state-active-background-color: white;
    --state-active-border-color: blue;
    --state-active-border-width: 2px;
    --state-active-label-color: blue;
  }
  ${rootSelector} {
    --state-selected-border-width: 1px;
  }
  `;
  return style;
}

export type FsmStateChartsConfig = {
  key: string;
  transitions?: [from: string, event: string, to: string][];
  states?: FsmStateChartsConfig[];
} & Record<string, unknown>;
export function newProcessCharts({
  config,
  direction = "lr",
  // onStateClick,
  // onTransitionClick,
  onEventClick,
  invalidation,
  lodash
}: {
  direction?: "tb" | "bt" | "lr" | "rl";
  config: FsmStateChartsConfig;
  onStateClick?: (stateId: string) => void;
  onTransitionClick?: (transitionId: string) => void;
  onEventClick?: (edge: { event: string }) => void;
  invalidation?: Promise<void>;
  lodash : unknown;
}): HTMLElement & { selectState: (stack: string[]) => () => void } {
  // ====================================================
  // Stage 1: create a static statechart index

  const fontSize = 12;
  const transitionsFontSize = 6;
  const statechart = buildCharts({
    lodash,
    newId,
    config,
    direction,
    padding: [fontSize, fontSize],
    ...getGraphParamsProvider({
      // fontSize,
      stateFontSize: fontSize,
      stateTextPadding: fontSize,
      transitionsFontSize,
      transitionsTextPadding: [
        transitionsFontSize * 1.6,
        transitionsFontSize * 2,
      ],
    }),
  });

  // ====================================================
  // Stage 2: build DOM/SVG/CSS elements
  // to visualize interactive charts in the browser

  const chartId = newId("statechart");
  const lines: string[] = [];
  buildStatechartsPanel({
    statechart,
    newId,
    println: (str: string) => lines.push(str),
  });
  const html = lines.join("\n");

  const element = document.createElement("div");
  element.setAttribute("id", chartId);
  element.innerHTML = `${html}`;

  const css = renderCss(`#${chartId}`);
  element.appendChild(css);

  const api = new RuntimeStatechartApi({
    element,
    statechart,
  });
  const chartsIndex = new StateChartIndex({ statechart });

  function selectState(stack: string[]) {
    const idsStack = chartsIndex.getStatesIds(...stack);
    const eventsIndex: Record<string, boolean> = {};
    api.deselectTransitions("active");
    api.deselectStates("active");
    api.closeStatePanels();
    for (let i = idsStack.length - 1; i >= 0; i--) {
      const stateId = idsStack[i];
      api.selectState(stateId, "active");
      api.openStatePanel(stateId);
      const transitions = chartsIndex.getTransitions(stateId);
      transitions.forEach((t) => {
        if (!eventsIndex[t.event]) {
          if (t.to !== "<final>") {
            eventsIndex[t.event] = true;
          }
          api.selectTransition(t.id, "active");
        }
      });
    }
    return () => {
      api.deselectTransitions("active");
      api.deselectStates("active");
      api.closeStatePanels();
    };
  }

  const unregisterStateListeners = api.onStateClick((stateId: string) => {
    const nodes = chartsIndex.getStackByStateId(stateId);
    const nodeIds = nodes.map((n) => n.id);
    const selected = api.isStateSelected(stateId, "selected");
    api.deselectTransitions("selected");
    api.deselectStates("selected");
    api.closeStatePanels();
    for (let i = 0; i < nodeIds.length; i++) {
      const id = nodeIds[i];
      api.openStatePanel(id);
      api.selectState(id, "selected");
      // const transitions = chartsIndex.getTransitions(id);
      // transitions.forEach((t) => api.selectTransition(t.id, "selected"));
    }
    if (selected) {
      api.deselectState(stateId, "selected");
      api.closeStatePanel(stateId);
      // const transitions = chartsIndex.getTransitions(stateId);
      // transitions.forEach((t) => api.deselectTransition(t.id, "selected"));
    } else {
      api.openStatePanel(stateId);
    }
  });

  // const unregisterTransitionsListeners = api.onTransitionClick(
  //   (transitionId) => {
  //     // api.toggleTransition(transitionId);
  //     console.log(">> transition", transitionId);
  //   }
  // );
  invalidation && invalidation.then(unregisterStateListeners);
  // invalidation.then(unregisterTransitionsListeners);

  if (onEventClick) {
    const unregisterClickListener = api.onTransitionClick(
      (transitionId: string) => {
        const edge = chartsIndex.getEdgeById(transitionId);
        edge && onEventClick(edge);
      },
    );
    invalidation &&
      unregisterClickListener &&
      invalidation.then(unregisterClickListener);
  }
  // initRuntimeApi({ statechart, element: element });
  return Object.assign(element, { selectState });
}
