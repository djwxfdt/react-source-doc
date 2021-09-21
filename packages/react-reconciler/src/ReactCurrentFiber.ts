import ReactSharedInternals from "../../shared/ReactSharedInternals";
import getComponentNameFromFiber from "./getComponentNameFromFiber";
import { getStackByFiberInDevAndProd } from "./ReactFiberComponentStack";
import { Fiber } from "./ReactInternalTypes";


const ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;

export let current: Fiber | null = null;
export let isRendering = false;


export function getCurrentFiberOwnerNameInDevOrNull(): string | null {
  if (__DEV__) {
    if (current === null) {
      return null;
    }
    const owner = current._debugOwner;
    if (owner !== null && typeof owner !== 'undefined') {
      return getComponentNameFromFiber(owner);
    }
  }
  return null;
}

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


export function setIsRendering(rendering: boolean) {
  if (__DEV__) {
    isRendering = rendering;
  }
}