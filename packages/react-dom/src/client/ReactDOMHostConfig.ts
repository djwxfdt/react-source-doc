import { DefaultEventPriority } from "../../../react-reconciler/src/ReactEventPriorities";
import { FiberRoot } from "../../../react-reconciler/src/ReactInternalTypes";
import { DOMEventName } from "../events/DOMEventNames";
import { getEventPriority } from "../events/ReactDOMEventListener";
import { getChildNamespace } from "../shared/DOMNamespaces";
import { COMMENT_NODE, DOCUMENT_FRAGMENT_NODE, DOCUMENT_NODE, ELEMENT_NODE } from "../shared/HTMLNodeType";
import { updatedAncestorInfo } from "./validateDOMNesting";

export {detachDeletedInstance} from './ReactDOMComponentTree';

type HostContextDev = {
  namespace: string,
  ancestorInfo: mixed,
  [key: string]: any
};

type HostContextProd = string;

export type Container = (Element & {_reactRootContainer?: FiberRoot}) | (Document & {_reactRootContainer?: FiberRoot});

export type TimeoutHandle = any;

export type NoTimeout = -1;

export type SuspenseInstance = Comment & {_reactRetry?: () => void};

export type Instance = Element;

export const noTimeout = -1;

export const supportsHydration = true;

export type TextInstance = Text;

export type HostContext = HostContextDev | HostContextProd;

export type HydratableInstance = Instance | TextInstance | SuspenseInstance;


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

/**
 * 加入到微任务队列，使用的是queueMicrotask，fallback为promise.resolve
 */
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

export function errorHydratingContainer(parentContainer: Container): void {
  if (__DEV__) {
    console.error(
      'An error occurred during hydration. The server HTML was replaced with client content in <%s>.',
      parentContainer.nodeName.toLowerCase(),
    );
  }
}

export function clearContainer(container: Container): void {
  if (container.nodeType === ELEMENT_NODE) {
    ((container as any) as Element).textContent = '';
  } else if (container.nodeType === DOCUMENT_NODE) {
    const body = ((container as any) as Document).body;
    if (body != null) {
      body.textContent = '';
    }
  }
}

export const isPrimaryRenderer = true;


/**
 * 就是clearTimeout
 */
export const cancelTimeout = typeof clearTimeout === 'function' ? clearTimeout : (undefined as any);

export const warnsIfNotActing = true;



export function getRootHostContext(
  rootContainerInstance: Container,
): HostContext {
  let type;
  let namespace;
  const nodeType = rootContainerInstance.nodeType;
  switch (nodeType) {
    case DOCUMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE: {
      type = nodeType === DOCUMENT_NODE ? '#document' : '#fragment';
      const root = (rootContainerInstance as any).documentElement;
      namespace = root ? root.namespaceURI : getChildNamespace(null, '');
      break;
    }
    default: {
      const container: any =
        nodeType === COMMENT_NODE
          ? rootContainerInstance.parentNode
          : rootContainerInstance;
      const ownNamespace = container.namespaceURI || null;
      type = container.tagName;
      namespace = getChildNamespace(ownNamespace, type);
      break;
    }
  }
  if (__DEV__) {
    const validatedTag = type.toLowerCase();
    const ancestorInfo = updatedAncestorInfo(null, validatedTag);
    return {namespace, ancestorInfo};
  }
  return namespace;
}