import { HydratableInstance, supportsHydration } from "./ReactFiberHostConfig";
import { Fiber } from "./ReactInternalTypes";

let hydrationParentFiber: null | Fiber = null;
let nextHydratableInstance: null | HydratableInstance = null;
let isHydrating = false;

export function resetHydrationState(): void {
  if (!supportsHydration) {
    return;
  }

  hydrationParentFiber = null;
  nextHydratableInstance = null;
  isHydrating = false;
}