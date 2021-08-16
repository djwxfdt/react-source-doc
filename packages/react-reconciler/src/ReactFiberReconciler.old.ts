import { enableSchedulingProfiler } from "../../shared/ReactFeatureFlags";
import { ReactNodeList } from "../../shared/ReactTypes";
import { emptyContextObject, findCurrentUnmaskedContext, isContextProvider as isLegacyContextProvider, processChildContext } from "./ReactFiberContext.old";
import { onScheduleRoot } from "./ReactFiberDevToolsHook.old";
import { Container } from "./ReactFiberHostConfig";
import { Lane } from "./ReactFiberLane.old";
import { createFiberRoot } from "./ReactFiberRoot.old";
import { requestEventTime, requestUpdateLane } from "./ReactFiberWorkLoop.old";
import { Fiber, FiberRoot, SuspenseHydrationCallbacks } from "./ReactInternalTypes";
import { RootTag } from "./ReactRootTags";
import { markRenderScheduled } from "./SchedulingProfiler";
import { get as getInstance } from '../../shared/ReactInstanceMap'
import { ClassComponent } from "./ReactWorkTags";

type OpaqueRoot = FiberRoot;


function getContextForSubtree(
  parentComponent?: React$Component<any, any>,
): Object {
  if (!parentComponent) {
    return emptyContextObject;
  }

  const fiber = getInstance(parentComponent) as Fiber;
  const parentContext = findCurrentUnmaskedContext(fiber);

  if (fiber.tag === ClassComponent) {
    const Component = fiber.type;
    if (isLegacyContextProvider(Component)) {
      return processChildContext(fiber, Component, parentContext);
    }
  }

  return parentContext;
}

/**
 * 创建 FiberRoot 对象,直接调用createFiberRoot
 */
export function createContainer(
  containerInfo: Container,
  tag: RootTag,
  hydrate: boolean,
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
): OpaqueRoot {
  return createFiberRoot(
    containerInfo,
    tag,
    hydrate,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
  );
}


export function updateContainer(
  element: ReactNodeList,
  container: OpaqueRoot,
  parentComponent?: React$Component<any, any>,
  callback?: Function | null,
): Lane {
  if (__DEV__) {
    onScheduleRoot(container, element);
  }
  const current = container.current;
  const eventTime = requestEventTime();
  const lane = requestUpdateLane(current!);

  if (enableSchedulingProfiler) {
    markRenderScheduled(lane);
  }

  const context = getContextForSubtree(parentComponent);
  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }

  // TODO
  // if (__DEV__) {
  //   if (
  //     ReactCurrentFiberIsRendering &&
  //     ReactCurrentFiberCurrent !== null &&
  //     !didWarnAboutNestedUpdates
  //   ) {
  //     didWarnAboutNestedUpdates = true;
  //     console.error(
  //       'Render methods should be a pure function of props and state; ' +
  //         'triggering nested component updates from render is not allowed. ' +
  //         'If necessary, trigger nested updates in componentDidUpdate.\n\n' +
  //         'Check the render method of %s.',
  //       getComponentNameFromFiber(ReactCurrentFiberCurrent) || 'Unknown',
  //     );
  //   }
  // }

  // const update = createUpdate(eventTime, lane);
  // // Caution: React DevTools currently depends on this property
  // // being called "element".
  // update.payload = {element};

  // callback = callback === undefined ? null : callback;
  // if (callback !== null) {
  //   if (__DEV__) {
  //     if (typeof callback !== 'function') {
  //       console.error(
  //         'render(...): Expected the last optional `callback` argument to be a ' +
  //           'function. Instead received: %s.',
  //         callback,
  //       );
  //     }
  //   }
  //   update.callback = callback;
  // }

  // enqueueUpdate(current, update, lane);
  // const root = scheduleUpdateOnFiber(current, lane, eventTime);
  // if (root !== null) {
  //   entangleTransitions(root, current, lane);
  // }

  return lane;
}