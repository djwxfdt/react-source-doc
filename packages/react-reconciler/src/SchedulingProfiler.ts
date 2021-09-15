import { enableSchedulingProfiler } from "../../shared/ReactFeatureFlags";
import getComponentNameFromFiber from "./getComponentNameFromFiber";
import { Lane, Lanes } from "./ReactFiberLane.old";
import { Fiber } from "./ReactInternalTypes";


let supportsUserTimingV3 = false;

function markAndClear(name: string) {
  performance.mark(name);
  performance.clearMarks(name);
}


export function markRenderScheduled(lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--schedule-render-${lane}`);
    }
  }
}

export function markPassiveEffectsStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--passive-effects-start-${lanes}`);
    }
  }
}

export function markPassiveEffectsStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--passive-effects-stop');
    }
  }
}

export function markRenderStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--render-start-${lanes}`);
    }
  }
}
export function markComponentRenderStarted(fiber: Fiber): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      const componentName = getComponentNameFromFiber(fiber) || 'Unknown';
      // TODO (scheduling profiler) Add component stack id
      markAndClear(`--component-render-start-${componentName}`);
    }
  }
}

export function markComponentRenderStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--component-render-stop');
    }
  }
}

export function markRenderStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--render-stop');
    }
  }
}
