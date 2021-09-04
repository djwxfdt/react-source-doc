import { enableLazyContextPropagation } from "../../shared/ReactFeatureFlags";
import { ReactContext } from "../../shared/ReactTypes";
import { isPrimaryRenderer } from "./ReactFiberHostConfig";
import { Fiber, ContextDependency, Dependencies } from "./ReactInternalTypes";
import is from '../../shared/objectIs'
import { Lanes, includesSomeLane, NoLanes } from "./ReactFiberLane.old";
import { markWorkInProgressReceivedUpdate } from "./ReactFiberBeginWork.old";
import invariant from "../../shared/invariant";
import { NeedsPropagation } from "./ReactFiberFlags";

let currentlyRenderingFiber: Fiber | null = null;
let lastContextDependency: ContextDependency<mixed> | null = null;
let lastFullyObservedContext: ReactContext<any> | null = null;

let isDisallowedContextReadInDEV = false;
export function resetContextDependencies(): void {
  // This is called right before React yields execution, to ensure `readContext`
  // cannot be called outside the render phase.
  currentlyRenderingFiber = null;
  lastContextDependency = null;
  lastFullyObservedContext = null;
  if (__DEV__) {
    isDisallowedContextReadInDEV = false;
  }
}

export function checkIfContextChanged(currentDependencies: Dependencies) {
  if (!enableLazyContextPropagation) {
    return false;
  }
  // Iterate over the current dependencies to see if something changed. This
  // only gets called if props and state has already bailed out, so it's a
  // relatively uncommon path, except at the root of a changed subtree.
  // Alternatively, we could move these comparisons into `readContext`, but
  // that's a much hotter path, so I think this is an appropriate trade off.
  let dependency = currentDependencies.firstContext;
  while (dependency !== null) {
    const context = dependency.context;
    const newValue = isPrimaryRenderer
      ? context._currentValue
      : context._currentValue2;
    const oldValue = dependency.memoizedValue;
    if (!is(newValue, oldValue)) {
      return true;
    }
    dependency = dependency.next;
  }
  return false;
}

export function prepareToReadContext(
  workInProgress: Fiber,
  renderLanes: Lanes,
): void {
  currentlyRenderingFiber = workInProgress;
  lastContextDependency = null;
  lastFullyObservedContext = null;

  const dependencies = workInProgress.dependencies;
  if (dependencies !== null) {
    if (enableLazyContextPropagation) {
      // Reset the work-in-progress list
      dependencies.firstContext = null;
    } else {
      const firstContext = dependencies.firstContext;
      if (firstContext !== null) {
        if (includesSomeLane(dependencies.lanes, renderLanes)) {
          // Context list has a pending update. Mark that this fiber performed work.
          markWorkInProgressReceivedUpdate();
        }
        // Reset the work-in-progress list
        dependencies.firstContext = null;
      }
    }
  }
}

export function readContext<T>(context: ReactContext<T>): T {
  if (__DEV__) {
    // This warning would fire if you read context inside a Hook like useMemo.
    // Unlike the class check below, it's not enforced in production for perf.
    if (isDisallowedContextReadInDEV) {
      console.error(
        'Context can only be read while React is rendering. ' +
          'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
          'In function components, you can read it directly in the function body, but not ' +
          'inside Hooks like useReducer() or useMemo().',
      );
    }
  }

  const value = isPrimaryRenderer
    ? context._currentValue
    : context._currentValue2;

  if (lastFullyObservedContext === context) {
    // Nothing to do. We already observe everything in this context.
  } else {
    const contextItem = {
      context,
      memoizedValue: value,
      next: null,
    };

    if (lastContextDependency === null) {
      invariant(
        currentlyRenderingFiber !== null,
        'Context can only be read while React is rendering. ' +
          'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
          'In function components, you can read it directly in the function body, but not ' +
          'inside Hooks like useReducer() or useMemo().',
      );

      // This is the first dependency for this component. Create a new list.
      lastContextDependency = contextItem;
      currentlyRenderingFiber!.dependencies = {
        lanes: NoLanes,
        firstContext: contextItem,
      };
      if (enableLazyContextPropagation) {
        currentlyRenderingFiber!.flags |= NeedsPropagation;
      }
    } else {
      // Append a new context item.
      lastContextDependency = lastContextDependency.next = contextItem;
    }
  }
  return value;
}