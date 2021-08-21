import { DefaultEventPriority } from "../../../react-reconciler/src/ReactEventPriorities";
import { FiberRoot } from "../../../react-reconciler/src/ReactInternalTypes";
import { DOMEventName } from "../events/DOMEventNames";
import { getEventPriority } from "../events/ReactDOMEventListener";

export {detachDeletedInstance} from './ReactDOMComponentTree';


export type Container = (Element & {_reactRootContainer?: FiberRoot}) | (Document & {_reactRootContainer?: FiberRoot});

export type TimeoutHandle = any;

export type NoTimeout = -1;

export type SuspenseInstance = Comment & {_reactRetry?: () => void};

export type Instance = Element;

export const noTimeout = -1;

export const supportsHydration = true;


export function getCurrentEventPriority() {
  const currentEvent = window.event;
  if (currentEvent === undefined) {
    return DefaultEventPriority;
  }
  return getEventPriority(currentEvent.type as DOMEventName);
}

export const scheduleTimeout: any = typeof setTimeout === 'function' ? setTimeout : undefined
const localPromise = typeof Promise === 'function' ? Promise : undefined;

// -------------------
//     Microtasks
// -------------------
export const supportsMicrotasks = true;
export const scheduleMicrotask: any =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : typeof localPromise !== 'undefined'
    ? (callback: (v: any) => void) =>
        localPromise
          .resolve(null)
          .then(callback)
          .catch(handleErrorInNextTick)
    : scheduleTimeout; // TODO: Determine the best fallback here.


function handleErrorInNextTick(error: Error) {
  setTimeout(() => {
    throw error;
  });
}