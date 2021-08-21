import { Instance } from "./ReactDOMHostConfig";

const randomKey = Math.random()
  .toString(36)
  .slice(2);
const internalInstanceKey = '__reactFiber$' + randomKey;
const internalPropsKey = '__reactProps$' + randomKey;
const internalContainerInstanceKey = '__reactContainer$' + randomKey;
const internalEventHandlersKey = '__reactEvents$' + randomKey;
const internalEventHandlerListenersKey = '__reactListeners$' + randomKey;
const internalEventHandlesSetKey = '__reactHandles$' + randomKey;

export function detachDeletedInstance(node: Instance): void {
  // TODO: This function is only called on host components. I don't think all of
  // these fields are relevant.
  delete (node as any)[internalInstanceKey];
  delete (node as any)[internalPropsKey];
  delete (node as any)[internalEventHandlersKey];
  delete (node as any)[internalEventHandlerListenersKey];
  delete (node as any)[internalEventHandlesSetKey];
}