import { enableLazyContextPropagation } from "../../shared/ReactFeatureFlags";
import { ReactContext } from "../../shared/ReactTypes";
import { isPrimaryRenderer } from "./ReactFiberHostConfig";
import { Fiber, ContextDependency, Dependencies } from "./ReactInternalTypes";
import is from '../../shared/objectIs'

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