import { DefaultEventPriority } from "../../../react-reconciler/src/ReactEventPriorities";
import { FiberRoot } from "../../../react-reconciler/src/ReactInternalTypes";
import { DOMEventName } from "../events/DOMEventNames";
import { getEventPriority } from "../events/ReactDOMEventListener";

export type Container = (Element & {_reactRootContainer?: FiberRoot}) | (Document & {_reactRootContainer?: FiberRoot});

export type TimeoutHandle = any;

export type NoTimeout = -1;

export type SuspenseInstance = Comment & {_reactRetry?: () => void};


export const noTimeout = -1;

export const supportsHydration = true;


export function getCurrentEventPriority() {
  const currentEvent = window.event;
  if (currentEvent === undefined) {
    return DefaultEventPriority;
  }
  return getEventPriority(currentEvent.type as DOMEventName);
}