import { Fiber } from "../../../react-reconciler/src/ReactInternalTypes";
import { HostComponent, HostText, SuspenseComponent, HostRoot } from "../../../react-reconciler/src/ReactWorkTags";
import { ReactScopeInstance } from "../../../shared/ReactTypes";
import { Container, Instance, Props, SuspenseInstance, TextInstance } from "./ReactDOMHostConfig";

let didWarnInvalidHydration = false;


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

export function isContainerMarkedAsRoot(node: Container): boolean {
  return !!(node as any)[internalContainerInstanceKey];
}


export function getInstanceFromNode(node: Node): Fiber | null {
  const inst =
    (node as any)[internalInstanceKey] ||
    (node as any)[internalContainerInstanceKey];
  if (inst) {
    if (
      inst.tag === HostComponent ||
      inst.tag === HostText ||
      inst.tag === SuspenseComponent ||
      inst.tag === HostRoot
    ) {
      return inst;
    } else {
      return null;
    }
  }
  return null;
}
export function markContainerAsRoot(hostRoot: Fiber, node: Container): void {
  (node as any)[internalContainerInstanceKey] = hostRoot;
}

export function warnForInsertedHydratedElement(
  parentNode: Element | Document,
  tag: string,
  props: Object,
) {
  if (__DEV__) {
    if (didWarnInvalidHydration) {
      return;
    }
    didWarnInvalidHydration = true;
    console.error(
      'Expected server HTML to contain a matching <%s> in <%s>.',
      tag,
      parentNode.nodeName.toLowerCase(),
    );
  }
}

export function warnForInsertedHydratedText(
  parentNode: Element | Document,
  text: string,
) {
  if (__DEV__) {
    if (text === '') {
      // We expect to insert empty text nodes since they're not represented in
      // the HTML.
      // TODO: Remove this special case if we can just avoid inserting empty
      // text nodes.
      return;
    }
    if (didWarnInvalidHydration) {
      return;
    }
    didWarnInvalidHydration = true;
    console.error(
      'Expected server HTML to contain a matching text node for "%s" in <%s>.',
      text,
      parentNode.nodeName.toLowerCase(),
    );
  }
}

export function precacheFiberNode(
  hostInst: Fiber,
  node: Instance | TextInstance | SuspenseInstance | ReactScopeInstance,
): void {
  (node as any)[internalInstanceKey] = hostInst;
}

export function updateFiberProps(
  node: Instance | TextInstance | SuspenseInstance,
  props: Props,
): void {
  (node as any)[internalPropsKey] = props;
}


export function getEventListenerSet(node: EventTarget): Set<string> {
  let elementListenerSet = (node as any)[internalEventHandlersKey];
  if (elementListenerSet === undefined) {
    elementListenerSet = (node as any)[internalEventHandlersKey] = new Set();
  }
  return elementListenerSet;
}

export function getFiberCurrentPropsFromNode(
  node: Instance | TextInstance | SuspenseInstance,
): Props {
  return (node as any)[internalPropsKey] || null;
}