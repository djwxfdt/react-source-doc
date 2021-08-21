import ReactSharedInternals from "../../shared/ReactSharedInternals";
import { getStackByFiberInDevAndProd } from "./ReactFiberComponentStack";
import { Fiber } from "./ReactInternalTypes";

const ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;

export let current: Fiber | null = null;
export let isRendering: boolean = false;



function getCurrentFiberStackInDev(): string {
  if (__DEV__) {
    if (current === null) {
      return '';
    }
    // Safe because if current fiber exists, we are reconciling,
    // and it is guaranteed to be the work-in-progress version.
    return getStackByFiberInDevAndProd(current);
  }
  return '';
}


export function resetCurrentFiber() {
  if (__DEV__) {
    ReactDebugCurrentFrame.getCurrentStack = null;
    current = null;
    isRendering = false;
  }
}

export function setCurrentFiber(fiber: Fiber) {
  if (__DEV__) {
    ReactDebugCurrentFrame.getCurrentStack = getCurrentFiberStackInDev;
    current = fiber;
    isRendering = false;
  }
}