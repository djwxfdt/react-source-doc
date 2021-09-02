import { ReactContext } from "../../shared/ReactTypes";
import { Fiber, ContextDependency } from "./ReactInternalTypes";

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