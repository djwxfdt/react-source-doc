import { enableSchedulingProfiler } from "../../shared/ReactFeatureFlags";
import { Lane, Lanes } from "./ReactFiberLane.old";


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